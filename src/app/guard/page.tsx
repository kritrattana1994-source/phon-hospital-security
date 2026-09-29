"use client";

import { useState, useEffect } from "react";
import { useStore, Guard } from "@/lib/store";
import { 
  ShieldCheck, 
  MapPin, 
  AlertTriangle, 
  Car, 
  LogOut, 
  Wifi, 
  WifiOff, 
  Delete, 
  Clock, 
  ChevronRight, 
  Radio, 
  CheckCircle2, 
  ArrowLeft,
  Calendar,
  Sun,
  Moon,
  Umbrella,
  Users,
  Phone,
  ChevronLeft,
  X,
  Sparkles,
  Coffee,
  Check,
  Search
} from "lucide-react";
import Link from "next/link";
import HospitalBrand from "@/components/HospitalBrand";

export default function GuardPage() {
  const { 
    currentUser, 
    loginGuard, 
    logoutGuard, 
    patrolLogs, 
    checkpoints, 
    parkingScans,
    guards
  } = useStore();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [isOnline, setIsOnline] = useState(true);
  const [currentTime, setCurrentTime] = useState("");

  const thaiMonths = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
  ];
  const thaiDayNamesFull = ["วันอาทิตย์", "วันจันทร์", "วันอังคาร", "วันพุธ", "วันพฤหัสบดี", "วันศุกร์", "วันเสาร์"];

  const todayObj = new Date();
  const todayThaiDay = thaiDayNamesFull[todayObj.getDay()];
  const todayThaiDate = `${todayObj.getDate()} ${thaiMonths[todayObj.getMonth()]} ${todayObj.getFullYear() + 543}`;

  const todayDuty = currentUser ? {
    type: currentUser.shift as "morning" | "night",
    label: currentUser.shift === "morning" ? "กะเช้า" : "กะดึก",
    badge: currentUser.shift === "morning" ? "07:00 - 19:00 น." : "19:00 - 07:00 น.",
    time: currentUser.shift === "morning" ? "07:00 - 19:00 น. (12 ชั่วโมง)" : "19:00 - 07:00 น. (ตรวจ 22:00/06:00)",
    coWorkers: guards.filter(g => g.shift === currentUser.shift && g.id !== currentUser.id && g.role === "guard")
  } : null;

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    const updateClock = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
      );
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(timer);
    };
  }, []);

  const handleKeyPress = (num: string) => {
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      setError("");
      if (newPin.length === 4) {
        verifyPin(newPin);
      }
    }
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
    setError("");
  };

  const handleClear = () => {
    setPin("");
    setError("");
  };

  const verifyPin = (pinToVerify: string) => {
    if (loginGuard(pinToVerify)) {
      setPin("");
      setError("");
    } else {
      setError("รหัส PIN รปภ. ไม่ถูกต้อง (ลอง 1234 หรือ 5678)");
      setTimeout(() => setPin(""), 600);
    }
  };

  const handleQuickLogin = (quickPin: string) => {
    setPin(quickPin);
    verifyPin(quickPin);
  };

  const completedIds = new Set(patrolLogs.map((log) => log.checkpointId));
  const progressPercent = Math.round((completedIds.size / Math.max(checkpoints.length, 1)) * 100);

  // 1. PIN LOGIN SCREEN FOR GUARDS (LIGHT MEDICAL THEME)
  if (!currentUser) {
    return (
      <main className="min-h-screen bg-[#f0f6fa] text-slate-800 flex flex-col justify-between p-4 sm:p-6 select-none relative overflow-hidden max-w-md mx-auto border-x border-sky-100 shadow-xl font-['Sarabun',sans-serif]">
        {/* Top Bar with Hospital Branding */}
        <div className="flex flex-col gap-2 z-10">
          <div className="flex justify-between items-center">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 px-3 py-1.5 rounded-xl bg-white border border-slate-200 shadow-2xs transition-all"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> กลับหน้าหลัก
            </Link>
            <span className="text-[10px] font-bold text-sky-700 bg-sky-100 px-2.5 py-1 rounded-full border border-sky-200">
              GUARD PORTAL
            </span>
          </div>

          <div className="pt-2">
            <HospitalBrand badgeText="Smart Patrol" />
          </div>
        </div>

        {/* Ambient background glows */}
        <div className="absolute top-1/4 -left-32 w-80 h-80 bg-sky-200/40 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 -right-32 w-80 h-80 bg-blue-100/50 rounded-full blur-3xl pointer-events-none" />

        {/* PIN Indicators */}
        <div className="w-full max-w-xs mx-auto text-center my-auto py-4 z-10">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center text-white mx-auto mb-3 shadow-lg shadow-sky-500/25 ring-4 ring-sky-100">
            <ShieldCheck className="w-9 h-9" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            ระบบ รปภ. เดินตรวจเวร
          </h1>
          <p className="text-xs text-slate-500 mt-1">กดรหัส PIN 4 หลักประจำตัวเพื่อเข้าเวร</p>

          <div className="flex justify-center gap-4 my-5">
            {[0, 1, 2, 3].map((index) => {
              const isFilled = pin.length > index;
              return (
                <div
                  key={index}
                  className={`w-5 h-5 rounded-full transition-all duration-200 ${
                    isFilled
                      ? "bg-sky-600 scale-110 shadow-md shadow-sky-500/40 ring-2 ring-sky-200"
                      : "bg-white border-2 border-slate-300"
                  }`}
                />
              );
            })}
          </div>
          {error ? (
            <p className="text-rose-600 text-xs font-semibold">{error}</p>
          ) : (
            <p className="text-slate-400 text-xs">Offline-First • ใช้งานได้ 100% แม้ในลานจอดใต้ตึก</p>
          )}
        </div>

        {/* Keypad */}
        <div className="w-full max-w-xs mx-auto z-10 pb-2">
          <div className="grid grid-cols-3 gap-2.5 mb-3">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((n) => (
              <button
                key={n}
                onClick={() => handleKeyPress(n)}
                className="h-14 rounded-2xl bg-white border border-slate-200 text-2xl font-bold text-slate-800 hover:bg-sky-50 active:scale-95 active:bg-sky-500 active:text-white transition-all flex items-center justify-center shadow-xs"
              >
                {n}
              </button>
            ))}
            <button
              onClick={handleClear}
              className="h-14 rounded-2xl bg-slate-100 text-xs font-semibold text-slate-500 hover:text-slate-800 active:scale-95 transition-all flex items-center justify-center"
            >
              ล้าง
            </button>
            <button
              onClick={() => handleKeyPress("0")}
              className="h-14 rounded-2xl bg-white border border-slate-200 text-2xl font-bold text-slate-800 hover:bg-sky-50 active:scale-95 active:bg-sky-500 active:text-white transition-all flex items-center justify-center shadow-xs"
            >
              0
            </button>
            <button
              onClick={handleDelete}
              className="h-14 rounded-2xl bg-slate-100 text-slate-500 hover:text-slate-800 active:scale-95 transition-all flex items-center justify-center"
            >
              <Delete className="w-6 h-6" />
            </button>
          </div>

          {/* Quick Demo Login Chips */}
          <div className="border-t border-slate-200 pt-3 text-center">
            <p className="text-[11px] text-slate-400 uppercase tracking-wider mb-2 font-medium">
              กดเข้าเวรด่วน (ทดสอบดูตารางเวรแต่ละนาย):
            </p>
            <div className="flex flex-wrap gap-1.5 justify-center">
              <button
                onClick={() => handleQuickLogin("1234")}
                className="px-2.5 py-1 rounded-full bg-sky-100 hover:bg-sky-200 border border-sky-300 text-sky-800 text-xs font-medium active:scale-95 transition-all"
              >
                👮 สมชาย (1234)
              </button>
              <button
                onClick={() => handleQuickLogin("1111")}
                className="px-2.5 py-1 rounded-full bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 text-emerald-800 text-xs font-medium active:scale-95 transition-all"
              >
                👮 ประสิทธิ์ (1111)
              </button>
              <button
                onClick={() => handleQuickLogin("2222")}
                className="px-2.5 py-1 rounded-full bg-amber-100 hover:bg-amber-200 border border-amber-300 text-amber-800 text-xs font-medium active:scale-95 transition-all"
              >
                👮 วิชัย (2222)
              </button>
              <button
                onClick={() => handleQuickLogin("5678")}
                className="px-2.5 py-1 rounded-full bg-indigo-100 hover:bg-indigo-200 border border-indigo-300 text-indigo-800 text-xs font-medium active:scale-95 transition-all"
              >
                👮 สมศักดิ์ (5678)
              </button>
              <button
                onClick={() => handleQuickLogin("3333")}
                className="px-2.5 py-1 rounded-full bg-purple-100 hover:bg-purple-200 border border-purple-300 text-purple-800 text-xs font-medium active:scale-95 transition-all"
              >
                👮 สุรชัย (3333)
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // 2. GUARD DASHBOARD (LIGHT MEDICAL THEME)
  return (
    <div className="min-h-screen bg-[#f0f6fa] text-slate-800 flex flex-col justify-between max-w-md mx-auto relative border-x border-sky-100 shadow-xl font-['Sarabun',sans-serif]">
      {/* Top Header with Hospital Brand Badge */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-sky-100 px-4 py-3 space-y-2.5 shadow-xs">
        <div className="flex items-center justify-between">
          <HospitalBrand badgeText="Smart Patrol" />
          <button
            onClick={logoutGuard}
            title="ออกเวร"
            className="p-2 rounded-xl bg-slate-100 text-slate-500 hover:text-rose-600 hover:bg-rose-50 active:scale-95 transition-all"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {/* Guard Info & Status Bar */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-slate-900">{currentUser.name}</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
              todayDuty?.type === "morning"
                ? "bg-amber-100 text-amber-900 border-amber-200"
                : "bg-indigo-100 text-indigo-900 border-indigo-200"
            }`}>
              {todayDuty?.type === "morning" ? "กะเช้า ☀️" : "กะดึก 🌙"}
            </span>
            <div className="flex items-center gap-1 text-xs text-slate-400 font-mono">
              <Clock className="w-3 h-3 text-slate-400" />
              <span>{currentTime || "--:--:--"}</span>
            </div>
          </div>

          <div
            className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
              isOnline
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-amber-50 text-amber-700 border-amber-200"
            }`}
          >
            {isOnline ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Online</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3 h-3 text-amber-600" />
                <span>ใต้ตึก</span>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Actions */}
      <main className="flex-1 p-4 space-y-4 overflow-y-auto">
        {!isOnline && (
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3 text-amber-800 text-xs">
            <Radio className="w-5 h-5 text-amber-600 shrink-0 animate-spin" />
            <div>
              <p className="font-bold">อยู่ในโหมดออฟไลน์ใต้ตึก</p>
              <p className="text-amber-700/80">ระบบจะดูดข้อมูลและรูปที่ค้างอยู่ ส่งขึ้นคลาวด์อัตโนมัติเมื่อมีสัญญาณเน็ต</p>
            </div>
          </div>
        )}

        {/* TODAY'S DUTY WIDGET (เวรวันนี้ของฉัน) */}
        <div className={`p-4 sm:p-5 rounded-3xl border shadow-sm space-y-3 transition-all ${
          todayDuty?.type === "morning"
            ? "bg-gradient-to-br from-amber-500/10 via-amber-50/70 to-orange-50 border-amber-200"
            : "bg-gradient-to-br from-indigo-500/10 via-indigo-50/70 to-blue-50 border-indigo-200"
        }`}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                <Calendar className="w-3.5 h-3.5 text-sky-600" />
                <span>{todayThaiDay}ที่ {todayThaiDate}</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                {todayDuty?.type === "morning" ? (
                  <>
                    <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Sun className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-black text-amber-950 leading-tight">วันนี้เข้ากะเช้า</h2>
                      <span className="text-[11px] text-amber-700 font-medium">07:00 - 19:00 น. (12 ชั่วโมง)</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Moon className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-black text-indigo-950 leading-tight">วันนี้เข้ากะดึก</h2>
                      <span className="text-[11px] text-indigo-700 font-medium">19:00 - 07:00 น. (ตรวจ 22:00/06:00)</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Co-workers on duty today */}
          {todayDuty && (
            <div className="pt-2 border-t border-slate-200/60">
              <div className="flex items-center justify-between text-[11px] text-slate-600 mb-1.5">
                <span className="font-bold text-slate-700 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-slate-500" />
                  เพื่อนร่วม{todayDuty.label}วันนี้ ({todayDuty.coWorkers.length} นาย):
                </span>
                <span className="text-[10px] text-slate-400">แตะเพื่อโทร</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {todayDuty.coWorkers.length === 0 ? (
                  <span className="text-xs text-slate-400 italic">ไม่มีเพื่อนร่วมเวรในกะนี้</span>
                ) : (
                  todayDuty.coWorkers.map(cw => (
                    <div
                      key={cw.id}
                      className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-white border border-slate-200 shadow-2xs text-xs font-medium text-slate-800"
                    >
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span>{cw.name.replace("นาย", "")}</span>
                      {cw.phone && (
                        <a
                          href={`tel:${cw.phone}`}
                          className="p-1 rounded-lg text-sky-600 hover:bg-sky-50 transition-colors"
                          title={`โทรหา ${cw.name} (${cw.phone})`}
                        >
                          <Phone className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Patrol Progress Quick Widget */}
        <div className="p-5 bg-white border border-sky-100 rounded-3xl shadow-sm space-y-3">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-sky-600">ความคืบหน้ารอบเวร</span>
              <h2 className="text-lg font-black text-slate-900 mt-0.5">เดินตรวจ {checkpoints.length} จุดตรวจความปลอดภัย</h2>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black text-sky-600">{progressPercent}%</span>
              <p className="text-[11px] text-slate-400">{completedIds.size}/{checkpoints.length} จุด</p>
            </div>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-3 p-0.5 border border-slate-200">
            <div
              className="bg-gradient-to-r from-sky-500 to-blue-600 h-full rounded-full transition-all duration-700 shadow-xs"
              style={{ width: `${Math.max(progressPercent, 4)}%` }}
            />
          </div>
        </div>

        {/* Guard Task Menu */}
        <div className="space-y-3">

          <Link
            href="/patrol"
            className="group block p-4 bg-white hover:bg-sky-50/40 border border-sky-100 hover:border-sky-300 rounded-2xl transition-all shadow-xs active:scale-[0.98]"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-sky-100 text-sky-600 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                  <MapPin className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 text-base">โมดูล 1: เดินตรวจ {checkpoints.length} จุด</h3>
                    <span className="text-[10px] bg-sky-100 text-sky-700 px-2 py-0.5 rounded-md font-semibold">
                      สแกน QR
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">สแกนป้ายยืนยันจุดตรวจ + บันทึกเช็กลิสต์ความปลอดภัย</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-sky-600 transition-colors" />
            </div>
          </Link>

          <Link
            href="/incident"
            className="group block p-4 bg-white hover:bg-rose-50/40 border border-rose-100 hover:border-rose-300 rounded-2xl transition-all shadow-xs active:scale-[0.98]"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 text-base">โมดูล 2: บันทึกแจ้งเหตุด่วน</h3>
                    <span className="text-[10px] bg-rose-100 text-rose-700 px-2 py-0.5 rounded-md font-semibold">
                      ส่ง Google Drive
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">ถ่ายรูปย่อขนาด 150KB ส่งเข้าโฟลเดอร์โรงพยาบาลพล</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-rose-600 transition-colors" />
            </div>
          </Link>

          {/* DEDICATED FEATURE: VEHICLE OWNER LOOKUP (ดูว่ารถใคร 24 ชม.) */}
          <Link
            href="/vehicle?mode=lookup"
            className="group block p-4 bg-gradient-to-r from-emerald-500/15 via-teal-50/80 to-sky-50/70 hover:from-emerald-500/25 border-2 border-emerald-400 hover:border-emerald-500 rounded-2xl transition-all shadow-sm hover:shadow-md active:scale-[0.98]"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/30 group-hover:scale-105 transition-transform">
                  <Search className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-slate-900 text-base">🔍 ตรวจสอบเจ้าของรถ (ดูว่ารถใคร)</h3>
                    <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded-full font-bold">
                      24 ชม.
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    สแกนป้าย / กด 4 ตัวท้าย • รู้ชื่อ แผนก โทรหาเจ้าของรถได้ทันที
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-emerald-600 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          <Link
            href="/vehicle?mode=patrol"
            className="group block p-4 bg-white hover:bg-sky-50/40 border border-sky-100 hover:border-sky-300 rounded-2xl transition-all shadow-xs active:scale-[0.98]"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-sky-100 text-sky-600 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                  <Car className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 text-base">โมดูล 3: เดินตรวจรอบเวรลานจอด</h3>
                    <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-md font-semibold">
                      รอบ 22:00 / 06:00 น.
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">เดินตรวจนับยอดรถกะดึก/กะเช้า • บันทึกส่ง AI วิเคราะห์รถแอบจอด</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-sky-600 transition-colors" />
            </div>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-4 bg-white border-t border-sky-100 text-xs text-slate-500 flex items-center justify-between shadow-2xs">
        <span>สแกนรถแล้ว: <strong className="text-slate-800">{parkingScans.length}</strong> คัน</span>
        <span>ตรวจแล้ว: <strong className="text-slate-800">{patrolLogs.length}</strong> จุด</span>
        <span className="text-emerald-600 flex items-center gap-1 font-semibold">
          <CheckCircle2 className="w-3.5 h-3.5" /> เวรปกติ
        </span>
      </footer>

          </div>
  );
}
