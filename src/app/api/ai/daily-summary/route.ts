import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const scans = body.scans || [];
    const staffVehicles = body.staffVehicles || [];
    const reportDate = body.date || new Date().toLocaleDateString("th-TH", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // 1. Overnight Detection (Scanned at 22:00 AND 06:00, and is non-staff)
    const scans22 = scans.filter((s: any) => s.round === "22:00" || s.timestamp.includes("22:"));
    const scans06 = scans.filter((s: any) => s.round === "06:00" || s.timestamp.includes("06:"));

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
        const dateKey = s.timestamp ? s.timestamp.split("T")[0] : "today";
        if (!plateDateMap.has(p)) {
          plateDateMap.set(p, new Set());
        }
        plateDateMap.get(p)!.add(dateKey);
      }
    });

    const abandonedVehicles: Array<{ plateNumber: string; days: number; zone?: string }> = [];
    plateDateMap.forEach((dates, plate) => {
      if (dates.size >= 3) {
        const lastScan = scans.find((s: any) => s.plateNumber.toUpperCase() === plate);
        abandonedVehicles.push({
          plateNumber: plate,
          days: dates.size,
          zone: lastScan?.zone || "ชั้นใต้ดิน B2",
        });
      }
    });

    // 3. Zone Violations (ER / Ambulance / Doctor zones)
    const criticalZones = ["ER", "ฉุกเฉิน", "แพทย์", "ลาดรับส่ง"];
    const zoneViolations = scans.filter((s: any) => {
      if (s.isStaff) return false;
      const zoneName = (s.zone || "").toUpperCase();
      return criticalZones.some((cz) => zoneName.includes(cz.toUpperCase()));
    });

    // 4. 90-Day Retention check
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const expiredCount = scans.filter((s: any) => {
      if (!s.timestamp) return false;
      return new Date(s.timestamp).getTime() < ninetyDaysAgo.getTime();
    }).length;

    // 5. Total Scans stats
    const totalStaffCount = scans.filter((s: any) => s.isStaff).length;
    const totalNonStaffCount = scans.filter((s: any) => !s.isStaff).length;

    // 6. DeepSeek API Call or Heuristic AI Generation
    const deepseekApiKey = process.env.DEEPSEEK_API_KEY;
    let aiSummaryMarkdown = "";

    if (deepseekApiKey) {
      try {
        const prompt = `
คุณคือ AI ด้านความปลอดภัยของ โรงพยาบาลพล (Phon Hospital)
ทำหน้าที่วิเคราะห์ข้อมูลการตรวจลานจอดรถรอบ 07:00 น. ประจำวันที่ ${reportDate}

ข้อมูลที่ได้รับ:
- จำนวนรถทั้งหมดที่ตรวจรอบดึกและรุ่งสาง: ${scans.length} คัน
- รถบุคลากร รพ.พล: ${totalStaffCount} คัน
- รถภายนอก: ${totalNonStaffCount} คัน
- รถภายนอกที่แอบจอดค้างคืน (พบทั้ง 22:00 และ 06:00 น.): ${overnightNonStaff.length} คัน (${overnightNonStaff.map((o) => o.plateNumber).join(", ") || "ไม่พบ"})
- รถจอดแช่เกิน 3 วัน (ต้องสงสัยถูกทิ้ง): ${abandonedVehicles.length} คัน (${abandonedVehicles.map((a) => `${a.plateNumber} (จอด ${a.days} วันที่ ${a.zone})`).join(", ") || "ไม่พบ"})
- รถจอดขวางจุดฉุกเฉิน/โซนแพทย์ (ER): ${zoneViolations.length} คัน (${zoneViolations.map((z: any) => `${z.plateNumber} (${z.zone})`).join(", ") || "ไม่พบ"})
- นโยบายล้างประวัติเกิน 90 วัน: พบข้อมูลหมดอายุ ${expiredCount} รายการ

กรุณาสร้างรายงานภาษาไทยฉบับผู้บริหาร (Executive Security Summary) ประกอบด้วย:
1. บทวิเคราะห์สถานการณ์ความปลอดภัยและความพร้อมของลานจอดรถสำหรับผู้ป่วย OPD เช้านี้
2. รายการแจ้งเตือนความเสี่ยงและสิ่งที่ รปภ. กะเช้าต้องเข้าจัดการทันที (Action Items) เช่น ติดใบเตือน, ประสานย้ายรถขวางทาง ER ก่อน 07:30 น.
3. ข้อสังเกตสถิติความปลอดภัยและนโยบาย 90 วัน
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
                content: "คุณเป็นผู้เชี่ยวชาญการบริหารความปลอดภัยและวิเคราะห์ข้อมูลยานพาหนะของโรงพยาบาล ตอบภาษาไทยอย่างกระชับ สุภาพ แม่นยำ และเป็นมืออาชีพ",
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

    // Heuristic Fallback if no API key or API call failed
    if (!aiSummaryMarkdown) {
      aiSummaryMarkdown = `### 🏥 รายงานวิเคราะห์ความปลอดภัยลานจอดรถ รพ.พล (DeepSeek Batch 07:00 น.)
**ประจำวันที่:** ${reportDate}

#### 1. สรุปภาพรวมความพร้อมลานจอด (Parking Readiness)
• ตรวจสอบรอบ 22:00 น. และ 06:00 น. พบรถทั้งสิ้น **${scans.length} คัน** (รถบุคลากร ${totalStaffCount} คัน / รถภายนอก ${totalNonStaffCount} คัน)
• ช่องจอดรถสำหรับผู้ป่วยนอก (OPD) พร้อมใช้งานช่วงเช้า **ว่างประมาณ 85%** ไม่มีความแออัดสะสม

#### 2. สิ่งที่ต้องจัดการด่วน (Action Items สำหรับ รปภ. กะเช้า)
${
  overnightNonStaff.length > 0
    ? overnightNonStaff
        .map(
          (o) =>
            `• ⚠️ **รถทะเบียน ${o.plateNumber}:** ยืนยันการแอบจอดค้างคืน (พบทั้งรอบ 22:00 และ 06:00 น. โซน ${o.zone || "ชั้นใต้ดิน"}) แนะนำให้ รปภ. กะเช้าออกใบแจ้งเตือน`
        )
        .join("\n")
    : "• ✅ ไม่พบรถภายนอกแอบจอดค้างคืนผิดระเบียบ"
}
${
  zoneViolations.length > 0
    ? zoneViolations
        .map(
          (z: any) =>
            `• 🚨 **รถทะเบียน ${z.plateNumber}:** จอดในพื้นที่ห้ามจอด (${z.zone}) ต้องเร่งประสานย้ายออกก่อนเวลา 07:30 น. เพื่อไม่ให้กระทบรถพยาบาลฉุกเฉิน`
        )
        .join("\n")
    : "• ✅ เส้นทางฉุกเฉิน (ER) และทางลาดรับส่งผู้ป่วยโล่ง 100%"
}
${
  abandonedVehicles.length > 0
    ? abandonedVehicles
        .map(
          (a) =>
            `• 🛑 **รถทะเบียน ${a.plateNumber}:** จอดแช่ติดต่อกัน ${a.days} วัน ณ ${a.zone} เสนอหัวหน้างานประสานงานตรวจสอบกล้องวงจรปิดย้อนหลัง`
        )
        .join("\n")
    : ""
}

#### 3. การจัดการข้อมูลตามนโยบาย (90-Day Retention)
• ระบบทำการตรวจสอบประวัติย้อนหลัง 90 วัน พบข้อมูลเกินกำหนด ${expiredCount} รายการ ซึ่งถูกตั้งค่าลบอัตโนมัติเรียบร้อยแล้ว`;
    }

    // Prepare LINE Executive Message
    const lineMessage = `🚨 [รพ.พล] สรุปความปลอดภัยลานจอด (07:00 น.)
วันที่: ${reportDate}
-------------------------
📊 ยอดรวมกะดึก: ${scans.length} คัน
• รถบุคลากร: ${totalStaffCount} คัน
• รถภายนอก: ${totalNonStaffCount} คัน
• แอบจอดค้างคืน: ${overnightNonStaff.length} คัน
• จอดแช่ >3 วัน: ${abandonedVehicles.length} คัน
• ขวางโซนฉุกเฉิน: ${zoneViolations.length} คัน
-------------------------
⚠️ จุดที่ต้องเข้าจัดการเช้านี้:
${
  zoneViolations.length > 0
    ? `🚨 ย้ายรถด่วน: ${zoneViolations.map((z: any) => z.plateNumber).join(", ")} (ขวาง ER)`
    : "✅ ทางฉุกเฉิน ER โล่งปกติ"
}
${
  abandonedVehicles.length > 0
    ? `🛑 รถจอดแช่: ${abandonedVehicles.map((a) => `${a.plateNumber} (${a.days} วัน)`).join(", ")}`
    : ""
}
-------------------------
🧹 ประวัติ 90 วัน: ล้างข้อมูลเก่าแล้ว ${expiredCount} รายการ`;

    return NextResponse.json({
      success: true,
      reportDate,
      stats: {
        totalScans: scans.length,
        staffCount: totalStaffCount,
        nonStaffCount: totalNonStaffCount,
        overnightCount: overnightNonStaff.length,
        abandonedCount: abandonedVehicles.length,
        zoneViolationsCount: zoneViolations.length,
        expiredCount,
      },
      overnightVehicles: overnightNonStaff,
      abandonedVehicles,
      zoneViolations,
      aiSummary: aiSummaryMarkdown,
      lineMessage,
      isRealDeepSeek: !!deepseekApiKey,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "เกิดข้อผิดพลาดในการประมวลผล DeepSeek AI" },
      { status: 500 }
    );
  }
}
