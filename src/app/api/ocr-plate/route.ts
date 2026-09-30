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

async function recognizeWithGemini(
  base64Image: string,
  apiKey: string
): Promise<{ success: boolean; plateNumber: string; letters: string; digits: string; rawText: string; model: string } | null> {
  const cleanBase64 = base64Image.replace(/^data:image\/[a-zA-Z]+;base64,/, "").trim();
  if (!cleanBase64) return null;

  const candidateModels = [
    "gemini-flash-latest",
    "gemini-3.5-flash-lite",
    "gemini-3.8-flash",
  ];

  const promptText = `
คุณคือ AI ตรวจจับป้ายทะเบียนรถในประเทศไทย สำหรับระบบรักษาความปลอดภัย โรงพยาบาลพล
หน้าที่ของคุณ:
1. วิเคราะห์และอ่านป้ายทะเบียนรถในภาพ (รองรับทั้งรถยนต์ รถกระบะ รถตู้ และรถจักรยานยนต์)
2. ส่งคืนเฉพาะ "หมวดอักษรและตัวเลข" เท่านั้น เช่น "ขน 9789", "1กข 1234", "7กศ 8888", "AU 9789"
3. กฎสำคัญมาก (ห้ามผิดเด็ดขาด):
   - ห้ามระบุชื่อจังหวัดโดยเด็ดขาด (ตัดชื่อจังหวัดทิ้ง 100% ไม่ต้องส่งชื่อจังหวัดกลับมา เช่น คำว่า ขอนแก่น, กรุงเทพมหานคร ให้ตัดทิ้ง)
   - สำหรับป้ายรถจักรยานยนต์ (ป้าย 2-3 บรรทัด เช่น บรรทัดบน '1กผ' บรรทัดล่าง '1234'): ให้นำหมวดอักษรด้านบนมารวมกับตัวเลขด้านล่าง เป็น "1กผ 1234"
   - ถ้าบนป้ายมีเฉพาะตัวเลข ให้ส่งเฉพาะตัวเลข เช่น "9789"
   - ตอบเฉพาะข้อความป้ายทะเบียนสั้นๆ บรรทัดเดียวเท่านั้น ห้ามมีคำอธิบายอื่น ห้ามใส่ Markdown หรือเครื่องหมายคำพูด
   - หากในภาพไม่มีป้ายทะเบียน หรือมองไม่เห็นตัวอักษร/ตัวเลขเลย ให้ตอบคำเดียวว่า NONE
  `.trim();

  for (const model of candidateModels) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8500);

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: promptText },
                {
                  inline_data: {
                    mime_type: "image/jpeg",
                    data: cleanBase64,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 200,
          },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const errText = await res.text();
        console.warn(`Gemini Vision API (${model}) notice: HTTP ${res.status}`, errText);
        continue;
      }

      const data = await res.json();
      const rawAiText = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
      if (!rawAiText || rawAiText.toUpperCase().includes("NONE")) {
        return { success: false, plateNumber: "", letters: "", digits: "", rawText: rawAiText, model };
      }

      // Clean any prefix like "ทะเบียน:" or quotes
      let cleanPlate = rawAiText
        .replace(/[`"*_#]/g, "")
        .replace(/\r?\n/g, " ")
        .trim();
      cleanPlate = cleanPlate.replace(/^(?:ป้ายทะเบียน|เลขทะเบียน|ทะเบียน|ทะเบียนรถ|รถ|plate|license\s*plate)\s*[:=]?\s*/i, "").trim();

      // Use our canonical parser to ensure clean letters & digits
      const extracted = extractLicensePlate(cleanPlate);
      const finalPlate = extracted.fullPlate || cleanPlate;

      return {
        success: !!finalPlate,
        plateNumber: finalPlate,
        letters: extracted.letters,
        digits: extracted.digits,
        rawText: rawAiText,
        model,
      };
    } catch (err) {
      clearTimeout(timeoutId);
      console.warn(`Gemini Vision API (${model}) error:`, err);
    }
  }

  return null;
}

export async function POST(req: NextRequest) {
  let worker: any = null;
  try {
    const body = await req.json();
    const { image, geminiApiKey: clientKey } = body;

    if (!image) {
      return NextResponse.json(
        { success: false, error: "Missing image data" },
        { status: 400 }
      );
    }

    // 1. Try Gemini Flash Vision API first if API key is provided
    const apiKey = (
      clientKey ||
      process.env.GEMINI_API_KEY ||
      process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
      ""
    ).trim();

    if (apiKey) {
      const geminiResult = await recognizeWithGemini(image, apiKey);
      if (geminiResult && geminiResult.success && geminiResult.plateNumber) {
        return NextResponse.json({
          success: true,
          engine: geminiResult.model || "gemini-flash",
          rawText: geminiResult.rawText,
          plateNumber: geminiResult.plateNumber,
          fullPlate: geminiResult.plateNumber,
          digits: geminiResult.digits,
          letters: geminiResult.letters,
          matches: [geminiResult.plateNumber],
        });
      }
    }

    // 2. Fallback to Tesseract OCR (Local same-origin / CDN)
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
      engine: "tesseract-fallback",
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
