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
          error: "สิ่งที่ท่านนำมาวางคือ URL ครับ (ไม่ใช่ API Key) กรุณาวางรหัสที่ขึ้นต้นด้วย 'AIzaSy' จาก Google AI Studio",
        },
        { status: 400 }
      );
    }

    if (!apiKey.startsWith("AIzaSy")) {
      return NextResponse.json(
        {
          success: false,
          error: "API Key ของ Google AI Studio จะต้องขึ้นต้นด้วย 'AIzaSy' เสมอครับ กรุณาตรวจสอบการคัดลอกอีกครั้ง",
        },
        { status: 400 }
      );
    }

    // Test calling Gemini 1.5 Flash
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 9000);

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
          maxOutputTokens: 10,
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
        message: "✅ เชื่อมต่อ Gemini 1.5 Flash API สำเร็จ 100%! พร้อมใช้งานสแกนป้ายทะเบียนรถยนต์และมอเตอร์ไซค์",
        reply,
      });
    }

    const errJson = await res.json().catch(() => ({}));
    const errMsg = errJson?.error?.message || `HTTP ${res.status}`;
    const errStatus = errJson?.error?.status || "";

    if (res.status === 400 || errStatus === "INVALID_ARGUMENT") {
      return NextResponse.json({
        success: false,
        error: `❌ API Key ไม่ถูกต้อง (รหัสไม่ตรงกับที่ Google บันทึกไว้) กรุณากดสร้างหรือคัดลอกคีย์ใหม่อีกครั้ง`,
        detail: errMsg,
      });
    }

    if (res.status === 403 || errStatus === "PERMISSION_DENIED") {
      return NextResponse.json({
        success: false,
        error: `❌ สิทธิ์การใช้งานถูกปฏิเสธ (HTTP 403): ตรวจสอบว่าโปรเจกต์เปิดสิทธิ์ Generative Language API แล้วหรือไม่`,
        detail: errMsg,
      });
    }

    return NextResponse.json({
      success: false,
      error: `❌ เชื่อมต่อล้มเหลว (HTTP ${res.status}): ${errMsg}`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: `เกิดข้อผิดพลาดในการเชื่อมต่อ: ${error?.message || error}` },
      { status: 500 }
    );
  }
}
