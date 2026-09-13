import { NextRequest, NextResponse } from "next/server";

export interface StaffVehicleImport {
  plateNumber: string;
  province: string;
  ownerName: string;
  department: string;
  phone: string;
  zone: string;
}

// Helper to parse CSV lines taking quotes into account
function parseCSV(text: string): string[][] {
  const lines: string[][] = [];
  let currentRow: string[] = [];
  let currentVal = "";
  let insideQuote = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (insideQuote && nextChar === '"') {
        currentVal += '"';
        i++; // skip escaped quote
      } else {
        insideQuote = !insideQuote;
      }
    } else if (char === "," && !insideQuote) {
      currentRow.push(currentVal.trim());
      currentVal = "";
    } else if ((char === "\r" || char === "\n") && !insideQuote) {
      if (char === "\r" && nextChar === "\n") {
        i++;
      }
      currentRow.push(currentVal.trim());
      if (currentRow.some((field) => field.length > 0)) {
        lines.push(currentRow);
      }
      currentRow = [];
      currentVal = "";
    } else {
      currentVal += char;
    }
  }

  if (currentVal.length > 0 || currentRow.length > 0) {
    currentRow.push(currentVal.trim());
    if (currentRow.some((field) => field.length > 0)) {
      lines.push(currentRow);
    }
  }

  return lines;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let csvData = body.csvText || "";

    if (body.url) {
      let fetchUrl = body.url.trim();

      // Convert normal Google Sheets link to CSV export URL
      const sheetIdMatch = fetchUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (sheetIdMatch && !fetchUrl.includes("export?format=csv") && !fetchUrl.includes("pub?output=csv")) {
        const sheetId = sheetIdMatch[1];
        const gidMatch = fetchUrl.match(/[#&?]gid=([0-9]+)/);
        const gid = gidMatch ? gidMatch[1] : "0";
        fetchUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
      }

      try {
        const response = await fetch(fetchUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) PhonHospital/1.0",
          },
        });

        if (!response.ok) {
          return NextResponse.json(
            {
              error: `ไม่สามารถเข้าถึง Google Sheets ได้ (HTTP ${response.status}). กรุณาตรวจสอบว่าได้เปิดการแชร์ลิงก์เป็น "ทุกคนที่มีลิงก์มีสิทธิ์อ่าน" หรือไม่`,
            },
            { status: 400 }
          );
        }

        csvData = await response.text();
      } catch (err: any) {
        return NextResponse.json(
          {
            error: `เกิดข้อผิดพลาดในการดึงข้อมูลจาก URL: ${err?.message || "ไม่สามารถเชื่อมต่อได้"}`,
          },
          { status: 400 }
        );
      }
    }

    if (!csvData || typeof csvData !== "string") {
      return NextResponse.json(
        { error: "ไม่พบข้อมูล CSV หรือ URL สำหรับประมวลผล" },
        { status: 400 }
      );
    }

    const rows = parseCSV(csvData);
    if (rows.length < 2) {
      return NextResponse.json(
        { error: "ข้อมูลต้องมีหัวตาราง (Header) และข้อมูลรถอย่างน้อย 1 แถว" },
        { status: 400 }
      );
    }

    const headers = rows[0].map((h) => h.toLowerCase().replace(/[\s\-_]/g, ""));

    // Find column indexes using fuzzy matching for Thai and English headers
    const findIndex = (keywords: string[]) => {
      return headers.findIndex((h) => keywords.some((k) => h.includes(k)));
    };

    const plateIdx = findIndex(["ทะเบียน", "เลขทะเบียน", "plate", "license"]);
    const provIdx = findIndex(["จังหวัด", "province"]);
    const ownerIdx = findIndex(["ชื่อ", "ผู้ครอบครอง", "เจ้าของ", "name", "owner"]);
    const deptIdx = findIndex(["แผนก", "สังกัด", "ฝ่าย", "กลุ่มงาน", "department", "dept"]);
    const phoneIdx = findIndex(["เบอร์", "โทร", "phone", "tel", "mobile"]);
    const zoneIdx = findIndex(["โซน", "ที่จอด", "ลานจอด", "zone", "parking"]);

    if (plateIdx === -1) {
      return NextResponse.json(
        {
          error: "ไม่พบคอลัมน์ 'เลขทะเบียนรถ' ในหัวตาราง กรุณาตรวจสอบว่ามีคอลัมน์ชื่อ 'ทะเบียน' หรือ 'Plate'",
        },
        { status: 400 }
      );
    }

    const vehicles: StaffVehicleImport[] = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const rawPlate = row[plateIdx]?.trim();
      if (!rawPlate) continue;

      vehicles.push({
        plateNumber: rawPlate.toUpperCase(),
        province: provIdx !== -1 && row[provIdx] ? row[provIdx].trim() : "ขอนแก่น",
        ownerName: ownerIdx !== -1 && row[ownerIdx] ? row[ownerIdx].trim() : "เจ้าหน้าที่ รพ.พล",
        department: deptIdx !== -1 && row[deptIdx] ? row[deptIdx].trim() : "รพ.พล",
        phone: phoneIdx !== -1 && row[phoneIdx] ? row[phoneIdx].trim() : "-",
        zone: zoneIdx !== -1 && row[zoneIdx] ? row[zoneIdx].trim() : "โซนบุคลากร",
      });
    }

    return NextResponse.json({
      success: true,
      count: vehicles.length,
      vehicles,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "เกิดข้อผิดพลาดในการซิงก์ข้อมูล" },
      { status: 500 }
    );
  }
}
