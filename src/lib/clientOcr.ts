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
      // 1. Try loading from same-origin /tessdata
      const worker = await createWorker("eng", 1, {
        langPath: window.location.origin + "/tessdata",
        gzip: true,
      });
      await worker.setParameters({
        tessedit_pageseg_mode: PSM.AUTO,
        tessedit_char_whitelist: "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ- ",
      });
      clientWorker = worker;
      return clientWorker;
    } catch (err) {
      console.warn("Local /tessdata worker init failed, trying CDN fallback:", err);
      try {
        // 2. Fallback to Project Naptha CDN
        const worker = await createWorker("eng", 1, {
          langPath: "https://raw.githubusercontent.com/naptha/tessdata/gh-pages/4.0.0",
          gzip: true,
        });
        await worker.setParameters({
          tessedit_pageseg_mode: PSM.AUTO,
          tessedit_char_whitelist: "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ- ",
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

export async function recognizePlateFromCanvas(
  canvas: HTMLCanvasElement
): Promise<{ success: boolean; plateNumber: string; rawText: string }> {
  try {
    const worker = await getClientOcrWorker();
    if (!worker) {
      return { success: false, plateNumber: "", rawText: "" };
    }
    const { data } = await worker.recognize(canvas);
    const rawText = data?.text || "";
    const { plateNumber } = extractLicensePlateNumber(rawText);
    return {
      success: !!plateNumber,
      plateNumber,
      rawText,
    };
  } catch (err) {
    console.warn("recognizePlateFromCanvas error:", err);
    return { success: false, plateNumber: "", rawText: "" };
  }
}
