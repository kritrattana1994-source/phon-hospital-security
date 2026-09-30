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
      const targetFile = path.join(candidate, "tha.traineddata");
      if (fs.existsSync(targetFile)) {
        return candidate;
      }
    } catch {}
  }
  return null;
}

export interface ExtractedLicensePlate {
  fullPlate: string;
  plateNumber: string;
  digits: string;
  letters: string;
  candidates: string[];
  cleanText: string;
}

export function extractLicensePlate(rawText: string): ExtractedLicensePlate {
  const cleanLine = rawText
    .replace(/[\|\[\]\(\)\{\}\:\;\*\_\"\'\<\>\=\-\–]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const candidates: string[] = [];

  // 1. Thai Plate: Optional leading digit 1-9, 1 to 3 Thai consonants, 1 to 4 digits
  const thaiMatch = cleanLine.match(/(?:^|[^\u0E01-\u0E2E])([1-9]?\s*[\u0E01-\u0E2E]\s*[\u0E01-\u0E2E](?:\s*[\u0E01-\u0E2E])?)\s*([0-9]{1,4})/);
  if (thaiMatch) {
    const letters = thaiMatch[1].replace(/\s+/g, "");
    const digits = thaiMatch[2];
    const fullPlate = `${letters} ${digits}`;
    candidates.push(fullPlate);
    candidates.push(digits);
    return {
      fullPlate,
      plateNumber: fullPlate,
      digits,
      letters,
      candidates,
      cleanText: cleanLine,
    };
  }

  // 2. English Plate: 1 to 3 English letters, 1 to 4 digits
  const engMatch = cleanLine.match(/(?:^|[^A-Za-z])([A-Za-z]{1,3})\s*([0-9]{1,4})/);
  if (engMatch) {
    const letters = engMatch[1].toUpperCase();
    const digits = engMatch[2];
    const fullPlate = `${letters} ${digits}`;
    candidates.push(fullPlate);
    candidates.push(digits);
    return {
      fullPlate,
      plateNumber: fullPlate,
      digits,
      letters,
      candidates,
      cleanText: cleanLine,
    };
  }

  // 3. Fallback: Digit sequences
  const spaced4 = cleanLine.match(/\b(\d)\s*(\d)\s*(\d)\s*(\d)\b/);
  if (spaced4) {
    const p4 = spaced4[1] + spaced4[2] + spaced4[3] + spaced4[4];
    candidates.push(p4);
  }

  const digitChunks = cleanLine.match(/\d+/g) || [];
  for (const chunk of digitChunks) {
    if (chunk.length >= 2 && chunk.length <= 4) {
      if (!candidates.includes(chunk)) candidates.push(chunk);
    } else if (chunk.length > 4) {
      const last4 = chunk.slice(-4);
      if (!candidates.includes(last4)) candidates.push(last4);
    }
  }

  const four = candidates.find((c) => c.length === 4);
  const three = candidates.find((c) => c.length === 3);
  const two = candidates.find((c) => c.length === 2);
  const bestDigits = four || three || two || candidates[0] || "";

  return {
    fullPlate: bestDigits,
    plateNumber: bestDigits,
    digits: bestDigits,
    letters: "",
    candidates,
    cleanText: cleanLine,
  };
}

export const extractLicensePlateNumber = extractLicensePlate;

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
      worker = await createWorker(["tha", "eng"], 1, {
        langPath: localDir,
        gzip: false,
        cacheMethod: "none",
      });
    } else {
      worker = await createWorker(["tha", "eng"], 1, {
        langPath: "https://raw.githubusercontent.com/naptha/tessdata/gh-pages/4.0.0",
        gzip: true,
        cacheMethod: "readOnly",
      });
    }

    await worker.setParameters({
      tessedit_pageseg_mode: PSM.AUTO,
    });

    const { data } = await worker.recognize(buffer);
    const rawText = data?.text || "";
    const { fullPlate, plateNumber, digits, letters, candidates, cleanText } = extractLicensePlate(rawText);

    return NextResponse.json({
      success: !!fullPlate,
      rawText: cleanText,
      plateNumber: fullPlate,
      fullPlate,
      digits,
      letters,
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
