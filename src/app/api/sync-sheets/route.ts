import { NextRequest, NextResponse } from "next/server";

export interface StaffVehicleImport {
  plateNumber: string;
  province: string;
  ownerName: string;
  department: string;
  phone: string;
  zone: string;
  brand?: string;
  model?: string;
  color?: string;
  vehicleType?: "รถยนต์" | "รถจักรยานยนต์" | string;
}

export const DEFAULT_PHON_HOSPITAL_SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1SJ4yULEWaWkYEFr_8afL7Ao8razoilFhuxNPScbBEMo/edit?pli=1&gid=1048644177#gid=1048644177";

// All 77 provinces of Thailand
const THAI_PROVINCES = [
  "กรุงเทพมหานคร", "กรุงเทพฯ", "กรุงเทพ", "กทม.", "กทม",
  "ขอนแก่น", "นครราชสีมา", "โคราช", "อุดรธานี", "หนองคาย", "มหาสารคาม", "ร้อยเอ็ด",
  "กาฬสินธุ์", "สกลนคร", "นครพนม", "มุกดาหาร", "บุรีรัมย์", "สุรินทร์", "ศรีสะเกษ",
  "อุบลราชธานี", "ยโสธร", "ชัยภูมิ", "อำนาจเจริญ", "บึงกาฬ", "หนองบัวลำภู", "เลย",
  "เชียงใหม่", "เชียงราย", "ลำปาง", "ลำพูน", "แม่ฮ่องสอน", "น่าน", "พะเยา", "แพร่",
  "อุตรดิตถ์", "ตาก", "สุโขทัย", "พิษณุโลก", "พิจิตร", "กำแพงเพชร", "เพชรบูรณ์",
  "นครสวรรค์", "อุทัยธานี", "นนทบุรี", "ปทุมธานี", "สมุทรปราการ", "สมุทรสาคร",
  "สมุทรสงคราม", "นครปฐม", "อยุธยา", "พระนครศรีอยุธยา", "อ่างทอง", "สิงห์บุรี",
  "ชัยนาท", "ลพบุรี", "สระบุรี", "นครนายก", "ปราจีนบุรี", "สระแก้ว", "ฉะเชิงเทรา",
  "ชลบุรี", "ระยอง", "จันทบุรี", "ตราด", "กาญจนบุรี", "ราชบุรี", "สุพรรณบุรี",
  "เพชรบุรี", "ประจวบคีรีขันธ์", "ประจวบฯ", "ชุมพร", "ระนอง", "สุราษฎร์ธานี", "พังงา",
  "ภูเก็ต", "กระบี่", "ตรัง", "พัทลุง", "นครศรีธรรมราช", "สงขลา", "สตูล", "ปัตตานี",
  "ยะลา", "นราธิวาส"
].sort((a, b) => b.length - a.length);

function normalizeProvince(raw: string): string {
  if (!raw) return "ขอนแก่น";
  const clean = raw.trim();
  if (["กทม", "กทม.", "กรุงเทพ", "กรุงเทพฯ"].includes(clean)) return "กรุงเทพมหานคร";
  if (clean === "โคราช") return "นครราชสีมา";
  if (clean === "อยุธยา") return "พระนครศรีอยุธยา";
  if (clean === "ประจวบฯ") return "ประจวบคีรีขันธ์";
  return clean;
}

