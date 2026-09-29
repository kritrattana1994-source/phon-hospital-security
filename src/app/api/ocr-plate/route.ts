import { NextRequest, NextResponse } from "next/server";
import { createWorker, PSM } from "tesseract.js";
import fs from "fs";
import path from "path";

// Global persistent worker cache for high-speed repeated frame recognition
let cachedWorker: any = null;
let isInitializing = false;

function getLocalTessdataPath(): string | undefined {
  const candidates = [
    path.join(process.cwd(), "public", "tessdata"),
    path.join(process.cwd(), "tessdata"),
    process.cwd(),
    path.join(__dirname, "..", "..", "..", "..", "public", "tessdata"),
    path.join(__dirname, "..", "..", "..", "..", "tessdata"),
  ];

  for (const candidate of candidates) {
    try {
      const targetFile = path.join(candidate, "eng.traineddata");
      if (fs.existsSync(targetFile)) {
        return candidate;
      }
    } catch {}
  }
  return undefined;
}

async function getOcrWorker() {
  if (cachedWorker) return cachedWorker;

  if (isInitializing) {
    while (isInitializing) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    if (cachedWorker) return cachedWorker;
  }

  isInitializing = true;
  try {
    const langPath = getLocalTessdataPath();
    const options: any = {
      cacheMethod: "none",
      gzip: false,
    };
    if (langPath) {
      options.langPath = langPath;
    }

    const worker = await createWorker("eng", 1, options);
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.SPARSE_TEXT,
      tessedit_char_whitelist: "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ- ",
    });
    cachedWorker = worker;
    return cachedWorker;
  } finally {
    isInitializing = false;
  }
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

        // Fallback: create fresh worker with local langPath
        const langPath = getLocalTessdataPath();
        const oneTimeWorker = await createWorker("eng", 1, {
          ...(langPath ? { langPath } : {}),
          cacheMethod: "none",
          gzip: false,
        });
        await oneTimeWorker.setParameters({
          tessedit_pageseg_mode: PSM.SPARSE_TEXT,
          tessedit_char_whitelist: "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ- ",
        });
        const { data } = await oneTimeWorker.recognize(buffer);
        cachedWorker = oneTimeWorker;
        return data.text || "";
      }
    })();

    const timeoutPromise = new Promise<string>((_, reject) =>
      setTimeout(() => reject(new Error("OCR timeout")), 3500)
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

    // Clean text and extract numbers
    const cleanText = rawText.replace(/\r?\n/g, " ").trim();
    const digitChunks = cleanText.match(/\d+/g) || [];

    const candidates: string[] = [];
    for (const chunk of digitChunks) {
      if (chunk.length >= 1 && chunk.length <= 4) {
        candidates.push(chunk);
      } else if (chunk.length === 5) {
        // If 5 digits, check for duplicate adjacent digits (e.g. 56113 -> 5613)
        const dedup = chunk.replace(/(.)\1+/g, "$1");
        if (dedup.length >= 2 && dedup.length <= 4) {
          candidates.push(dedup);
        }
        // Or strip leading motorcycle code digit (e.g. 15613 -> 5613)
        candidates.push(chunk.slice(-4));
      } else if (chunk.length > 5) {
        candidates.push(chunk.slice(-4));
      }
    }

    // Prioritize 4-digit numbers, then 3-digit, then 2-digit
    let bestPlate = "";
    const fourDigits = candidates.filter((d) => d.length === 4);
    const threeDigits = candidates.filter((d) => d.length === 3);
    const twoDigits = candidates.filter((d) => d.length === 2);

    if (fourDigits.length > 0) {
      bestPlate = fourDigits[0];
    } else if (threeDigits.length > 0) {
      bestPlate = threeDigits[0];
    } else if (twoDigits.length > 0) {
      bestPlate = twoDigits[0];
    } else if (candidates.length > 0) {
      bestPlate = candidates[0];
    }

    return NextResponse.json({
      success: !!bestPlate,
      rawText: cleanText,
      plateNumber: bestPlate,
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
