import { NextRequest, NextResponse } from "next/server";
import { createWorker } from "tesseract.js";

// Global persistent worker cache for high-speed repeated frame recognition
let cachedWorker: any = null;
let isInitializing = false;

async function getOcrWorker() {
  if (cachedWorker) return cachedWorker;

  if (isInitializing) {
    while (isInitializing) {
      await new Promise((resolve) => setTimeout(resolve, 80));
    }
    if (cachedWorker) return cachedWorker;
  }

  isInitializing = true;
  try {
    const worker = await createWorker("eng");
    await worker.setParameters({
      tessedit_char_whitelist: "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz- ",
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

        // Fallback: one-time worker
        const oneTimeWorker = await createWorker("eng");
        await oneTimeWorker.setParameters({
          tessedit_char_whitelist: "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz- ",
        });
        const { data } = await oneTimeWorker.recognize(buffer);
        cachedWorker = oneTimeWorker;
        return data.text || "";
      }
    })();

    const timeoutPromise = new Promise<string>((_, reject) =>
      setTimeout(() => reject(new Error("OCR timeout")), 7000)
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

    // Clean text and extract numbers (1-4 digits)
    const cleanText = rawText.replace(/\r?\n/g, " ").trim();
    
    // Find consecutive digits (usually 1-4 digits on license plates)
    const digitMatches = cleanText.match(/\d{1,4}/g);
    
    // Prefer 4-digit or 3-digit matches
    let bestPlate = "";
    if (digitMatches && digitMatches.length > 0) {
      const fourDigits = digitMatches.filter((d) => d.length === 4);
      const threeDigits = digitMatches.filter((d) => d.length === 3);
      const twoDigits = digitMatches.filter((d) => d.length === 2);
      
      if (fourDigits.length > 0) {
        bestPlate = fourDigits[0];
      } else if (threeDigits.length > 0) {
        bestPlate = threeDigits[0];
      } else if (twoDigits.length > 0) {
        bestPlate = twoDigits[0];
      } else {
        const sortedByLength = [...digitMatches].sort((a, b) => b.length - a.length);
        bestPlate = sortedByLength[0];
      }
    }

    return NextResponse.json({
      success: !!bestPlate,
      rawText: cleanText,
      plateNumber: bestPlate,
      matches: digitMatches || [],
    });
  } catch (error: any) {
    console.error("API /api/ocr-plate error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
