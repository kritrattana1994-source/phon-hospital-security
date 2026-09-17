import { NextRequest, NextResponse } from "next/server";
import { 
  getGoogleDriveConfig, 
  getGoogleAccessToken, 
  findOrCreateSubfolder, 
  uploadFileToGoogleDrive 
} from "@/lib/googleDrive";

export const maxDuration = 10; // Max 10s for Vercel Serverless

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { image, title } = body;

    if (!image || typeof image !== "string") {
      return NextResponse.json({ error: "ไม่พบข้อมูลรูปภาพ" }, { status: 400 });
    }

    // Check if Google Drive service account is configured
    const driveConfig = getGoogleDriveConfig();

    if (driveConfig) {
      try {
        // Strict 4-second timeout for Google Drive upload so the user never hangs
        const uploadPromise = (async () => {
          const accessToken = await getGoogleAccessToken(driveConfig);
          const rootFolderId =
            driveConfig.rootFolderId || "1ED0LnFxfSwHVU60fI8LShWiXBDmxFFXT";

          // Find or create "รูปภาพเหตุการณ์ (Incidents)" subfolder
          const incidentFolder = await findOrCreateSubfolder(
            "รูปภาพเหตุการณ์ (Incidents)",
            rootFolderId,
            accessToken
          );

          // Convert base64 dataUrl to Buffer
          const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
          const buffer = Buffer.from(base64Data, "base64");

          const now = new Date();
          const dateStr = now.toISOString().slice(0, 10);
          const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, "-");
          const safeTitle = (title || "incident")
            .slice(0, 20)
            .replace(/[^a-zA-Z0-9ก-๙]/g, "_");
          const filename = `${dateStr}_${timeStr}_${safeTitle}.jpg`;

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
            4000
          )
        );

        const uploadResult = await Promise.race([
          uploadPromise,
          timeoutPromise,
        ]);
        return NextResponse.json(uploadResult);
      } catch (driveErr: any) {
        console.warn(
          "Google Drive upload warning (falling back to direct storage):",
          driveErr.message
        );
      }
    }

    // Fallback: Return image dataUrl directly so it is stored in Firestore instantly
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
