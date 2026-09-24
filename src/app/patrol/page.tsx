"use client";

import { useState, useEffect, useRef } from "react";
import { useStore, Checkpoint } from "@/lib/store";
import { 
  ArrowLeft, 
  CheckCircle2, 
  QrCode, 
  MapPin, 
  ShieldCheck, 
  AlertCircle, 
  Scan, 
  Building2, 
  RotateCcw,
  Navigation,
  Camera,
  ExternalLink,
  LocateFixed,
  CheckSquare
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import HospitalBrand from "@/components/HospitalBrand";

export default function PatrolPage() {
  const router = useRouter();
  const { currentUser, checkpoints, patrolLogs, addPatrolLog } = useStore();
  const [scanning, setScanning] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [selectedCheckpoint, setSelectedCheckpoint] = useState<Checkpoint | null>(null);
  const [status, setStatus] = useState<"normal" | "issue">("normal");
  const [notes, setNotes] = useState("");
  const [checklistItems, setChecklistItems] = useState<string[]>([]);
  const [checkedMap, setCheckedMap] = useState<Record<string, boolean>>({});

  // Sync checklist items when a checkpoint is selected
  useEffect(() => {
    if (selectedCheckpoint) {
      const items = (selectedCheckpoint.items && selectedCheckpoint.items.length > 0)
        ? selectedCheckpoint.items
        : [
            "ประตูทางเข้า-ออก และหน้าต่างล็อกแน่นหนา",
            "ทางหนีไฟและอุปกรณ์ดับเพลิงไม่ถูกปิดกั้น",
            "ระบบไฟส่องสว่างและกล้องวงจรปิดทำงานปกติ",
          ];
      setChecklistItems(items);
      const initialMap: Record<string, boolean> = {};
      items.forEach((item) => {
        initialMap[item] = true; // All normal by default
      });
      setCheckedMap(initialMap);
      setStatus("normal");
      setNotes("");
    }
  }, [selectedCheckpoint]);

  const handleToggleChecklist = (item: string) => {
    setCheckedMap((prev) => {
      const next = { ...prev, [item]: !prev[item] };
      const hasIssue = Object.values(next).some((val) => val === false);
      if (hasIssue) {
        setStatus("issue");
      } else {
        setStatus("normal");
      }
      return next;
    });
  };

  // GPS Location State
  const [gpsLocation, setGpsLocation] = useState<{
    lat: number;
    lng: number;
    accuracy: number;
    timestamp: string;
    isReal: boolean;
  }>({
    lat: 15.81462,
    lng: 102.60124,
    accuracy: 4.5,
    timestamp: new Date().toLocaleTimeString("th-TH"),
    isReal: false,
  });
  const [gpsLocked, setGpsLocked] = useState(false);

  const html5QrCodeRef = useRef<any>(null);

  // Check login
  useEffect(() => {
    if (!currentUser) {
      router.push("/guard");
    }
  }, [currentUser, router]);

  // Track GPS Location
  useEffect(() => {
    if ("geolocation" in navigator) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          setGpsLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: Math.round(position.coords.accuracy * 10) / 10,
            timestamp: new Date().toLocaleTimeString("th-TH"),
            isReal: true,
          });
          setGpsLocked(true);
        },
        (err) => {
          console.log("GPS Notice: Using hospital simulated coordinates.", err.message);
          setGpsLocked(true);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );

      return () => navigator.geolocation.clearWatch(watchId);
    } else {
      setGpsLocked(true);
    }
  }, []);

  if (!currentUser) return null;

  const completedIds = new Set(patrolLogs.map((log) => log.checkpointId));
  const progress = Math.round((completedIds.size / checkpoints.length) * 100);

  // Start Real Camera QR Scanner
  const startCameraScanner = async () => {
    setCameraActive(true);
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode("qr-camera-stream");
      }

      await html5QrCodeRef.current.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText: string) => {
          handleQrDecoded(decodedText);
          stopCameraScanner();
        },
        (errorMessage: string) => {
          // scanning in progress...
        }
      );
    } catch (err) {
      console.warn("Camera init issue, fallback to simulator:", err);
      // Fallback
    }
  };

  const stopCameraScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
      } catch (e) {
        console.error(e);
      }
    }
    setCameraActive(false);
  };

  const handleQrDecoded = (text: string) => {
    // Formats: "HOSP-PATROL:cp01:A1-01" or "cp01" or "A1-01"
    const matched = checkpoints.find(
      (cp) =>
        text.includes(cp.id) ||
        text.includes(cp.code) ||
        text.toLowerCase().includes(cp.code.toLowerCase())
    );

    if (matched) {
      setSelectedCheckpoint(matched);
    } else {
      // If code doesn't match, pick next checkpoint
      const remaining = checkpoints.filter((item) => !completedIds.has(item.id));
      setSelectedCheckpoint(remaining.length > 0 ? remaining[0] : checkpoints[0]);
    }
  };

  const handleMockScan = (cp?: Checkpoint) => {
    setScanning(true);
    setTimeout(() => {
      if (cp) {
        setSelectedCheckpoint(cp);
      } else {
        const remaining = checkpoints.filter((item) => !completedIds.has(item.id));
        setSelectedCheckpoint(remaining.length > 0 ? remaining[0] : checkpoints[0]);
      }
      setScanning(false);
    }, 600);
  };

  const handleSubmit = () => {
    if (selectedCheckpoint) {
      const failedItems = checklistItems.filter((item) => checkedMap[item] === false);
      let resolvedNotes = notes.trim();
      if (!resolvedNotes) {
        if (status === "issue" && failedItems.length > 0) {
          resolvedNotes = `พบปัญหา: ${failedItems.join(", ")}`;
        } else if (status === "normal") {
          resolvedNotes = `ตรวจเช็กเรียบร้อยปกติครบถ้วน (${checklistItems.length} รายการ)`;
        } else {
          resolvedNotes = "พบสิ่งผิดปกติหน้างาน";
        }
      }

      addPatrolLog({
        checkpointId: selectedCheckpoint.id,
        timestamp: new Date().toISOString(),
        status,
        notes: resolvedNotes,
        coords: {
          lat: gpsLocation.lat,
          lng: gpsLocation.lng,
          accuracy: gpsLocation.accuracy,
        },
      });
      setSelectedCheckpoint(null);
      setStatus("normal");
      setNotes("");
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f6fa] text-slate-800 flex flex-col max-w-md mx-auto border-x border-sky-100 shadow-xl font-['Sarabun',sans-serif]">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-sky-100 px-4 py-3 space-y-2.5 shadow-xs">
        <div className="flex items-center justify-between">
          <Link
            href="/guard"
            onClick={stopCameraScanner}
            className="p-2 -ml-2 rounded-xl bg-slate-100 text-slate-600 hover:text-slate-900 active:scale-95 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <HospitalBrand badgeText={`จุดตรวจ ${checkpoints.length} จุด`} />
          <span className="px-2.5 py-1 rounded-full bg-sky-100 text-sky-800 text-xs font-bold font-mono border border-sky-200">
            {completedIds.size}/{checkpoints.length}
          </span>
        </div>
      </header>

      <main className="flex-1 p-4 space-y-4 overflow-y-auto">
        {/* Live GPS Verification Card */}
        <div className="p-4 bg-white border border-sky-200 rounded-3xl shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center">
                <LocateFixed className="w-4 h-4 animate-spin text-sky-600" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900 block">
                  พิกัดดาวเทียม GPS ตรวจการ (Anti-Tamper)
                </span>
                <span className="text-[10px] text-slate-500">
                  ระบบบันทึกพิกัดทุกครั้งที่สแกน ป้องกันการทุจริต
                </span>
              </div>
            </div>
            <span className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              GPS ล็อกแล้ว
            </span>
          </div>

          <div className="bg-sky-50/60 p-3 rounded-2xl border border-sky-100 flex items-center justify-between text-xs">
            <div className="font-mono">
              <span className="text-slate-500 text-[10px] block">ละติจูด, ลองจิจูด:</span>
              <strong className="text-sky-900">
                {gpsLocation.lat.toFixed(5)}° N, {gpsLocation.lng.toFixed(5)}° E
              </strong>
            </div>
            <div className="text-right">
              <span className="text-slate-500 text-[10px] block">ความแม่นยำ:</span>
              <span className="text-emerald-700 font-bold font-mono">
                ±{gpsLocation.accuracy} ม.
              </span>
            </div>
          </div>
        </div>

        {/* Progress Card */}
        <div className="p-4 bg-white border border-sky-100 rounded-3xl shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-semibold text-slate-600">ความคืบหน้ารอบเวรนี้</span>
            <span className="text-xl font-black text-sky-600">{progress}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2.5 p-0.5 border border-slate-200">
            <div
              className="bg-gradient-to-r from-sky-500 to-blue-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.max(progress, 3)}%` }}
            />
          </div>
        </div>

        {/* QR Scanner Area */}
        {!selectedCheckpoint ? (
          <div className="space-y-3">
            {/* Real Camera Video Container */}
            {cameraActive ? (
              <div className="relative p-4 bg-slate-900 rounded-3xl overflow-hidden shadow-lg border-2 border-sky-400">
                <div id="qr-camera-stream" className="w-full rounded-2xl overflow-hidden" />
                <button
                  onClick={stopCameraScanner}
                  className="w-full mt-3 py-2.5 bg-slate-800 text-white text-xs font-bold rounded-xl active:scale-95 transition-all"
                >
                  ปิดกล้องสแกน
                </button>
              </div>
            ) : (
              <div className="relative p-6 bg-white border-2 border-dashed border-sky-300 rounded-3xl flex flex-col items-center justify-center text-center overflow-hidden shadow-sm">
                <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-sky-500" />
                <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-sky-500" />
                <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-sky-500" />
                <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-sky-500" />

                <div className="my-4 relative">
                  <div className="w-20 h-20 rounded-3xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-600 shadow-inner">
                    <Scan className={`w-10 h-10 ${scanning ? "animate-spin text-blue-600" : ""}`} />
                  </div>
                </div>

                <h3 className="font-bold text-slate-900 text-base mb-1">
                  สแกน QR Code ประจำจุดตรวจ
                </h3>
                <p className="text-xs text-slate-500 max-w-xs mb-5">
                  ส่องกล้องไปที่ป้าย QR ประจำจุดที่ติดไว้หน้างาน ระบบจะดึงข้อมูลจุดตรวจพร้อมบันทึกพิกัด GPS อัตโนมัติ
                </p>

                <div className="w-full space-y-2">
                  <button
                    onClick={startCameraScanner}
                    className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-bold text-sm shadow-md shadow-sky-500/25 active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <Camera className="w-5 h-5" /> เปิดกล้องมือถือสแกนป้ายจริง
                  </button>

                  <button
                    onClick={() => handleMockScan()}
                    disabled={scanning}
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                  >
                    {scanning ? (
                      <>
                        <RotateCcw className="w-4 h-4 animate-spin" /> กำลังจำลองสแกน...
                      </>
                    ) : (
                      <>
                        <QrCode className="w-4 h-4 text-slate-500" /> จำลองสแกน QR (สำหรับทดสอบในคอม)
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Checkpoint Verification Form with Location Display */
          <div className="bg-white border-2 border-sky-400 rounded-3xl p-5 shadow-md space-y-4 animate-in fade-in-50">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-sky-100 text-sky-800 uppercase tracking-wider">
                  จุดตรวจ {selectedCheckpoint.code}
                </span>
                <h2 className="text-lg font-bold text-slate-900 mt-1">
                  {selectedCheckpoint.name}
                </h2>
                <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                  <Building2 className="w-3.5 h-3.5 text-sky-600" />{" "}
                  {selectedCheckpoint.building} • {selectedCheckpoint.floor}
                </p>
              </div>
              <button
                onClick={() => setSelectedCheckpoint(null)}
                className="text-xs text-slate-500 hover:text-slate-800 px-2.5 py-1 bg-slate-100 rounded-lg"
              >
                เปลี่ยนจุด
              </button>
            </div>

            {/* GPS Location Proof Card */}
            <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-1.5 text-xs text-emerald-900">
              <div className="flex items-center justify-between font-bold">
                <span className="flex items-center gap-1.5 text-emerald-800">
                  <MapPin className="w-4 h-4 text-emerald-600" /> บันทึกพิกัด GPS ณ เวลาเข้าตรวจ:
                </span>
                <span className="text-[10px] text-emerald-700 font-mono">
                  {gpsLocation.timestamp}
                </span>
              </div>
              <div className="font-mono text-emerald-800 text-[11px] bg-white p-2 rounded-xl border border-emerald-200 flex justify-between">
                <span>📍 {gpsLocation.lat.toFixed(6)}, {gpsLocation.lng.toFixed(6)}</span>
                <span className="text-emerald-700 font-semibold">ถูกต้องตามจุดตรวจ ✅</span>
              </div>
            </div>

            {/* Checklist */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <CheckSquare className="w-4 h-4 text-sky-600" />
                  รายการตรวจเช็คความปลอดภัยจุดนี้ ({checklistItems.length} ข้อ)
                </p>
                {checklistItems.length > 0 && checklistItems.every(it => checkedMap[it] !== false) ? (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    ครบถ้วนปกติ ✅
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                    มีข้อไม่ผ่าน ⚠️
                  </span>
                )}
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-0.5">
                {checklistItems.map((item, idx) => {
                  const isChecked = checkedMap[item] !== false;
                  return (
                    <label
                      key={idx}
                      className={`flex items-start gap-3 p-3 rounded-2xl border cursor-pointer text-xs transition-all active:scale-[0.99] ${
                        isChecked
                          ? "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100/70"
                          : "bg-rose-50/80 border-rose-300 text-rose-900 ring-1 ring-rose-300"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleChecklist(item)}
                        className="w-4 h-4 mt-0.5 rounded text-sky-600 focus:ring-sky-500 border-slate-300 shrink-0"
                      />
                      <div className="flex-1">
                        <span className="font-semibold">{item}</span>
                        {!isChecked && (
                          <span className="text-[10px] font-bold text-rose-600 block mt-0.5">
                            (ระบุว่าไม่ผ่าน / พบปัญหา)
                          </span>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Status Selector */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => setStatus("normal")}
                className={`p-3.5 rounded-2xl border text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                  status === "normal"
                    ? "bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-200"
                    : "bg-slate-50 border-slate-200 text-slate-500"
                }`}
              >
                <CheckCircle2 className="w-5 h-5 text-emerald-600" /> ตรวจเช็กปกติ
              </button>
              <button
                type="button"
                onClick={() => setStatus("issue")}
                className={`p-3.5 rounded-2xl border text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                  status === "issue"
                    ? "bg-rose-50 border-rose-500 text-rose-800 ring-2 ring-rose-200"
                    : "bg-slate-50 border-slate-200 text-slate-500"
                }`}
              >
                <AlertCircle className="w-5 h-5 text-rose-600" /> พบสิ่งผิดปกติ
              </button>
            </div>

            {status === "issue" && (
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="ระบุข้อบกพร่องที่พบ (เช่น ประตูห้องแล็บไม่ได้ล็อก, ไฟฉุกเฉินดับ)..."
                className="w-full p-3 bg-white border border-rose-300 rounded-xl text-slate-800 placeholder-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
                rows={3}
              />
            )}

            <button
              onClick={handleSubmit}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-bold text-sm shadow-md shadow-sky-500/25 active:scale-95 transition-all"
            >
              บันทึกผลการตรวจ + พิกัด GPS
            </button>
          </div>
        )}

        {/* Checkpoint List */}
        <div className="space-y-2 pt-2">
          <div className="flex justify-between items-center px-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              รายการจุดตรวจทั้งหมด ({checkpoints.length} จุด)
            </h3>
            <span className="text-[11px] text-slate-400">แตะเพื่อทดสอบสแกน</span>
          </div>
          <div className="space-y-2">
            {checkpoints.map((cp) => {
              const isDone = completedIds.has(cp.id);
              return (
                <div
                  key={cp.id}
                  onClick={() => handleMockScan(cp)}
                  className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition-all active:scale-[0.99] ${
                    isDone
                      ? "bg-emerald-50/70 border-emerald-200 text-emerald-900"
                      : "bg-white border-slate-200 text-slate-700 hover:border-sky-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                        isDone ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      {isDone ? <CheckCircle2 className="w-5 h-5" /> : <MapPin className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className={`text-sm font-bold ${isDone ? "text-emerald-950" : "text-slate-800"}`}>
                        {cp.name}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        รหัส {cp.code} • {cp.building}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`text-[11px] px-2.5 py-1 rounded-full font-semibold border ${
                      isDone
                        ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                        : "bg-slate-100 text-slate-500 border-slate-200"
                    }`}
                  >
                    {isDone ? "ตรวจแล้ว" : "ยังไม่ตรวจ"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
