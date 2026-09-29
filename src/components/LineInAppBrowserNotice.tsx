"use client";

import React, { useState, useEffect } from "react";
import { AlertTriangle, ExternalLink, Copy, Check, X, Smartphone, Globe } from "lucide-react";

export default function LineInAppBrowserNotice() {
  const [isLineBrowser, setIsLineBrowser] = useState(false);
  const [deviceType, setDeviceType] = useState<"ios" | "android" | "other">("other");
  const [isDismissed, setIsDismissed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [currentUrl, setCurrentUrl] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const ua = navigator.userAgent || navigator.vendor || (window as any).opera || "";
    const isLine = /Line\//i.test(ua) || /\bLine\b/i.test(ua);
    const isIOS = /iPhone|iPad|iPod/i.test(ua);
    const isAndroid = /Android/i.test(ua);

    setCurrentUrl(window.location.href);

    if (isIOS) setDeviceType("ios");
    else if (isAndroid) setDeviceType("android");
    else setDeviceType("other");

    if (isLine) {
      setIsLineBrowser(true);

      // LINE URL Trick: If not present, try redirecting with openExternalBrowser=1
      try {
        const urlObj = new URL(window.location.href);
        if (!urlObj.searchParams.has("openExternalBrowser")) {
          urlObj.searchParams.set("openExternalBrowser", "1");
          // Attempt automatic launch in native browser
          window.location.replace(urlObj.toString());
        }
      } catch (err) {
        console.warn("Auto-redirect external browser error:", err);
      }
    }
  }, []);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // Fallback prompt
      window.prompt("คัดลอกลิงก์นี้ไปวางที่เบราว์เซอร์ Chrome หรือ Safari:", currentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const handleOpenExternal = () => {
    if (typeof window === "undefined") return;

    if (deviceType === "android") {
      // Try Android Intent to Google Chrome
      const cleanUrl = window.location.href.replace(/^https?:\/\//i, "");
      const chromeIntent = `intent://${cleanUrl}#Intent;scheme=https;package=com.android.chrome;end`;
      window.location.href = chromeIntent;
    } else {
      // iOS / General: use openExternalBrowser=1 query
      try {
        const urlObj = new URL(window.location.href);
        urlObj.searchParams.set("openExternalBrowser", "1");
        window.location.href = urlObj.toString();
      } catch {
        window.location.reload();
      }
    }
  };

  if (!isLineBrowser || isDismissed) return null;

  return (
    <div className="fixed inset-0 z-[99999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col my-auto animate-in zoom-in-95 duration-200 font-['Sarabun',sans-serif]">
        
        {/* Top Hospital & LINE Alert Header */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-sky-700 text-white p-5 relative">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0 border border-white/30 shadow-inner">
              <Smartphone className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] bg-emerald-400/30 text-white border border-emerald-300/40 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                  LINE In-App Browser
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-white mt-1 leading-tight">
                กรุณาเปิดด้วยเบราว์เซอร์หลักของเครื่อง
              </h2>
            </div>
          </div>

          <button
            onClick={() => setIsDismissed(true)}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
            title="ปิดการแจ้งเตือน"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 text-slate-700 text-sm">
          
          {/* Reason Alert */}
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-2.5 text-xs text-amber-900 leading-relaxed shadow-2xs">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold text-amber-950 block text-[13px] mb-0.5">
                ทำไมจึงต้องเปิดด้วยเบราว์เซอร์หลัก?
              </strong>
              ระบบ รปภ. โรงพยาบาลพล จำเป็นต้องใช้งาน <strong>กล้องถ่ายภาพ, สแกน QR Code และจับพิกัด GPS</strong> ซึ่งแอป LINE มักจะจำกัดสิทธิ์ ทำให้ระบบไม่สามารถทำงานได้อย่างถูกต้อง
            </div>
          </div>

          {/* Step by Step Guide according to Device */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-sky-600" />
                ขั้นตอนการเปิด (ทำเพียง 2 สเต็ป):
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800">
                {deviceType === "ios" ? "สำหรับ iPhone / Safari" : "สำหรับ Android / Chrome"}
              </span>
            </div>

            {deviceType === "ios" ? (
              <ol className="space-y-2.5 text-xs text-slate-700">
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-sky-600 text-white font-bold flex items-center justify-center shrink-0 text-[11px]">
                    1
                  </span>
                  <span>
                    แตะที่ไอคอน <strong>จุด 3 จุด (...)</strong> หรือปุ่ม <strong>แชร์ / แชร์ออก</strong> ที่มุมขวาล่างหรือขวาบนของหน้าจอ
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-sky-600 text-white font-bold flex items-center justify-center shrink-0 text-[11px]">
                    2
                  </span>
                  <span>
                    เลือกเมนู <strong>"เปิดใน Safari"</strong> หรือ <strong>"เปิดด้วยเบราว์เซอร์เริ่มต้น"</strong>
                  </span>
                </li>
              </ol>
            ) : (
              <ol className="space-y-2.5 text-xs text-slate-700">
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0 text-[11px]">
                    1
                  </span>
                  <span>
                    แตะที่ไอคอน <strong>จุด 3 จุดแนวตั้ง (⋮)</strong> ที่มุมขวาบนของหน้าจอ
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0 text-[11px]">
                    2
                  </span>
                  <span>
                    เลือกเมนู <strong>"เปิดใน Chrome"</strong> หรือ <strong>"เปิดด้วยเบราว์เซอร์อื่น"</strong>
                  </span>
                </li>
              </ol>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-1">
            <button
              onClick={handleOpenExternal}
              className="w-full py-3 px-4 bg-gradient-to-r from-sky-600 to-blue-700 hover:from-sky-700 hover:to-blue-800 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-sky-600/25 active:scale-[0.98] transition-all cursor-pointer"
            >
              <ExternalLink className="w-4 h-4" />
              <span>เปิดในเบราว์เซอร์เริ่มต้นทันที</span>
            </button>

            <button
              onClick={handleCopyLink}
              className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 active:scale-[0.98] transition-all cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-700 font-bold">คัดลอกลิงก์สำเร็จ! วางใน Chrome หรือ Safari ได้เลย</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-600" />
                  <span>คัดลอกลิงก์เว็บไซต์ เพื่อนำไปเปิดเอง</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Footer note */}
        <div className="px-5 py-3 bg-slate-100/80 border-t border-slate-200 text-center flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            ระบบรักษาความปลอดภัย โรงพยาบาลพล
          </span>
          <button
            onClick={() => setIsDismissed(true)}
            className="text-[11px] text-slate-600 hover:text-slate-900 font-semibold underline cursor-pointer"
          >
            เข้าใจแล้ว ดำเนินการต่อใน LINE
          </button>
        </div>

      </div>
    </div>
  );
}
