import { Checkpoint, PatrolLog, Guard } from "./store";

export interface PatrolRound {
  id: string;               // e.g. "R01", "R02", ...
  name: string;             // e.g. "รอบที่ 1"
  startTime: string;        // "08:00"
  endTime: string;          // "11:00"
  deadlineTime: string;     // "09:00" (1 ชม. แรกตามกฎทอง)
  period: "day" | "night";  // "day" (12 ชม. 08:00-20:00) | "night" (12 ชม. 20:00-08:00)
  shift: "morning" | "afternoon" | "night"; // 3 กะ รพ.พล
  frequencyHours: number;   // 3 หรือ 2
  isActive: boolean;
}

export interface ShiftReportLog {
  id: string;
  shiftId: "morning" | "afternoon" | "night";
  shiftName: string;
  guardId: string;
  guardName: string;
  timestamp: string;
  dateString: string;
  roundsCount: number;
  completedPoints: number;
  totalPoints: number;
  complianceRate: number;
  onTimeRate: number;
  issuesCount: number;
  status: "on_time" | "late";
  note?: string;
  exportedImageUrl?: string;
}

/**
 * 10 รอบตรวจมาตรฐานของ รพ.พล:
 * - กลางวัน 08:00 - 20:00 น. ตรวจทุก 3 ชั่วโมง (4 รอบ)
 * - กลางคืน 20:00 - 08:00 น. ตรวจทุก 2 ชั่วโมง (6 รอบ)
 * - กฎทอง 1 ชม. แรก: ต้องเดินตรวจให้เสร็จภายใน 1 ชม. หลังเวลาเริ่มรอบ
 */
export const defaultPatrolRounds: PatrolRound[] = [
  // ☀️ กะเช้า (08:00 - 16:00 น.)
  {
    id: "R01",
    name: "รอบที่ 1 (08:00 - 11:00)",
    startTime: "08:00",
    endTime: "11:00",
    deadlineTime: "09:00",
    period: "day",
    shift: "morning",
    frequencyHours: 3,
    isActive: true,
  },
  {
    id: "R02",
    name: "รอบที่ 2 (11:00 - 14:00)",
    startTime: "11:00",
    endTime: "14:00",
    deadlineTime: "12:00",
    period: "day",
    shift: "morning",
    frequencyHours: 3,
    isActive: true,
  },
  {
    id: "R03",
    name: "รอบที่ 3 (14:00 - 17:00)",
    startTime: "14:00",
    endTime: "17:00",
    deadlineTime: "15:00",
    period: "day",
    shift: "morning",
    frequencyHours: 3,
    isActive: true,
  },

  // ⛅ กะบ่าย (16:00 - 24:00 น.)
  {
    id: "R04",
    name: "รอบที่ 4 (17:00 - 20:00)",
    startTime: "17:00",
    endTime: "20:00",
    deadlineTime: "18:00",
    period: "day",
    shift: "afternoon",
    frequencyHours: 3,
    isActive: true,
  },
  {
    id: "R05",
    name: "รอบที่ 5 (20:00 - 22:00)",
    startTime: "20:00",
    endTime: "22:00",
    deadlineTime: "21:00",
    period: "night",
    shift: "afternoon",
    frequencyHours: 2,
    isActive: true,
  },
  {
    id: "R06",
    name: "รอบที่ 6 (22:00 - 24:00)",
    startTime: "22:00",
    endTime: "24:00",
    deadlineTime: "23:00",
    period: "night",
    shift: "afternoon",
    frequencyHours: 2,
    isActive: true,
  },

  // 🌙 กะดึก (24:00 - 08:00 น.)
  {
    id: "R07",
    name: "รอบที่ 7 (00:00 - 02:00)",
    startTime: "00:00",
    endTime: "02:00",
    deadlineTime: "01:00",
    period: "night",
    shift: "night",
    frequencyHours: 2,
    isActive: true,
  },
  {
    id: "R08",
    name: "รอบที่ 8 (02:00 - 04:00)",
    startTime: "02:00",
    endTime: "04:00",
    deadlineTime: "03:00",
    period: "night",
    shift: "night",
    frequencyHours: 2,
    isActive: true,
  },
  {
    id: "R09",
    name: "รอบที่ 9 (04:00 - 06:00)",
    startTime: "04:00",
    endTime: "06:00",
    deadlineTime: "05:00",
    period: "night",
    shift: "night",
    frequencyHours: 2,
    isActive: true,
  },
  {
    id: "R10",
    name: "รอบที่ 10 (06:00 - 08:00)",
    startTime: "06:00",
    endTime: "08:00",
    deadlineTime: "07:00",
    period: "night",
    shift: "night",
    frequencyHours: 2,
    isActive: true,
  },
];

