import { NextRequest, NextResponse } from "next/server";
import { 
  getGoogleDriveConfig, 
  getGoogleAccessToken, 
  findOrCreateSubfolder, 
  uploadFileToGoogleDrive 
} from "@/lib/googleDrive";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

export const maxDuration = 12; // Max 12s for Vercel Serverless

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { image, title, webhookUrl, subfolder } = body;

    if (!image || typeof image !== "string") {
      return NextResponse.json({ error: "ไม่พบข้อมูลรูปภาพ" }, { status: 400 });
    }

    let targetWebhookUrl = webhookUrl || process.env.GOOGLE_DRIVE_WEBHOOK_URL || process.env.GOOGLE_APPS_SCRIPT_URL;
    if (!targetWebhookUrl) {
      try {
        const snap = await getDoc(doc(db, "systemSettings", "googleDrive"));
        if (snap.exists()) {
          targetWebhookUrl = snap.data()?.webhookUrl;
        }
      } catch (e: any) {
        console.warn("Fetch systemSettings webhook notice:", e?.message);
      }
    }

    const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || "1ED0LnFxfSwHVU60fI8LShWiXBDmxFFXT";
    const targetSubfolder = (subfolder || "รูปภาพเหตุการณ์ (Incidents)").trim();

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, "-");
    const safeTitle = (title || "incident")
      .slice(0, 20)
      .replace(/[^a-zA-Z0-9ก-๙]/g, "_");
    const filename = `${dateStr}_${timeStr}_${safeTitle}.jpg`;

    // 1. Priority 1: Google Apps Script Web App (Direct upload to Google Drive folder)
    if (targetWebhookUrl) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        const scriptRes = await fetch(targetWebhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image,
            filename,
            folderId: rootFolderId,
            subfolder: targetSubfolder,
            mimeType: "image/jpeg"
          }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (scriptRes.ok) {
          const scriptData = await scriptRes.json();
          if (scriptData.success || scriptData.url || scriptData.fileId) {
            return NextResponse.json({
              success: true,
              provider: "google_drive",
              url: scriptData.directLink || scriptData.url || `https://drive.google.com/file/d/${scriptData.fileId}/view`,
              fileId: scriptData.fileId
            });
          }
        }
      } catch (scriptErr: any) {
        console.warn("Google Apps Script upload fallback:", scriptErr.message);
      }
    }

    // 2. Priority 2: Google Drive API via Service Account
    const driveConfig = getGoogleDriveConfig();
    if (driveConfig) {
      try {
        const uploadPromise = (async () => {
          const accessToken = await getGoogleAccessToken(driveConfig);
          const targetFolderId = driveConfig.rootFolderId || rootFolderId;

          // Find or create target subfolder
          const incidentFolder = await findOrCreateSubfolder(
            targetSubfolder,
            targetFolderId,
            accessToken
          );

          // Convert base64 dataUrl to Buffer
          const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
          const buffer = Buffer.from(base64Data, "base64");

          const result = await uploadFileToGoogleDrive({
            filename,
            mimeType: "image/jpeg",
            content: buffer,
            parentFolderId: incidentFolder.id,
            accessToken,
          });

          return {
            success: true,
            provider: "google_drive",
            url:
              result.webViewLink ||
              `https://drive.google.com/file/d/${result.id}/view`,
            fileId: result.id,
          };
        })();

        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error("Google Drive upload timed out")),
            4500
          )
        );

        const uploadResult = await Promise.race([
          uploadPromise,
          timeoutPromise,
        ]);
        return NextResponse.json(uploadResult);
      } catch (driveErr: any) {
        console.warn(
          "Google Drive Service Account upload warning (falling back):",
          driveErr.message
        );
      }
    }

    // 3. Fallback: Return image dataUrl directly so it is stored in Firestore instantly
    return NextResponse.json({
      success: true,
      provider: "base64",
      url: image,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "เกิดข้อผิดพลาดในการประมวลผลรูปภาพ" },
      { status: 500 }
    );
  }
}
