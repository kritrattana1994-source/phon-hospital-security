import { createWorker, PSM } from "tesseract.js";

let clientWorker: any = null;
let isInitializing = false;
let initPromise: Promise<any> | null = null;

export async function getClientOcrWorker() {
  if (typeof window === "undefined") return null;
  if (clientWorker) return clientWorker;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    isInitializing = true;
    try {
      // 1. Try loading Thai + English models from same-origin /tessdata
      const worker = await createWorker(["tha", "eng"], 1, {
        langPath: window.location.origin + "/tessdata",
        gzip: true,
      });
      await worker.setParameters({
        tessedit_pageseg_mode: PSM.AUTO,
      });
      clientWorker = worker;
      return clientWorker;
    } catch (err) {
      console.warn("Local /tessdata worker init failed, trying CDN fallback:", err);
      try {
        // 2. Fallback to Project Naptha CDN
        const worker = await createWorker(["tha", "eng"], 1, {
          langPath: "https://raw.githubusercontent.com/naptha/tessdata/gh-pages/4.0.0",
          gzip: true,
        });
        await worker.setParameters({
          tessedit_pageseg_mode: PSM.AUTO,
        });
        clientWorker = worker;
        return clientWorker;
      } catch (fallbackErr) {
        console.error("Client OCR worker completely failed:", fallbackErr);
        initPromise = null;
        return null;
      }
    } finally {
      isInitializing = false;
    }
  })();

  return initPromise;
}

export interface ExtractedLicensePlate {
  fullPlate: string;     // e.g. "ขน 9789", "1กข 1234", "9789"
  plateNumber: string;   // same as fullPlate for backwards compatibility
  digits: string;        // only digits e.g. "9789"
  letters: string;       // Thai consonants or English letters e.g. "ขน", "1กข"
  candidates: string[];
  cleanText: string;
}

export function extractLicensePlate(rawText: string): ExtractedLicensePlate {
  const cleanLine = rawText
    .replace(/[\|\[\]\(\)\{\}\:\;\*\_\"\'\<\>\=\-\–]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const candidates: string[] = [];

  // 1. Thai Plate: Optional digit 1-9, 1 to 3 Thai consonants (possibly with spaces), 1 to 4 digits
  // Example: "ขน 9789", "1กข 1234", "ข น 9789", "กข 123"
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

  // 2. English Plate: 1 to 3 English letters, 1 to 4 digits (e.g. "AU 9789")
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

  // 3. Fallback: Digit sequences (if letters are obscured or not detected)
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

// Backwards-compatible alias
export const extractLicensePlateNumber = extractLicensePlate;

export async function recognizePlateFromCanvas(
  canvas: HTMLCanvasElement
): Promise<{
  isWorkerReady: boolean;
  success: boolean;
  plateNumber: string;
  fullPlate: string;
  digits: string;
  letters: string;
  rawText: string;
}> {
  try {
    const worker = await getClientOcrWorker();
    if (!worker) {
      return {
        isWorkerReady: false,
        success: false,
        plateNumber: "",
        fullPlate: "",
        digits: "",
        letters: "",
        rawText: "",
      };
    }
    const { data } = await worker.recognize(canvas);
    const rawText = data?.text || "";
    const extracted = extractLicensePlate(rawText);
    return {
      isWorkerReady: true,
      success: !!extracted.fullPlate,
      plateNumber: extracted.fullPlate,
      fullPlate: extracted.fullPlate,
      digits: extracted.digits,
      letters: extracted.letters,
      rawText,
    };
  } catch (err) {
    console.warn("recognizePlateFromCanvas error:", err);
    return {
      isWorkerReady: false,
      success: false,
      plateNumber: "",
      fullPlate: "",
      digits: "",
      letters: "",
      rawText: "",
    };
  }
}