function parsePlateAndProvince(rawStr: string): { plate: string; province: string } {
  if (!rawStr) return { plate: "", province: "ขอนแก่น" };
  let s = rawStr.trim();

  let detectedProvince = "ขอนแก่น";
  let provinceMatched = "";

  for (const prov of THAI_PROVINCES) {
    if (s.includes(prov)) {
      detectedProvince = normalizeProvince(prov);
      provinceMatched = prov;
      break;
    }
  }

  let plateOnly = s;
  if (provinceMatched) {
    plateOnly = s.replace(provinceMatched, "").trim();
  }

  // Remove trailing or leading dashes, periods, parenthesis
  plateOnly = plateOnly.replace(/^[-\s]+|[-\s]+$/g, "");
  // Normalize internal whitespace
  plateOnly = plateOnly.replace(/\s+/g, " ").trim();

  return {
    plate: plateOnly || s,
    province: detectedProvince,
  };
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
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    let csvData = body.csvText || "";
    let fetchUrl = (body.url || "").trim();

    // If neither URL nor CSV text provided, default to Phon Hospital's official registration sheet
    if (!csvData && !fetchUrl) {
      fetchUrl = DEFAULT_PHON_HOSPITAL_SHEET_URL;
    }

    if (fetchUrl) {
      // Convert normal Google Sheets link to CSV export URL
      const sheetIdMatch = fetchUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (
        sheetIdMatch &&
        !fetchUrl.includes("export?format=csv") &&
        !fetchUrl.includes("pub?output=csv")
      ) {
        const sheetId = sheetIdMatch[1];
        const gidMatch = fetchUrl.match(/[#&?]gid=([0-9]+)/);
        const gid = gidMatch ? gidMatch[1] : "0";
        fetchUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
      }

      try {
        const response = await fetch(fetchUrl, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) PhonHospital/1.0",
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
            error: `เกิดข้อผิดพลาดในการดึงข้อมูลจาก URL: ${
              err?.message || "ไม่สามารถเชื่อมต่อได้"
            }`,
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

    const headerRow = rows[0];
    const normalizedHeaders = headerRow.map((h) =>
      h.toLowerCase().replace(/[\s\-_]/g, "")
    );

    // Check if this is the Phon Hospital Google Forms multi-vehicle response schema
    const isGoogleFormResponses =
      headerRow.length >= 10 &&
      (normalizedHeaders.some((h) => h.includes("ยานพาหนะที่ใช้เดินทาง")) ||
        normalizedHeaders.some((h) => h.includes("คำนำหน้า")) ||
        normalizedHeaders.filter((h) => h.includes("หมายเลขทะเบียน")).length > 1);

    const vehicleMap = new Map<string, StaffVehicleImport>();

    if (isGoogleFormResponses) {
      // Find base staff profile column indexes
      const titleIdx = normalizedHeaders.findIndex((h) => h.includes("คำนำหน้า"));
      const nameIdx = normalizedHeaders.findIndex(
        (h) => h.includes("ชื่อ") && (h.includes("นามสกุล") || h.includes("สกุล"))
      );
      const deptIdx = normalizedHeaders.findIndex(
        (h) => h.includes("งาน") || h.includes("หน่วยงาน") || h.includes("แผนก")
      );
      const phoneIdx = normalizedHeaders.findIndex(
        (h) => h.includes("เบอร์") || h.includes("โทร") || h.includes("phone")
      );

      // Find all vehicle column groups in Phon Hospital Form:
      // Typically:
      // Car 1: brand (6), model (7), color (8), plate (9)
      // Car 2: brand (10), model (11), color (12), plate (13)
      // Motorcycle 1: brand (14), model (15), color (16), plate (17)
      // Motorcycle 2: brand (18), model (19), color (20), plate (21)
      const vehicleGroups: {
        type: "รถยนต์" | "รถจักรยานยนต์";
        brandIdx: number;
        modelIdx: number;
        colorIdx: number;
        plateIdx: number;
      }[] = [];

      headerRow.forEach((colName, idx) => {
        const norm = colName.toLowerCase().replace(/[\s\-_]/g, "");
        if (norm.includes("หมายเลขทะเบียนรถยนต์")) {
          vehicleGroups.push({
            type: "รถยนต์",
            brandIdx: idx - 3 >= 0 ? idx - 3 : -1,
            modelIdx: idx - 2 >= 0 ? idx - 2 : -1,
            colorIdx: idx - 1 >= 0 ? idx - 1 : -1,
            plateIdx: idx,
          });
        } else if (norm.includes("หมายเลขทะเบียนรถจักรยานยนต์")) {
          vehicleGroups.push({
            type: "รถจักรยานยนต์",
            brandIdx: idx - 3 >= 0 ? idx - 3 : -1,
            modelIdx: idx - 2 >= 0 ? idx - 2 : -1,
            colorIdx: idx - 1 >= 0 ? idx - 1 : -1,
            plateIdx: idx,
          });
        }
      });

      // Fallback default index positions if exact header text varies slightly
      if (vehicleGroups.length === 0) {
        vehicleGroups.push(
          { type: "รถยนต์", brandIdx: 6, modelIdx: 7, colorIdx: 8, plateIdx: 9 },
          { type: "รถยนต์", brandIdx: 10, modelIdx: 11, colorIdx: 12, plateIdx: 13 },
          { type: "รถจักรยานยนต์", brandIdx: 14, modelIdx: 15, colorIdx: 16, plateIdx: 17 },
          { type: "รถจักรยานยนต์", brandIdx: 18, modelIdx: 19, colorIdx: 20, plateIdx: 21 }
        );
      }

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const title = titleIdx !== -1 ? row[titleIdx]?.trim() || "" : "";
        const rawName = nameIdx !== -1 ? row[nameIdx]?.trim() || "" : "";

        // Combine title + name cleanly
        let ownerName = rawName || "บุคลากร รพ.พล";
        if (title && !rawName.startsWith(title)) {
          ownerName = `${title}${rawName}`;
        }

        const department = deptIdx !== -1 ? row[deptIdx]?.trim() || "รพ.พล" : "รพ.พล";
        const phone = phoneIdx !== -1 ? row[phoneIdx]?.trim() || "-" : "-";

        for (const g of vehicleGroups) {
          if (g.plateIdx >= row.length) continue;
          const rawPlate = row[g.plateIdx]?.trim();

          // Validation & Sanitization: Must have at least one digit and not be empty / placeholder
          if (
            !rawPlate ||
            rawPlate.length < 2 ||
            !/[0-9]/.test(rawPlate) ||
            rawPlate.includes("ยังไม่") ||
            rawPlate.includes("ไม่มี") ||
            rawPlate === "-"
          ) {
            continue;
          }

          const { plate, province } = parsePlateAndProvince(rawPlate);

          // Smart Zone Allocation
          let zone = "โซนบุคลากร รพ.พล";
          if (g.type === "รถจักรยานยนต์") {
            zone = "ลานจอดรถจักรยานยนต์บุคลากร";
          } else if (
            title.includes("นพ.") ||
            title.includes("พญ.") ||
            ownerName.includes("นพ.") ||
            ownerName.includes("พญ.") ||
            department.includes("แพทย์")
          ) {
            zone = "ลานจอดแพทย์ A";
          } else if (
            department.includes("ฉุกเฉิน") ||
            department.includes("ER") ||
            department.includes("กู้ชีพ")
          ) {
            zone = "โซนฉุกเฉิน (ER)";
          }

          const brand = g.brandIdx !== -1 && g.brandIdx < row.length ? row[g.brandIdx]?.trim() || "" : "";
          const model = g.modelIdx !== -1 && g.modelIdx < row.length ? row[g.modelIdx]?.trim() || "" : "";
          const color = g.colorIdx !== -1 && g.colorIdx < row.length ? row[g.colorIdx]?.trim() || "" : "";

          // Unique key per vehicle: Normalized Plate + Province
          const dedupKey = `${plate.replace(/\s+/g, "").toUpperCase()}_${province}`;

          vehicleMap.set(dedupKey, {
            plateNumber: plate,
            province,
            ownerName,
            department,
            phone,
            zone,
            brand: brand || undefined,
            model: model || undefined,
            color: color || undefined,
            vehicleType: g.type,
          });
        }
      }
    } else {
      // Standard Flat CSV Format (Single Vehicle per row)
      const findIndex = (keywords: string[]) => {
        return normalizedHeaders.findIndex((h) =>
          keywords.some((k) => h.includes(k))
        );
      };

      const plateIdx = findIndex(["ทะเบียน", "เลขทะเบียน", "plate", "license"]);
      const provIdx = findIndex(["จังหวัด", "province"]);
      const ownerIdx = findIndex(["ชื่อ", "ผู้ครอบครอง", "เจ้าของ", "name", "owner"]);
      const deptIdx = findIndex(["แผนก", "สังกัด", "ฝ่าย", "กลุ่มงาน", "department", "dept"]);
      const phoneIdx = findIndex(["เบอร์", "โทร", "phone", "tel", "mobile"]);
      const zoneIdx = findIndex(["โซน", "ที่จอด", "ลานจอด", "zone", "parking"]);
      const brandIdx = findIndex(["ยี่ห้อ", "brand"]);
      const modelIdx = findIndex(["รุ่น", "model"]);
      const colorIdx = findIndex(["สี", "color"]);
      const typeIdx = findIndex(["ประเภท", "type"]);

      if (plateIdx === -1) {
        return NextResponse.json(
          {
            error:
              "ไม่พบคอลัมน์ 'เลขทะเบียนรถ' ในหัวตาราง กรุณาตรวจสอบว่ามีคอลัมน์ชื่อ 'ทะเบียน' หรือ 'Plate'",
          },
          { status: 400 }
        );
      }

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const rawPlate = row[plateIdx]?.trim();
        if (
          !rawPlate ||
          rawPlate.length < 2 ||
          !/[0-9]/.test(rawPlate) ||
          rawPlate.includes("ยังไม่") ||
          rawPlate.includes("ไม่มี") ||
          rawPlate === "-"
        ) {
          continue;
        }

        const { plate, province: detectedProv } = parsePlateAndProvince(rawPlate);
        const province =
          provIdx !== -1 && row[provIdx]?.trim()
            ? normalizeProvince(row[provIdx].trim())
            : detectedProv;

        const ownerName =
          ownerIdx !== -1 && row[ownerIdx]?.trim()
            ? row[ownerIdx].trim()
            : "เจ้าหน้าที่ รพ.พล";
        const department =
          deptIdx !== -1 && row[deptIdx]?.trim()
            ? row[deptIdx].trim()
            : "รพ.พล";
        const phone =
          phoneIdx !== -1 && row[phoneIdx]?.trim()
            ? row[phoneIdx].trim()
            : "-";
        const zone =
          zoneIdx !== -1 && row[zoneIdx]?.trim()
            ? row[zoneIdx].trim()
            : "โซนบุคลากร รพ.พล";
        const brand = brandIdx !== -1 ? row[brandIdx]?.trim() || undefined : undefined;
        const model = modelIdx !== -1 ? row[modelIdx]?.trim() || undefined : undefined;
        const color = colorIdx !== -1 ? row[colorIdx]?.trim() || undefined : undefined;
        const vehicleType =
          typeIdx !== -1 && row[typeIdx]?.trim()
            ? row[typeIdx].trim()
            : "รถยนต์";

        const dedupKey = `${plate.replace(/\s+/g, "").toUpperCase()}_${province}`;
        vehicleMap.set(dedupKey, {
          plateNumber: plate,
          province,
          ownerName,
          department,
          phone,
          zone,
          brand,
          model,
          color,
          vehicleType,
        });
      }
    }

    const vehicles = Array.from(vehicleMap.values());

    return NextResponse.json({
      success: true,
      count: vehicles.length,
      carsCount: vehicles.filter((v) => v.vehicleType === "รถยนต์").length,
      motorcyclesCount: vehicles.filter((v) => v.vehicleType === "รถจักรยานยนต์").length,
      vehicles,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "เกิดข้อผิดพลาดในการซิงก์ข้อมูล" },
      { status: 500 }
    );
  }
}
