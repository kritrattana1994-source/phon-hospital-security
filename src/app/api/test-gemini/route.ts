import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let apiKey = (body.apiKey || "").trim();

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "กรุณาระบุ Gemini API Key ก่อนกดทดสอบ" },
        { status: 400 }
      );
    }

    // Clean quotes or accidentally wrapped characters
    apiKey = apiKey.replace(/[`"'=]/g, "").trim();

    // Check if user accidentally pasted a URL
    if (apiKey.startsWith("http://") || apiKey.startsWith("https://") || apiKey.includes("/")) {
      return NextResponse.json(
        {
          success: false,
          error: "สิ่งที่ท่านนำมาวางคือ URL ครับ (ไม่ใช่ API Key) กรุณาวางรหัสที่คัดลอกจาก Google AI Studio (เช่นขึ้นต้นด้วย 'AQ.' หรือ 'AIzaSy')",
        },
        { status: 400 }
      );
    }

    if (apiKey.length < 20) {
      return NextResponse.json(
        {
          success: false,
          error: "API Key สั้นเกินไป กรุณาตรวจสอบการคัดลอกจาก Google AI Studio (aistudio.google.com) อีกครั้งครับ",
        },
        { status: 400 }
      );
    }

    // Test calling Gemini Flash (candidate models)
    const candidateModels = ["gemini-flash-latest", "gemini-2.5-flash", "gemini-3.8-flash", "gemini-3.5-flash-lite", "gemini-1.5-flash"];
    let lastErrorMsg = "";
    let lastStatus = 0;

    for (const model of candidateModels) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 9000);

      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: "Hello! Reply with OK only." }],
              },
            ],
            generationConfig: {
              maxOutputTokens: 100,
            },
          }),
          signal: controller.signal,
        });

        clearTimeout(timer);

        if (res.ok) {
          const data = await res.json();
          const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
          return NextResponse.json({
            success: true,
            model,
            message: `✅ เชื่อมต่อ Google Gemini (${model}) สำเร็จ 100%! พร้อมใช้งานสแกนป้ายทะเบียนรถยนต์และมอเตอร์ไซค์`,
            reply,
          });
        }

        lastStatus = res.status;
        const errJson = await res.json().catch(() => ({}));
        lastErrorMsg = errJson?.error?.message || `HTTP ${res.status}`;
        console.warn(`Test Gemini (${model}) warning:`, res.status, lastErrorMsg);
      } catch (e: any) {
        clearTimeout(timer);
        lastErrorMsg = e?.message || String(e);
      }
    }

    if (lastStatus === 400) {
      return NextResponse.json({
        success: false,
        error: `❌ API Key ไม่ถูกต้อง (รหัสไม่ตรงกับที่ Google บันทึกไว้) กรุณากดสร้างหรือคัดลอกคีย์ใหม่อีกครั้ง`,
        detail: lastErrorMsg,
      });
    }

    if (lastStatus === 403) {
      return NextResponse.json({
        success: false,
        error: `❌ สิทธิ์การใช้งานถูกปฏิเสธ (HTTP 403): ตรวจสอบว่าโปรเจกต์เปิดสิทธิ์ Generative Language API แล้วหรือไม่`,
        detail: lastErrorMsg,
      });
    }

    return NextResponse.json({
      success: false,
      error: `❌ เชื่อมต่อล้มเหลว (HTTP ${lastStatus || 500}): ${lastErrorMsg || "ไม่สามารถติดต่อ Google Gemini ได้"}`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: `เกิดข้อผิดพลาดในการเชื่อมต่อ: ${error?.message || error}` },
      { status: 500 }
    );
  }
}
