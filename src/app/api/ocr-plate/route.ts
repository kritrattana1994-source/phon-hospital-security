import { NextRequest, NextResponse } from "next/server";
import { createWorker } from "tesseract.js";

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

    // Run OCR with a strict 4.5-second timeout to prevent any server hang
    const ocrPromise = (async () => {
      let worker: any = null;
      try {
        worker = await createWorker("eng");
        await worker.setParameters({
          tessedit_char_whitelist: "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
        });

        const { data } = await worker.recognize(buffer);
        await worker.terminate();
        return data.text || "";
      } catch (err) {
        if (worker) {
          try {
            await worker.terminate();
          } catch {}
        }
        throw err;
      }
    })();

    const timeoutPromise = new Promise<string>((_, reject) =>
      setTimeout(() => reject(new Error("OCR timeout")), 4500)
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
      const sortedByLength = [...digitMatches].sort((a, b) => b.length - a.length);
      bestPlate = sortedByLength[0];
    }

    return NextResponse.json({
      success: true,
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
