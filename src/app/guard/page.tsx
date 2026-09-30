"use client";

import { useState, useEffect } from "react";
import { useStore } from "@/lib/store";
import { 
  ShieldCheck, 
  MapPin, 
  AlertTriangle, 
  Car, 
  LogOut, 
  WifiOff, 
  Delete, 
  Clock, 
  ChevronRight, 
  Radio, 
  CheckCircle2, 
  Search,
  Send,
  FileText,
  Compass,
  ExternalLink
} from "lucide-react";
import Link from "next/link";
import HospitalBrand from "@/components/HospitalBrand";
import ShiftReportModal from "@/components/ShiftReportModal";
import { 
  getCurrentRound, 
  getRoundProgress, 
  getCurrentShift, 
  defaultPatrolRounds 
} from "@/lib/patrolSchedule";

export default function GuardPage() {
  const { 
    currentUser, 
    loginGuard, 
    logoutGuard, 
    patrolLogs, 
    checkpoints, 
    parkingScans,
    patrolRounds,
    incidents
  } = useStore();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [isOnline, setIsOnline] = useState(true);
  const [currentTime, setCurrentTime] = useState("");
  const [showShiftReportModal, setShowShiftReportModal] = useState(false);

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
      setError("รหัส PIN รปภ. ไม่ถูกต้อง โปรดลองอีกครั้ง");
      setTimeout(() => setPin(""), 600);
    }
  };

  const rounds = (patrolRounds && patrolRounds.length > 0) ? patrolRounds : defaultPatrolRounds;
  const now = new Date();
  const activeRound = getCurrentRound(rounds, now);
  const activeShift = getCurrentShift(now);
  const roundProgress = getRoundProgress(activeRound, checkpoints, patrolLogs, now);
  const progressPercent = roundProgress.percent;
  const completedInRound = roundProgress.completedCount;

  const todayStr = now.toISOString().split("T")[0];
  const todayScansCount = parkingScans.filter((s) => s.timestamp?.startsWith(todayStr)).length;
  const activeRoundScansCount = parkingScans.filter((s) => {
    if (!s.timestamp?.startsWith(todayStr)) return false;
    return s.round === activeRound.id || s.roundName === activeRound.name || s.round === activeRound.name;
  }).length;

  const unresolvedIncidents = (incidents || []).filter((i) => i.status !== "resolved");
  const currentShiftIncidents = unresolvedIncidents.filter((i) => {
    if (i.shift && i.shift === activeShift.id) return true;
    if (i.timestamp) {
      const incDate = new Date(i.timestamp);
      return getCurrentShift(incDate).id === activeShift.id && incDate.toDateString() === now.toDateString();
    }
    return false;
  });

  // 1. PIN LOGIN SCREEN FOR GUARDS (LIGHT MEDICAL THEME)
  if (!currentUser) {
    return (
      <main className="min-h-screen bg-[#f0f6fa] text-slate-800 flex flex-col justify-between p-4 sm:p-6 select-none relative overflow-hidden max-w-md mx-auto border-x border-sky-100 shadow-xl font-['Sarabun',sans-serif]">
        {/* Top Bar with Hospital Branding */}
        <div className="flex flex-col gap-2 z-10">
          <div className="flex justify-end items-center">
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
        <div className="w-full max-w-xs mx-auto z-10 pb-6">
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

        {/* Patrol Progress Quick Widget (เฉพาะรอบปัจจุบัน ไม่ทะลุ 100%) */}
        <div className="p-4 bg-white border border-slate-200/80 rounded-2xl shadow-xs space-y-3">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-sky-600">
                  รอบตรวจปัจจุบัน • {activeShift.name}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800">
                  {activeRound.frequencyHours === 3 ? "ทุก 3 ชม." : "ทุก 2 ชม."}
                </span>
              </div>
              <h2 className="text-lg font-black text-slate-900 mt-0.5">{activeRound.name}</h2>
              <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                <Clock className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                <span>กำหนดเสร็จภายใน: <strong className="text-slate-800 font-bold">{activeRound.deadlineTime} น.</strong> (1 ชม. แรก)</span>
              </p>
            </div>
            <div className="text-right">
              <span className={`text-2xl font-black ${progressPercent === 100 ? "text-emerald-600" : "text-sky-600"}`}>
                {progressPercent}%
              </span>
              <p className="text-[11px] text-slate-400 font-bold">
                {completedInRound}/{checkpoints.length} จุด
              </p>
            </div>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2.5 p-0.5 border border-slate-200">
            <div
              className={`h-full rounded-full transition-all duration-700 shadow-xs ${
                progressPercent === 100
                  ? "bg-gradient-to-r from-emerald-500 to-teal-600"
                  : "bg-gradient-to-r from-sky-500 to-blue-600"
              }`}
              style={{ width: `${Math.max(progressPercent, 4)}%` }}
            />
          </div>
          {progressPercent === 100 ? (
            <p className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> ตรวจครบถ้วนตามเกณฑ์รอบนี้แล้ว ✅
            </p>
          ) : (
            <p className="text-[11px] text-slate-400">
              เหลืออีก {Math.max(checkpoints.length - completedInRound, 0)} จุดตรวจในรอบนี้
            </p>
          )}
        </div>

        {/* Guard Task Menu */}
        <div className="space-y-4">

          {/* URGENT INCIDENT ALERT BANNER FOR CURRENT SHIFT */}
          {currentShiftIncidents.length > 0 && (
            <Link
              href="/incident"
              className="block p-3.5 bg-gradient-to-r from-rose-600 via-rose-500 to-amber-600 text-white rounded-2xl shadow-lg shadow-rose-600/25 border border-rose-300 animate-pulse hover:animate-none transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-black text-sm">🚨 มีเหตุการณ์ในกะนี้ ({currentShiftIncidents.length} เรื่อง)</span>
                      <span className="bg-white text-rose-700 text-[10px] font-black px-1.5 py-0.5 rounded-full">รอดำเนินการ/ปิดงาน</span>
                    </div>
                    <p className="text-[11px] text-rose-100 line-clamp-1 mt-0.5">
                      {currentShiftIncidents[0].title} — กดเพื่อเข้าจัดการสถานะ
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-white/90 shrink-0" />
              </div>
            </Link>
          )}

          {/* SECTION 1: งานตรวจการณ์ลาดตระเวน */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-bold tracking-wider uppercase text-slate-400">
                งานตรวจการณ์ลาดตระเวน
              </span>
              <span className="text-[11px] font-semibold text-sky-600">7 จุดตรวจ</span>
            </div>

            {/* Card 1: เดินตรวจ 7 จุด */}
            <Link
              href="/patrol"
              className="group block p-4 bg-white hover:bg-sky-50/40 border border-slate-200/80 hover:border-sky-300 rounded-2xl transition-all shadow-xs active:scale-[0.99]"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 border border-sky-100 flex items-center justify-center shadow-xs shrink-0 group-hover:scale-105 transition-transform">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-slate-900 text-[15px]">โมดูล 1: เดินตรวจ {checkpoints.length} จุด</h3>
                      <span className="text-[10px] bg-sky-100 text-sky-700 px-2 py-0.5 rounded-full font-bold">
                        สแกน QR
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">สแกนป้ายยืนยันจุดตรวจ + บันทึกเช็กลิสต์ความปลอดภัย</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-sky-600 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
              </div>
            </Link>

            {/* Card 2: แผนผังเส้นทางลาดตระเวน 7 จุด */}
            <a
              href="/patrol_map_7_checkpoints.html"
              target="_blank"
              rel="noopener noreferrer"
              className="group block p-4 bg-white hover:bg-indigo-50/40 border border-slate-200/80 hover:border-indigo-300 rounded-2xl transition-all shadow-xs active:scale-[0.99]"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shadow-xs shrink-0 group-hover:scale-105 transition-transform">
                    <Compass className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-slate-900 text-[15px]">
                        แผนผังเส้นทางลาดตระเวน 7 จุด
                      </h3>
                      <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold">
                        แผนที่ดาวเทียม
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      เปิดดูแผนที่ภาพถ่ายดาวเทียม จุดตรวจ 01 - 07 พร้อมภาพสถานที่จริง
                    </p>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
              </div>
            </a>
          </div>

          {/* SECTION 2: จัดการเหตุการณ์ & งานยานพาหนะ */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-bold tracking-wider uppercase text-slate-400">
                เหตุการณ์ & งานยานพาหนะ
              </span>
            </div>

            {/* Card 3: จัดการเหตุการณ์ & แจ้งเหตุด่วน */}
            <Link
              href="/incident"
              className={`group block p-4 bg-white hover:bg-rose-50/40 border ${
                currentShiftIncidents.length > 0
                  ? "border-rose-400 ring-2 ring-rose-200 bg-rose-50/20"
                  : "border-slate-200/80 hover:border-rose-300"
              } rounded-2xl transition-all shadow-xs active:scale-[0.99]`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center shadow-xs shrink-0 group-hover:scale-105 transition-transform relative">
                    <AlertTriangle className="w-6 h-6" />
                    {currentShiftIncidents.length > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-600 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white animate-bounce">
                        {currentShiftIncidents.length}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-slate-900 text-[15px]">โมดูล 2: จัดการเหตุการณ์ & แจ้งเหตุด่วน</h3>
                      {currentShiftIncidents.length > 0 ? (
                        <span className="text-[10px] bg-rose-600 text-white px-2 py-0.5 rounded-full font-bold animate-pulse">
                          กะนี้ {currentShiftIncidents.length} เคส
                        </span>
                      ) : unresolvedIncidents.length > 0 ? (
                        <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold">
                          ค้างกะก่อน {unresolvedIncidents.length} เคส
                        </span>
                      ) : (
                        <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">
                          เรียบร้อย
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">ปรับสถานะ / ปิดงานพร้อมแนบรูป / ดูย้อนหลัง • Google Drive</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-rose-600 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
              </div>
            </Link>

            {/* Card 4: สแกนตรวจรถทุกคันใน รพ. */}
            <Link
              href="/vehicle?mode=patrol"
              className="group block p-4 bg-white hover:bg-sky-50/40 border border-slate-200/80 hover:border-sky-300 rounded-2xl transition-all shadow-xs active:scale-[0.99]"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 border border-sky-100 flex items-center justify-center shadow-xs shrink-0 group-hover:scale-105 transition-transform">
                    <Car className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-slate-900 text-[15px]">สแกนตรวจรถทุกคันใน รพ.</h3>
                      <span className="text-[10px] bg-sky-100 text-sky-700 px-2 py-0.5 rounded-full font-bold">
                        รอบ {activeRound.id}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      ตรวจรถบุคลากร/คนนอก • รอบนี้: <strong className="text-sky-700 font-bold">{activeRoundScansCount} คัน</strong> • วันนี้: <strong className="text-slate-800 font-bold">{todayScansCount} คัน</strong>
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-sky-600 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
              </div>
            </Link>

            {/* Card 5: ตรวจสอบเจ้าของรถ (ดูว่ารถใคร) */}
            <Link
              href="/vehicle?mode=lookup"
              className="group block p-4 bg-white hover:bg-emerald-50/40 border border-slate-200/80 hover:border-emerald-300 rounded-2xl transition-all shadow-xs active:scale-[0.99]"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shadow-xs shrink-0 group-hover:scale-105 transition-transform">
                    <Search className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-slate-900 text-[15px]">ตรวจสอบเจ้าของรถ (ดูว่ารถใคร)</h3>
                      <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">
                        24 ชม.
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      พิมพ์หรือกดเลข 4 ตัวท้าย • รู้ชื่อ แผนก โทรหาเจ้าของรถได้ทันที
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
              </div>
            </Link>
          </div>

          {/* SECTION 3: ส่งมอบเวรและรายงานผล */}
          <div className="space-y-2 pt-1 pb-1">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-bold tracking-wider uppercase text-slate-400">
                สรุปผล & ส่งมอบเวร
              </span>
              <span className="text-[11px] font-medium text-emerald-600">LINE รปภ.</span>
            </div>

            {/* Card 6: รายงานผลการเดินตรวจ & ส่งมอบเวร */}
            <button
              onClick={() => setShowShiftReportModal(true)}
              className="w-full group block p-4 bg-gradient-to-r from-emerald-50/90 via-teal-50/50 to-sky-50/40 hover:from-emerald-100/70 hover:to-sky-100/60 border border-emerald-200/90 hover:border-emerald-300 rounded-2xl transition-all shadow-xs active:scale-[0.99] text-left cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0 group-hover:scale-105 transition-transform">
                    <Send className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-slate-900 text-[15px]">
                        รายงานผลการเดินตรวจ & ส่งมอบเวร
                      </h3>
                      <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded-full font-bold">
                        ช่วงต่อกะ
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                      สรุปผลงานอัตโนมัติ พร้อมส่งภาพเข้ากลุ่มไลน์ รปภ.
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-emerald-600/70 group-hover:text-emerald-700 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
              </div>
            </button>
          </div>
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

      {/* Modal: Shift Handover Report (ส่งไลน์กลุ่ม) */}
      <ShiftReportModal
        isOpen={showShiftReportModal}
        onClose={() => setShowShiftReportModal(false)}
      />
    </div>
  );
}