export const hospitalShifts = [
  { id: "morning" as const, name: "กะเช้า", timeRange: "08:00 - 16:00 น.", handoverTime: "16:00" },
  { id: "afternoon" as const, name: "กะบ่าย", timeRange: "16:00 - 24:00 น.", handoverTime: "24:00" },
  { id: "night" as const, name: "กะดึก", timeRange: "24:00 - 08:00 น.", handoverTime: "08:00" },
];

/**
 * คำนวณระยะห่างระหว่าง 2 พิกัดพิกัดละติจูด/ลองจิจูด (Haversine Formula) เป็นหน่วยเมตร
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in metres
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

/**
 * แปลงเวลา "HH:MM" เป็นนาทีนับจาก 00:00 (0-1440)
 */
function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  if (timeStr === "24:00") return 1440;
  const [h, m] = timeStr.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

/**
 * คำนวณหารอบตรวจปัจจุบันจากเวลาจริง
 */
export function getCurrentRound(
  rounds: PatrolRound[] = defaultPatrolRounds,
  now: Date = new Date()
): PatrolRound {
  const activeRounds = rounds.filter((r) => r.isActive);
  if (activeRounds.length === 0) return defaultPatrolRounds[0];

  const currentHours = now.getHours();
  const currentMinutes = now.getMinutes();
  const currentTotalMinutes = currentHours * 60 + currentMinutes;

  for (const round of activeRounds) {
    const startMin = timeToMinutes(round.startTime);
    const endMin = timeToMinutes(round.endTime);

    if (startMin < endMin) {
      if (currentTotalMinutes >= startMin && currentTotalMinutes < endMin) {
        return round;
      }
    } else {
      // ข้ามเที่ยงคืน เช่น 22:00 - 02:00
      if (currentTotalMinutes >= startMin || currentTotalMinutes < endMin) {
        return round;
      }
    }
  }

  // Fallback: หากเลย 24:00 น. หรือช่วงคาบเกี่ยว คืนค่ารอบแรกหรือรอบที่ใกล้ที่สุด
  return activeRounds[0];
}

/**
 * คำนวณหากะปัจจุบันของ รพ.พล (กะเช้า 08:00-16:00, กะบ่าย 16:00-24:00, กะดึก 24:00-08:00)
 */
export function getCurrentShift(now: Date = new Date()): {
  id: "morning" | "afternoon" | "night";
  name: string;
  timeRange: string;
} {
  const hours = now.getHours();
  if (hours >= 8 && hours < 16) {
    return hospitalShifts[0]; // morning
  } else if (hours >= 16 && hours < 24) {
    return hospitalShifts[1]; // afternoon
  } else {
    return hospitalShifts[2]; // night (00:00 - 07:59)
  }
}

/**
 * ตรวจสอบว่าบันทึกการสแกนอยู่ในเส้นตาย 1 ชั่วโมงแรกของรอบหรือไม่
 */
export function isScanOnTime(timestamp: string, round: PatrolRound): boolean {
  if (!timestamp || !round) return true;
  try {
    const scanDate = new Date(timestamp);
    if (isNaN(scanDate.getTime())) return true;

    const scanTotalMin = scanDate.getHours() * 60 + scanDate.getMinutes();
    const startMin = timeToMinutes(round.startTime);
    const deadlineMin = timeToMinutes(round.deadlineTime);

    if (startMin <= deadlineMin) {
      return scanTotalMin >= startMin && scanTotalMin <= deadlineMin;
    } else {
      // ข้ามเที่ยงคืน
      return scanTotalMin >= startMin || scanTotalMin <= deadlineMin;
    }
  } catch {
    return true;
  }
}

/**
 * กรอง Logs ของรอบตรวจในวันปัจจุบัน
 */
