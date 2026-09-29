/**
 * ฟังก์ชันกลางสำหรับอัปโหลดรูปภาพทั้งหมดเข้าสู่ Google Drive
 * รองรับ:
 * - รูปภาพแจ้งเหตุการณ์ (Incidents)
 * - รูปภาพปิดเหตุการณ์ / ระงับเหตุ (Incident Resolutions)
 * - ภาพถ่ายหลักฐานจุดตรวจ (Patrol Logs)
 * - รายงานสรุปส่งมอบเวร (Shift Reports)
 */
export async function uploadImageToDrive({
  image,
  title,
  subfolder = "รูปภาพเหตุการณ์ (Incidents)",
  webhookUrl,
}: {
  image?: string | null;
  title: string;
  subfolder?: string;
  webhookUrl?: string;
}): Promise<string | undefined> {
  if (!image) return undefined;
  // หากเป็น URL ภายนอกอยู่แล้ว (เช่น ลิงก์ Drive) ไม่ต้องอัปโหลดซ้ำ
  if (!image.startsWith("data:image")) return image;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6500);

    const res = await fetch("/api/upload-incident", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image,
        title,
        subfolder,
        webhookUrl,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data.url) {
        return data.url;
      }
    }
  } catch (err: any) {
    console.warn("Direct upload to Google Drive warning (fallback to local):", err?.message);
  }

  // Fallback: หากออฟไลน์หรือเน็ตช้า คืนค่าภาพเดิมเพื่อไม่ให้การทำงานของ รปภ. ติดขัด
  return image;
}
