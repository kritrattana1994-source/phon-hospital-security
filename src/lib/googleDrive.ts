import crypto from "crypto";

export interface GoogleDriveConfig {
  clientEmail: string;
  privateKey: string;
  rootFolderId: string;
}

/**
 * ดึงค่า Config ของ Google Drive จาก Environment Variables
 */
export function getGoogleDriveConfig(): GoogleDriveConfig | null {
  // รองรับทั้ง JSON Key ก้อนเดียว หรือแยกเป็น Env ตัวๆ
  const jsonKeyRaw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_JSON;
  let clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || "";
  let privateKey = process.env.GOOGLE_PRIVATE_KEY || "";
  const rootFolderId =
    process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || "1ED0LnFxfSwHVU60fI8LShWiXBDmxFFXT";

  if (jsonKeyRaw) {
    try {
      const parsed = JSON.parse(jsonKeyRaw);
      clientEmail = parsed.client_email || clientEmail;
      privateKey = parsed.private_key || privateKey;
    } catch (e) {
      console.warn("Invalid GOOGLE_SERVICE_ACCOUNT_KEY_JSON format");
    }
  }

  // ปรับแก้ newline ใน private key ในกรณีที่ถูก escape เป็น \n ใน env string
  if (privateKey) {
    privateKey = privateKey.replace(/\\n/g, "\n");
  }

  if (!clientEmail || !privateKey) {
    return null;
  }

  return {
    clientEmail,
    privateKey,
    rootFolderId,
  };
}

/**
 * แปลงสตริงเป็น Base64URL
 */
function base64UrlEncode(str: string | Buffer): string {
  const buf = typeof str === "string" ? Buffer.from(str, "utf8") : str;
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * ขอ Google OAuth2 Access Token ด้วย Service Account (RS256 JWT)
 */
export async function getGoogleAccessToken(config: GoogleDriveConfig): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = {
    alg: "RS256",
    typ: "JWT",
  };

  const claimSet = {
    iss: config.clientEmail,
    scope: "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedClaimSet = base64UrlEncode(JSON.stringify(claimSet));
  const signatureInput = `${encodedHeader}.${encodedClaimSet}`;

  const signer = crypto.createSign("RSA-SHA256");
  signer.update(signatureInput);
  signer.end();
  const signature = signer.sign(config.privateKey);
  const encodedSignature = base64UrlEncode(signature);

  const jwt = `${signatureInput}.${encodedSignature}`;

  // Call OAuth2 token endpoint
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    throw new Error(`Google OAuth2 Token Error (${tokenRes.status}): ${errText}`);
  }

  const tokenData = await tokenRes.json();
  return tokenData.access_token;
}

/**
 * ทดสอบการเชื่อมต่อ Google Drive และตรวจสอบสิทธิ์ใน Root Folder
 */
export async function testGoogleDriveConnection(folderIdOverride?: string): Promise<{
  connected: boolean;
  message: string;
  folderName?: string;
  folderId?: string;
  serviceAccountEmail?: string;
  canEdit?: boolean;
}> {
  const config = getGoogleDriveConfig();
  if (!config) {
    return {
      connected: false,
      message:
        "ยังไม่ได้ตั้งค่า Service Account (ต้องการ GOOGLE_SERVICE_ACCOUNT_EMAIL และ GOOGLE_PRIVATE_KEY ใน .env.local)",
    };
  }

  const folderId = folderIdOverride || config.rootFolderId;

  try {
    const accessToken = await getGoogleAccessToken(config);

    const folderRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${folderId}?fields=id,name,capabilities,webViewLink&supportsAllDrives=true`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!folderRes.ok) {
      if (folderRes.status === 404) {
        return {
          connected: false,
          serviceAccountEmail: config.clientEmail,
          message: `ไม่พบโฟลเดอร์ Google Drive หรือยังไม่ได้แชร์โฟลเดอร์ให้ Service Account: ${config.clientEmail} (สิทธิ์ Editor)`,
        };
      }
      const errText = await folderRes.text();
      return {
        connected: false,
        serviceAccountEmail: config.clientEmail,
        message: `ข้อผิดพลาดจาก Google Drive (${folderRes.status}): ${errText}`,
      };
    }

    const folderData = await folderRes.json();
    const canEdit = folderData.capabilities?.canAddChildren ?? true;

    return {
      connected: true,
      message: "เชื่อมต่อ Google Drive สำเร็จ และมีสิทธิ์สร้าง/อัปโหลดไฟล์ในโฟลเดอร์",
      folderName: folderData.name || "โฟลเดอร์สำรองข้อมูล",
      folderId: folderData.id,
      serviceAccountEmail: config.clientEmail,
      canEdit,
    };
  } catch (error: any) {
    return {
      connected: false,
      serviceAccountEmail: config?.clientEmail,
      message: `เกิดข้อผิดพลาดในการเชื่อมต่อ: ${error.message}`,
    };
  }
}

/**
 * ค้นหาหรือสร้างโฟลเดอร์ย่อย (เช่น โฟลเดอร์ประจำปีงบประมาณ FY2567) ภายใน Parent Folder
 */
export async function findOrCreateSubfolder(
  folderName: string,
  parentFolderId: string,
  accessToken: string
): Promise<{ id: string; name: string; webViewLink?: string }> {
  // 1. ค้นหาว่ามีโฟลเดอร์ชื่อนี้อยู่แล้วหรือไม่
  const query = `'${parentFolderId}' in parents and name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
    query
  )}&fields=files(id,name,webViewLink)&supportsAllDrives=true&includeItemsFromAllDrives=true`;

  const searchRes = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (searchRes.ok) {
    const searchData = await searchRes.json();
    if (searchData.files && searchData.files.length > 0) {
      return searchData.files[0];
    }
  }

  // 2. หากยังไม่มี ให้สร้างใหม่
  const createRes = await fetch(
    "https://www.googleapis.com/drive/v3/files?supportsAllDrives=true&fields=id,name,webViewLink",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: folderName,
        mimeType: "application/vnd.google-apps.folder",
        parents: [parentFolderId],
      }),
    }
  );

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`ไม่สามารถสร้างโฟลเดอร์ ${folderName} ใน Google Drive: ${errText}`);
  }

  return await createRes.json();
}

/**
 * อัปโหลดไฟล์เข้าสู่ Google Drive ในโฟลเดอร์ที่ระบุ (Multipart Upload)
 */
export async function uploadFileToGoogleDrive(params: {
  filename: string;
  mimeType: string;
  content: string | Buffer;
  parentFolderId: string;
  accessToken: string;
}): Promise<{ id: string; name: string; webViewLink?: string }> {
  const boundary = "-------314159265358979323846";
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metadata = {
    name: params.filename,
    parents: [params.parentFolderId],
  };

  const fileDataBuffer =
    typeof params.content === "string"
      ? Buffer.from(params.content, "utf8")
      : params.content;

  const multipartBody = Buffer.concat([
    Buffer.from(
      delimiter +
        "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
        JSON.stringify(metadata) +
        delimiter +
        `Content-Type: ${params.mimeType}\r\n\r\n`
    ),
    fileDataBuffer,
    Buffer.from(closeDelimiter),
  ]);

  const uploadRes = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id,name,webViewLink",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${params.accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
        "Content-Length": multipartBody.length.toString(),
      },
      body: multipartBody,
    }
  );

  if (!uploadRes.ok) {
    const errText = await uploadRes.text();
    throw new Error(`อัปโหลดไฟล์ ${params.filename} ไม่สำเร็จ (${uploadRes.status}): ${errText}`);
  }

  return await uploadRes.json();
}
