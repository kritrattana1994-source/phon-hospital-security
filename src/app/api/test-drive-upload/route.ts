import { NextRequest, NextResponse } from "next/server";
import { 
  getGoogleDriveConfig, 
  getGoogleAccessToken, 
  findOrCreateSubfolder, 
  uploadFileToGoogleDrive 
} from "@/lib/googleDrive";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

export const maxDuration = 15;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    let targetWebhookUrl = body.webhookUrl || process.env.GOOGLE_DRIVE_WEBHOOK_URL || process.env.GOOGLE_APPS_SCRIPT_URL;
    if (!targetWebhookUrl) {
      try {
        const snap = await getDoc(doc(db, "systemSettings", "googleDrive"));
        if (snap.exists()) {
          targetWebhookUrl = snap.data()?.webhookUrl;
        }
      } catch (e: any) {
        console.warn("Fetch systemSettings webhook in test notice:", e?.message);
      }
    }
    const rootFolderId = body.folderId || process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || "1ED0LnFxfSwHVU60fI8LShWiXBDmxFFXT";

    // 1. A tiny 1x1 transparent/colored JPEG in Base64 for rapid testing
    const sampleBase64 = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=";
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, "-");
    const testFilename = `TEST_UPLOAD_${dateStr}_${timeStr}.jpg`;

    // 2. Try Google Apps Script Web App first if webhookUrl is present
    if (targetWebhookUrl) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const response = await fetch(targetWebhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image: sampleBase64,
            filename: testFilename,
            folderId: rootFolderId,
            subfolder: "ทดสอบระบบ (Test Uploads)",
            mimeType: "image/jpeg"
          }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`Google Apps Script ตอบกลับด้วยสถานะ HTTP ${response.status}`);
        }

        const data = await response.json();
        if (data.success || data.fileId || data.url) {
          return NextResponse.json({
            success: true,
            provider: "google_apps_script",
            url: data.directLink || data.url || `https://drive.google.com/file/d/${data.fileId}/view`,
            fileId: data.fileId,
            message: "อัปโหลดรูปทดสอบเข้า Google Drive สำเร็จผ่าน Google Apps Script!"
          });
        } else {
          throw new Error(data.error || "Google Apps Script ส่งข้อผิดพลาดกลับมา");
        }
      } catch (scriptErr: any) {
        return NextResponse.json({
          success: false,
          provider: "google_apps_script",
          error: `เชื่อมต่อ Google Apps Script ไม่สำเร็จ: ${scriptErr.message}`
        }, { status: 400 });
      }
    }

    // 3. Try Google Drive Service Account
    const driveConfig = getGoogleDriveConfig();
    if (driveConfig) {
      try {
        const accessToken = await getGoogleAccessToken(driveConfig);
        const testFolder = await findOrCreateSubfolder(
          "ทดสอบระบบ (Test Uploads)",
          rootFolderId,
          accessToken
        );

        const buffer = Buffer.from(sampleBase64.replace(/^data:image\/\w+;base64,/, ""), "base64");
        const result = await uploadFileToGoogleDrive({
          filename: testFilename,
          mimeType: "image/jpeg",
          content: buffer,
          parentFolderId: testFolder.id,
          accessToken,
        });

        return NextResponse.json({
          success: true,
          provider: "google_service_account",
          url: result.webViewLink || `https://drive.google.com/file/d/${result.id}/view`,
          fileId: result.id,
          message: "อัปโหลดรูปทดสอบเข้า Google Drive สำเร็จผ่าน Google Cloud Service Account!"
        });
      } catch (saErr: any) {
        return NextResponse.json({
          success: false,
          provider: "google_service_account",
          error: `ข้อผิดพลาด Service Account: ${saErr.message}`
        }, { status: 400 });
      }
    }

    return NextResponse.json({
      success: false,
      error: "ยังไม่ได้ตั้งค่า Google Apps Script Web App URL หรือ Service Account ในระบบ"
    }, { status: 400 });

  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message || "เกิดข้อผิดพลาดในการทดสอบอัปโหลด"
    }, { status: 500 });
  }
}
