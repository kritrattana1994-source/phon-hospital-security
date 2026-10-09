import { ParkingScan, StaffVehicle } from "./store";

export interface AnalyzedVehicle {
  plateNumber: string;
  province: string;
  normalizedKey: string;
  isStaff: boolean;
  ownerName?: string;
  department?: string;
  scanCount: number;
  totalUniqueDays: number;
  weekendDays: number;
  weekdayDays: number;
  weekendRatio: number; // 0.0 - 1.0
  overnightCount: number;
  mostFrequentZone: string;
  firstSeen: string;
  lastSeen: string;
  datesSeen: string[]; // YYYY-MM-DD
  dayOfWeekBreakdown: {
    sun: number;
    mon: number;
    tue: number;
    wed: number;
    thu: number;
    fri: number;
    sat: number;
  };
  timeSlotBreakdown: {
    morning: number; // 06:00 - 11:59
    afternoon: number; // 12:00 - 17:59
    evening: number; // 18:00 - 21:59
    night: number; // 22:00 - 05:59
  };
  riskCategory: "weekend_squatter" | "chronic_overnight" | "abandoned" | "unregistered_staff" | "normal_visitor" | "staff";
  riskScore: number; // 0 - 100
  riskReason: string;
}

export interface Parking90DaysAnalyticsResult {
  daysAnalyzed: number;
  startDate: string;
  endDate: string;
  totalScans: number;
  uniqueVehiclesCount: number;
  staffVehiclesCount: number;
  outsideVehiclesCount: number;
  weekendSquatters: AnalyzedVehicle[];
  chronicOvernight: AnalyzedVehicle[];
  abandonedVehicles: AnalyzedVehicle[];
  unregisteredStaffSuspects: AnalyzedVehicle[];
  allAnalyzedVehicles: AnalyzedVehicle[];
}

/**
 * ล้างข้อมูลป้ายทะเบียนให้เป็นมาตรฐานเดียวกัน
 */
export function normalizePlateKey(plate: string): string {
  if (!plate) return "";
  return plate.replace(/[\s\-_.,()\[\]]/g, "").toUpperCase();
}

/**
 * ตรวจสอบความถูกต้องของป้ายทะเบียนเจ้าหน้าที่แบบ Strict
 */
export function isStaffPlateStrict(
  plate: string,
  province: string | undefined,
  staffList: StaffVehicle[]
): { isStaff: boolean; staffInfo?: StaffVehicle } {
  if (!plate || !staffList.length) return { isStaff: false };
  const cleanPlate = normalizePlateKey(plate);
  const digitMatch = cleanPlate.match(/\d+$/);
  if (!digitMatch) return { isStaff: false };
  const digits = digitMatch[0];
  const letters = cleanPlate.slice(0, cleanPlate.length - digits.length);
  const consonants = letters.replace(/[^ก-ฮA-Z]/g, "");

  const matched = staffList.find((sv) => {
    const svClean = normalizePlateKey(sv.plateNumber);
    const svDigitMatch = svClean.match(/\d+$/);
    if (!svDigitMatch || svDigitMatch[0] !== digits) return false;
    const svLetters = svClean.slice(0, svClean.length - digits.length);
    const svConsonants = svLetters.replace(/[^ก-ฮA-Z]/g, "");
    return svLetters === letters || svConsonants === consonants;
  });

  return {
    isStaff: !!matched,
    staffInfo: matched,
  };
}

/**
 * วิเคราะห์เปรียบเทียบพฤติกรรมการจอดรถย้อนหลัง (ค่าเริ่มต้น 90 วัน)
 */
