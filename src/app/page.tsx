"use client";

import { ShieldCheck, Smartphone, Monitor, QrCode, Wifi, ArrowRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import HospitalBrand from "@/components/HospitalBrand";

export default function Home() {
  const [lanIp, setLanIp] = useState("192.168.1.111:3000");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setLanIp(`${window.location.hostname}:${window.location.port || "3000"}`);
    }
  }, []);

  return (
    <main className="min-h-screen bg-[#f0f6fa] text-slate-800 flex flex-col justify-between p-4 sm:p-6 relative overflow-hidden font-['Sarabun',sans-serif]">
      {/* Soft Sky Blue / Light Blue Ambient Glows */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-sky-200/50 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 -right-32 w-96 h-96 bg-blue-100/60 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 left-1/3 w-96 h-96 bg-sky-100/50 rounded-full blur-3xl pointer-events-none" />

      {/* Top Navbar with Hospital Branding */}
      <header className="max-w-5xl mx-auto w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 z-10 pt-2 pb-4">
        {/* Phon Hospital Brand Badge */}
        <HospitalBrand badgeText="Smart Hospital" />

        <div className="flex items-center gap-2 self-start sm:self-auto px-3.5 py-1.5 rounded-full bg-white border border-sky-200 shadow-xs text-xs text-sky-800 font-medium">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>ระบบออนไลน์พร้อมใช้งาน (Cloud Sync)</span>
        </div>
      </header>

      {/* Portal Selection Cards */}
      <div className="max-w-4xl mx-auto w-full my-auto py-6 z-10 space-y-8">
        <div className="text-center space-y-2.5">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-sky-100 text-sky-800 border border-sky-200 text-xs font-bold uppercase tracking-wider shadow-2xs">
            <ShieldCheck className="w-4 h-4 text-sky-600" /> ระบบบริหารจัดการ รปภ. & ลาดตระเวน
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            เลือกช่องทางเข้าสู่ระบบความปลอดภัย
          </h1>
          <p className="text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
            ระบบแยก URL ชัดเจน เพื่อความสะดวกในการใช้งานผ่านมือถือของเจ้าหน้าที่ รปภ. และจอคอมพิวเตอร์ของหัวหน้างาน
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Guard Portal */}
          <Link
            href="/guard"
            className="group relative bg-white hover:bg-sky-50/40 border-2 border-sky-100 hover:border-sky-400 rounded-3xl p-7 transition-all shadow-md shadow-sky-900/5 hover:shadow-xl hover:shadow-sky-500/10 flex flex-col justify-between active:scale-[0.99]"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-sky-500/25 group-hover:scale-105 transition-transform">
                  <Smartphone className="w-7 h-7" />
                </div>
                <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-sky-100 text-sky-700 border border-sky-200">
                  สำหรับมือถือ: /guard
                </span>
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-900 group-hover:text-sky-700 transition-colors">
                  สำหรับเจ้าหน้าที่ รปภ. (Guard Portal)
                </h2>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  ใช้งานง่ายบนสมาร์ตโฟน ออกแบบเป็น PWA รองรับการเดินตรวจ:
                </p>
                <ul className="text-xs text-slate-600 mt-3 space-y-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-sky-500 shrink-0" />
                    <span>ล็อกอินด่วนด้วย <strong>รหัส PIN 4 หลัก</strong></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-sky-500 shrink-0" />
                    <span>สแกน QR Code <strong>จุดตรวจความปลอดภัย</strong> ทั่วโรงพยาบาล</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-sky-500 shrink-0" />
                    <span>ค้นหาด่วนป้ายทะเบียน 4 ตัวท้ายใน <strong>0.1 วินาที</strong></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span className="text-emerald-700 font-semibold">รองรับโหมดออฟไลน์ใต้ตึกอับสัญญาณ 100%</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-sky-100 flex items-center justify-between text-xs font-bold text-sky-600 group-hover:text-sky-700">
              <span>เข้าสู่หน้า รปภ. หน้างาน &gt;</span>
              <div className="w-8 h-8 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center group-hover:translate-x-1 transition-transform">
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </Link>

          {/* Card 2: Supervisor Dashboard */}
          <Link
            href="/supervisor"
            className="group relative bg-white hover:bg-blue-50/40 border-2 border-blue-100 hover:border-blue-400 rounded-3xl p-7 transition-all shadow-md shadow-blue-900/5 hover:shadow-xl hover:shadow-blue-500/10 flex flex-col justify-between active:scale-[0.99]"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-blue-600/25 group-hover:scale-105 transition-transform">
                  <Monitor className="w-7 h-7" />
                </div>
                <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                  สำหรับคอมพิวเตอร์: /supervisor
                </span>
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                  สำหรับหัวหน้างาน (Supervisor Dashboard)
                </h2>
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  จอควบคุมความปลอดภัย มอนิเตอร์รอบเวร และบริหารจัดการ:
                </p>
                <ul className="text-xs text-slate-600 mt-3 space-y-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0" />
                    <span>มอนิเตอร์สถานะ <strong>จุดตรวจทั้งหมดแบบ Real-time</strong></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0" />
                    <span>ตรวจสอบรูปเหตุฉุกเฉินบน <strong>Google Drive</strong></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0" />
                    <span>จัดการฐานข้อมูลรถบุคลากร + อัตรา KPI รปภ.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-indigo-500 shrink-0" />
                    <span><strong>Gemini AI Batch Run</strong> วิเคราะห์รถแอบจอดค้างคืน</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-blue-100 flex items-center justify-between text-xs font-bold text-blue-700 group-hover:text-blue-800">
              <span>เข้าสู่ศูนย์ควบคุม (PIN: 9999) &gt;</span>
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center group-hover:translate-x-1 transition-transform">
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </Link>
        </div>

        {/* Mobile LAN Connection Info Box */}
        <div className="p-5 bg-white border border-sky-200 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-slate-800 text-sm">เปิดใช้งานบนโทรศัพท์มือถือ รปภ. (Wi-Fi เดียวกัน):</p>
              <p className="text-xs text-slate-500 mt-0.5">
                เปิดเบราว์เซอร์บนมือถือ แล้วพิมพ์ที่อยู่:{" "}
                <span className="text-sky-700 font-mono font-bold bg-sky-50 px-2.5 py-0.5 rounded-md border border-sky-200">
                  http://{lanIp}/guard
                </span>
              </p>
            </div>
          </div>
          <Link
            href="/guard"
            className="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-2xl text-xs active:scale-95 transition-all shadow-md shadow-sky-600/20 shrink-0"
          >
            เปิดหน้า รปภ. บนเครื่องนี้
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="max-w-5xl mx-auto w-full text-center text-xs text-slate-400 py-3 border-t border-sky-100">
        ระบบบริหารจัดการ รปภ. • โรงพยาบาลพล (PHON HOSPITAL) • Smart Hospital Security
      </footer>
    </main>
  );
}
