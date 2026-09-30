import { NextRequest, NextResponse } from "next/server";
import { createWorker, PSM } from "tesseract.js";
import fs from "fs";
import path from "path";

function getLocalTessdataDir(): string | null {
  const candidates = [
    path.join(process.cwd(), "public", "tessdata"),
    path.join(process.cwd(), "tessdata"),
    path.join(__dirname, "..", "..", "..", "..", "public", "tessdata"),
    path.join(__dirname, "..", "..", "..", "..", "tessdata"),
    "/tmp/tessdata",
  ];

  for (const candidate of candidates) {
    try {
      const targetFile = path.join(candidate, "eng.traineddata");
      if (fs.existsSync(targetFile)) {
        return candidate;
      }
    } catch {}
  }
  return null;
}

export function extractLicensePlateNumber(rawText: string): { plateNumber: string; candidates: string[]; cleanText: string } {
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
  let worker: any = null;
  try {
    const body = await req.json();
    const { image } = body;

    if (!image) {
      return NextResponse.json(
        { success: false, error: "Missing image data" },
        { status: 400 }
      );
    }

    // Convert dataUrl or base64 to Buffer
    let buffer: Buffer;
    if (image.startsWith("data:")) {
      const base64Data = image.split(",")[1];
      buffer = Buffer.from(base64Data, "base64");
    } else {
      buffer = Buffer.from(image, "base64");
    }

    const localDir = getLocalTessdataDir();
    if (localDir) {
      worker = await createWorker("eng", 1, {
        langPath: localDir,
        gzip: false,
        cacheMethod: "none",
      });
    } else {
      worker = await createWorker("eng", 1, {
        langPath: "https://raw.githubusercontent.com/naptha/tessdata/gh-pages/4.0.0",
        gzip: true,
        cacheMethod: "readOnly",
      });
    }

    await worker.setParameters({
      tessedit_pageseg_mode: PSM.AUTO,
      tessedit_char_whitelist: "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ- ",
    });

    const { data } = await worker.recognize(buffer);
    const rawText = data?.text || "";
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
  } finally {
    if (worker) {
      try {
        await worker.terminate();
      } catch {}
    }
  }
}