export function analyze90DaysParking(
  scans: ParkingScan[],
  staffVehicles: StaffVehicle[],
  cutoffDays: number = 90
): Parking90DaysAnalyticsResult {
  const now = new Date();
  const cutoffTime = new Date(now.getTime() - cutoffDays * 24 * 60 * 60 * 1000).getTime();

  // กรองเฉพาะบันทึกภายในช่วงวันย้อนหลัง
  const filteredScans = scans.filter((s) => {
    if (!s.timestamp) return false;
    const t = new Date(s.timestamp).getTime();
    return !isNaN(t) && t >= cutoffTime;
  });

  // รวบรวมข้อมูลตามทะเบียนรถ
  const vehicleMap = new Map<string, {
    plateNumber: string;
    province: string;
    scans: ParkingScan[];
    uniqueDates: Set<string>;
    zoneCounts: Record<string, number>;
  }>();

  filteredScans.forEach((scan) => {
    const rawPlate = scan.plateNumber?.trim();
    if (!rawPlate) return;
    const normKey = normalizePlateKey(rawPlate);
    const prov = scan.province?.trim() || "ขอนแก่น";

    if (!vehicleMap.has(normKey)) {
      vehicleMap.set(normKey, {
        plateNumber: rawPlate,
        province: prov,
        scans: [],
        uniqueDates: new Set<string>(),
        zoneCounts: {},
      });
    }

    const item = vehicleMap.get(normKey)!;
    item.scans.push(scan);

    const dateStr = scan.timestamp ? scan.timestamp.split("T")[0] : "";
    if (dateStr) item.uniqueDates.add(dateStr);

    const zoneName = scan.zone || "ลานจอดทั่วไป";
    item.zoneCounts[zoneName] = (item.zoneCounts[zoneName] || 0) + 1;
  });

  const analyzedList: AnalyzedVehicle[] = [];

  vehicleMap.forEach((item, normKey) => {
    const { isStaff, staffInfo } = isStaffPlateStrict(item.plateNumber, item.province, staffVehicles);
    const explicitStaff = isStaff || item.scans.some((s) => s.isStaff);

    let weekendDaysCount = 0;
    let weekdayDaysCount = 0;
    let overnightScansCount = 0;

    const dayBreakdown = { sun: 0, mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0 };
    const timeSlots = { morning: 0, afternoon: 0, evening: 0, night: 0 };

    // นับวันเสาร์-อาทิตย์ vs วันธรรมดา จาก unique dates
    Array.from(item.uniqueDates).forEach((dStr) => {
      const d = new Date(dStr + "T12:00:00");
      if (!isNaN(d.getTime())) {
        const dayIdx = d.getDay();
        if (dayIdx === 0) {
          dayBreakdown.sun++;
          weekendDaysCount++;
        } else if (dayIdx === 6) {
          dayBreakdown.sat++;
          weekendDaysCount++;
        } else {
          weekdayDaysCount++;
          if (dayIdx === 1) dayBreakdown.mon++;
          else if (dayIdx === 2) dayBreakdown.tue++;
          else if (dayIdx === 3) dayBreakdown.wed++;
          else if (dayIdx === 4) dayBreakdown.thu++;
          else if (dayIdx === 5) dayBreakdown.fri++;
        }
      }
    });

    // สแกนช่วงเวลาและค้างคืน
    item.scans.forEach((s) => {
      const isNightRound =
        s.round?.includes("22:") ||
        s.round?.includes("06:") ||
        s.round === "22:00" ||
        s.round === "06:00";

      let hour = 12;
      if (s.timestamp) {
        const t = new Date(s.timestamp);
        if (!isNaN(t.getTime())) {
          hour = t.getHours();
        }
      }

      if (hour >= 6 && hour < 12) timeSlots.morning++;
      else if (hour >= 12 && hour < 18) timeSlots.afternoon++;
      else if (hour >= 18 && hour < 22) timeSlots.evening++;
      else timeSlots.night++;

      if (isNightRound || hour >= 22 || hour < 6) {
        overnightScansCount++;
      }
    });

    const totalDays = item.uniqueDates.size;
    const weekendRatio = totalDays > 0 ? weekendDaysCount / totalDays : 0;

    // หาโซนที่จอดบ่อยสุด
    let mostZone = "ลานจอดทั่วไป";
    let maxZoneCount = 0;
    Object.entries(item.zoneCounts).forEach(([z, count]) => {
      if (count > maxZoneCount) {
        maxZoneCount = count;
        mostZone = z;
      }
    });

    // จัดเรียงวันที่
    const sortedDates = Array.from(item.uniqueDates).sort();
    const firstSeen = sortedDates[0] || "";
    const lastSeen = sortedDates[sortedDates.length - 1] || "";

    // Classification & Risk Scoring
    let riskCategory: AnalyzedVehicle["riskCategory"] = "normal_visitor";
    let riskScore = 10;
    let riskReason = "ผู้ติดต่อหรือญาติผู้ป่วยทั่วไป";

    if (explicitStaff) {
      riskCategory = "staff";
      riskScore = 0;
      riskReason = `บุคลากรโรงพยาบาล (${staffInfo?.department || item.scans[0]?.department || "ลงทะเบียนแล้ว"})`;
    } else {
      // 1. ตรวจจับรถชอบแอบมาจอด เสาร์-อาทิตย์ (Weekend Squatter)
      // เกณฑ์: มาวันหยุดสุดสัปดาห์ตั้งแต่ 3 ครั้งขึ้นไป และสัดส่วนเสาร์-อาทิตย์ >= 65%
      if (weekendDaysCount >= 3 && weekendRatio >= 0.65) {
        riskCategory = "weekend_squatter";
        riskScore = Math.min(98, 60 + weekendDaysCount * 4 + Math.round(weekendRatio * 20));
        riskReason = `🚨 แอบจอดประจำวันเสาร์-อาทิตย์ (พบ ${weekendDaysCount} วันหยุด, คิดเป็น ${Math.round(weekendRatio * 100)}% ของวันที่มา)`;
      }
      // 2. รถจอดค้างคืนเรื้อรัง
      else if (overnightScansCount >= 4) {
        riskCategory = "chronic_overnight";
        riskScore = Math.min(95, 50 + overnightScansCount * 5);
        riskReason = `🌙 จอดค้างคืนเรื้อรัง (พบรอบดึก/เช้าตรู่ ${overnightScansCount} ครั้ง)`;
      }
      // 3. รถสงสัยเป็นบุคลากรลืมลงทะเบียน (มาเฉพาะวันจันทร์-ศุกร์ สม่ำเสมอ)
      else if (weekdayDaysCount >= 12 && weekendRatio <= 0.2) {
        riskCategory = "unregistered_staff";
        riskScore = 35;
        riskReason = `ℹ️ มาจอดวันทำงานสม่ำเสมอ (${weekdayDaysCount} วัน) คาดว่าเป็นเจ้าหน้าที่ยังไม่ได้ลงทะเบียน`;
      }
      // 4. รถจอดแช่ยาว (> 5 วันต่อเนื่อง)
      else if (totalDays >= 5 && overnightScansCount >= 3) {
        riskCategory = "abandoned";
        riskScore = 75;
        riskReason = `🛑 จอดแช่ยาวนานผิดปกติ (${totalDays} วัน)`;
      }
    }

    analyzedList.push({
      plateNumber: item.plateNumber,
      province: item.province,
      normalizedKey: normKey,
      isStaff: explicitStaff,
      ownerName: staffInfo?.ownerName || item.scans[0]?.ownerName,
      department: staffInfo?.department || item.scans[0]?.department,
      scanCount: item.scans.length,
      totalUniqueDays: totalDays,
      weekendDays: weekendDaysCount,
      weekdayDays: weekdayDaysCount,
      weekendRatio: Number(weekendRatio.toFixed(3)),
      overnightCount: overnightScansCount,
      mostFrequentZone: mostZone,
      firstSeen,
      lastSeen,
      datesSeen: sortedDates,
      dayOfWeekBreakdown: dayBreakdown,
      timeSlotBreakdown: timeSlots,
      riskCategory,
      riskScore,
      riskReason,
    });
  });

  // แยกกลุ่มผลลัพธ์
  const weekendSquatters = analyzedList
    .filter((v) => v.riskCategory === "weekend_squatter")
    .sort((a, b) => b.weekendDays - a.weekendDays || b.weekendRatio - a.weekendRatio);

  const chronicOvernight = analyzedList
    .filter((v) => v.riskCategory === "chronic_overnight")
    .sort((a, b) => b.overnightCount - a.overnightCount);

  const abandonedVehicles = analyzedList
    .filter((v) => v.riskCategory === "abandoned")
    .sort((a, b) => b.totalUniqueDays - a.totalUniqueDays);

  const unregisteredStaffSuspects = analyzedList
    .filter((v) => v.riskCategory === "unregistered_staff")
    .sort((a, b) => b.weekdayDays - a.weekdayDays);

  const staffCount = analyzedList.filter((v) => v.isStaff).length;
  const outsideCount = analyzedList.filter((v) => !v.isStaff).length;

  const startDateStr = new Date(cutoffTime).toISOString().split("T")[0];
  const endDateStr = now.toISOString().split("T")[0];

  return {
    daysAnalyzed: cutoffDays,
    startDate: startDateStr,
    endDate: endDateStr,
    totalScans: filteredScans.length,
    uniqueVehiclesCount: analyzedList.length,
    staffVehiclesCount: staffCount,
    outsideVehiclesCount: outsideCount,
    weekendSquatters,
    chronicOvernight,
    abandonedVehicles,
    unregisteredStaffSuspects,
    allAnalyzedVehicles: analyzedList,
  };
}

