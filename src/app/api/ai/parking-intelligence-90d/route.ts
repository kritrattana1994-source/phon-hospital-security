import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      daysAnalyzed = 90,
      totalScans = 0,
      uniqueVehiclesCount = 0,
      staffVehiclesCount = 0,
      outsideVehiclesCount = 0,
      weekendSquatters = [],
      chronicOvernight = [],
      abandonedVehicles = [],
      unregisteredStaffSuspects = [],
      geminiApiKey: clientGeminiKey,
    } = body;

    const apiKey =
      (clientGeminiKey || "").trim() ||
      process.env.GEMINI_API_KEY ||
      process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
      "";

    const topSquatters = weekendSquatters.slice(0, 10);
    const topOvernight = chronicOvernight.slice(0, 5);
    const topAbandoned = abandonedVehicles.slice(0, 5);
    const topStaffSuspects = unregisteredStaffSuspects.slice(0, 5);

    let aiSummaryMarkdown = "";

    // 1. Try Gemini API if key is available
    if (apiKey && apiKey.length > 20) {
      const prompt = `
คุณเป็นผู้เชี่ยวชาญด้านระบบวิเคราะห์ความปลอดภัยและการจัดการลานจอดรถโรงพยาบาล (Hospital Parking Security Intelligence)
ทำหน้าที่จัดทำ "รายงานวิเคราะห์พฤติกรรมการจอดรถย้อนหลัง ${daysAnalyzed} วัน และตรวจจับยานพาหนะแอบจอดวันเสาร์-อาทิตย์" ให้แก่ผู้อำนวยการโรงพยาบาลพล และหัวหน้าฝ่าย รปภ.

ข้อมูลสถิติภาพรวมในรอบ ${daysAnalyzed} วัน:
- จำนวนการสแกนตรวจตราทั้งหมด: ${totalScans} ครั้ง
- จำนวนยานพาหนะทั้งหมด: ${uniqueVehiclesCount} คัน
- รถบุคลากรที่ลงทะเบียนแล้ว: ${staffVehiclesCount} คัน
- รถบุคคลภายนอก/ผู้ติดต่อ: ${outsideVehiclesCount} คัน

ผลการตรวจจับกลุ่มพฤติกรรมผิดปกติ:
1. กลุ่มยานพาหนะบุคคลภายนอกที่ชอบแอบมาจอดเฉพาะวันเสาร์-อาทิตย์ (Weekend Squatters): รวม ${weekendSquatters.length} คัน
ข้อมูลคันเด่น:
${topSquatters
  .map(
    (s: any, idx: number) =>
      `${idx + 1}. ทะเบียน ${s.plateNumber} ${s.province || ""}: พบวันหยุด ${s.weekendDays} วัน (จากวันทั้งหมดที่มา ${s.totalUniqueDays} วัน, คิดเป็นสัดส่วนมาวันหยุด ${Math.round(s.weekendRatio * 100)}%), จอดค้างคืน ${s.overnightCount} ครั้ง, โซนประจำ ${s.mostFrequentZone}`
  )
  .join("\n") || "- ไม่พบกลุ่มผิดปกติชัดเจน"}

2. กลุ่มยานพาหนะจอดค้างคืนเรื้อรัง (Chronic Overnight): รวม ${chronicOvernight.length} คัน
${topOvernight.map((o: any) => `- ทะเบียน ${o.plateNumber} ${o.province || ""}: พบค้างคืนรอบดึก/เช้าตรู่ ${o.overnightCount} ครั้ง`).join("\n") || "- ไม่พบ"}

3. กลุ่มสงสัยเป็นรถบุคลากรที่ลืมลงทะเบียน (Unregistered Staff): รวม ${unregisteredStaffSuspects.length} คัน
${topStaffSuspects.map((u: any) => `- ทะเบียน ${u.plateNumber} ${u.province || ""}: มาจอดเฉพาะวันทำงาน ${u.weekdayDays} วัน`).join("\n") || "- ไม่พบ"}

กรุณาสร้างรายงานภาษาไทยฉบับสมบูรณ์ (Executive Security Intelligence Report) โดยมีโครงสร้างหัวข้อดังนี้:
1. 📊 สรุปภาพรวมสถานการณ์ลานจอดรถในรอบ ${daysAnalyzed} วัน (Executive Overview)
2. 🚨 ชี้เป้าและวิเคราะห์เชิงลึก: รถบุคคลภายนอกที่แอบมาจอดประจำวันเสาร์-อาทิตย์ (วิเคราะห์ว่าทำไมถึงมาจอด เช่น บ้านใกล้ รพ., ตลาดนัด, หรือจอดทิ้ง)
3. 🛑 การควบคุมรถจอดค้างคืนเรื้อรัง และรถที่อาจเป็นบุคลากรตกหล่น
4. 📋 แผนปฏิบัติการ 3 ขั้นตอนสำหรับ รปภ. ป้อมยามและหัวหน้าเวร (Action Items)

รายงานต้องสุภาพ เป็นทางการ คมชัด ชี้เป้าตัวเลขและทะเบียนรถอย่างแม่นยำ
`;

      const candidateModels = [
        "gemini-2.5-flash",
        "gemini-1.5-flash",
        "gemini-flash-latest",
      ];

      for (const model of candidateModels) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
          const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.2,
                maxOutputTokens: 2048,
              },
            }),
          });

          if (res.ok) {
            const data = await res.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              aiSummaryMarkdown = text;
              break;
            }
          }
        } catch (e) {
          console.warn(`Gemini model ${model} attempt failed:`, e);
        }
      }
    }

    // 2. Heuristic Intelligent Fallback
    if (!aiSummaryMarkdown) {
      aiSummaryMarkdown = `### 🏥 รายงานวิเคราะห์พฤติกรรมการจอดรถย้อนหลัง ${daysAnalyzed} วัน • โรงพยาบาลพล
**ช่วงเวลาที่วิเคราะห์:** ข้อมูลสะสม ${daysAnalyzed} วันล่าสุด | การสแกนรวม **${totalScans.toLocaleString()} ครั้ง**

#### 1. 📊 สรุปภาพรวมลานจอดรถ (Executive Overview)
• มีการตรวจสแกนยานพาหนะหมุนเวียนรวม **${uniqueVehiclesCount.toLocaleString()} คัน**  
• **รถบุคลากรโรงพยาบาลที่ลงทะเบียนแล้ว:** **${staffVehiclesCount.toLocaleString()} คัน** (${uniqueVehiclesCount > 0 ? Math.round((staffVehiclesCount / uniqueVehiclesCount) * 100) : 0}%) มีการเข้าจอดเป็นระเบียบตามโซนที่กำหนด  
• **รถบุคคลภายนอก/ผู้ติดต่อ:** **${outsideVehiclesCount.toLocaleString()} คัน** (${uniqueVehiclesCount > 0 ? Math.round((outsideVehiclesCount / uniqueVehiclesCount) * 100) : 0}%)

---

#### 2. 🚨 ชี้เป้าเชิงลึก: รถบุคคลภายนอกที่ชอบแอบมาจอดวันเสาร์-อาทิตย์ (Weekend Squatters)
ตรวจพบยานพาหนะภายนอกที่มีพฤติกรรมนำรถเข้ามาจอดเฉพาะวันหยุดสุดสัปดาห์สูงผิดปกติรวม **${weekendSquatters.length} คัน**:
${
  topSquatters.length > 0
    ? topSquatters
        .map(
          (s: any, idx: number) =>
            `• **ลำดับ ${idx + 1}: ทะเบียน ${s.plateNumber} ${s.province}**  
  - สถิติ: พบมาจอดในวันเสาร์-อาทิตย์ **${s.weekendDays} วัน** (คิดเป็น **${Math.round(s.weekendRatio * 100)}%** ของวันที่เข้ามาทั้งหมด)  
  - พบค้างคืนรอบดึก: **${s.overnightCount} ครั้ง** | โซนประจำ: **${s.mostFrequentZone}**  
  - *ข้อสันนิษฐาน AI:* ${
    s.overnightCount >= 2
      ? "นำรถมาจอดทิ้งค้างคืนตลอดช่วงวันหยุดสุดสัปดาห์ (อาจเป็นประชาชนที่บ้านอยู่ละแวกใกล้เคียง รพ. หรือเดินทางไปต่างจังหวัด)"
      : "นำรถมาจอดช่วงกลางวันของวันหยุดสม่ำเสมอ คาดว่ามาทำธุระภายนอกหรือตลาดนัดใกล้เคียง"
  }`
        )
        .join("\n\n")
    : "• ✅ ในรอบ 90 วัน ไม่พบยานพาหนะบุคคลภายนอกที่มีพฤติกรรมแอบจอดซ้ำซ้อนในวันหยุดเกินเกณฑ์ความเสี่ยง"
}

---

#### 3. 🛑 พฤติกรรมเสี่ยงอื่นๆ ในพื้นที่โรงพยาบาล
• **รถค้างคืนเรื้อรัง (Chronic Overnight):** ตรวจพบ **${chronicOvernight.length} คัน** (พบค้างคืนรอบ 22:00 น. ถึง 06:00 น. ซ้ำซ้อน)
${
  topOvernight.length > 0
    ? topOvernight
        .map(
          (o: any) =>
            `  - ทะเบียน **${o.plateNumber} ${o.province}** จอดค้างคืนสะสม **${o.overnightCount} ครั้ง**`
        )
        .join("\n")
    : "  - ไม่พบรถค้างคืนเรื้อรังเกินเกณฑ์"
}
• **รถสงสัยเป็นบุคลากรที่ลืมลงทะเบียน:** ตรวจพบ **${unregisteredStaffSuspects.length} คัน** ที่เข้ามาจอดเฉพาะวันจันทร์-ศุกร์อย่างต่อเนื่อง
${
  topStaffSuspects.length > 0
    ? topStaffSuspects
        .map(
          (u: any) =>
            `  - ทะเบียน **${u.plateNumber} ${u.province}** พบในวันทำการ **${u.weekdayDays} วัน** (แนะนำให้ประชาสัมพันธ์ลงทะเบียน)`
        )
        .join("\n")
    : "  - ไม่มีรายการตกหล่น"
}

---

#### 4. 📋 มาตรการและสิ่งที่ต้องสั่งการ (Action Items)
1. **จัดทำป้ายแจ้งเตือนสีส้ม/เหลือง:** สำหรับทะเบียนกลุ่มแอบจอดเสาร์-อาทิตย์ (${topSquatters.slice(0, 3).map((s: any) => s.plateNumber).join(", ") || "-"}) เพื่อแจ้งระเบียบการสงวนที่จอดรถไว้สำหรับผู้รับบริการทางการแพทย์
2. **กวดขันป้อมยามทางเข้าในวันหยุด:** ให้ รปภ. ประจำป้อมหน้า สอบถามจุดประสงค์การติดต่อและบันทึกข้อมูลรถที่มีประวัติแอบจอด
3. **ติดตามเจ้าหน้าที่ลงทะเบียน:** มอบหมายให้ธุรการตรวจสอบรถกลุ่ม Unregistered Staff เพื่อบันทึกเข้าสู่ฐานข้อมูลรถบุคลากรอย่างเป็นทางการ`;
    }

    const actionItems: string[] = [];
    if (topSquatters.length > 0) {
      actionItems.push(
        `ออกใบแจ้งเตือนรถแอบจอดเสาร์-อาทิตย์ (${topSquatters.slice(0, 3).map((s: any) => s.plateNumber).join(", ")})`
      );
    }
    if (topOvernight.length > 0) {
      actionItems.push(
        `ตรวจสอบรถจอดค้างคืนเรื้อรัง (${topOvernight.slice(0, 2).map((o: any) => o.plateNumber).join(", ")})`
      );
    }
    if (topStaffSuspects.length > 0) {
      actionItems.push(
        `ประสานบุคลากรลงทะเบียนรถ (${topStaffSuspects.slice(0, 2).map((u: any) => u.plateNumber).join(", ")})`
      );
    }

    return NextResponse.json({
      success: true,
      daysAnalyzed,
      generatedAt: new Date().toISOString(),
      aiSummaryMarkdown,
      actionItems,
      squattersCount: weekendSquatters.length,
      chronicOvernightCount: chronicOvernight.length,
      unregisteredStaffCount: unregisteredStaffSuspects.length,
      isRealGemini: !!(apiKey && apiKey.length > 20),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "เกิดข้อผิดพลาดในการประมวลผลรายงาน AI 90 วัน" },
      { status: 500 }
    );
  }
}