export function getLogsForRound(
  round: PatrolRound,
  patrolLogs: PatrolLog[],
  targetDateStr: string = new Date().toISOString().split("T")[0]
): PatrolLog[] {
  return patrolLogs.filter((log) => {
    if (!log.timestamp) return false;
    const logDateStr = log.timestamp.split("T")[0];
    if (logDateStr !== targetDateStr) return false;

    // หาก Log มีการบันทึก roundId ไว้ ให้ตรวจตรง id
    if (log.roundId) {
      return log.roundId === round.id;
    }

    // กรณีไม่มี roundId (Log เก่า) คำนวณจากเวลา
    const logDate = new Date(log.timestamp);
    if (isNaN(logDate.getTime())) return false;
    const logMin = logDate.getHours() * 60 + logDate.getMinutes();
    const startMin = timeToMinutes(round.startTime);
    const endMin = timeToMinutes(round.endTime);

    if (startMin < endMin) {
      return logMin >= startMin && logMin < endMin;
    } else {
      return logMin >= startMin || logMin < endMin;
    }
  });
}

export interface RoundProgress {
  round: PatrolRound;
  completedIds: Set<string>;
  completedCount: number;
  totalCheckpoints: number;
  percent: number;
  status: "completed_ontime" | "completed_late" | "active" | "missed" | "upcoming";
  guards: string[];
  issuesCount: number;
  lastScannedTime?: string;
}

/**
 * คำนวณความคืบหน้าของรอบตรวจเฉพาะรอบนั้น
 */
export function getRoundProgress(
  round: PatrolRound,
  checkpoints: Checkpoint[],
  patrolLogs: PatrolLog[],
  now: Date = new Date()
): RoundProgress {
  const todayStr = now.toISOString().split("T")[0];
  const logsInRound = getLogsForRound(round, patrolLogs, todayStr);

  const completedIds = new Set(logsInRound.map((l) => l.checkpointId));
  const completedCount = completedIds.size;
  const total = Math.max(checkpoints.length, 1);
  const percent = Math.min(100, Math.round((completedCount / total) * 100));

  const guards = Array.from(new Set(logsInRound.map((l) => l.guardName).filter(Boolean)));
  const issuesCount = logsInRound.filter((l) => l.status === "issue").length;
  const lastScannedTime = logsInRound.length > 0 ? logsInRound[0].timestamp : undefined;

  // คำนวณสถานะของรอบ
  const currentTotalMin = now.getHours() * 60 + now.getMinutes();
  const startMin = timeToMinutes(round.startTime);
  const endMin = timeToMinutes(round.endTime);
  const deadlineMin = timeToMinutes(round.deadlineTime);

  const isCurrentActive =
    startMin < endMin
      ? currentTotalMin >= startMin && currentTotalMin < endMin
      : currentTotalMin >= startMin || currentTotalMin < endMin;

  const isPast =
    startMin < endMin
      ? currentTotalMin >= endMin
      : currentTotalMin >= endMin && currentTotalMin < startMin;

  const isUpcoming =
    startMin < endMin
      ? currentTotalMin < startMin
      : currentTotalMin < startMin && currentTotalMin >= endMin;

  let status: RoundProgress["status"] = "upcoming";

  if (completedCount >= checkpoints.length && checkpoints.length > 0) {
    // เช็คว่าตรวจทัน 1 ชม. แรกหรือไม่
    const allOnTime = logsInRound.every((l) => l.isOnTime !== false);
    status = allOnTime ? "completed_ontime" : "completed_late";
  } else if (isCurrentActive) {
    status = "active";
  } else if (isPast) {
    status = "missed";
  } else if (isUpcoming) {
    status = "upcoming";
  }

  return {
    round,
    completedIds,
    completedCount,
    totalCheckpoints: checkpoints.length,
    percent,
    status,
    guards,
    issuesCount,
    lastScannedTime,
  };
}

/**
 * คำนวณ KPI สรุปผลงานรายกะ (กะเช้า, กะบ่าย, กะดึก)
 */
