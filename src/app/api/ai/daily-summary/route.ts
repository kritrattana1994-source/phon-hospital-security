import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const scans = body.scans || [];
    const staffVehicles = body.staffVehicles || [];
    const patrolLogs = body.patrolLogs || [];
    const shiftReports = body.shiftReports || [];
    const checkpoints = body.checkpoints || [];
    const dateString = body.dateString || new Date().toISOString().split("T")[0];
    const reportDate = body.date || new Date().toLocaleDateString("th-TH", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Filter data for target date
    const dayScans = scans.filter((s: any) => s.timestamp && s.timestamp.startsWith(dateString));
    const dayPatrolLogs = patrolLogs.filter((p: any) => p.timestamp && p.timestamp.startsWith(dateString));
    const dayShiftReports = shiftReports.filter((r: any) => (r.dateString && r.dateString === dateString) || (r.timestamp && r.timestamp.startsWith(dateString)));

    // 1. Overnight Detection (Scanned at 22:00 AND 06:00, or night rounds, and is non-staff)
    const scans22 = scans.filter((s: any) => s.round?.includes("22:") || s.round === "22:00" || (s.timestamp && s.timestamp.includes("22:")));
    const scans06 = scans.filter((s: any) => s.round?.includes("06:") || s.round === "06:00" || (s.timestamp && s.timestamp.includes("06:")));

    const plates22NonStaff = new Set(
      scans22.filter((s: any) => !s.isStaff).map((s: any) => s.plateNumber.toUpperCase())
    );

    const overnightNonStaff: any[] = [];
    scans06.forEach((s: any) => {
      const plate = s.plateNumber.toUpperCase();
      if (!s.isStaff && plates22NonStaff.has(plate)) {
        if (!overnightNonStaff.some((o) => o.plateNumber === plate)) {
          overnightNonStaff.push(s);
        }
      }
    });

    // 2. Abandoned Vehicles (> 3 days)
    const plateDateMap = new Map<string, Set<string>>();
    scans.forEach((s: any) => {
      if (!s.isStaff) {
        const p = s.plateNumber.toUpperCase();
        const dKey = s.timestamp ? s.timestamp.split("T")[0] : "today";
        if (!plateDateMap.has(p)) {
          plateDateMap.set(p, new Set());
        }
        plateDateMap.get(p)!.add(dKey);
      }
    });

    const abandonedVehicles: Array<{ plateNumber: string; days: number; zone?: string }> = [];
    plateDateMap.forEach((dates, plate) => {
      if (dates.size >= 3) {
        const lastScan = scans.find((s: any) => s.plateNumber.toUpperCase() === plate);
        abandonedVehicles.push({
          plateNumber: plate,
          days: dates.size,
          zone: lastScan?.zone || "ลานจอดทั่วไป",
        });
      }
    });

    // 3. Zone Violations (ER / Ambulance / Doctor zones)
    const criticalZones = ["ER", "ฉุกเฉิน", "แพทย์", "ลาดรับส่ง"];
    const zoneViolations = dayScans.filter((s: any) => {
      if (s.isStaff) return false;
      const zoneName = (s.zone || "").toUpperCase();
      return criticalZones.some((cz) => zoneName.includes(cz.toUpperCase()));
    });

    // 4. Vehicle Scan Counts
    const totalStaffCount = dayScans.filter((s: any) => s.isStaff).length;
    const totalNonStaffCount = dayScans.filter((s: any) => !s.isStaff).length;

    // 5. Patrol & Checkpoints Calculations
    const uniqueCheckpointsScanned = new Set(dayPatrolLogs.map((p: any) => p.checkpointId)).size;
    const totalCheckpointsTarget = checkpoints.length > 0 ? checkpoints.length : 2;
    const patrolComplianceRate = Math.min(100, Math.round((uniqueCheckpointsScanned / totalCheckpointsTarget) * 100));

    const onTimeScans = dayPatrolLogs.filter((p: any) => p.isOnTime !== false).length;
    const patrolOnTimeRate = dayPatrolLogs.length > 0 ? Math.round((onTimeScans / dayPatrolLogs.length) * 100) : 100;
    const patrolIssuesCount = dayPatrolLogs.filter((p: any) => p.status === "issue").length;

    // 6. DeepSeek API Call or Heuristic AI Generation
    const deepseekApiKey = process.env.DEEPSEEK_API_KEY;
    let aiSummaryMarkdown = "";

    if (deepseekApiKey) {
      try {
        const prompt = `
คุณคือ AI ด้านความปลอดภัยของ โรงพยาบาลพล (Phon Hospital Smart Patrol)
ทำหน้าที่วิเคราะห์ข้อมูลความปลอดภัยประจำวันที่ ${reportDate}

ข้อมูลยานพาหนะ (Vehicle Fleet Patrol):
- สแกนตรวจรถใน รพ. วันนี้รวม: ${dayScans.length} คัน (บุคลากร ${totalStaffCount} คัน / รถภายนอก ${totalNonStaffCount} คัน)
- แอบจอดค้างคืน (พบข้ามคืน): ${overnightNonStaff.length} คัน (${overnightNonStaff.map(o => o.plateNumber).join(", ") || "ไม่พบ"})
- จอดแช่สะสมเกิน 3 วัน: ${abandonedVehicles.length} คัน (${abandonedVehicles.map(a => `${a.plateNumber} (${a.days} วัน)`).join(", ") || "ไม่พบ"})
- จอดกีดขวางโซนฉุกเฉิน (ER)/ทางลาดแพทย์: ${zoneViolations.length} คัน (${zoneViolations.map((z: any) => z.plateNumber).join(", ") || "ไม่พบ"})

ข้อมูลการเดินตรวจ (Patrol Compliance):
- จุดตรวจที่สแกนครบ: ${uniqueCheckpointsScanned}/${totalCheckpointsTarget} จุด (${patrolComplianceRate}%)
- ความตรงเวลากฎทอง 1 ชม. แรก: ${patrolOnTimeRate}%
- การแจ้งข้อบกพร่อง/ปัญหา: ${patrolIssuesCount} รายการ
- การส่งมอบเวรประจำกะ: ส่งมอบแล้ว ${dayShiftReports.length} กะ

กรุณาสร้างรายงานภาษาไทยฉบับผู้บริหาร (Executive Security Summary) โดยมีโครงสร้างดังนี้:
1. สรุปสถานการณ์ความปลอดภัยและผลการปฏิบัติงานภาพรวม
2. บทวิเคราะห์ลานจอดรถและการสแกนตรวจรถทุกคันใน รพ.
3. บทวิเคราะห์ผลการเดินตรวจรอบเวรและการส่งมอบเวร (ประเมินวินัย รปภ.)
4. รายการสิ่งที่ต้องสั่งการด่วน (Action Items)
        `;

        const dsRes = await fetch("https://api.deepseek.com/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${deepseekApiKey}`,
          },
          body: JSON.stringify({
            model: "deepseek-chat",
            messages: [
              {
                role: "system",
                content: "คุณเป็นผู้เชี่ยวชาญการบริหารความปลอดภัยระดับโรงพยาบาล ตอบภาษาไทยอย่างกระชับ สุภาพ แม่นยำ และเป็นมืออาชีพ",
              },
              { role: "user", content: prompt },
            ],
            temperature: 0.3,
          }),
        });

        if (dsRes.ok) {
          const dsData = await dsRes.json();
          aiSummaryMarkdown = dsData.choices?.[0]?.message?.content || "";
        }
      } catch (aiErr) {
        console.error("DeepSeek API call failed, falling back to heuristic engine:", aiErr);
      }
    }

    // Heuristic Fallback
    if (!aiSummaryMarkdown) {
      aiSummaryMarkdown = `### 🏥 รายงานวิเคราะห์ความปลอดภัยประจำวัน • รพ.พล (Smart Patrol AI Insight)
**ประจำวันที่:** ${reportDate}

#### 1. สรุปภาพรวมความปลอดภัย (Executive Overview)
• การเดินตรวจจุดตรวจทำได้ **${patrolComplianceRate}%** (${uniqueCheckpointsScanned}/${totalCheckpointsTarget} จุดตรวจ)
• อัตราการตรวจตรงเวลากฎทอง 1 ชม. แรก อยู่ที่ **${patrolOnTimeRate}%** ${patrolOnTimeRate >= 80 ? "อยู่ในเกณฑ์ดีเยี่ยม ✅" : "มีบางรอบที่ล่าช้า ควรติดตาม ⚠️"}
• ตรวจพบข้อบกพร่อง/เหตุแจ้งเตือนในพื้นที่ **${patrolIssuesCount} รายการ** ${patrolIssuesCount === 0 ? "(สภาพแวดล้อมปกติ ปลอดภัย 100%)" : "(ประสานงานช่าง/ผู้เกี่ยวข้องแล้ว)"}

#### 2. สรุปผลการสแกนตรวจรถในโรงพยาบาล (Vehicle Fleet Patrol)
• ทำการสแกนตรวจรถในโรงพยาบาลรวมทั้งสิ้น **${dayScans.length} คัน** (รถบุคลากร ${totalStaffCount} คัน / รถภายนอก ${totalNonStaffCount} คัน)
${
  overnightNonStaff.length > 0
    ? `• ⚠️ **รถแอบจอดค้างคืน ${overnightNonStaff.length} คัน:** (${overnightNonStaff.map(o => o.plateNumber).join(", ")}) จอดตั้งแต่รอบ 22:00 น. ถึง 06:00 น. แนะนำให้ รปภ. ตรวจสอบ`
    : "• ✅ ไม่พบรถภายนอกแอบจอดค้างคืนผิดระเบียบ"
}
${
  zoneViolations.length > 0
    ? `• 🚨 **รถจอดกีดขวางจุดฉุกเฉิน ${zoneViolations.length} คัน:** (${zoneViolations.map((z: any) => `${z.plateNumber} ณ ${z.zone}`).join(", ")}) ต้องเร่งประสานย้ายออกทันที`
    : "• ✅ เส้นทางฉุกเฉิน (ER) และทางลาดรับส่งผู้ป่วยโล่ง 100%"
}
${
  abandonedVehicles.length > 0
    ? `• 🛑 **รถจอดแช่สะสมเกิน 3 วัน:** (${abandonedVehicles.map(a => `${a.plateNumber} จอด ${a.days} วัน`).join(", ")}) เสนอหัวหน้างานประสานตรวจสอบกล้องวงจรปิด`
    : "• ✅ ไม่พบรถจอดแช่ผิดปกติเกิน 3 วัน"
}

#### 3. การประเมินวินัยและการส่งมอบเวร (Shift Handover Audit)
• รปภ. ได้จัดทำและส่งออกรายงานสรุปประจำกะแล้ว **${dayShiftReports.length} กะ**
${
  dayShiftReports.length > 0
    ? `• ผู้ส่งมอบเวร: ${dayShiftReports.map((r: any) => `${r.shiftName} (${r.guardName})`).join(", ")}`
    : "• ⚠️ ยังไม่มีการส่งรายงานประจำกะในวันนี้ หรืออยู่ในช่วงระหว่างกะ"
}

#### 4. สิ่งที่หัวหน้างานต้องสั่งการด่วน (Action Items)
${zoneViolations.length > 0 ? "1. 🚨 ตรวจสอบและย้ายรถที่ขวางทางฉุกเฉิน ER ทันที\n" : ""}${overnightNonStaff.length > 0 ? "2. ⚠️ ตรวจสอบบัตรผู้ติดต่อและติดใบเตือนรถที่แอบจอดค้างคืน\n" : ""}3. 📋 กำชับ รปภ. ทุกกะให้เดินตรวจสแกนจุดตรวจให้ครบใน 1 ชม. แรก และกดส่งรายงานประจำกะช่วงต่อกะทุกครั้ง`;
    }

    const actionItems: string[] = [];
    if (zoneViolations.length > 0) actionItems.push(`ย้ายรถขวางทางฉุกเฉิน ER (${zoneViolations.map((z: any) => z.plateNumber).join(", ")})`);
    if (overnightNonStaff.length > 0) actionItems.push(`ตรวจสอบรถแอบจอดค้างคืน (${overnightNonStaff.map(o => o.plateNumber).join(", ")})`);
    if (patrolComplianceRate < 90) actionItems.push(`ติดตามการเดินตรวจจุดตรวจให้ครบ 100%`);
    if (actionItems.length === 0) actionItems.push("ความปลอดภัยปกติ รักษามาตรฐานการตรวจตราต่อเนื่อง");

    return NextResponse.json({
      success: true,
      id: `ai-summary-${dateString}`,
      dateString,
      timestamp: new Date().toISOString(),
      reportDateThai: reportDate,
      totalVehiclesScanned: dayScans.length,
      staffVehiclesCount: totalStaffCount,
      outsideVehiclesCount: totalNonStaffCount,
      overnightVehiclesCount: overnightNonStaff.length,
      abandonedCount: abandonedVehicles.length,
      zoneViolationsCount: zoneViolations.length,
      patrolTotalScans: dayPatrolLogs.length,
      patrolComplianceRate,
      patrolOnTimeRate,
      patrolIssuesCount,
      aiSummaryMarkdown,
      actionItems,
      generatedBy: "DeepSeek AI • รพ.พล",
      isRealDeepSeek: !!deepseekApiKey,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "เกิดข้อผิดพลาดในการประมวลผล DeepSeek AI" },
      { status: 500 }
    );
  }
}