/**
 * ส่งออกรายงานรถแอบจอดเสาร์-อาทิตย์ เป็น CSV พร้อม BOM สำหรับเปิดใน Excel ภาษาไทย
 */
export function exportWeekendSquattersToCSV(squatters: AnalyzedVehicle[]): string {
  const headers = [
    "ลำดับ",
    "เลขทะเบียน",
    "จังหวัด",
    "สถานะตรวจจับ",
    "จำนวนวันเสาร์-อาทิตย์ที่มา",
    "จำนวนวันธรรมดา",
    "จำนวนวันทั้งหมดในรอบ 90 วัน",
    "สัดส่วนมาวันหยุด (%)",
    "รอบค้างคืน (ครั้ง)",
    "โซนที่จอดประจำ",
    "พบครั้งแรก",
    "พบล่าสุด",
    "คำแนะนำการปฏิบัติ",
  ];

  const escapeCSV = (val: any) => {
    if (val === null || val === undefined) return '""';
    const s = String(val).replace(/"/g, '""');
    return `"${s}"`;
  };

  const rows = squatters.map((item, idx) => [
    escapeCSV(idx + 1),
    escapeCSV(item.plateNumber),
    escapeCSV(item.province),
    escapeCSV("🚨 แอบจอดประจำวันเสาร์-อาทิตย์"),
    escapeCSV(item.weekendDays),
    escapeCSV(item.weekdayDays),
    escapeCSV(item.totalUniqueDays),
    escapeCSV(`${Math.round(item.weekendRatio * 100)}%`),
    escapeCSV(item.overnightCount),
    escapeCSV(item.mostFrequentZone),
    escapeCSV(item.firstSeen),
    escapeCSV(item.lastSeen),
    escapeCSV("ติดใบแจ้งเตือน / สอบถามเหตุผลการนำรถมาจอดค้างช่วงวันหยุด"),
  ]);

  const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
  return "\uFEFF" + csvContent;
}
