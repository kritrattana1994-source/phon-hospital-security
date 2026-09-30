import { NextRequest, NextResponse } from "next/server";
import { createWorker, PSM } from "tesseract.js";
import fs from "fs";
import path from "path";

// Global persistent worker cache for high-speed repeated frame recognition
let cachedWorker: any = null;
let isInitializing = false;

function getTessdataConfig(): { langPath: string; gzip: boolean; cacheMethod: "none" | "readOnly" } {
  const candidates = [
    path.join(process.cwd(), "public", "tessdata"),
    path.join(process.cwd(), "tessdata"),
    path.join(__dirname, "..", "..", "..", "..", "public", "tessdata"),
    path.join(__dirname, "..", "..", "..", "..", "tessdata"),
  ];

  for (const candidate of candidates) {
    try {
      const targetFile = path.join(candidate, "eng.traineddata");
      if (fs.existsSync(targetFile)) {
        return { langPath: candidate, gzip: false, cacheMethod: "none" };
      }
    } catch {}
  }

  // Reliable remote CDN with HTTP 200 OK (never returns 404 like jsdelivr)
  return {
    langPath: "https://raw.githubusercontent.com/naptha/tessdata/gh-pages/4.0.0",
    gzip: true,
    cacheMethod: "readOnly",
  };
}

async function getOcrWorker() {
  if (cachedWorker) return cachedWorker;

  if (isInitializing) {
    let waitCount = 0;
    while (isInitializing && waitCount < 100) {
      await new Promise((resolve) => setTimeout(resolve, 50));
      waitCount++;
    }
    if (cachedWorker) return cachedWorker;
  }

  isInitializing = true;
  try {
    const config = getTessdataConfig();
    const worker = await createWorker("eng", 1, {
      langPath: config.langPath,
      gzip: config.gzip,
      cacheMethod: config.cacheMethod,
    });
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.AUTO,
      tessedit_char_whitelist: "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ- ",
    });
    cachedWorker = worker;
    return cachedWorker;
  } finally {
    isInitializing = false;
  }
}

function extractLicensePlateNumber(rawText: string): { plateNumber: string; candidates: string[]; cleanText: string } {
  const cleanText = rawText.replace(/\r?\n/g, " ").trim();
  const candidates: string[] = [];

  // Pattern 1: Spaced 4 digits e.g. "9 789", "97 89", "9 7 8 9", "9789"
  const spaced4 = cleanText.match(/\b(\d)\s*(\d)\s*(\d)\s*(\d)\b/);
  if (spaced4) {
    const p4 = spaced4[1] + spaced4[2] + spaced4[3] + spaced4[4];
    candidates.push(p4);
  }

  // Pattern 2: Normal digit chunks
  const digitChunks = cleanText.match(/\d+/g) || [];
  for (const chunk of digitChunks) {
    if (chunk.length >= 2 && chunk.length <= 4) {
      if (!candidates.includes(chunk)) candidates.push(chunk);
    } else if (chunk.length > 4) {
      const last4 = chunk.slice(-4);
      if (!candidates.includes(last4)) candidates.push(last4);
    }
  }

  // Prioritize 4-digit numbers, then 3-digit, then 2-digit
  const four = candidates.find((c) => c.length === 4);
  const three = candidates.find((c) => c.length === 3);
  const two = candidates.find((c) => c.length === 2);

  const bestPlate = four || three || two || candidates[0] || "";
  return { plateNumber: bestPlate, candidates, cleanText };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { image } = body;

    if (!image) {
      return NextResponse.json(
        { success: false, error: "Missing image data" },
        { status: 400 }
      );
    }

    // Convert dataUrl to Buffer
    let buffer: Buffer;
    if (image.startsWith("data:")) {
      const base64Data = image.split(",")[1];
      buffer = Buffer.from(base64Data, "base64");
    } else {
      buffer = Buffer.from(image, "base64");
    }

    // Run OCR with cached worker
    const ocrPromise = (async () => {
      try {
        const worker = await getOcrWorker();
        const { data } = await worker.recognize(buffer);
        return data.text || "";
      } catch (workerErr) {
        console.warn("Cached worker error, reinitializing worker:", workerErr);
        try {
          if (cachedWorker) {
            await cachedWorker.terminate().catch(() => {});
          }
        } catch {}
        cachedWorker = null;

        // Fallback: create fresh worker with safe CDN config
        const config = getTessdataConfig();
        const oneTimeWorker = await createWorker("eng", 1, {
          langPath: config.langPath,
          gzip: config.gzip,
          cacheMethod: config.cacheMethod,
        });
        await oneTimeWorker.setParameters({
          tessedit_pageseg_mode: PSM.AUTO,
          tessedit_char_whitelist: "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ- ",
        });
        const { data } = await oneTimeWorker.recognize(buffer);
        cachedWorker = oneTimeWorker;
        return data.text || "";
      }
    })();

    const timeoutPromise = new Promise<string>((_, reject) =>
      setTimeout(() => reject(new Error("OCR timeout")), 8500)
    );

    let rawText = "";
    try {
      rawText = await Promise.race([ocrPromise, timeoutPromise]);
    } catch (err: any) {
      console.warn("OCR recognition notice:", err?.message || err);
      return NextResponse.json({
        success: false,
        error: "OCR processing timed out or failed",
        plateNumber: "",
        rawText: "",
      });
    }

    const { plateNumber, candidates, cleanText } = extractLicensePlateNumber(rawText);

    return NextResponse.json({
      success: !!plateNumber,
      rawText: cleanText,
      plateNumber,
      matches: candidates,
    });
  } catch (error: any) {
    console.error("API /api/ocr-plate error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
