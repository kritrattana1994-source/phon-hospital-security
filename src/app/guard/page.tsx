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
    rosterSchedule,
    staffDaysOff,
    leaveRequests,
    guards
  } = useStore();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [isOnline, setIsOnline] = useState(true);
  const [currentTime, setCurrentTime] = useState("");

  // My Schedule Modal & View State
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleYear, setScheduleYear] = useState(2026);
  const [scheduleMonth, setScheduleMonth] = useState(8); // September (0-indexed)
  const [scheduleViewMode, setScheduleViewMode] = useState<"agenda" | "calendar">("agenda");
  const [scheduleFilter, setScheduleFilter] = useState<"all" | "working" | "off">("all");
  const [selectedDateDetail, setSelectedDateDetail] = useState<string | null>(null);

  const thaiMonths = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
  ];
  const thaiDayNamesShort = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];
  const thaiDayNamesFull = ["วันอาทิตย์", "วันจันทร์", "วันอังคาร", "วันพุธ", "วันพฤหัสบดี", "วันศุกร์", "วันเสาร์"];

  // Helper to determine guard duty on any date
  const getGuardDutyForDate = (guardId: string, dateStr: string) => {
    // 1. Check approved leave
    const leave = leaveRequests.find(l => 
      l.guardId === guardId && l.status === "approved" && dateStr >= l.startDate && dateStr <= l.endDate
    );
    if (leave) {
      return {
        type: "leave" as const,
        label: "ลางาน",
        badge: leave.type === "sick" ? "ลาป่วย" : leave.type === "vacation" ? "พักร้อน" : "ลากิจ",
        time: "ตลอดวัน",
        color: "rose",
        coWorkers: [] as Guard[]
      };
    }

    // 2. Check assigned day off
    const dayOff = staffDaysOff.find(d => d.guardId === guardId && d.date === dateStr);
    if (dayOff) {
      return {
        type: "day_off" as const,
        label: "วันหยุด",
        badge: "วันหยุดประจำ",
        detail: dayOff.reason || "วันหยุดประจำสัปดาห์",
        time: "ตลอดวัน",
        color: "emerald",
        coWorkers: [] as Guard[]
      };
    }

    // 3. Check roster schedule
    const roster = rosterSchedule[dateStr];
    if (roster) {
      if (roster.morningGuardIds?.includes(guardId)) {
        const coWorkers = roster.morningGuardIds
          .filter(id => id !== guardId)
          .map(id => guards.find(g => g.id === id))
          .filter((g): g is Guard => Boolean(g));

        return {
          type: "morning" as const,
          label: "กะเช้า",
          badge: "07:00 - 19:00 น.",
          time: "07:00 - 19:00 น. (12 ชม.)",
          color: "amber",
          coWorkers
        };
      }

      if (roster.nightGuardIds?.includes(guardId)) {
        const coWorkers = roster.nightGuardIds
          .filter(id => id !== guardId)
          .map(id => guards.find(g => g.id === id))
          .filter((g): g is Guard => Boolean(g));

        return {
          type: "night" as const,
          label: "กะดึก",
          badge: "19:00 - 07:00 น.",
          time: "19:00 - 07:00 น. (12 ชม.)",
          color: "indigo",
          coWorkers
        };
      }

      if (roster.offGuardIds?.includes(guardId)) {
        return {
          type: "off" as const,
          label: "วันพัก",
          badge: "ออกเวร",
          detail: "พักผ่อนหลังออกเวร",
          time: "ตลอดวัน",
          color: "slate",
          coWorkers: [] as Guard[]
        };
      }
    }

    // 4. Fallback default by regular shift
    if (currentUser) {
      if (currentUser.shift === "morning") {
        const coWorkers = guards.filter(g => g.id !== guardId && g.role === "guard" && g.shift === "morning");
        return {
          type: "morning" as const,
          label: "กะเช้า",
          badge: "07:00 - 19:00 น.",
          time: "07:00 - 19:00 น.",
          color: "amber",
          coWorkers
        };
      } else {
        const coWorkers = guards.filter(g => g.id !== guardId && g.role === "guard" && g.shift === "night");
        return {
          type: "night" as const,
          label: "กะดึก",
          badge: "19:00 - 07:00 น.",
          time: "19:00 - 07:00 น.",
          color: "indigo",
          coWorkers
        };
      }
    }

    return {
      type: "none" as const,
      label: "ไม่มีเวร",
      badge: "-",
      time: "-",
      color: "slate",
      coWorkers: [] as Guard[]
    };
  };

  // Calculations for selected month
  const daysInMonth = new Date(scheduleYear, scheduleMonth + 1, 0).getDate();
  const monthPrefix = `${scheduleYear}-${String(scheduleMonth + 1).padStart(2, "0")}`;
  const firstDayWeekday = new Date(scheduleYear, scheduleMonth, 1).getDay();

  const monthDatesList: string[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    monthDatesList.push(`${monthPrefix}-${String(d).padStart(2, "0")}`);
  }

  // Today's details
  const todayStr = (() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  })();

  const todayDuty = currentUser ? getGuardDutyForDate(currentUser.id, todayStr) : null;
  const todayObj = new Date();
  const todayThaiDay = thaiDayNamesFull[todayObj.getDay()];
  const todayThaiDate = `${todayObj.getDate()} ${thaiMonths[todayObj.getMonth()]} ${todayObj.getFullYear() + 543}`;

  // Monthly stats for currentUser
  const monthlyStats = (() => {
    if (!currentUser) return { morning: 0, night: 0, dayOff: 0, leave: 0, totalWorking: 0 };
    let morning = 0;
    let night = 0;
    let dayOff = 0;
    let leave = 0;

    monthDatesList.forEach(d => {
      const duty = getGuardDutyForDate(currentUser.id, d);
      if (duty.type === "morning") morning++;
      else if (duty.type === "night") night++;
      else if (duty.type === "day_off") dayOff++;
      else if (duty.type === "leave") leave++;
    });

    return {
      morning,
      night,
      dayOff,
      leave,
      totalWorking: morning + night
    };
  })();

  const handlePrevScheduleMonth = () => {
    if (scheduleMonth === 0) {
      setScheduleMonth(11);
      setScheduleYear(y => y - 1);
    } else {
      setScheduleMonth(m => m - 1);
    }
  };

  const handleNextScheduleMonth = () => {
    if (scheduleMonth === 11) {
      setScheduleMonth(0);
      setScheduleYear(y => y + 1);
    } else {
      setScheduleMonth(m => m + 1);
    }
  };

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
                : todayDuty?.type === "night"
                ? "bg-indigo-100 text-indigo-900 border-indigo-200"
                : todayDuty?.type === "day_off"
                ? "bg-emerald-100 text-emerald-900 border-emerald-200"
                : todayDuty?.type === "leave"
                ? "bg-rose-100 text-rose-900 border-rose-200"
                : "bg-sky-100 text-sky-800 border-sky-200"
            }`}>
              {todayDuty?.type === "morning" ? "กะเช้า ☀️" : todayDuty?.type === "night" ? "กะดึก 🌙" : todayDuty?.type === "day_off" ? "วันหยุด 🏖️" : todayDuty?.type === "leave" ? "ลา 🏥" : "เวรปกติ"}
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
            : todayDuty?.type === "night"
            ? "bg-gradient-to-br from-indigo-500/10 via-indigo-50/70 to-blue-50 border-indigo-200"
            : todayDuty?.type === "day_off"
            ? "bg-gradient-to-br from-emerald-500/10 via-emerald-50/70 to-teal-50 border-emerald-200"
            : todayDuty?.type === "leave"
            ? "bg-gradient-to-br from-rose-500/10 via-rose-50/70 to-pink-50 border-rose-200"
            : "bg-white border-slate-200"
        }`}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                <Calendar className="w-3.5 h-3.5 text-sky-600" />
                <span>{todayThaiDay}ที่ {todayThaiDate}</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                {todayDuty?.type === "morning" && (
                  <>
                    <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Sun className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-black text-amber-950 leading-tight">วันนี้เข้ากะเช้า</h2>
                      <span className="text-[11px] text-amber-700 font-medium">07:00 - 19:00 น. (12 ชั่วโมง)</span>
                    </div>
                  </>
                )}
                {todayDuty?.type === "night" && (
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
                {todayDuty?.type === "day_off" && (
                  <>
                    <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <span className="text-base">🏖️</span>
                    </div>
                    <div>
                      <h2 className="text-base font-black text-emerald-950 leading-tight">วันนี้เป็นวันหยุดของคุณ</h2>
                      <span className="text-[11px] text-emerald-700 font-medium">พักผ่อนตามอัธยาศัย (ไม่มีเวร)</span>
                    </div>
                  </>
                )}
                {todayDuty?.type === "leave" && (
                  <>
                    <div className="w-8 h-8 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <span className="text-base">🏥</span>
                    </div>
                    <div>
                      <h2 className="text-base font-black text-rose-950 leading-tight">วันนี้คุณลางาน</h2>
                      <span className="text-[11px] text-rose-700 font-medium">{todayDuty.badge} (อนุมัติแล้ว)</span>
                    </div>
                  </>
                )}
                {(!todayDuty || todayDuty.type === "off" || todayDuty.type === "none") && (
                  <>
                    <div className="w-8 h-8 rounded-xl bg-slate-400 text-white flex items-center justify-center shrink-0">
                      <Coffee className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-black text-slate-900 leading-tight">วันนี้ไม่มีเวรปฏิบัติหน้าที่</h2>
                      <span className="text-[11px] text-slate-500 font-medium">พักผ่อนหลังออกเวร</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            <button
              onClick={() => setShowScheduleModal(true)}
              className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-sky-300 text-xs font-bold text-sky-700 shadow-2xs hover:shadow-xs active:scale-95 transition-all flex items-center gap-1 shrink-0 mt-1"
            >
              <Calendar className="w-3.5 h-3.5" /> ตารางเวร &gt;
            </button>
          </div>

          {/* Co-workers on duty today */}
          {todayDuty && (todayDuty.type === "morning" || todayDuty.type === "night") && (
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

          {todayDuty && todayDuty.type === "day_off" && (
            <div className="pt-2 border-t border-emerald-200/60 text-xs text-emerald-800 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>วันหยุดประจำสัปดาห์ตามที่หัวหน้างานกำหนด พักผ่อนให้เต็มที่ครับ</span>
            </div>
          )}

          {todayDuty && todayDuty.type === "leave" && (
            <div className="pt-2 border-t border-rose-200/60 text-xs text-rose-800 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              <span>คำขอลาได้รับการอนุมัติเรียบร้อย ระบบข้ามเวรให้อัตโนมัติ</span>
            </div>
          )}
        </div>

        {/* Patrol Progress Quick Widget */}
        <div className="p-5 bg-white border border-sky-100 rounded-3xl shadow-sm space-y-3">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-sky-600">ความคืบหน้ารอบเวร</span>
              <h2 className="text-lg font-black text-slate-900 mt-0.5">เดินตรวจ 20 จุดตรวจความปลอดภัย</h2>
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
          {/* Module 4: My Schedule */}
          <button
            type="button"
            onClick={() => setShowScheduleModal(true)}
            className="w-full text-left group block p-4 bg-white hover:bg-amber-50/40 border border-amber-200/70 hover:border-amber-400 rounded-2xl transition-all shadow-xs active:scale-[0.98]"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                  <Calendar className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 text-base">ตารางเวรของฉัน (My Shifts)</h3>
                    <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md font-semibold">
                      รายเดือน
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">เช็กกะเช้า/กะดึกทั้งเดือน • วันหยุด • เพื่อนร่วมกะ</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-amber-600 transition-colors" />
            </div>
          </button>

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
                    <h3 className="font-bold text-slate-900 text-base">โมดูล 1: เดินตรวจ 20 จุด</h3>
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

      {/* MY SCHEDULE MODAL (ตารางเวรประจำตัวของฉัน) */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-sky-100 flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-sky-50 via-white to-blue-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                  {currentUser.name.substring(0, 2)}
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-sky-600" /> ตารางเวรของฉัน
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    {currentUser.name} • รปภ. โรงพยาบาลพล
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowScheduleModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                title="ปิดหน้าต่าง"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              {/* Month Navigator */}
              <div className="flex items-center justify-between bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shadow-2xs">
                <button
                  onClick={handlePrevScheduleMonth}
                  className="p-2 hover:bg-white rounded-xl text-slate-600 hover:text-slate-900 transition-all active:scale-90"
                  title="เดือนก่อนหน้า"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="text-center">
                  <span className="text-sm font-black text-slate-900 tracking-wide block">
                    {thaiMonths[scheduleMonth]} {scheduleYear + 543}
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium">
                    รวมทั้งสิ้น {daysInMonth} วัน
                  </span>
                </div>
                <button
                  onClick={handleNextScheduleMonth}
                  className="p-2 hover:bg-white rounded-xl text-slate-600 hover:text-slate-900 transition-all active:scale-90"
                  title="เดือนถัดไป"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Monthly Stats Badges */}
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="p-2.5 rounded-2xl bg-amber-50 border border-amber-200/80 shadow-2xs">
                  <Sun className="w-4 h-4 text-amber-600 mx-auto mb-1" />
                  <span className="text-base font-black text-amber-900 block leading-tight">{monthlyStats.morning}</span>
                  <span className="text-[10px] text-amber-700 font-bold">กะเช้า</span>
                </div>
                <div className="p-2.5 rounded-2xl bg-indigo-50 border border-indigo-200/80 shadow-2xs">
                  <Moon className="w-4 h-4 text-indigo-600 mx-auto mb-1" />
                  <span className="text-base font-black text-indigo-900 block leading-tight">{monthlyStats.night}</span>
                  <span className="text-[10px] text-indigo-700 font-bold">กะดึก</span>
                </div>
                <div className="p-2.5 rounded-2xl bg-emerald-50 border border-emerald-200/80 shadow-2xs">
                  <span className="text-sm block mb-1">🏖️</span>
                  <span className="text-base font-black text-emerald-900 block leading-tight">{monthlyStats.dayOff}</span>
                  <span className="text-[10px] text-emerald-700 font-bold">วันหยุด</span>
                </div>
                <div className="p-2.5 rounded-2xl bg-rose-50 border border-rose-200/80 shadow-2xs">
                  <span className="text-sm block mb-1">🏥</span>
                  <span className="text-base font-black text-rose-900 block leading-tight">{monthlyStats.leave}</span>
                  <span className="text-[10px] text-rose-700 font-bold">วันลา</span>
                </div>
              </div>

              {/* View Switcher Toggle */}
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold w-full">
                  <button
                    onClick={() => setScheduleViewMode("agenda")}
                    className={`flex-1 py-1.5 rounded-lg transition-all text-center ${
                      scheduleViewMode === "agenda"
                        ? "bg-white text-sky-700 shadow-2xs"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    📋 รายการรายวัน (Agenda)
                  </button>
                  <button
                    onClick={() => setScheduleViewMode("calendar")}
                    className={`flex-1 py-1.5 rounded-lg transition-all text-center ${
                      scheduleViewMode === "calendar"
                        ? "bg-white text-sky-700 shadow-2xs"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    📅 ปฏิทิน (Grid)
                  </button>
                </div>
              </div>

              {/* VIEW 1: AGENDA LIST VIEW */}
              {scheduleViewMode === "agenda" && (
                <div className="space-y-3">
                  {/* Filter Pills */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                    <button
                      onClick={() => setScheduleFilter("all")}
                      className={`px-3 py-1 rounded-full font-bold whitespace-nowrap transition-all ${
                        scheduleFilter === "all"
                          ? "bg-slate-900 text-white shadow-xs"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      ทั้งหมด ({monthDatesList.length})
                    </button>
                    <button
                      onClick={() => setScheduleFilter("working")}
                      className={`px-3 py-1 rounded-full font-bold whitespace-nowrap transition-all ${
                        scheduleFilter === "working"
                          ? "bg-sky-600 text-white shadow-xs"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      เข้าเวร ({monthlyStats.totalWorking})
                    </button>
                    <button
                      onClick={() => setScheduleFilter("off")}
                      className={`px-3 py-1 rounded-full font-bold whitespace-nowrap transition-all ${
                        scheduleFilter === "off"
                          ? "bg-emerald-600 text-white shadow-xs"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      วันหยุด/ลา ({monthlyStats.dayOff + monthlyStats.leave})
                    </button>
                  </div>

                  {/* List of Days */}
                  <div className="space-y-2.5">
                    {monthDatesList
                      .filter(dStr => {
                        const duty = getGuardDutyForDate(currentUser.id, dStr);
                        if (scheduleFilter === "working") {
                          return duty.type === "morning" || duty.type === "night";
                        }
                        if (scheduleFilter === "off") {
                          return duty.type === "day_off" || duty.type === "leave" || duty.type === "off";
                        }
                        return true;
                      })
                      .map(dStr => {
                        const dateObj = new Date(dStr);
                        const dayNum = dateObj.getDate();
                        const dayOfWeek = dateObj.getDay();
                        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                        const isToday = dStr === todayStr;
                        const duty = getGuardDutyForDate(currentUser.id, dStr);

                        return (
                          <div
                            key={dStr}
                            className={`p-3.5 rounded-2xl border transition-all ${
                              isToday
                                ? "bg-sky-50/60 border-sky-400 ring-2 ring-sky-300 shadow-xs"
                                : duty.type === "morning"
                                ? "bg-white border-amber-200/90 hover:border-amber-400"
                                : duty.type === "night"
                                ? "bg-white border-indigo-200/90 hover:border-indigo-400"
                                : duty.type === "day_off"
                                ? "bg-emerald-50/40 border-emerald-200"
                                : duty.type === "leave"
                                ? "bg-rose-50/40 border-rose-200"
                                : "bg-slate-50 border-slate-200"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              {/* Date Info */}
                              <div className="flex items-center gap-2.5">
                                <div className={`w-10 h-10 rounded-2xl flex flex-col items-center justify-center font-black ${
                                  isToday
                                    ? "bg-sky-600 text-white shadow-xs"
                                    : isWeekend
                                    ? "bg-rose-100 text-rose-700"
                                    : "bg-slate-100 text-slate-800"
                                }`}>
                                  <span className="text-[10px] leading-none uppercase font-bold">{thaiDayNamesShort[dayOfWeek]}</span>
                                  <span className="text-sm leading-none mt-0.5">{dayNum}</span>
                                </div>

                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-extrabold text-sm text-slate-900">
                                      {thaiDayNamesFull[dayOfWeek]}ที่ {dayNum} {thaiMonths[scheduleMonth]}
                                    </span>
                                    {isToday && (
                                      <span className="px-1.5 py-0.2 rounded bg-sky-500 text-white text-[9px] font-bold">
                                        วันนี้
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-[11px] text-slate-500">
                                    {duty.time}
                                  </span>
                                </div>
                              </div>

                              {/* Duty Badge */}
                              <div className="shrink-0">
                                {duty.type === "morning" && (
                                  <span className="px-2.5 py-1 rounded-xl bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold flex items-center gap-1">
                                    <Sun className="w-3.5 h-3.5 text-amber-600" /> กะเช้า
                                  </span>
                                )}
                                {duty.type === "night" && (
                                  <span className="px-2.5 py-1 rounded-xl bg-indigo-100 text-indigo-900 border border-indigo-200 text-xs font-bold flex items-center gap-1">
                                    <Moon className="w-3.5 h-3.5 text-indigo-600" /> กะดึก
                                  </span>
                                )}
                                {duty.type === "day_off" && (
                                  <span className="px-2.5 py-1 rounded-xl bg-emerald-100 text-emerald-900 border border-emerald-200 text-xs font-bold flex items-center gap-1">
                                    🏖️ วันหยุด
                                  </span>
                                )}
                                {duty.type === "leave" && (
                                  <span className="px-2.5 py-1 rounded-xl bg-rose-100 text-rose-900 border border-rose-200 text-xs font-bold flex items-center gap-1">
                                    🏥 ลา ({duty.badge})
                                  </span>
                                )}
                                {(duty.type === "off" || duty.type === "none") && (
                                  <span className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-600 border border-slate-200 text-xs font-semibold">
                                    ออกเวร
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Co-workers on this shift */}
                            {(duty.type === "morning" || duty.type === "night") && (
                              <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs">
                                <div className="flex items-center gap-1.5 text-slate-600 flex-wrap">
                                  <span className="font-semibold text-[11px] text-slate-500">เพื่อนร่วมกะ:</span>
                                  {duty.coWorkers.length === 0 ? (
                                    <span className="text-slate-400 italic text-[11px]">ไม่มีเพื่อนร่วมกะ</span>
                                  ) : (
                                    duty.coWorkers.map(cw => (
                                      <span
                                        key={cw.id}
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-800 text-[11px] font-medium"
                                      >
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                        {cw.name.replace("นาย", "")}
                                        {cw.phone && (
                                          <a
                                            href={`tel:${cw.phone}`}
                                            className="text-sky-600 hover:text-sky-800 ml-0.5"
                                            title={`โทรหา ${cw.name} (${cw.phone})`}
                                          >
                                            <Phone className="w-3 h-3" />
                                          </a>
                                        )}
                                      </span>
                                    ))
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* VIEW 2: CALENDAR GRID VIEW */}
              {scheduleViewMode === "calendar" && (
                <div className="space-y-3">
                  {/* 7 Columns Header */}
                  <div className="grid grid-cols-7 gap-1 text-center">
                    {thaiDayNamesShort.map((dayName, idx) => (
                      <div
                        key={dayName}
                        className={`py-1 rounded-lg text-[11px] font-bold ${
                          idx === 0 || idx === 6
                            ? "bg-rose-50 text-rose-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {dayName}
                      </div>
                    ))}
                  </div>

                  {/* Calendar Grid Tiles */}
                  <div className="grid grid-cols-7 gap-1">
                    {Array.from({ length: firstDayWeekday }).map((_, i) => (
                      <div
                        key={`guard-pad-${i}`}
                        className="p-1 rounded-xl bg-slate-50/40 border border-dashed border-slate-200/50 opacity-40 min-h-[52px]"
                      />
                    ))}

                    {monthDatesList.map(dStr => {
                      const dateObj = new Date(dStr);
                      const dayNum = dateObj.getDate();
                      const dayOfWeek = dateObj.getDay();
                      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                      const isToday = dStr === todayStr;
                      const duty = getGuardDutyForDate(currentUser.id, dStr);
                      const isSelected = selectedDateDetail === dStr;

                      return (
                        <button
                          key={dStr}
                          type="button"
                          onClick={() => setSelectedDateDetail(dStr === selectedDateDetail ? null : dStr)}
                          className={`p-1 rounded-xl border flex flex-col items-center justify-between transition-all min-h-[56px] text-left active:scale-95 ${
                            isSelected
                              ? "ring-2 ring-sky-600 shadow-sm"
                              : ""
                          } ${
                            isToday
                              ? "border-sky-500 bg-sky-50/80"
                              : duty.type === "morning"
                              ? "bg-amber-50/70 border-amber-200 hover:border-amber-400"
                              : duty.type === "night"
                              ? "bg-indigo-50/70 border-indigo-200 hover:border-indigo-400"
                              : duty.type === "day_off"
                              ? "bg-emerald-50/70 border-emerald-200 hover:border-emerald-400"
                              : duty.type === "leave"
                              ? "bg-rose-50/70 border-rose-200 hover:border-rose-400"
                              : "bg-slate-50 border-slate-200"
                          }`}
                        >
                          <div className="w-full flex items-center justify-between px-0.5">
                            <span className={`text-[11px] font-black ${isWeekend ? "text-rose-600" : "text-slate-800"}`}>
                              {dayNum}
                            </span>
                            {isToday && (
                              <span className="w-1.5 h-1.5 rounded-full bg-sky-600" />
                            )}
                          </div>

                          <div className="w-full text-center">
                            {duty.type === "morning" && (
                              <span className="text-[9px] font-bold text-amber-800 bg-white/90 px-1 py-0.2 rounded shadow-2xs block truncate">
                                ☀️ เช้า
                              </span>
                            )}
                            {duty.type === "night" && (
                              <span className="text-[9px] font-bold text-indigo-800 bg-white/90 px-1 py-0.2 rounded shadow-2xs block truncate">
                                🌙 ดึก
                              </span>
                            )}
                            {duty.type === "day_off" && (
                              <span className="text-[9px] font-bold text-emerald-800 bg-white/90 px-1 py-0.2 rounded shadow-2xs block truncate">
                                🏖️ หยุด
                              </span>
                            )}
                            {duty.type === "leave" && (
                              <span className="text-[9px] font-bold text-rose-800 bg-white/90 px-1 py-0.2 rounded shadow-2xs block truncate">
                                🏥 ลา
                              </span>
                            )}
                            {(duty.type === "off" || duty.type === "none") && (
                              <span className="text-[9px] text-slate-300 block">-</span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Selected Day Popover Detail */}
                  {selectedDateDetail && (() => {
                    const duty = getGuardDutyForDate(currentUser.id, selectedDateDetail);
                    const dObj = new Date(selectedDateDetail);
                    const dNum = dObj.getDate();
                    const dWk = dObj.getDay();

                    return (
                      <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 animate-in fade-in-50">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-xs text-slate-900">
                            รายละเอียด: {thaiDayNamesFull[dWk]}ที่ {dNum} {thaiMonths[scheduleMonth]} {scheduleYear + 543}
                          </span>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            duty.type === "morning" ? "bg-amber-100 text-amber-900" :
                            duty.type === "night" ? "bg-indigo-100 text-indigo-900" :
                            duty.type === "day_off" ? "bg-emerald-100 text-emerald-900" :
                            duty.type === "leave" ? "bg-rose-100 text-rose-900" : "bg-slate-200 text-slate-700"
                          }`}>
                            {duty.label} ({duty.badge})
                          </span>
                        </div>
                        <div className="text-xs text-slate-600">
                          <strong>เวลาปฏิบัติงาน:</strong> {duty.time}
                        </div>
                        {(duty.type === "morning" || duty.type === "night") && (
                          <div className="text-xs space-y-1">
                            <span className="font-bold text-slate-700">เพื่อนร่วมกะ:</span>
                            <div className="flex flex-wrap gap-1.5">
                              {duty.coWorkers.length === 0 ? (
                                <span className="text-slate-400 italic">ไม่มีเพื่อนร่วมกะ</span>
                              ) : (
                                duty.coWorkers.map(cw => (
                                  <span key={cw.id} className="px-2 py-0.5 bg-white border border-slate-200 rounded-lg text-[11px] flex items-center gap-1 font-medium">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    {cw.name}
                                    {cw.phone && (
                                      <a href={`tel:${cw.phone}`} className="text-sky-600 ml-1">
                                        <Phone className="w-3 h-3 inline" />
                                      </a>
                                    )}
                                  </span>
                                ))
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Guard Team Directory */}
              <div className="p-3.5 bg-sky-50/50 border border-sky-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-sky-900">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-sky-600" />
                    สมุดเบอร์โทรเพื่อนร่วมทีม รปภ. (สำหรับประสานงาน/แลกเวร)
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {guards.filter(g => g.role === "guard").map(g => (
                    <div
                      key={g.id}
                      className="p-2 rounded-xl bg-white border border-slate-200 flex items-center justify-between shadow-2xs"
                    >
                      <div className="space-y-0.5">
                        <span className="font-bold text-slate-900 block">{g.name}</span>
                        <span className="text-[10px] text-slate-500 block">
                          {g.shift === "morning" ? "กะเช้าประจำ" : "กะดึกประจำ"}
                        </span>
                      </div>
                      {g.phone && (
                        <a
                          href={`tel:${g.phone}`}
                          className="px-2.5 py-1 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 font-bold text-[11px] flex items-center gap-1 active:scale-95 transition-all"
                        >
                          <Phone className="w-3 h-3" /> {g.phone}
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 sm:p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">
                หากต้องการขอแลกเวร กรุณาแจ้งหัวหน้างานล่วงหน้า
              </span>
              <button
                type="button"
                onClick={() => setShowScheduleModal(false)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl active:scale-95 transition-all shadow-xs"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
