/**
 * Thai Fiscal Year Utilities (ระบบคำนวณปีงบประมาณไทย)
 * ปีงบประมาณไทย: เริ่มต้น 1 ตุลาคม (ปีก่อนหน้า) ถึง 30 กันยายน (ปีปัจจุบัน)
 * ตัวอย่าง: 1 ต.ค. 2566 - 30 ก.ย. 2567 = ปีงบประมาณ 2567 (FY2567)
 */

export interface FiscalYearInfo {
  yearBE: number;       // พ.ศ. (เช่น 2567)
  yearCE: number;       // ค.ศ. (เช่น 2024)
  code: string;         // เช่น "FY2567"
  label: string;        // เช่น "ปีงบประมาณ 2567 (FY2567)"
  startDate: string;    // "2023-10-01"
  endDate: string;      // "2024-09-30"
}

/**
 * คำนวณปีงบประมาณไทยจากวันที่กำหนด
 */
export function getThaiFiscalYear(dateInput: Date | string | number): FiscalYearInfo {
  const date = typeof dateInput === "object" ? dateInput : new Date(dateInput);
  if (isNaN(date.getTime())) {
    const fallbackYearCE = new Date().getFullYear();
    const fallbackYearBE = fallbackYearCE + 543;
    return {
      yearBE: fallbackYearBE,
      yearCE: fallbackYearCE,
      code: `FY${fallbackYearBE}`,
      label: `ปีงบประมาณ ${fallbackYearBE} (FY${fallbackYearBE})`,
      startDate: `${fallbackYearCE - 1}-10-01`,
      endDate: `${fallbackYearCE}-09-30`,
    };
  }

  const yearCE = date.getFullYear();
  const month = date.getMonth() + 1; // 1-12

  // ถ้าเดือนเป็น 10, 11, 12 จะนับเป็นปีงบประมาณถัดไป
  const fiscalYearCE = month >= 10 ? yearCE + 1 : yearCE;
  const fiscalYearBE = fiscalYearCE + 543;

  return {
    yearBE: fiscalYearBE,
    yearCE: fiscalYearCE,
    code: `FY${fiscalYearBE}`,
    label: `ปีงบประมาณ ${fiscalYearBE} (FY${fiscalYearBE})`,
    startDate: `${fiscalYearCE - 1}-10-01`,
    endDate: `${fiscalYearCE}-09-30`,
  };
}

/**
 * ตรวจสอบว่าวันที่เก่าเกินจำนวนวันที่ระบุหรือไม่ (ค่าเริ่มต้น 365 วัน)
 */
export function isOlderThanDays(dateInput: Date | string | number, days: number = 365): boolean {
  const date = typeof dateInput === "object" ? dateInput : new Date(dateInput);
  if (isNaN(date.getTime())) return false;

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return date.getTime() < cutoff.getTime();
}

/**
 * จัดกลุ่มข้อมูลตามปีงบประมาณ
 */
export function groupByFiscalYear<T extends { timestamp: string }>(items: T[]): Record<string, T[]> {
  const grouped: Record<string, T[]> = {};

  for (const item of items) {
    if (!item.timestamp) continue;
    const fy = getThaiFiscalYear(item.timestamp);
    const key = fy.code;
    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(item);
  }

  return grouped;
}

/**
 * จัดรูปแบบวันที่เวลาภาษาไทยฉบับสมบูรณ์
 */
export function formatThaiDateTime(dateInput: Date | string | number): string {
  const date = typeof dateInput === "object" ? dateInput : new Date(dateInput);
  if (isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
