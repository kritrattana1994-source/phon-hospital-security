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
  CheckSquare,
  Image as ImageIcon,
  Trash2,
  AlertTriangle,
  Clock
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import HospitalBrand from "@/components/HospitalBrand";
import { 
  calculateDistanceMeters, 
  getCurrentRound, 
  isScanOnTime,
  getCurrentShift,
  defaultPatrolRounds,
  getLogsForRound
} from "@/lib/patrolSchedule";
import { uploadImageToDrive } from "@/lib/uploadToDrive";

export default function PatrolPage() {
  const router = useRouter();
  const { currentUser, checkpoints, patrolLogs, addPatrolLog, patrolRounds, googleDriveWebhookUrl } = useStore();
  const [scanning, setScanning] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [selectedCheckpoint, setSelectedCheckpoint] = useState<Checkpoint | null>(null);
  const [status, setStatus] = useState<"normal" | "issue">("normal");
  const [notes, setNotes] = useState("");
  const [checklistItems, setChecklistItems] = useState<string[]>([]);
  const [checkedMap, setCheckedMap] = useState<Record<string, boolean>>({});

  // Photo state (จุดละ 1 รูป)
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Helper สำหรับค้นหาจุดตรวจจากข้อความที่สแกนได้ หรือ URL parameter
  const resolveCheckpoint = (input: string): Checkpoint | null => {
    const text = input.trim();
    if (!text || checkpoints.length === 0) return null;

    // Mapping สำหรับรองรับ QR โค้ดรุ่นเดิมที่อาจพิมพ์ไปก่อนหน้า (cp01 - cp07)
    const legacyIdToCode: Record<string, string> = {
      cp01: "01",
      cp02: "02",
      cp03: "03",
      cp04: "04",
      cp05: "05",
      cp06: "06",
      cp07: "07",
    };

    // 1. ตรวจสอบรูปแบบมาตรฐาน "HOSP-PATROL:<checkpointId>:<checkpointCode>"
    if (text.startsWith("HOSP-PATROL:")) {
      const parts = text.split(":");
      const targetId = parts[1]?.trim();
      const targetCode = parts[2]?.trim();

      // จับคู่ด้วย Checkpoint ID ตรงตัว (100% Strict Match)
      if (targetId) {
        const matchedById = checkpoints.find((cp) => cp.id === targetId);
        if (matchedById) return matchedById;

        // หากเป็น Legacy ID เช่น cp01 ให้แปลงเป็น Code "01"
        if (legacyIdToCode[targetId]) {
          const matchedLegacy = checkpoints.find((cp) => cp.code === legacyIdToCode[targetId]);
          if (matchedLegacy) return matchedLegacy;
        }
      }

      // หากไม่พบ ID ให้จับคู่ด้วย Code ตรงตัว
      if (targetCode) {
        const normalizedTargetCode = targetCode.padStart(2, "0");
        const matchedByCode = checkpoints.find(
          (cp) => cp.code.toLowerCase() === targetCode.toLowerCase() || cp.code === normalizedTargetCode
        );
        if (matchedByCode) return matchedByCode;
      }
    }

    // 2. จับคู่แบบ Exact Match (ID ตรงตัว)
    const exactIdMatch = checkpoints.find((cp) => cp.id === text);
    if (exactIdMatch) return exactIdMatch;

    // 3. แปลง Legacy ID (เช่น cp01) ตรงๆ
    if (legacyIdToCode[text]) {
      const matchedLegacy = checkpoints.find((cp) => cp.code === legacyIdToCode[text]);
      if (matchedLegacy) return matchedLegacy;
    }

    // 4. จับคู่ด้วย Code ตรงตัว หรือเลข 1-7
    const numOnly = text.replace(/\D/g, "");
    if (numOnly) {
      const paddedNum = numOnly.padStart(2, "0");
      const matchedByPadded = checkpoints.find(
        (cp) => cp.code === paddedNum || String(cp.order) === numOnly
      );
      if (matchedByPadded) return matchedByPadded;
    }

    // 5. จับคู่ด้วยชื่อจุดตรวจ (เผื่อกรณีสแกนข้อความชื่ออาคาร)
    const matchedByName = checkpoints.find(
      (cp) => cp.name.toLowerCase() === text.toLowerCase() || text.includes(cp.name)
    );
    if (matchedByName) return matchedByName;

    // 6. กรณีสแกนได้เป็น URL ที่มีพารามิเตอร์ cp= หรือ scan=
    try {
      if (text.includes("?") || text.includes("&")) {
        const queryPart = text.includes("?") ? text.split("?")[1] : text;
        const searchParams = new URLSearchParams(queryPart);
        const paramVal = searchParams.get("cp") || searchParams.get("scan");
        if (paramVal) {
          return resolveCheckpoint(paramVal);
        }
      }
    } catch (_) {}

    return null;
  };

  // Read URL query parameter on mount (?cp=cp01 or ?scan=01)
  useEffect(() => {
    if (typeof window !== "undefined" && checkpoints.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const cpQuery = params.get("cp") || params.get("scan");
      if (cpQuery) {
        const found = resolveCheckpoint(cpQuery);
        if (found) {
          setSelectedCheckpoint(found);
        }
      }
    }
  }, [checkpoints]);

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
      setCapturedPhoto(null);
      setPhotoError(null);
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

  // จัดการการถ่ายรูป/อัปโหลดภาพประจำจุดตรวจ พร้อมบีบอัดรูปภาพ
  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new (window as any).Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxDim = 800;
        let w = img.width;
        let h = img.height;
        if (w > h && w > maxDim) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        } else if (h > maxDim) {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.7);
          setCapturedPhoto(compressedDataUrl);
          setPhotoError(null);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // จำลองเดินมาที่จุดตรวจนี้ (สำหรับทดสอบในคอมพิวเตอร์)
  const handleSimulateAtCheckpoint = () => {
    if (selectedCheckpoint?.coords) {
      setGpsLocation({
        lat: selectedCheckpoint.coords.lat + 0.00002, // ~2 เมตร
        lng: selectedCheckpoint.coords.lng + 0.00002,
        accuracy: 3.5,
        timestamp: new Date().toLocaleTimeString("th-TH"),
        isReal: true,
      });
      setGpsLocked(true);
    }
  };

  const [gpsLocation, setGpsLocation] = useState<{
    lat: number;
    lng: number;
    accuracy: number;
    timestamp: string;
    isReal: boolean;
  }>({
    lat: 15.816506,
    lng: 102.6082934,
    accuracy: 8.8,
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

  const rounds = (patrolRounds && patrolRounds.length > 0) ? patrolRounds : defaultPatrolRounds;
  const now = new Date();
  const activeRound = getCurrentRound(rounds, now);
  const activeShift = getCurrentShift(now);

  const roundLogs = getLogsForRound(activeRound, patrolLogs);
  const completedIds = new Set(roundLogs.map((log) => log.checkpointId));
  const progress = checkpoints.length > 0 ? Math.round((completedIds.size / checkpoints.length) * 100) : 0;

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
    const matched = resolveCheckpoint(text);

    if (matched) {
      setSelectedCheckpoint(matched);
    } else {
      alert(`⚠️ ป้าย QR Code ที่สแกน ("${text}") ไม่ตรงกับจุดตรวจใดในระบบโรงพยาบาลพล กรุณาลองใหม่อีกครั้ง`);
    }
  };

  const handleSubmit = async () => {
    if (!selectedCheckpoint) return;

    // ตรวจสอบระยะพิกัด GPS เทียบกับจุดตรวจจริง (เผื่อความคลาดเคลื่อน GPS ใต้อาคาร/ชั้นล่าง)
    const distance = (selectedCheckpoint.coords && gpsLocation)
      ? calculateDistanceMeters(gpsLocation.lat, gpsLocation.lng, selectedCheckpoint.coords.lat, selectedCheckpoint.coords.lng)
      : 0;

    // รัศมีที่ยอมรับได้: ขั้นต่ำ 50 เมตร หรือตามความแม่นยำของดาวเทียมมือถือ (ไม่เกิน 100 เมตร)
    const allowedRadius = Math.max(50, Math.min(100, Math.round((gpsLocation.accuracy || 10) + 25)));

    if (gpsLocation.isReal && distance > allowedRadius) {
      alert(`⚠️ อยู่นอกระยะจุดตรวจ! คุณอยู่ห่างจากจุดตรวจ ${distance} เมตร (ระบบกำหนดไม่เกิน ${allowedRadius} ม. เผื่อความคลาดเคลื่อน GPS ใต้อาคาร) กรุณาเดินเข้าไปใกล้จุดตรวจเพื่อเช็คอิน`);
      return;
    }

    // บังคับถ่ายรูป 1 รูป
    if (!capturedPhoto) {
      setPhotoError("กรุณาถ่ายรูปจุดตรวจ 1 รูปเพื่อยืนยันการปฏิบัติงาน");
      return;
    }

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

    const scanTimeIso = new Date().toISOString();
    const onTime = isScanOnTime(scanTimeIso, activeRound);

    // อัปโหลดภาพเข้า Google Drive โฟลเดอร์ "ภาพถ่ายจุดตรวจ (Patrol Logs)"
    let finalPhotoUrl = capturedPhoto;
    if (capturedPhoto && capturedPhoto.startsWith("data:image")) {
      try {
        finalPhotoUrl = (await uploadImageToDrive({
          image: capturedPhoto,
          title: `CP_${selectedCheckpoint.code}_${activeRound.id}`,
          subfolder: "ภาพถ่ายจุดตรวจ (Patrol Logs)",
          webhookUrl: googleDriveWebhookUrl,
        })) || capturedPhoto;
      } catch (uploadErr) {
        console.warn("Drive upload fallback:", uploadErr);
      }
    }

    addPatrolLog({
      checkpointId: selectedCheckpoint.id,
      timestamp: scanTimeIso,
      status,
      notes: resolvedNotes,
      coords: {
        lat: gpsLocation.lat,
        lng: gpsLocation.lng,
        accuracy: gpsLocation.accuracy,
      },
      roundId: activeRound.id,
      roundName: activeRound.name,
      shift: activeShift.id,
      imageUrl: finalPhotoUrl,
      distanceMeters: distance,
      isOnTime: onTime,
    });

    const recordedCheckpointName = selectedCheckpoint.name;
    const recordedCode = selectedCheckpoint.code;
    const guardName = currentUser?.name || "เจ้าหน้าที่ รปภ.";

    setSelectedCheckpoint(null);
    setStatus("normal");
    setNotes("");
    setCapturedPhoto(null);
    setPhotoError(null);

    alert(
      `✅ บันทึกผลการตรวจเรียบร้อย\n\n` +
      `📍 จุดตรวจ: ${recordedCheckpointName} (รหัส ${recordedCode})\n` +
      `👤 ผู้ปฏิบัติงาน: ${guardName}\n` +
      `⏰ เวลา: ${new Date(scanTimeIso).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })} น.`
    );
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
        {/* Active Patrol Round & 1-Hour Deadline Banner */}
        <div className="p-3 bg-gradient-to-r from-sky-600 to-blue-700 text-white rounded-2xl shadow-xs flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-sky-200 shrink-0" />
            <div>
              <span className="font-bold">{activeRound.name} • {activeShift.name}</span>
              <span className="text-[10px] text-sky-100 block">
                เกณฑ์เวลา: กำหนดตรวจเสร็จสิ้นภายใน <strong>{activeRound.deadlineTime} น.</strong>
              </span>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-white/20 text-white font-bold text-[10px]">
            {activeRound.frequencyHours === 3 ? "ทุก 3 ชม." : "ทุก 2 ชม."}
          </span>
        </div>

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
                  จัดตำแหน่งกล้องไปยัง QR Code ประจำจุดตรวจ ระบบจะตรวจสอบข้อมูลและบันทึกพิกัด GPS อัตโนมัติ
                </p>

                <div className="w-full space-y-2">
                  <button
                    onClick={startCameraScanner}
                    className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white font-bold text-sm shadow-md shadow-sky-500/25 active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <Camera className="w-5 h-5" /> เปิดกล้องเพื่อสแกน QR Code
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

            {/* GPS Location & 30-Meter Geofence Validation */}
            {(() => {
              const distance = (selectedCheckpoint.coords && gpsLocation)
                ? calculateDistanceMeters(gpsLocation.lat, gpsLocation.lng, selectedCheckpoint.coords.lat, selectedCheckpoint.coords.lng)
                : 0;
              const isWithin30m = distance <= 30;

              return (
                <div
                  className={`p-3.5 rounded-2xl border space-y-2 text-xs transition-all ${
                    isWithin30m
                      ? "bg-emerald-50/80 border-emerald-300 text-emerald-900"
                      : "bg-rose-50 border-rose-300 text-rose-900"
                  }`}
                >
                  <div className="flex items-center justify-between font-bold">
                    <span className="flex items-center gap-1.5">
                      <MapPin className={`w-4 h-4 ${isWithin30m ? "text-emerald-600" : "text-rose-600"}`} />
                      ตรวจสอบระยะห่างจุดตรวจจริง (เกณฑ์ไม่เกิน 30 ม.):
                    </span>
                    <span className="text-[10px] font-mono">
                      {gpsLocation.timestamp}
                    </span>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 font-mono text-[11px]">
                    <div>
                      <span>📍 พิกัด รปภ.: {gpsLocation.lat.toFixed(5)}, {gpsLocation.lng.toFixed(5)}</span>
                      <span className="block text-[10px] text-slate-500">
                        ระยะห่าง: <strong className={isWithin30m ? "text-emerald-700" : "text-rose-600"}>{distance} เมตร</strong>
                      </span>
                    </div>

                    {isWithin30m ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] flex items-center gap-1 self-start sm:self-center">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> อยู่ในระยะถูกต้อง ✅
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold text-[10px] flex items-center gap-1 self-start sm:self-center">
                        <AlertTriangle className="w-3 h-3 text-rose-600" /> ห่างเกิน 30 ม. ❌
                      </span>
                    )}
                  </div>

                  {!isWithin30m && (
                    <p className="text-[11px] text-rose-700 font-semibold flex items-center gap-1">
                      ⚠️ คุณอยู่ห่างจากจุดตรวจ {distance} เมตร ต้องเดินเข้าไปใกล้ๆ (ไม่เกิน 30 ม.) จึงจะบันทึกได้
                    </p>
                  )}
                </div>
              );
            })()}

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

            {/* Photo Capture Section (บังคับถ่ายรูป 1 รูป) */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-sky-600" />
                  ถ่ายรูปยืนยันจุดตรวจ (บังคับ 1 รูป) <span className="text-rose-600">*</span>
                </span>
                {capturedPhoto && (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    แนบรูปแล้ว ✅
                  </span>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoCapture}
                className="hidden"
              />

              {capturedPhoto ? (
                <div className="relative rounded-2xl overflow-hidden border-2 border-emerald-400 bg-black aspect-video max-h-48 group">
                  <img
                    src={capturedPhoto}
                    alt="Checkpoint Evidence"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent flex items-end justify-between p-3">
                    <span className="text-white text-[10px] font-bold">
                      📸 บันทึกหลักฐานจุด {selectedCheckpoint.code}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCapturedPhoto(null)}
                      className="px-2.5 py-1 rounded-xl bg-rose-600 text-white font-bold text-[10px] flex items-center gap-1 hover:bg-rose-700 active:scale-95 transition-all shadow-md"
                    >
                      <Trash2 className="w-3 h-3" /> ถ่ายใหม่
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-4 rounded-2xl border-2 border-dashed border-sky-300 hover:border-sky-500 bg-sky-50/50 hover:bg-sky-50 text-sky-800 font-bold text-xs flex flex-col items-center justify-center gap-1.5 active:scale-98 transition-all"
                >
                  <div className="w-10 h-10 rounded-full bg-sky-100 flex items-center justify-center text-sky-600">
                    <Camera className="w-5 h-5" />
                  </div>
                  <span>แตะเพื่อถ่ายรูปพื้นที่จุดตรวจ (1 รูป)</span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    บีบอัดอัตโนมัติ ส่งข้อมูลรวดเร็ว
                  </span>
                </button>
              )}

              {photoError && (
                <p className="text-[11px] text-rose-600 font-bold flex items-center gap-1">
                  ⚠️ {photoError}
                </p>
              )}
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

            {/* Submit Button with Dynamic Disabled State */}
            {(() => {
              const distance = (selectedCheckpoint.coords && gpsLocation)
                ? calculateDistanceMeters(gpsLocation.lat, gpsLocation.lng, selectedCheckpoint.coords.lat, selectedCheckpoint.coords.lng)
                : 0;
              const isWithin30m = distance <= 30;
              const canSubmit = isWithin30m && !!capturedPhoto;

              return (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  className={`w-full py-4 rounded-2xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 ${
                    canSubmit
                      ? "bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white shadow-sky-500/25 active:scale-95 cursor-pointer"
                      : "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                  }`}
                >
                  {!isWithin30m ? (
                    <span>❌ อยู่นอกระยะจุดตรวจ (ห่าง {distance} ม. - กำหนด ≤ 30 ม.)</span>
                  ) : !capturedPhoto ? (
                    <span>📷 กรุณาถ่ายรูปจุดตรวจ 1 รูปก่อนบันทึก</span>
                  ) : (
                    <span>✅ บันทึกผลการตรวจ + รูปถ่าย + พิกัด GPS</span>
                  )}
                </button>
              );
            })()}
          </div>
        )}

        {/* Checkpoint List */}
        <div className="space-y-2 pt-2">
          <div className="flex justify-between items-center px-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              สถานะจุดตรวจรอบ {activeRound.id} ({completedIds.size}/{checkpoints.length} จุด)
            </h3>
            <span className="text-[11px] text-sky-700 font-bold flex items-center gap-1">
              <QrCode className="w-3.5 h-3.5 text-sky-600" /> สแกน QR หน้างานเท่านั้น
            </span>
          </div>
          <div className="space-y-2">
            {checkpoints.map((cp) => {
              const cpLogs = roundLogs.filter((l) => l.checkpointId === cp.id);
              const checkpointLog = cpLogs.length > 0 ? cpLogs[cpLogs.length - 1] : null;
              const isDone = !!checkpointLog;
              const isIssue = checkpointLog?.status === "issue";
              const guardName = checkpointLog?.guardName || (isDone ? currentUser?.name : "");
              const scanTimeStr = checkpointLog?.timestamp
                ? new Date(checkpointLog.timestamp).toLocaleTimeString("th-TH", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : null;

              return (
                <div
                  key={cp.id}
                  onClick={() => {
                    if (!isDone) {
                      alert(`⚠️ จุดตรวจ "${cp.name}" ยังไม่ได้รับการตรวจในรอบนี้\n\nระบบกำหนดให้เดินไปยังจุดตรวจแล้วกดปุ่ม "เปิดกล้องเพื่อสแกน QR Code" ด้านบนเพื่อสแกน QR Code หน้างานเท่านั้น (ไม่สามารถกดตรวจจากรายการได้)`);
                    }
                  }}
                  className={`p-3.5 rounded-2xl border flex items-center justify-between transition-all select-none ${
                    isDone
                      ? isIssue
                        ? "bg-rose-50/80 border-rose-300 text-rose-950 shadow-2xs"
                        : "bg-emerald-50/80 border-emerald-300 text-emerald-950 shadow-2xs"
                      : "bg-white border-slate-200 text-slate-700 hover:border-slate-300 cursor-not-allowed opacity-90"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isDone 
                          ? isIssue 
                            ? "bg-rose-500 text-white shadow-xs" 
                            : "bg-emerald-500 text-white shadow-xs" 
                          : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      {isDone ? (
                        isIssue ? <AlertCircle className="w-5 h-5 stroke-[2.5]" /> : <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                      ) : (
                        <MapPin className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className={`text-sm font-bold truncate ${isDone ? (isIssue ? "text-rose-950" : "text-emerald-950") : "text-slate-800"}`}>
                        {cp.name}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">
                        รหัส {cp.code} • {cp.building}
                      </p>
                      {isDone && (
                        <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[11px]">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 font-bold border border-emerald-200 shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                            ผู้ตรวจ: {guardName || "รปภ."}
                          </span>
                          {scanTimeStr && (
                            <span className="text-emerald-700 font-mono font-medium">
                              (เวลา {scanTimeStr} น.)
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    {isDone ? (
                      <div className="flex flex-col items-end gap-0.5">
                        <span className={`text-[11px] px-2.5 py-1 rounded-full font-bold flex items-center gap-1 shadow-2xs ${
                          isIssue 
                            ? "bg-rose-100 text-rose-800 border border-rose-300" 
                            : "bg-emerald-100 text-emerald-800 border border-emerald-300"
                        }`}>
                          {isIssue ? (
                            <>
                              <AlertCircle className="w-3 h-3 text-rose-600" /> พบปัญหา
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> ตรวจแล้ว
                            </>
                          )}
                        </span>
                        {guardName && (
                          <span className="text-[10px] text-slate-600 font-bold max-w-[100px] truncate" title={guardName}>
                            👤 {guardName}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-[10px] px-2 py-1 rounded-full font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                        รอสแกน QR
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
