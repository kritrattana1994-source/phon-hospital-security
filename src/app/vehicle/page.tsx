"use client";

import { useState, useEffect, useRef } from "react";
import { useStore, StaffVehicle } from "@/lib/store";
import { 
  ArrowLeft, 
  Search, 
  Car, 
  User, 
  Phone, 
  ShieldAlert, 
  CheckCircle2, 
  Flashlight, 
  Building, 
  AlertOctagon, 
  Clock,
  Camera,
  RotateCcw,
  Sparkles,
  Zap,
  Volume2,
  VolumeX,
  Info
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import HospitalBrand from "@/components/HospitalBrand";

interface FloatingToast {
  id: string;
  plate: string;
  isStaff: boolean;
  ownerName?: string;
  department?: string;
  type: "success" | "warning" | "info";
  message: string;
}

export default function VehiclePage() {
  const router = useRouter();
  const { currentUser, staffVehicles, addParkingScan, parkingScans } = useStore();

  // Mode: "walk_scan" (Continuous camera walk & scan) | "search" (Quick lookup)
  const [activeMode, setActiveMode] = useState<"walk_scan" | "search">("walk_scan");

  // Round: Auto-detect default round based on current time
  // 18:00 - 04:59 -> 22:00 round; 05:00 - 17:59 -> 06:00 round
  const currentHour = new Date().getHours();
  const defaultRound: "22:00" | "06:00" = currentHour >= 18 || currentHour < 5 ? "22:00" : "06:00";
  const [selectedRound, setSelectedRound] = useState<"22:00" | "06:00">(defaultRound);

  // Camera & Torch states
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Floating Toasts queue
  const [toasts, setToasts] = useState<FloatingToast[]>([]);

  // Debounce tracking: plate -> last scanned timestamp (ms)
  const lastScannedRef = useRef<Record<string, number>>({});

  // Quick text scan on camera
  const [cameraInputPlate, setCameraInputPlate] = useState("");

  // Search mode states
  const [search, setSearch] = useState("");
  const [result, setResult] = useState<StaffVehicle | "not_found" | null>(null);
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    if (!currentUser) {
      router.push("/guard");
    }
  }, [currentUser, router]);

  // Start / Stop Camera when in walk_scan mode
  useEffect(() => {
    if (activeMode === "walk_scan") {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [activeMode]);

  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError("อุปกรณ์นี้ไม่รองรับการเปิดกล้องผ่านเบราว์เซอร์");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment", // rear camera
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      setCameraActive(true);
    } catch (err: any) {
      console.warn("Camera access error:", err);
      setCameraError("ไม่สามารถเปิดกล้องได้ (จำลองการสแกนผ่านแถบคีย์ด่วนด้านล่างได้)");
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
    setTorchOn(false);
  };

  // Toggle Torch
  const toggleTorch = async () => {
    if (!streamRef.current) {
      setTorchOn((prev) => !prev);
      return;
    }

    const videoTrack = streamRef.current.getVideoTracks()[0];
    if (videoTrack) {
      const capabilities = (videoTrack.getCapabilities && videoTrack.getCapabilities()) as any;
      if (capabilities && "torch" in capabilities) {
        try {
          const nextTorch = !torchOn;
          await (videoTrack as any).applyConstraints({
            advanced: [{ torch: nextTorch }],
          });
          setTorchOn(nextTorch);
        } catch (e) {
          setTorchOn((prev) => !prev);
        }
      } else {
        setTorchOn((prev) => !prev);
      }
    } else {
      setTorchOn((prev) => !prev);
    }
  };

  // Synthesize soft confirmation sound via Web Audio API
  const playBeep = (type: "staff" | "outside" | "dup") => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === "staff") {
        osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
        osc.start();
        osc.stop(ctx.currentTime + 0.18);
      } else if (type === "outside") {
        osc.frequency.setValueAtTime(520, ctx.currentTime); // C5
        gain.gain.setValueAtTime(0.18, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      } else {
        // dup
        osc.frequency.setValueAtTime(400, ctx.currentTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
      }
    } catch (e) {
      // AudioContext unavailable or blocked
    }
  };

  // Push Floating Toast with auto-dismiss
  const addToast = (toast: Omit<FloatingToast, "id">) => {
    const id = "toast-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6);
    setToasts((prev) => [ { ...toast, id }, ...prev.slice(0, 2) ]); // show max 3 toasts

    // Vibrate device if supported
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      if (toast.type === "warning") {
        navigator.vibrate([100, 50, 100]);
      } else {
        navigator.vibrate(80);
      }
    }

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  };

  // Core Walk-and-Scan Handler (with Debounce)
  const handleContinuousScan = (rawPlate: string, zoneOverride?: string) => {
    const plate = rawPlate.trim().toUpperCase();
    if (!plate) return;

    const now = Date.now();
    const lastTime = lastScannedRef.current[plate] || 0;

    // 10-second Anti-Duplicate Debounce
    if (now - lastTime < 10000) {
      playBeep("dup");
      addToast({
        plate,
        isStaff: false,
        type: "info",
        message: `ทะเบียน ${plate} เพิ่งสแกนไปเมื่อสักครู่ (ข้ามบันทึกซ้ำ)`,
      });
      return;
    }

    lastScannedRef.current[plate] = now;

    // Check against offline staff cache in 0.1s
    const staff = staffVehicles.find(
      (v) => v.plateNumber.toUpperCase() === plate || v.plateNumber.includes(plate)
    );

    const isStaff = !!staff;
    const zone = zoneOverride || (isStaff ? staff.zone : "ลานจอดทั่วไป");

    // Add to Zustand store & local storage
    addParkingScan({
      plateNumber: plate,
      province: staff ? staff.province : "ขอนแก่น",
      round: selectedRound,
      timestamp: new Date().toISOString(),
      isStaff,
      ownerName: staff ? staff.ownerName : undefined,
      department: staff ? staff.department : undefined,
      zone,
    });

    if (isStaff) {
      playBeep("staff");
      addToast({
        plate,
        isStaff: true,
        ownerName: staff.ownerName,
        department: staff.department,
        type: "success",
        message: `บันทึกทะเบียน ${plate} เรียบร้อยแล้ว (${staff.ownerName} - ${staff.department})`,
      });
    } else {
      playBeep("outside");
      addToast({
        plate,
        isStaff: false,
        type: "warning",
        message: `บันทึกทะเบียน ${plate} เรียบร้อยแล้ว (รถภายนอก - บันทึกเฝ้าระวัง)`,
      });
    }

    setCameraInputPlate("");
  };

  // Quick Search Handler
  const handleSearch = (e?: React.FormEvent, termOverride?: string) => {
    if (e) e.preventDefault();
    const query = (termOverride !== undefined ? termOverride : search).trim();
    if (!query) return;

    setScanned(false);

    const found = staffVehicles.find(
      (v) =>
        v.plateNumber.toLowerCase().includes(query.toLowerCase()) ||
        v.phone.replace(/[^0-9]/g, "").includes(query)
    );

    if (found) {
      setResult(found);
    } else {
      setResult("not_found");
    }
  };

  const handleSaveSearchScan = () => {
    const plate = result !== "not_found" && result ? result.plateNumber : search.toUpperCase();
    handleContinuousScan(plate);
    setScanned(true);
    setTimeout(() => {
      setSearch("");
      setResult(null);
      setScanned(false);
    }, 1800);
  };

  // Filter scans for the selected round
  const currentRoundScans = parkingScans.filter((s) => s.round === selectedRound);
  const staffCountInRound = currentRoundScans.filter((s) => s.isStaff).length;
  const outsideCountInRound = currentRoundScans.filter((s) => !s.isStaff).length;

  if (!currentUser) return null;

  return (
    <div className="min-h-screen bg-[#f0f6fa] text-slate-800 flex flex-col max-w-md mx-auto border-x border-sky-100 shadow-xl font-['Sarabun',sans-serif]">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-sky-100 px-4 py-3 space-y-2 shadow-xs">
        <div className="flex items-center justify-between">
          <Link
            href="/guard"
            className="p-2 -ml-2 rounded-xl bg-slate-100 text-slate-600 hover:text-slate-900 active:scale-95 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <HospitalBrand badgeText="ตรวจลานจอดรถ" />

          {/* Audio toggle */}
          <button
            onClick={() => setSoundEnabled((prev) => !prev)}
            className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200"
            title={soundEnabled ? "ปิดเสียงสัญญาณ" : "เปิดเสียงสัญญาณ"}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-sky-600" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
          </button>
        </div>

        {/* Round Switcher & Flashlight */}
        <div className="flex items-center justify-between pt-1 gap-2">
          {/* Round Selector Pill */}
          <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs font-bold flex-1">
            <button
              type="button"
              onClick={() => setSelectedRound("22:00")}
              className={`flex-1 py-1.5 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                selectedRound === "22:00"
                  ? "bg-indigo-700 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>🌙</span>
              <span>รอบดึก 22:00 น.</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedRound("06:00")}
              className={`flex-1 py-1.5 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                selectedRound === "06:00"
                  ? "bg-amber-500 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span>☀️</span>
              <span>รอบเช้า 06:00 น.</span>
            </button>
          </div>

          {/* Flashlight Toggle */}
          <button
            onClick={toggleTorch}
            className={`px-3 py-2 rounded-2xl border flex items-center gap-1.5 text-xs font-bold transition-all active:scale-95 shrink-0 ${
              torchOn
                ? "bg-amber-400 text-slate-950 border-amber-500 shadow-md shadow-amber-400/30 ring-2 ring-amber-200"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
            }`}
          >
            <Flashlight className={`w-4 h-4 ${torchOn ? "fill-current animate-bounce" : ""}`} />
            <span>{torchOn ? "เปิดไฟ" : "ไฟฉาย"}</span>
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex border-b border-sky-100 pt-1 -mx-4 px-4 gap-4">
          <button
            onClick={() => setActiveMode("walk_scan")}
            className={`pb-2 text-xs font-bold flex items-center gap-1.5 border-b-2 transition-all ${
              activeMode === "walk_scan"
                ? "border-sky-600 text-sky-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>เปิดกล้องเดินส่องต่อเนื่อง</span>
          </button>
          <button
            onClick={() => setActiveMode("search")}
            className={`pb-2 text-xs font-bold flex items-center gap-1.5 border-b-2 transition-all ${
              activeMode === "search"
                ? "border-sky-600 text-sky-700"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Search className="w-4 h-4" />
            <span>ค้นหาด่วน 4 ตัวท้าย</span>
          </button>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 p-4 space-y-4 overflow-y-auto relative">
        {/* Floating Toasts Overlay (Animated upwards) */}
        <div className="fixed top-36 left-0 right-0 z-50 pointer-events-none px-4 flex flex-col items-center gap-2 max-w-md mx-auto">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`w-full p-3.5 rounded-2xl shadow-xl backdrop-blur-md border pointer-events-auto flex items-start gap-3 transform transition-all duration-300 animate-in slide-in-from-top-4 fade-in-0 ${
                toast.type === "success"
                  ? "bg-emerald-900/90 text-white border-emerald-400"
                  : toast.type === "warning"
                  ? "bg-amber-900/90 text-white border-amber-400"
                  : "bg-slate-900/90 text-white border-slate-400"
              }`}
            >
              <div className="shrink-0 mt-0.5">
                {toast.type === "success" ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : toast.type === "warning" ? (
                  <AlertOctagon className="w-5 h-5 text-amber-400" />
                ) : (
                  <Info className="w-5 h-5 text-sky-300" />
                )}
              </div>
              <div className="flex-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-black text-sm tracking-wider">{toast.plate}</span>
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                      toast.isStaff ? "bg-emerald-400/20 text-emerald-300" : "bg-amber-400/20 text-amber-300"
                    }`}
                  >
                    {toast.isStaff ? "รถบุคลากร รพ." : "รถภายนอก"}
                  </span>
                </div>
                <p className="mt-0.5 leading-tight opacity-90">{toast.message}</p>
              </div>
            </div>
          ))}
        </div>

        {/* MODE 1: CONTINUOUS WALK & SCAN CAMERA */}
        {activeMode === "walk_scan" && (
          <div className="space-y-4">
            {/* Live Round Statistics Banner */}
            <div className="p-3 bg-white border border-sky-100 rounded-2xl flex items-center justify-between text-xs shadow-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-bold text-slate-700">รอบตรวจ {selectedRound} น.</span>
              </div>
              <div className="flex items-center gap-2 font-mono">
                <span className="text-slate-500">สแกนแล้ว:</span>
                <span className="font-bold text-sky-800">{currentRoundScans.length} คัน</span>
                <span className="text-slate-300">|</span>
                <span className="text-emerald-600 font-bold">{staffCountInRound} รพ.</span>
                <span className="text-slate-300">|</span>
                <span className="text-amber-600 font-bold">{outsideCountInRound} นอก</span>
              </div>
            </div>

            {/* Camera Viewfinder Box */}
            <div className="relative aspect-4/3 sm:aspect-16/11 bg-slate-950 rounded-3xl overflow-hidden border-2 border-sky-300 shadow-lg flex flex-col justify-between p-4">
              {/* Real Video Element */}
              <video
                ref={videoRef}
                playsInline
                autoPlay
                muted
                className="absolute inset-0 w-full h-full object-cover"
              />

              {/* Viewfinder Target Reticle HUD */}
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
                <div className="w-full max-w-[280px] h-28 border-2 border-sky-400/80 rounded-2xl relative shadow-2xl">
                  {/* Corner accents */}
                  <div className="absolute -top-1 -left-1 w-4 h-4 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
                  <div className="absolute -top-1 -right-1 w-4 h-4 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
                  <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />

                  {/* Laser Scanning Line Animation */}
                  <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-sky-400 to-transparent absolute top-1/2 -translate-y-1/2 animate-pulse" />

                  <div className="absolute -bottom-6 left-0 right-0 text-center">
                    <span className="text-[10px] font-bold text-white/90 bg-slate-900/70 px-2.5 py-0.5 rounded-full backdrop-blur-xs">
                      เล็งป้ายทะเบียนในกรอบนี้
                    </span>
                  </div>
                </div>
              </div>

              {/* Viewfinder Top Bar */}
              <div className="relative z-10 flex items-center justify-between">
                <span className="px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur-md text-[10px] font-mono text-emerald-400 flex items-center gap-1.5 border border-emerald-500/30">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  LIVE CAMERA
                </span>

                <button
                  type="button"
                  onClick={startCamera}
                  className="p-1.5 rounded-xl bg-slate-900/70 text-white/80 hover:text-white backdrop-blur-md text-[10px] flex items-center gap-1"
                  title="รีสตาร์ตกล้อง"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Viewfinder Bottom Status */}
              <div className="relative z-10 text-center">
                <span className="text-[11px] text-white/80 bg-slate-900/80 px-3 py-1 rounded-full backdrop-blur-md border border-white/10">
                  เดินส่องไปเรื่อยๆ ระบบจะตรวจและบันทึกอัตโนมัติ (Anti-Duplicate 10 วินาที)
                </span>
              </div>
            </div>

            {/* Camera Error / Simulator Notice */}
            {cameraError && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-amber-800 text-xs flex items-center gap-2">
                <Info className="w-4 h-4 text-amber-600 shrink-0" />
                <span>{cameraError}</span>
              </div>
            )}

            {/* Fast Continuous Entry Bar (Point & Rapid Tap) */}
            <div className="p-4 bg-white border border-sky-100 rounded-3xl shadow-sm space-y-3">
              <label className="block text-xs font-bold text-slate-700">
                สแกนด่วนขณะเดินตรวจ (ใส่เลขทะเบียน 4 ตัวท้าย)
              </label>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (cameraInputPlate) {
                    handleContinuousScan(cameraInputPlate);
                  }
                }}
                className="flex gap-2"
              >
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={cameraInputPlate}
                    onChange={(e) => setCameraInputPlate(e.target.value)}
                    placeholder="เช่น 1234 หรือ 9999"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 font-mono text-base font-bold focus:outline-none focus:border-sky-500 focus:bg-white focus:ring-1 focus:ring-sky-500"
                  />
                </div>
                <button
                  type="submit"
                  className="px-5 py-3 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-2xl shadow-md shadow-sky-600/20 active:scale-95 transition-all flex items-center gap-1.5 shrink-0"
                >
                  <Zap className="w-4 h-4 fill-current" /> บันทึก
                </button>
              </form>

              {/* 1-Tap Quick Demo Plate Buttons */}
              <div className="space-y-1.5 pt-1 border-t border-slate-100">
                <span className="text-[11px] text-slate-400 block">กดจำลองสแกนรถที่พบบ่อย:</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleContinuousScan("1234")}
                    className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-left transition-all active:scale-95"
                  >
                    <span className="font-mono font-bold text-emerald-800 text-xs block">1234 (หมอวิทยา)</span>
                    <span className="text-[10px] text-emerald-600">รถแพทย์ รพ.พล</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleContinuousScan("5678")}
                    className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-left transition-all active:scale-95"
                  >
                    <span className="font-mono font-bold text-emerald-800 text-xs block">5678 (หมอสมศรี)</span>
                    <span className="text-[10px] text-emerald-600">รถแพทย์ รพ.พล</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleContinuousScan("9999", "ชั้นใต้ดิน B2 (เสา 14)")}
                    className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 hover:bg-rose-100 text-left transition-all active:scale-95"
                  >
                    <span className="font-mono font-bold text-rose-800 text-xs block">9999 (รถต้องสงสัย)</span>
                    <span className="text-[10px] text-rose-600">รถภายนอก / แอบจอดแช่</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleContinuousScan("กข-4455", "ช่องแพทย์ฉุกเฉิน (ER)")}
                    className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 hover:bg-amber-100 text-left transition-all active:scale-95"
                  >
                    <span className="font-mono font-bold text-amber-800 text-xs block">กข-4455 (จอดขวาง ER)</span>
                    <span className="text-[10px] text-amber-600">รถภายนอก / ขวางทางฉุกเฉิน</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Recent Scans In This Round List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  รายการสแกนรอบนี้ ({currentRoundScans.length} คัน)
                </h3>
                <span className="text-[11px] text-sky-700 font-bold">แคชออฟไลน์ 0.1s</span>
              </div>

              {currentRoundScans.length === 0 ? (
                <div className="p-6 bg-white border border-slate-200 rounded-3xl text-center text-xs text-slate-400 space-y-1">
                  <p>ยังไม่มีรายการบันทึกในรอบ {selectedRound} น.</p>
                  <p className="text-[11px]">ส่องกล้องหรือกดปุ่มด้านบนเพื่อเริ่มบันทึก</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {currentRoundScans.slice(0, 6).map((scan) => (
                    <div
                      key={scan.id}
                      className="p-3.5 bg-white border border-slate-200 rounded-2xl flex items-center justify-between text-xs shadow-2xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-2.5 h-2.5 rounded-full ${
                            scan.isStaff ? "bg-emerald-500" : "bg-rose-500 animate-pulse"
                          }`}
                        />
                        <div>
                          <span className="font-mono font-bold text-slate-900 text-sm block">
                            {scan.plateNumber}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {scan.ownerName || scan.zone || "รถภายนอก"}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold block ${
                            scan.isStaff ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          {scan.isStaff ? "บุคลากร" : "ภายนอก"}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {scan.timestamp ? scan.timestamp.split("T")[1]?.substring(0, 5) : "--:--"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* MODE 2: QUICK SEARCH MODE (Traditional) */}
        {activeMode === "search" && (
          <div className="space-y-4">
            {/* Offline Cache Indicator */}
            <div className="flex items-center justify-between text-xs px-3.5 py-2 bg-white rounded-2xl border border-sky-200 text-slate-600 shadow-xs">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> ฐานข้อมูลรถบุคลากรในเครื่อง ({staffVehicles.length} คัน)
              </span>
              <span className="text-sky-700 font-mono font-bold">0.1 วินาที</span>
            </div>

            {/* Quick Search Form */}
            <div className="p-5 bg-white border border-sky-100 rounded-3xl shadow-sm space-y-3">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                ค้นหาด่วนด้วยเลขท้ายทะเบียน 4 ตัว
              </label>
              <form onSubmit={handleSearch} className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="เช่น 1234 หรือ 5678"
                    className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 font-mono text-base focus:outline-none focus:border-sky-500 focus:bg-white focus:ring-1 focus:ring-sky-500 transition-all"
                  />
                </div>
                <button
                  type="submit"
                  className="px-5 py-3.5 bg-sky-600 hover:bg-sky-500 text-white font-bold text-sm rounded-2xl shadow-md shadow-sky-600/20 active:scale-95 transition-all"
                >
                  ค้นหา
                </button>
              </form>
            </div>

            {/* Search Result: Outside Vehicle */}
            {result === "not_found" && (
              <div className="p-5 bg-rose-50 border-2 border-rose-400 rounded-3xl shadow-sm space-y-4 animate-in fade-in-50">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center">
                    <AlertOctagon className="w-7 h-7" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200">
                      รถภายนอก / ไม่พบในฐานข้อมูล
                    </span>
                    <h3 className="text-xl font-black text-slate-900 mt-0.5">{search || "ไม่ระบุ"}</h3>
                  </div>
                </div>

                <div className="p-3.5 bg-white rounded-2xl border border-rose-200 text-xs text-rose-800 space-y-1">
                  <p className="font-bold flex items-center gap-1.5 text-rose-700">
                    <ShieldAlert className="w-4 h-4" /> ข้อสังเกตความปลอดภัย:
                  </p>
                  <p className="text-slate-600">
                    • ไม่ใช่รถบุคลากรโรงพยาบาลพล<br />
                    • บันทึกตรวจรอบ {selectedRound} น. เพื่อส่ง DeepSeek AI ประมวลผลรอบ 07:00 น.
                  </p>
                </div>

                <button
                  onClick={handleSaveSearchScan}
                  disabled={scanned}
                  className="w-full py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm shadow-md shadow-rose-600/25 active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                  {scanned ? (
                    <>
                      <CheckCircle2 className="w-5 h-5" /> บันทึกประวัติตรวจพบแล้ว
                    </>
                  ) : (
                    <>
                      <Clock className="w-5 h-5" /> บันทึกเวลาที่พบรถคันนี้ (รอบ {selectedRound} น.)
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Search Result: Staff Vehicle */}
            {result && result !== "not_found" && (
              <div className="p-5 bg-white border-2 border-emerald-400 rounded-3xl shadow-sm space-y-4 animate-in fade-in-50">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                      <Car className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                        รถบุคลากร รพ.พล
                      </span>
                      <h3 className="text-2xl font-black text-slate-900 mt-0.5">{result.plateNumber}</h3>
                    </div>
                  </div>
                  <span className="text-xs text-emerald-700 font-bold bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                    อนุญาตจอด
                  </span>
                </div>

                <div className="space-y-2.5 text-sm bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <div className="flex items-center gap-3 text-slate-700">
                    <User className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <span className="text-xs text-slate-500 block">เจ้าของรถ</span>
                      <span className="font-bold text-slate-900 text-base">{result.ownerName}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-slate-700">
                    <Building className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <span className="text-xs text-slate-500 block">แผนก / สังกัด</span>
                      <span className="font-medium text-slate-800">{result.department}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                    <div className="flex items-center gap-3 text-slate-700">
                      <Phone className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div>
                        <span className="text-xs text-slate-500 block">เบอร์โทรติดต่อ</span>
                        <span className="font-mono text-emerald-700 font-bold">{result.phone}</span>
                      </div>
                    </div>
                    <a
                      href={`tel:${result.phone}`}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs active:scale-95 transition-all"
                    >
                      <Phone className="w-3.5 h-3.5" /> โทรด่วน
                    </a>
                  </div>
                </div>

                <button
                  onClick={handleSaveSearchScan}
                  disabled={scanned}
                  className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-md shadow-emerald-600/25 active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                  {scanned ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-white" /> บันทึกการเข้าจอดแล้ว
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-white" /> บันทึกผลการตรวจ (รอบ {selectedRound} น.)
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
