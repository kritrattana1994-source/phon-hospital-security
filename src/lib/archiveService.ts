import { PatrolLog, ParkingScan, Incident } from "./store";
import { formatThaiDateTime, getThaiFiscalYear } from "./fiscalYear";

// Helper to escape CSV values
function escapeCSV(val: any): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * แปลง Patrol Logs เป็น CSV พร้อม UTF-8 BOM สำหรับเปิดใน Microsoft Excel ภาษาไทยไม่เพี้ยน
 */
export function exportPatrolLogsToCSV(logs: PatrolLog[]): string {
  const headers = [
    "รหัสบันทึก (ID)",
    "รหัสจุดตรวจ",
    "รหัส รปภ.",
    "ชื่อ รปภ.",
    "วันเวลาสแกน",
    "สถานะ",
    "หมายเหตุ / รายการตรวจ",
    "พิกัดละติจูด (Lat)",
    "พิกัดลองจิจูด (Lng)",
    "ความแม่นยำ GPS (เมตร)",
  ];

  const rows = logs.map((log) => [
    escapeCSV(log.id),
    escapeCSV(log.checkpointId),
    escapeCSV(log.guardId),
    escapeCSV(log.guardName),
    escapeCSV(formatThaiDateTime(log.timestamp)),
    escapeCSV(log.status === "normal" ? "ปกติ" : "พบสิ่งผิดปกติ"),
    escapeCSV(log.notes || "-"),
    escapeCSV(log.coords?.lat ?? "-"),
    escapeCSV(log.coords?.lng ?? "-"),
    escapeCSV(log.coords?.accuracy ?? "-"),
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((r) => r.join(",")),
  ].join("\r\n");

  // Add UTF-8 BOM
  return "\uFEFF" + csvContent;
}

/**
 * แปลง Parking Scans เป็น CSV พร้อม UTF-8 BOM
 */
export function exportParkingScansToCSV(scans: ParkingScan[]): string {
  const headers = [
    "รหัสสแกน (ID)",
    "เลขทะเบียนรถ",
    "จังหวัด",
    "ประเภทรถ",
    "เจ้าของรถ",
    "สังกัด / แผนก",
    "โซนจอด",
    "รอบตรวจ",
    "วันเวลาสแกน",
    "รปภ. ผู้สแกน",
  ];

  const rows = scans.map((scan) => [
    escapeCSV(scan.id),
    escapeCSV(scan.plateNumber),
    escapeCSV(scan.province || "ขอนแก่น"),
    escapeCSV(scan.isStaff ? "รถบุคลากร" : "รถภายนอก"),
    escapeCSV(scan.ownerName || "-"),
    escapeCSV(scan.department || "-"),
    escapeCSV(scan.zone || "-"),
    escapeCSV(scan.round || "-"),
    escapeCSV(formatThaiDateTime(scan.timestamp)),
    escapeCSV(scan.guardName),
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((r) => r.join(",")),
  ].join("\r\n");

  return "\uFEFF" + csvContent;
}

/**
 * แปลง Incidents เป็น CSV พร้อม UTF-8 BOM
 */
export function exportIncidentsToCSV(incidents: Incident[]): string {
  const headers = [
    "รหัสเหตุการณ์ (ID)",
    "ประเภทเหตุ",
    "ระดับความรุนแรง",
    "หัวข้อ / รายละเอียด",
    "ผู้รายงาน",
    "วันเวลาเกิดเหตุ",
    "สถานะ",
    "ลิงก์รูปภาพหลักฐาน",
  ];

  const rows = incidents.map((inc) => [
    escapeCSV(inc.id),
    escapeCSV(
      inc.type === "medical"
        ? "การแพทย์ฉุกเฉิน"
        : inc.type === "suspicious"
        ? "บุคคล/พฤติกรรมต้องสงสัย"
        : "กายภาพ/สิ่งแวดล้อม"
    ),
    escapeCSV(
      inc.severity === "high"
        ? "วิกฤต/เร่งด่วน (High)"
        : inc.severity === "medium"
        ? "ปานกลาง (Medium)"
        : "ทั่วไป (Low)"
    ),
    escapeCSV(inc.title),
    escapeCSV(inc.reporterName),
    escapeCSV(formatThaiDateTime(inc.timestamp)),
    escapeCSV(
      inc.status === "resolved"
        ? "คลี่คลายแล้ว"
        : inc.status === "investigating"
        ? "กำลังตรวจสอบ"
        : "รอดำเนินการ"
    ),
    escapeCSV(inc.imageUrl || "-"),
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((r) => r.join(",")),
  ].join("\r\n");

  return "\uFEFF" + csvContent;
}

/**
 * สร้าง Manifest สรุปแพ็กเกจสำรองข้อมูล
 */
export function createArchiveManifest(params: {
  fiscalYear: string;
  patrolLogsCount: number;
  parkingScansCount: number;
  incidentsCount: number;
  archivedAt: string;
  operator: string;
  source: string;
}) {
  return {
    system: "Smart Hospital Security & Patrol System",
    organization: "โรงพยาบาลพล (PHON HOSPITAL)",
    fiscalYear: params.fiscalYear,
    archivedAt: params.archivedAt,
    operator: params.operator,
    source: params.source,
    summary: {
      patrolLogs: params.patrolLogsCount,
      parkingScans: params.parkingScansCount,
      incidents: params.incidentsCount,
      totalRecords: params.patrolLogsCount + params.parkingScansCount + params.incidentsCount,
    },
    version: "1.0",
  };
}