export function calculateShiftKPIs(
  rounds: PatrolRound[] = defaultPatrolRounds,
  checkpoints: Checkpoint[],
  patrolLogs: PatrolLog[],
  shiftReports: ShiftReportLog[] = [],
  now: Date = new Date()
) {
  const todayStr = now.toISOString().split("T")[0];

  return hospitalShifts.map((shift) => {
    const shiftRounds = rounds.filter((r) => r.shift === shift.id && r.isActive);
    const roundProgressList = shiftRounds.map((r) =>
      getRoundProgress(r, checkpoints, patrolLogs, now)
    );

    const totalRounds = shiftRounds.length;
    const completedRounds = roundProgressList.filter(
      (p) => p.status === "completed_ontime" || p.status === "completed_late"
    ).length;
    const onTimeRounds = roundProgressList.filter((p) => p.status === "completed_ontime").length;

    const complianceRate = totalRounds > 0 ? Math.round((completedRounds / totalRounds) * 100) : 0;
    const onTimeRate = totalRounds > 0 ? Math.round((onTimeRounds / totalRounds) * 100) : 0;

    const totalIssues = roundProgressList.reduce((sum, p) => sum + p.issuesCount, 0);

    // ตรวจสอบรายงานประจำกะที่ส่งเข้ามา
    const reportForShift = shiftReports.find(
      (sr) => sr.shiftId === shift.id && sr.dateString === todayStr
    );

    return {
      shift,
      totalRounds,
      completedRounds,
      onTimeRounds,
      complianceRate,
      onTimeRate,
      totalIssues,
      roundProgressList,
      hasSubmittedReport: !!reportForShift,
      reportSubmittedBy: reportForShift?.guardName,
      reportSubmittedAt: reportForShift?.timestamp,
      reportStatus: reportForShift?.status || "pending",
    };
  });
}

/**
 * คำนวณ KPI สรุปผลงานรายบุคคลของ รปภ. (สำหรับประเมินผลงาน & ตรวจสอบว่าใครอู้)
 */
export function calculateGuardKPIs(
  guards: Guard[],
  rounds: PatrolRound[] = defaultPatrolRounds,
  checkpoints: Checkpoint[],
  patrolLogs: PatrolLog[],
  shiftReports: ShiftReportLog[] = [],
  now: Date = new Date()
) {
  const todayStr = now.toISOString().split("T")[0];
  const todayLogs = patrolLogs.filter((l) => l.timestamp?.startsWith(todayStr));

  return guards.map((guard) => {
    const guardLogs = todayLogs.filter((l) => l.guardId === guard.id || l.guardName === guard.name);
    const checkpointsScanned = guardLogs.length;

    // รอบที่มีส่วนร่วมตรวจ
    const roundsInvolved = new Set(guardLogs.map((l) => l.roundId).filter(Boolean)).size;

    // อัตราตรงเวลา
    const onTimeCount = guardLogs.filter((l) => l.isOnTime !== false).length;
    const onTimeRate = checkpointsScanned > 0 ? Math.round((onTimeCount / checkpointsScanned) * 100) : 0;

    // รูปถ่ายที่ส่ง
    const photosUploaded = guardLogs.filter((l) => !!l.imageUrl).length;

    // ปัญหาที่แจ้ง
    const issuesReported = guardLogs.filter((l) => l.status === "issue").length;

    // การส่งรายงานประจำกะ (ตรวจสอบว่าส่งมอบเวรหรือไม่)
    const reportsSent = shiftReports.filter(
      (r) => (r.guardId === guard.id || r.guardName === guard.name) && r.dateString === todayStr
    ).length;

    // คะแนนประเมินเบื้องต้น
    let ratingGrade: "A" | "B" | "C" = "B";
    let ratingText = "ผ่านเกณฑ์มาตรฐาน";
    if (checkpointsScanned >= checkpoints.length && onTimeRate >= 80 && reportsSent > 0) {
      ratingGrade = "A";
      ratingText = "ดีเยี่ยม (ตรงเวลา + ส่งงานครบ)";
    } else if (checkpointsScanned === 0 && reportsSent === 0) {
      ratingGrade = "C";
      ratingText = "ยังไม่มีบันทึกปฏิบัติการ";
    }

    return {
      guard,
      checkpointsScanned,
      roundsInvolved,
      onTimeRate,
      photosUploaded,
      issuesReported,
      reportsSent,
      ratingGrade,
      ratingText,
      lastActive: guardLogs[0]?.timestamp,
    };
  });
}
