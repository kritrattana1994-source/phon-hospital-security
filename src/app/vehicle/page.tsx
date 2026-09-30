"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useStore, StaffVehicle } from "@/lib/store";
import { 
  ArrowLeft, 
  Search, 
  Car, 
  Bike,
  User, 
  Phone, 
  ShieldAlert, 
  CheckCircle2, 
  Flashlight, 
  Building, 
  AlertOctagon, 
  Clock,
  RotateCcw,
  Zap,
  Volume2,
  VolumeX,
  Info,
  Check,
  X,
  Delete,
  Camera,
  Loader2,
  Sparkles,
  Upload,
  Moon,
  Sun,
  Scan
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import HospitalBrand from "@/components/HospitalBrand";
import { uploadImageToDrive } from "@/lib/uploadToDrive";
import { openFullImage } from "@/lib/imageViewer";
import { recognizePlateFromCanvas, getClientOcrWorker } from "@/lib/clientOcr";

interface FloatingToast {
  id: string;
  plate: string;
  isStaff: boolean;
  ownerName?: string;
  department?: string;
  type: "success" | "warning" | "info";
  message: string;
}

function resizeImageBase64(file: File, maxDimension = 1200): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = () => reject(new Error("Failed to load image for resizing"));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

function VehicleContent() {
  const router = useRouter();
  const { currentUser, staffVehicles, addParkingScan, parkingScans, googleDriveWebhookUrl } = useStore();

  // OCR Processing States
  const [isOcrProcessing, setIsOcrProcessing] = useState(false);
  const [ocrStatusText, setOcrStatusText] = useState<string | null>(null);
  const patrolFileInputRef = useRef<HTMLInputElement | null>(null);
  const lookupFileInputRef = useRef<HTMLInputElement | null>(null);

  // Top-level View: "lookup" (ดูว่ารถใคร 24 ชม.) | "patrol" (เดินตรวจสแกนรถทุกคันใน รพ.)
  const [mainTab, setMainTab] = useState<"lookup" | "patrol">("lookup");

  // Read URL query parameter on mount (?mode=lookup or ?mode=patrol)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const mode = params.get("mode");
      if (mode === "patrol") {
        setMainTab("patrol");
      } else if (mode === "lookup") {
        setMainTab("lookup");
      }
    }
  }, []);

  // --- TAB 1: VEHICLE OWNER LOOKUP (ดูว่ารถใคร) STATES ---
  const [dialQuery, setDialQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [matchedVehicles, setMatchedVehicles] = useState<StaffVehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<StaffVehicle | null>(null);

  // Quick issue tag state
  const [reportedIssue, setReportedIssue] = useState<string | null>(null);

  // --- TAB 2: PATROL ROUND (เดินตรวจสแกนรถทุกคันใน รพ.) STATES ---
  // ตรวจเฉพาะ 2 รอบมาตรฐาน: 22:00 (รอบดึก) และ 06:00 (รอบเช้า)
  const [selectedRound, setSelectedRound] = useState<"22:00" | "06:00">(() => {
    const hour = new Date().getHours();
    return (hour >= 14 || hour < 2) ? "22:00" : "06:00";
  });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [toasts, setToasts] = useState<FloatingToast[]>([]);
  const lastScannedRef = useRef<Record<string, number>>({});
  const [cameraInputPlate, setCameraInputPlate] = useState("");

  // --- Auto-Scan & Floating Scan Alert States ---
  const [autoScanActive, setAutoScanActive] = useState(true);
  const [isAutoScanningFrame, setIsAutoScanningFrame] = useState(false);
  const [lastDetectedPlate, setLastDetectedPlate] = useState<string | null>(null);
  const [scanPulse, setScanPulse] = useState(false);
  const [floatingNotification, setFloatingNotification] = useState<{
    id: string;
    plate: string;
    isStaff: boolean;
    ownerName?: string;
    department?: string;
    round: string;
    timestamp: string;
  } | null>(null);

  const autoScanTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isAutoScanProcessingRef = useRef(false);
  const floatingNotificationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!currentUser) {
      router.push("/guard");
    }
  }, [currentUser, router]);

  // Pre-initialize Client OCR worker in the browser
  useEffect(() => {
    getClientOcrWorker().catch((err) => console.warn("Client OCR pre-init notice:", err));
  }, []);

  // Handle Patrol Camera
  useEffect(() => {
    if (mainTab === "patrol") {
      startPatrolCamera();
    } else {
      stopPatrolCamera();
    }
    return () => {
      stopPatrolCamera();
    };
  }, [mainTab]);

  const startPatrolCamera = async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError("อุปกรณ์นี้ไม่รองรับการเปิดกล้องผ่านเบราว์เซอร์");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
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
      setCameraError("ไม่สามารถเปิดกล้องได้ (สามารถพิมพ์เลขทะเบียนหรือเลือกถ่ายภาพความชัดสูงด้านล่างได้)");
      setCameraActive(false);
    }
  };

  const stopPatrolCamera = () => {
    if (autoScanTimerRef.current) {
      clearInterval(autoScanTimerRef.current);
      autoScanTimerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
    setTorchOn(false);
    setIsAutoScanningFrame(false);
  };

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
        } catch {
          setTorchOn((prev) => !prev);
        }
      } else {
        setTorchOn((prev) => !prev);
      }
    } else {
      setTorchOn((prev) => !prev);
    }
  };

  // Beep Sound
  const playBeep = (type: "staff" | "outside" | "dup") => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === "staff") {
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
        osc.start();
        osc.stop(ctx.currentTime + 0.18);
      } else if (type === "outside") {
        osc.frequency.setValueAtTime(520, ctx.currentTime);
        gain.gain.setValueAtTime(0.18, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      } else {
        osc.frequency.setValueAtTime(400, ctx.currentTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
      }
    } catch {}
  };

  const addToast = (toast: Omit<FloatingToast, "id">) => {
    const id = "toast-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6);
    setToasts((prev) => [{ ...toast, id }, ...prev.slice(0, 2)]);
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      if (toast.type === "warning") navigator.vibrate([100, 50, 100]);
      else navigator.vibrate(80);
    }
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  };

  // --- LOOKUP DIALPAD HANDLERS ---
  const handleDialPress = (digit: string) => {
    setDialQuery((prev) => prev + digit);
  };

  const handleDialDelete = () => {
    setDialQuery((prev) => prev.slice(0, -1));
  };

  const handleDialClear = () => {
    setDialQuery("");
    setSubmittedQuery("");
    setHasSearched(false);
    setMatchedVehicles([]);
    setSelectedVehicle(null);
    setReportedIssue(null);
  };

  // Core Search Action (Executed ONLY when pressing "ค้นหา")
  const handlePerformSearch = (queryOverride?: string) => {
    const query = (queryOverride !== undefined ? queryOverride : dialQuery).trim();
    if (!query) return;

    const clean = query.replace(/\s+/g, "").toLowerCase();
    const results = staffVehicles.filter((v) => {
      const vPlateClean = v.plateNumber.replace(/\s+/g, "").toLowerCase();
      const phoneClean = (v.phone || "").replace(/[^0-9]/g, "");
      const ownerClean = (v.ownerName || "").toLowerCase();
      const deptClean = (v.department || "").toLowerCase();

      return (
        vPlateClean.includes(clean) ||
        clean.includes(vPlateClean) ||
        phoneClean.includes(clean) ||
        ownerClean.includes(clean) ||
        deptClean.includes(clean)
      );
    });

    setSubmittedQuery(query);
    setHasSearched(true);
    setMatchedVehicles(results);
    setReportedIssue(null);

    if (results.length === 1) {
      setSelectedVehicle(results[0]);
      playBeep("staff");
    } else if (results.length > 1) {
      setSelectedVehicle(null); // Show selection list for user to choose!
      playBeep("staff");
    } else {
      setSelectedVehicle(null);
      playBeep("outside");
    }
  };

  // --- CAMERA CAPTURE & AI OCR METHODS ---
  const captureVideoFrame = (): string | null => {
    if (!videoRef.current) return null;
    try {
      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL("image/jpeg", 0.85);
    } catch (err) {
      console.error("Frame capture error:", err);
      return null;
    }
  };

  // ตัดภาพเฉพาะโซนกรอบเล็งเป้า (Viewfinder HUD) ตรงกลาง เพื่อให้ OCR วิเคราะห์เลขทะเบียนได้แม่นยำและเร็วที่สุด
  const captureOcrScanArea = (): { cropCanvas: HTMLCanvasElement; cropDataUrl: string; fullDataUrl: string } | null => {
    if (!videoRef.current) return null;
    try {
      const video = videoRef.current;
      if (video.readyState < 2 || video.videoWidth === 0) return null;

      const vw = video.videoWidth;
      const vh = video.videoHeight;

      // ภาพเต็มความละเอียดสูง สำหรับบันทึกลงระบบและ Google Drive
      const fullCanvas = document.createElement("canvas");
      fullCanvas.width = Math.min(vw, 1280);
      fullCanvas.height = Math.min(vh, 720);
      const fullCtx = fullCanvas.getContext("2d");
      if (!fullCtx) return null;
      fullCtx.drawImage(video, 0, 0, fullCanvas.width, fullCanvas.height);
      const fullDataUrl = fullCanvas.toDataURL("image/jpeg", 0.85);

      // ตัดเฉพาะกรอบกลาง (ความกว้าง 78% ความสูง 45% ตรงเป้าเล็ง เผื่อขอบรอบป้ายทะเบียนเพื่อความแม่นยำสูงสุด)
      const cropW = Math.round(vw * 0.78);
      const cropH = Math.round(vh * 0.45);
      const cropX = Math.round((vw - cropW) / 2);
      const cropY = Math.round((vh - cropH) / 2);

      const targetWidth = Math.min(cropW, 768);
      const cropCanvas = document.createElement("canvas");
      cropCanvas.width = targetWidth;
      cropCanvas.height = Math.round((targetWidth * cropH) / cropW);
      const cropCtx = cropCanvas.getContext("2d");
      if (!cropCtx) return null;

      cropCtx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, cropCanvas.width, cropCanvas.height);
      const cropDataUrl = cropCanvas.toDataURL("image/jpeg", 0.88);
      return { cropCanvas, cropDataUrl, fullDataUrl };
    } catch (err) {
      console.warn("captureOcrScanArea notice:", err);
      return null;
    }
  };

  // ลูปตรวจจับป้ายทะเบียนอัตโนมัติขณะส่องกล้อง (Auto-Scan Loop)
  useEffect(() => {
    if (mainTab !== "patrol" || !cameraActive || !autoScanActive) {
      if (autoScanTimerRef.current) {
        clearInterval(autoScanTimerRef.current);
        autoScanTimerRef.current = null;
      }
      return;
    }

    const runAutoScan = async () => {
      if (isAutoScanProcessingRef.current || isOcrProcessing) return;
      if (!videoRef.current || videoRef.current.paused || videoRef.current.ended) return;

      const frames = captureOcrScanArea();
      if (!frames) return;

      isAutoScanProcessingRef.current = true;
      setIsAutoScanningFrame(true);

      try {
        let detectedPlate = "";

        // 1. Client-side local WebAssembly OCR in browser (Fastest: ~150ms, zero network)
        const clientRes = await recognizePlateFromCanvas(frames.cropCanvas);
        if (clientRes.isWorkerReady) {
          // Client worker is active and analyzed the frame locally!
          if (clientRes.success && clientRes.plateNumber) {
            detectedPlate = clientRes.plateNumber;
          }
          // Note: If no plate is in the frame, we simply wait for the next frame without hitting the server!
        } else {
          // 2. Server API fallback ONLY if client-side worker is not ready yet
          const controller = new AbortController();
          const abortTimer = setTimeout(() => controller.abort(), 6000);
          try {
            const res = await fetch("/api/ocr-plate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ image: frames.cropDataUrl }),
              signal: controller.signal,
            });
            clearTimeout(abortTimer);
            if (res.ok) {
              const data = await res.json();
              if (data.success && data.plateNumber) {
                detectedPlate = data.plateNumber;
              }
            }
          } catch {} finally {
            clearTimeout(abortTimer);
          }
        }

        if (detectedPlate && detectedPlate.length >= 2) {
          const plate = detectedPlate.trim().toUpperCase();
          setLastDetectedPlate(plate);
          setScanPulse(true);
          setTimeout(() => setScanPulse(false), 1200);

          const lastTime = lastScannedRef.current[plate] || 0;
          const now = Date.now();

          // ป้องกันการบันทึกซ้ำซ้อนภายใน 10 วินาที
          if (now - lastTime >= 10000) {
            await handleContinuousScan(plate, undefined, frames.fullDataUrl);
          }
        }
      } catch (err) {
        console.warn("Auto scan notice:", err);
      } finally {
        isAutoScanProcessingRef.current = false;
        setIsAutoScanningFrame(false);
      }
    };

    // ตรวจจับทุก 1 วินาทีขณะเล็งกล้อง
    autoScanTimerRef.current = setInterval(runAutoScan, 1000);

    return () => {
      if (autoScanTimerRef.current) {
        clearInterval(autoScanTimerRef.current);
        autoScanTimerRef.current = null;
      }
    };
  }, [mainTab, cameraActive, autoScanActive, isOcrProcessing]);

  const performOcrOnImage = async (
    dataUrl: string,
    targetMode: "lookup" | "patrol",
    fullImageUrl?: string,
    canvasElement?: HTMLCanvasElement
  ) => {
    setIsOcrProcessing(true);
    setOcrStatusText("กำลังตรวจจับเลขทะเบียนด้วย AI...");
    try {
      let detectedPlate = "";

      // 1. ลองใช้ Client-Side WebAssembly OCR ทันทีหากมี canvas
      if (canvasElement) {
        const clientRes = await recognizePlateFromCanvas(canvasElement);
        if (clientRes.success && clientRes.plateNumber) {
          detectedPlate = clientRes.plateNumber;
        }
      }

      // 2. ถ้ายังไม่พบ ส่งตรวจจับผ่าน Server API
      if (!detectedPlate) {
        const controller = new AbortController();
        const abortTimer = setTimeout(() => controller.abort(), 12000);
        try {
          const res = await fetch("/api/ocr-plate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ image: dataUrl }),
            signal: controller.signal,
          });
          clearTimeout(abortTimer);
          if (res.ok) {
            const data = await res.json();
            if (data.success && data.plateNumber) {
              detectedPlate = data.plateNumber;
            }
          }
        } catch (apiErr) {
          console.warn("API OCR error:", apiErr);
        } finally {
          clearTimeout(abortTimer);
        }
      }

      // 3. หากตัดกรอบกลางแล้วไม่พบ ลองสแกนภาพเต็มมุมกว้างสำรองทันที
      if (!detectedPlate && fullImageUrl && fullImageUrl !== dataUrl) {
        setOcrStatusText("กำลังตรวจจับภาพมุมกว้างสำรอง...");
        try {
          const fallbackRes = await fetch("/api/ocr-plate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ image: fullImageUrl }),
          });
          if (fallbackRes.ok) {
            const fallbackData = await fallbackRes.json();
            if (fallbackData.success && fallbackData.plateNumber) {
              detectedPlate = fallbackData.plateNumber;
            }
          }
        } catch {}
      }

      if (detectedPlate) {
        const plate = detectedPlate;
        setLastDetectedPlate(plate);
        setScanPulse(true);
        setTimeout(() => setScanPulse(false), 1200);
        if (targetMode === "lookup") {
          setDialQuery(plate);
          handlePerformSearch(plate);
          addToast({
            plate,
            isStaff: false,
            type: "success",
            message: `ตรวจพบเลขทะเบียน ${plate} สำเร็จ`,
          });
        } else {
          await handleContinuousScan(plate, undefined, fullImageUrl || dataUrl);
        }
      } else {
        const msg = "ไม่สามารถอ่านเลขทะเบียนจากภาพได้ชัดเจน กรุณาส่องตรงป้ายอีกครั้ง หรือกดค้นหาด้วยแป้นตัวเลข";
        if (targetMode === "lookup") {
          alert(`⚠️ ${msg}`);
        }
        addToast({
          plate: "-",
          isStaff: false,
          type: "warning",
          message: msg,
        });
      }
    } catch (err: any) {
      console.error("OCR error:", err);
      if (targetMode === "lookup") {
        alert("เกิดข้อผิดพลาดในการวิเคราะห์ภาพ กรุณาลองใหม่อีกครั้งหรือพิมพ์เลขทะเบียนด้วยตนเอง");
      }
    } finally {
      setIsOcrProcessing(false);
      setOcrStatusText(null);
    }
  };

  const handleVideoShutter = async (targetMode: "lookup" | "patrol") => {
    if (!videoRef.current) {
      alert("กล้องยังไม่พร้อมใช้งาน กรุณากดปุ่มรีสตาร์ตกล้อง หรือเลือกอัปโหลดรูปภาพ");
      return;
    }
    const frames = captureOcrScanArea();
    if (frames) {
      await performOcrOnImage(frames.cropDataUrl, targetMode, frames.fullDataUrl, frames.cropCanvas);
    } else {
      const frame = captureVideoFrame();
      if (!frame) {
        alert("ไม่สามารถจับภาพจากกล้องได้ กรุณาลองใหม่อีกครั้ง");
        return;
      }
      await performOcrOnImage(frame, targetMode, frame);
    }
  };

  const handleFileInputChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
    targetMode: "lookup" | "patrol"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsOcrProcessing(true);
      setOcrStatusText("กำลังปรับขนาดและประมวลผลรูปภาพ...");
      const dataUrl = await resizeImageBase64(file, 1280);
      await performOcrOnImage(dataUrl, targetMode);
    } catch (err) {
      console.error("File processing error:", err);
      alert("ไม่สามารถประมวลผลไฟล์ภาพได้ กรุณาลองใหม่อีกครั้ง");
      setIsOcrProcessing(false);
      setOcrStatusText(null);
    } finally {
      if (e.target) e.target.value = "";
    }
  };

  // --- PATROL CONTINUOUS SCAN HANDLER ---
  const handleContinuousScan = async (rawPlate: string, zoneOverride?: string, capturedImage?: string) => {
    const plate = rawPlate.trim().toUpperCase();
    if (!plate) return;

    const now = Date.now();
    const lastTime = lastScannedRef.current[plate] || 0;

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

    const cleanScanPlate = plate.replace(/\s+/g, "").toUpperCase();
    const staff = staffVehicles.find((v) => {
      const vClean = v.plateNumber.replace(/\s+/g, "").toUpperCase();
      return (
        vClean === cleanScanPlate ||
        vClean.includes(cleanScanPlate) ||
        cleanScanPlate.includes(vClean)
      );
    });

    const isStaff = !!staff;
    const roundLabel = selectedRound === "22:00" ? "รอบดึก 22:00 น." : "รอบเช้า 06:00 น.";
    const zone = zoneOverride || (isStaff ? (staff.zone || "ลานจอดบุคลากร") : "ลานจอดโรงพยาบาล");

    // อัปโหลดรูปภาพหลักฐานไปยัง Google Drive โฟลเดอร์ "ภาพถ่ายตรวจรถ (Vehicle Scans)"
    let finalPhotoUrl = capturedImage;
    if (capturedImage && capturedImage.startsWith("data:image")) {
      try {
        finalPhotoUrl = (await uploadImageToDrive({
          image: capturedImage,
          title: `CAR_${plate}_${selectedRound.replace(":", "")}`,
          subfolder: "ภาพถ่ายตรวจรถ (Vehicle Scans)",
          webhookUrl: googleDriveWebhookUrl,
        })) || capturedImage;
      } catch (uploadErr) {
        console.warn("Drive vehicle photo upload fallback:", uploadErr);
      }
    }

    addParkingScan({
      plateNumber: plate,
      province: staff ? staff.province : "ขอนแก่น",
      round: selectedRound,
      roundName: roundLabel,
      timestamp: new Date().toISOString(),
      isStaff,
      ownerName: staff ? staff.ownerName : undefined,
      department: staff ? staff.department : undefined,
      zone,
      imageUrl: finalPhotoUrl,
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

    // ✨ แสดงข้อความแจ้งเตือนบันทึกลอยมา (Floating Banner Alert)
    setFloatingNotification({
      id: "alert-" + Date.now(),
      plate,
      isStaff,
      ownerName: staff ? staff.ownerName : undefined,
      department: staff ? staff.department : undefined,
      round: selectedRound,
      timestamp: new Date().toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }),
    });

    if (floatingNotificationTimeoutRef.current) {
      clearTimeout(floatingNotificationTimeoutRef.current);
    }
    floatingNotificationTimeoutRef.current = setTimeout(() => {
      setFloatingNotification(null);
    }, 4500);

    setCameraInputPlate("");
  };

  const todayDateStr = new Date().toISOString().split("T")[0];
  const todayScans = parkingScans.filter((s) => s.timestamp && s.timestamp.startsWith(todayDateStr));
  const todayStaffCount = todayScans.filter((s) => s.isStaff).length;
  const todayOutsideCount = todayScans.filter((s) => !s.isStaff).length;

  const currentRoundScans = parkingScans.filter((s) => {
    if (!s.timestamp?.startsWith(todayDateStr)) return false;
    return s.round === selectedRound || (s.roundName && s.roundName.includes(selectedRound));
  });
  const staffCountInRound = currentRoundScans.filter((s) => s.isStaff).length;
  const outsideCountInRound = currentRoundScans.filter((s) => !s.isStaff).length;

  if (!currentUser) return null;

  return (
    <div className="min-h-screen bg-[#f0f6fa] text-slate-800 flex flex-col max-w-md mx-auto border-x border-sky-100 shadow-xl font-['Sarabun',sans-serif]">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-sky-100 px-4 py-3 space-y-2.5 shadow-xs">
        <div className="flex items-center justify-between">
          <Link
            href="/guard"
            className="p-2 -ml-2 rounded-xl bg-slate-100 text-slate-600 hover:text-slate-900 active:scale-95 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <HospitalBrand badgeText="ตรวจสอบยานพาหนะ" />

          <button
            onClick={() => setSoundEnabled((prev) => !prev)}
            className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200"
            title={soundEnabled ? "ปิดเสียงสัญญาณ" : "เปิดเสียงสัญญาณ"}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-600" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
          </button>
        </div>

        {/* Primary Functional Tabs */}
        <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-2xl border border-slate-200 text-xs font-bold gap-1">
          <button
            type="button"
            onClick={() => {
              setMainTab("lookup");
              stopPatrolCamera();
            }}
            className={`py-2 px-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              mainTab === "lookup"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/25"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>ดูว่ารถใคร (24 ชม.)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMainTab("patrol");
            }}
            className={`py-2 px-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              mainTab === "patrol"
                ? "bg-sky-600 text-white shadow-md shadow-sky-600/25"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>ตรวจรอบเวร (เช้า/ดึก)</span>
          </button>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 p-4 space-y-4 overflow-y-auto relative pb-16">
        {/* Floating Toasts */}
        <div className="fixed top-32 left-0 right-0 z-50 pointer-events-none px-4 flex flex-col items-center gap-2 max-w-md mx-auto">
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
                    className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
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

        {/* ========================================================================= */}
        {/* MAIN TAB 1: VEHICLE OWNER LOOKUP (แป้นตัวเลข -> ใส่เสร็จค่อยกดค้นหา) */}
        {/* ========================================================================= */}
        {mainTab === "lookup" && (
          <div className="space-y-4 animate-in fade-in-50 duration-200">
            {/* Top Status & Description */}
            <div className="p-3.5 bg-gradient-to-r from-emerald-500/10 via-teal-50 to-sky-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
                  <Search className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-extrabold text-slate-900 leading-tight">ตรวจสอบเจ้าของรถ & สิทธิ์จอด</h2>
                  <p className="text-[11px] text-emerald-800">ค้นหาได้ตลอด 24 ชม. • ฐานข้อมูล 530 คันในเครื่อง (0.01s)</p>
                </div>
              </div>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold border border-emerald-200">
                พร้อมใช้งาน
              </span>
            </div>

            {/* INPUT & DISPLAY BOX */}
            <div className="p-4 bg-white border border-sky-100 rounded-3xl shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">
                  ใส่เลขทะเบียน 4 ตัวท้าย (หรือพิมพ์ค้นหา)
                </label>
                {dialQuery && (
                  <button
                    type="button"
                    onClick={handleDialClear}
                    className="text-[11px] text-rose-600 hover:underline font-bold"
                  >
                    ล้างตัวเลข
                  </button>
                )}
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handlePerformSearch();
                }}
                className="space-y-2.5"
              >
                <div className="relative">
                  <input
                    type="text"
                    value={dialQuery}
                    onChange={(e) => setDialQuery(e.target.value)}
                    placeholder="กดเลขบนแป้นด้านล่าง..."
                    className="w-full pl-4 pr-10 py-3.5 bg-slate-50 border-2 border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 font-mono text-xl font-bold tracking-widest text-center focus:outline-none focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-200 transition-all"
                  />
                  {dialQuery && (
                    <button
                      type="button"
                      onClick={handleDialClear}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>

              </form>
            </div>

            {/* Hidden file input for native camera in Lookup mode */}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              ref={lookupFileInputRef}
              onChange={(e) => handleFileInputChange(e, "lookup")}
              className="hidden"
            />

            {/* AI Camera OCR Button */}
            <button
              type="button"
              onClick={() => lookupFileInputRef.current?.click()}
              disabled={isOcrProcessing}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-sky-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-2xl font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/25 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isOcrProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>{ocrStatusText || "กำลังวิเคราะห์ป้ายทะเบียนด้วย AI..."}</span>
                </>
              ) : (
                <>
                  <Camera className="w-4 h-4 text-emerald-100" />
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>ถ่ายรูปสแกนป้ายด้วยกล้อง AI (ไม่ต้องพิมพ์)</span>
                </>
              )}
            </button>

            {/* QUICK NUMERIC DIALPAD */}
            <div className="p-3 bg-white border border-slate-200 rounded-3xl shadow-xs space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  แป้นกดตัวเลข (เหมือนตู้ ATM)
                </span>
                <span className="text-[10px] text-emerald-700 font-medium">กดเลขเสร็จแล้วแตะปุ่มค้นหา</span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handleDialPress(num)}
                    className="h-13 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-2xl text-2xl font-bold font-mono text-slate-800 active:scale-95 active:bg-emerald-600 active:text-white transition-all shadow-2xs flex items-center justify-center"
                  >
                    {num}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handleDialClear}
                  className="h-13 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 rounded-2xl text-sm font-bold active:scale-95 transition-all flex items-center justify-center"
                >
                  ล้าง
                </button>
                <button
                  type="button"
                  onClick={() => handleDialPress("0")}
                  className="h-13 bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 rounded-2xl text-2xl font-bold font-mono text-slate-800 active:scale-95 active:bg-emerald-600 active:text-white transition-all shadow-2xs flex items-center justify-center"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={handleDialDelete}
                  className="h-13 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl flex items-center justify-center active:scale-95 transition-all"
                  title="ลบตัวเลข"
                >
                  <Delete className="w-6 h-6" />
                </button>
              </div>

              {/* PRIMARY SEARCH BUTTON (แตะเมื่อใส่เลขเสร็จ) */}
              <button
                type="button"
                onClick={() => handlePerformSearch()}
                disabled={!dialQuery.trim()}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-2xl font-bold text-base shadow-md shadow-emerald-600/30 active:scale-98 transition-all flex items-center justify-center gap-2 mt-2 cursor-pointer"
              >
                <Search className="w-5 h-5" />
                <span>ค้นหาเจ้าของรถ</span>
              </button>
            </div>

            {/* ================================================================= */}
            {/* SEARCH RESULTS DISPLAY (โชว์เมื่อกดค้นหา) */}
            {/* ================================================================= */}

            {/* CASE A: FOUND MULTIPLE CARS (เช่น เจอ 2 คันขึ้นไป -> ให้จิ้มเลือกว่าจะเอาคันไหน) */}
            {hasSearched && matchedVehicles.length > 1 && !selectedVehicle && (
              <div className="p-5 bg-white border-2 border-emerald-400 rounded-3xl shadow-lg space-y-3.5 animate-in zoom-in-95 duration-200">
                <div className="border-b border-slate-100 pb-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                      พบรถตรงกัน {matchedVehicles.length} คัน
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-600">
                      เลขที่ค้นหา: {submittedQuery}
                    </span>
                  </div>
                  <h3 className="text-base font-black text-slate-900 mt-1">
                    พบรถ {matchedVehicles.length} คันที่มีเลขนี้
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    กรุณาแตะเลือกคันที่ต้องการดูข้อมูลเจ้าของรถและเบอร์โทร:
                  </p>
                </div>

                <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                  {matchedVehicles.map((v, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setSelectedVehicle(v)}
                      className="w-full p-3.5 rounded-2xl border-2 border-slate-200 hover:border-emerald-500 bg-slate-50 hover:bg-emerald-50/50 text-left flex items-center justify-between transition-all active:scale-98 shadow-2xs group"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-sm shrink-0 shadow-xs ${
                          v.vehicleType === "รถจักรยานยนต์" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                        }`}>
                          {v.vehicleType === "รถจักรยานยนต์" ? <Bike className="w-6 h-6" /> : <Car className="w-6 h-6" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-black text-slate-900 text-base group-hover:text-emerald-800 transition-colors">
                              {v.plateNumber}
                            </span>
                            <span className="text-[11px] text-slate-500 font-medium">{v.province}</span>
                          </div>
                          <p className="text-xs font-bold text-slate-700 mt-0.5">
                            {v.ownerName}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {v.department} {[v.brand, v.model].filter(Boolean).join(" ")}
                          </p>
                        </div>
                      </div>

                      <div className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold shrink-0 shadow-xs group-hover:scale-105 transition-transform flex items-center gap-1">
                        <span>เลือกคันนี้</span>
                        <span>&gt;</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* CASE B: SINGLE CAR SELECTED OR FOUND (แสดงการ์ดข้อมูลเจ้าของรถเต็มรูปแบบ) */}
            {hasSearched && selectedVehicle && (
              <div className="space-y-3 animate-in zoom-in-95 duration-200">
                {/* Back to multiple list button if there were 2+ cars */}
                {matchedVehicles.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setSelectedVehicle(null)}
                    className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all active:scale-98"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>กลับไปหน้ารายการ (พบทั้งหมด {matchedVehicles.length} คัน)</span>
                  </button>
                )}

                <div className="p-5 bg-white border-2 border-emerald-500 rounded-3xl shadow-lg space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-xs ${
                        selectedVehicle.vehicleType === "รถจักรยานยนต์"
                          ? "bg-amber-100 text-amber-700 ring-2 ring-amber-200"
                          : "bg-emerald-100 text-emerald-700 ring-2 ring-emerald-200"
                      }`}>
                        {selectedVehicle.vehicleType === "รถจักรยานยนต์" ? (
                          <Bike className="w-7 h-7" />
                        ) : (
                          <Car className="w-7 h-7" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200">
                            {selectedVehicle.vehicleType === "รถจักรยานยนต์" ? "🏍️ รถจักรยานยนต์บุคลากร" : "🚗 รถยนต์บุคลากร รพ.พล"}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                            {selectedVehicle.province || "ขอนแก่น"}
                          </span>
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 mt-0.5 font-mono tracking-tight">
                          {selectedVehicle.plateNumber}
                        </h3>
                      </div>
                    </div>

                    <span className="text-xs text-emerald-700 font-extrabold bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200 flex items-center gap-1 shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      มีสิทธิ์จอด
                    </span>
                  </div>

                  {/* Details list */}
                  <div className="space-y-3 text-sm bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    {/* Brand / Model / Color */}
                    {(selectedVehicle.brand || selectedVehicle.model || selectedVehicle.color) && (
                      <div className="flex items-center gap-3 text-slate-700 pb-2.5 border-b border-slate-200/60">
                        <div className="w-5 h-5 text-emerald-600 shrink-0 flex items-center justify-center">
                          <Car className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-[11px] text-slate-500 block font-medium">ยี่ห้อ / รุ่น / สีรถ</span>
                          <span className="font-bold text-slate-900 text-sm">
                            {[selectedVehicle.brand, selectedVehicle.model].filter(Boolean).join(" ")}
                            {selectedVehicle.color ? ` (สี ${selectedVehicle.color})` : ""}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Owner */}
                    <div className="flex items-center gap-3 text-slate-700 pb-2.5 border-b border-slate-200/60">
                      <div className="w-5 h-5 text-emerald-600 shrink-0 flex items-center justify-center">
                        <User className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-500 block font-medium">เจ้าของรถ</span>
                        <span className="font-bold text-slate-900 text-base">{selectedVehicle.ownerName}</span>
                      </div>
                    </div>

                    {/* Department */}
                    <div className="flex items-center gap-3 text-slate-700 pb-2.5 border-b border-slate-200/60">
                      <div className="w-5 h-5 text-emerald-600 shrink-0 flex items-center justify-center">
                        <Building className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-500 block font-medium">แผนก / หน่วยงาน / ตึก</span>
                        <span className="font-semibold text-slate-800 text-sm">{selectedVehicle.department}</span>
                      </div>
                    </div>

                    {/* Parking Zone */}
                    {selectedVehicle.zone && (
                      <div className="flex items-center gap-3 text-slate-700 pb-2.5 border-b border-slate-200/60">
                        <span className="text-xs text-slate-500 w-5 text-center">🅿️</span>
                        <div>
                          <span className="text-[11px] text-slate-500 block font-medium">โซนจอดประจำ</span>
                          <span className="font-semibold text-slate-800 text-sm">{selectedVehicle.zone}</span>
                        </div>
                      </div>
                    )}

                    {/* Phone number & 1-Tap Call */}
                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-3 text-slate-700">
                        <div className="w-5 h-5 text-emerald-600 shrink-0 flex items-center justify-center">
                          <Phone className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-[11px] text-slate-500 block font-medium">เบอร์โทรศัพท์</span>
                          <span className="font-mono text-emerald-800 font-extrabold text-base">
                            {selectedVehicle.phone || "ไม่ระบุ"}
                          </span>
                        </div>
                      </div>

                      {selectedVehicle.phone && selectedVehicle.phone !== "-" && (
                        <a
                          href={`tel:${selectedVehicle.phone}`}
                          className="px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-bold flex items-center gap-2 shadow-md shadow-emerald-600/30 active:scale-95 transition-all"
                        >
                          <Phone className="w-4 h-4 fill-current" />
                          <span>โทรหาทันที</span>
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Quick Security Actions for Guards */}
                  <div className="space-y-2 pt-1 border-t border-slate-100">
                    <span className="text-xs font-bold text-slate-700 block">
                      บันทึกการแจ้งเตือนเจ้าหน้าที่ รปภ. (หากมีเหตุ):
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setReportedIssue(reportedIssue === "ขวางทาง" ? null : "ขวางทาง")}
                        className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all text-center ${
                          reportedIssue === "ขวางทาง"
                            ? "bg-rose-100 border-rose-400 text-rose-800"
                            : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        🚗 จอดขวางทาง
                      </button>
                      <button
                        type="button"
                        onClick={() => setReportedIssue(reportedIssue === "ลืมปิดไฟ" ? null : "ลืมปิดไฟ")}
                        className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all text-center ${
                          reportedIssue === "ลืมปิดไฟ"
                            ? "bg-amber-100 border-amber-400 text-amber-800"
                            : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        💡 ลืมปิดไฟหน้า
                      </button>
                      <button
                        type="button"
                        onClick={() => setReportedIssue(reportedIssue === "ขวางทางฉุกเฉิน" ? null : "ขวางทางฉุกเฉิน")}
                        className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all text-center ${
                          reportedIssue === "ขวางทางฉุกเฉิน"
                            ? "bg-rose-100 border-rose-400 text-rose-800"
                            : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        🚨 ขวางจุด ER
                      </button>
                    </div>

                    {reportedIssue && (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2 animate-in fade-in-50 text-xs">
                        <p className="font-bold text-amber-900">
                          คุณระบุเหตุ: &ldquo;{reportedIssue}&rdquo;
                        </p>
                        {selectedVehicle.phone && selectedVehicle.phone !== "-" ? (
                          <a
                            href={`tel:${selectedVehicle.phone}`}
                            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold flex items-center justify-center gap-2"
                          >
                            <Phone className="w-3.5 h-3.5" /> โทรแจ้งเจ้าของรถ ({selectedVehicle.ownerName})
                          </a>
                        ) : (
                          <p className="text-amber-800 text-[11px]">
                            ไม่มีเบอร์โทรในระบบ กรุณาประสานงานหัวหน้า รปภ. หรือประชาสัมพันธ์โรงพยาบาล
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Button to search new vehicle */}
                <button
                  type="button"
                  onClick={handleDialClear}
                  className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-98"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>ค้นหาเลขทะเบียนคันใหม่</span>
                </button>
              </div>
            )}

            {/* CASE C: NOT FOUND RESULT: OUTSIDE VEHICLE */}
            {hasSearched && matchedVehicles.length === 0 && (
              <div className="p-5 bg-rose-50 border-2 border-rose-400 rounded-3xl shadow-md space-y-4 animate-in fade-in-50 duration-200">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                    <AlertOctagon className="w-7 h-7" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200">
                      รถภายนอก / ผู้มารับบริการ
                    </span>
                    <h3 className="text-xl font-black text-slate-900 mt-0.5 font-mono">{submittedQuery}</h3>
                  </div>
                </div>

                <div className="p-3.5 bg-white rounded-2xl border border-rose-200 text-xs text-rose-900 space-y-1">
                  <p className="font-bold flex items-center gap-1.5 text-rose-700">
                    <ShieldAlert className="w-4 h-4" /> ผลการตรวจสอบสิทธิ์:
                  </p>
                  <p className="text-slate-600 leading-relaxed">
                    • <strong>ไม่มีข้อมูลในฐานข้อมูลรถบุคลากร รพ.พล (530 คัน)</strong><br />
                    • เป็นรถของผู้ป่วย, ญาติผู้ป่วย หรือบุคคลภายนอกที่เข้ามาติดต่อ<br />
                    • อนุญาตให้จอดในลานจอดรถผู้รับบริการทั่วไป (ห้ามจอดในช่องเฉพาะแพทย์หรือทางฉุกเฉิน)
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      handleContinuousScan(submittedQuery, "ลานจอดรถภายนอก");
                      addToast({
                        plate: submittedQuery,
                        isStaff: false,
                        type: "warning",
                        message: `บันทึกหมายเลข ${submittedQuery} เป็นรถภายนอกเรียบร้อย`,
                      });
                    }}
                    className="flex-1 py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md active:scale-95 transition-all flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>บันทึกเฝ้าระวัง</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDialClear}
                    className="py-3 px-4 rounded-2xl bg-white border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>ค้นหาใหม่</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* MAIN TAB 2: PATROL ROUNDS (เดินตรวจสแกนรถทุกคันใน รพ.) */}
        {/* ========================================================================= */}
        {mainTab === "patrol" && (
          <div className="space-y-4 animate-in fade-in-50 duration-200">
            {/* Round Selector & Flashlight Header */}
            <div className="p-4 bg-white border border-sky-100 rounded-3xl shadow-xs space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1">
                  <span className="text-[11px] font-bold text-slate-500 block mb-1.5">
                    รอบตรวจสแกนรถ (เฉพาะ 2 รอบมาตรฐาน):
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedRound("22:00")}
                      className={`py-2 px-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 ${
                        selectedRound === "22:00"
                          ? "bg-slate-900 text-amber-300 shadow-md ring-2 ring-amber-400/40"
                          : "bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200"
                      }`}
                    >
                      <Moon className="w-3.5 h-3.5" />
                      <span>🌙 รอบ 22:00 น. (ดึก)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedRound("06:00")}
                      className={`py-2 px-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 ${
                        selectedRound === "06:00"
                          ? "bg-sky-600 text-white shadow-md ring-2 ring-sky-300"
                          : "bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200"
                      }`}
                    >
                      <Sun className="w-3.5 h-3.5" />
                      <span>☀️ รอบ 06:00 น. (เช้า)</span>
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={toggleTorch}
                  className={`px-3.5 py-2.5 mt-5 rounded-2xl border flex items-center gap-1.5 text-xs font-bold transition-all active:scale-95 shrink-0 ${
                    torchOn
                      ? "bg-amber-400 text-slate-950 border-amber-500 shadow-md shadow-amber-400/30 ring-2 ring-amber-200"
                      : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
                  }`}
                >
                  <Flashlight className={`w-4 h-4 ${torchOn ? "fill-current animate-bounce" : ""}`} />
                  <span>{torchOn ? "เปิดไฟ" : "ไฟฉาย"}</span>
                </button>
              </div>

              {/* 2 Big Live Counters (รอบนี้ vs วันนี้) */}
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                {/* Counter 1: รอบนี้ */}
                <div className="p-3 bg-sky-50/70 border border-sky-200 rounded-2xl space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-bold text-sky-800">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-sky-500 animate-ping" />
                      {selectedRound === "22:00" ? "รอบดึก 22:00 น." : "รอบเช้า 06:00 น."}
                    </span>
                    <span className="text-[10px] bg-white px-2 py-0.5 rounded-full border border-sky-200 text-sky-700">รอบนี้</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-sky-950 font-mono">{currentRoundScans.length}</span>
                    <span className="text-xs text-sky-600 font-semibold">คัน</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500 pt-0.5 border-t border-sky-100">
                    <span className="text-emerald-700 font-semibold">รพ. {staffCountInRound}</span>
                    <span>•</span>
                    <span className="text-amber-700 font-semibold">นอก {outsideCountInRound}</span>
                  </div>
                </div>

                {/* Counter 2: วันนี้ */}
                <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-bold text-emerald-800">
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      ยอดรวมวันนี้
                    </span>
                    <span className="text-[10px] bg-white px-2 py-0.5 rounded-full border border-emerald-200 text-emerald-700">สะสม</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-emerald-950 font-mono">{todayScans.length}</span>
                    <span className="text-xs text-emerald-600 font-semibold">คัน</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500 pt-0.5 border-t border-emerald-100">
                    <span className="text-emerald-700 font-semibold">รพ. {todayStaffCount}</span>
                    <span>•</span>
                    <span className="text-amber-700 font-semibold">นอก {todayOutsideCount}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Continuous Viewfinder Camera Box */}
            <div className="relative aspect-4/3 sm:aspect-16/11 bg-slate-950 rounded-3xl overflow-hidden border-2 border-sky-300 shadow-lg flex flex-col justify-between p-4">
              <video
                ref={videoRef}
                playsInline
                autoPlay
                muted
                className="absolute inset-0 w-full h-full object-cover"
              />

              {/* Viewfinder HUD */}
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6 z-10">
                <div className={`w-full max-w-[280px] h-28 border-2 rounded-2xl relative shadow-2xl transition-all duration-300 ${
                  scanPulse
                    ? "border-emerald-300 ring-4 ring-emerald-400/80 shadow-emerald-400/50 scale-105"
                    : isAutoScanningFrame
                    ? "border-emerald-400 ring-2 ring-emerald-400/50 shadow-emerald-500/30"
                    : "border-sky-400/80"
                }`}>
                  <div className="absolute -top-1 -left-1 w-4 h-4 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
                  <div className="absolute -top-1 -right-1 w-4 h-4 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
                  <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />

                  {/* Laser Scanning Animation */}
                  <div className={`w-full h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent absolute top-1/2 -translate-y-1/2 ${
                    isAutoScanningFrame ? "animate-ping opacity-100" : "animate-pulse opacity-70"
                  }`} />

                  {/* Live OCR detection badge inside HUD */}
                  {lastDetectedPlate ? (
                    <div className="absolute -top-9 left-0 right-0 text-center animate-in zoom-in-95 duration-200">
                      <span className="text-xs font-black text-slate-950 bg-emerald-400 px-3.5 py-1 rounded-full shadow-lg border border-emerald-200 font-mono tracking-wider inline-flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>พบเลขทะเบียน: {lastDetectedPlate}</span>
                      </span>
                    </div>
                  ) : isAutoScanningFrame ? (
                    <div className="absolute -top-7 left-0 right-0 text-center">
                      <span className="text-[10px] font-bold text-emerald-300 bg-slate-900/80 px-2.5 py-0.5 rounded-full border border-emerald-500/30 inline-flex items-center gap-1">
                        <Loader2 className="w-2.5 h-2.5 animate-spin text-emerald-400" />
                        <span>AI กำลังอ่านป้าย...</span>
                      </span>
                    </div>
                  ) : null}

                  <div className="absolute -bottom-6 left-0 right-0 text-center">
                    <span className="text-[10px] font-bold text-white/95 bg-slate-900/90 px-3 py-0.5 rounded-full backdrop-blur-xs border border-white/10 shadow-sm">
                      ส่องกรอบนี้ตรงป้ายทะเบียน (จับเลขอัตโนมัติทันที)
                    </span>
                  </div>
                </div>
              </div>

              {/* ✨ ข้อความแจ้งเตือนบันทึกลอยมาทันทีเมื่อส่องกล้อง (Floating Save Banner) */}
              {floatingNotification && (
                <div className="absolute inset-x-3 top-13 z-30 animate-in fade-in-0 slide-in-from-top-4 zoom-in-95 duration-200">
                  <div
                    className={`p-3.5 rounded-2xl shadow-2xl backdrop-blur-xl border-2 flex items-center gap-3 ${
                      floatingNotification.isStaff
                        ? "bg-slate-950/95 text-white border-emerald-400 shadow-emerald-500/40 ring-4 ring-emerald-500/20"
                        : "bg-slate-950/95 text-white border-sky-400 shadow-sky-500/40 ring-4 ring-sky-500/20"
                    }`}
                  >
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-lg ${
                        floatingNotification.isStaff ? "bg-emerald-500 text-white" : "bg-sky-500 text-white"
                      }`}
                    >
                      <CheckCircle2 className="w-6 h-6 stroke-[2.5] animate-bounce" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                          บันทึกสำเร็จ {floatingNotification.round === "22:00" ? "รอบดึก 22:00 น." : "รอบเช้า 06:00 น."}
                        </span>
                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                            floatingNotification.isStaff
                              ? "bg-emerald-500/30 text-emerald-300 border-emerald-400/40"
                              : "bg-sky-500/30 text-sky-300 border-sky-400/40"
                          }`}
                        >
                          {floatingNotification.isStaff ? "บุคลากร รพ." : "รถภายนอก"}
                        </span>
                      </div>

                      <div className="flex items-baseline gap-2 mt-0.5">
                        <span className="text-xl font-black font-mono tracking-wider text-white">
                          {floatingNotification.plate}
                        </span>
                        {floatingNotification.ownerName && (
                          <span className="text-xs text-emerald-200 truncate font-bold">
                            • {floatingNotification.ownerName}
                          </span>
                        )}
                      </div>

                      {floatingNotification.department && (
                        <span className="text-[10px] text-slate-300 block truncate">
                          {floatingNotification.department}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Viewfinder Header Toolbar */}
              <div className="relative z-20 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur-md text-[10px] font-mono text-emerald-400 flex items-center gap-1.5 border border-emerald-500/30">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    LIVE PATROL
                  </span>

                  <button
                    type="button"
                    onClick={() => setAutoScanActive(!autoScanActive)}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 backdrop-blur-md border transition-all active:scale-95 ${
                      autoScanActive
                        ? "bg-emerald-500/30 text-emerald-300 border-emerald-400/50 shadow-xs"
                        : "bg-slate-800/80 text-slate-400 border-slate-700"
                    }`}
                  >
                    <Zap className={`w-3 h-3 ${autoScanActive ? "fill-current text-amber-300 animate-pulse" : ""}`} />
                    <span>{autoScanActive ? "สแกนอัตโนมัติ: เปิด" : "สแกนอัตโนมัติ: ปิด"}</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={startPatrolCamera}
                  className="p-1.5 rounded-xl bg-slate-900/70 text-white/80 hover:text-white backdrop-blur-md text-[10px] flex items-center gap-1 border border-white/10"
                  title="รีสตาร์ตกล้อง"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Viewfinder Bottom Status */}
              <div className="relative z-20 text-center">
                <span className="text-[11px] text-white/90 bg-slate-900/85 px-3.5 py-1.5 rounded-full backdrop-blur-md border border-white/10 inline-flex items-center gap-1.5 shadow-md">
                  {autoScanActive ? (
                    <>
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      <span>ส่องกรอบไปที่ป้ายทะเบียน ระบบจะบันทึกลอยขึ้นมาอัตโนมัติ</span>
                    </>
                  ) : (
                    <span>โหมดกดถ่าย: กดปุ่ม "ถ่ายจับป้าย (AI OCR)" ด้านล่าง</span>
                  )}
                </span>
              </div>
            </div>

            {/* Hidden file input for native camera in Patrol mode */}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              ref={patrolFileInputRef}
              onChange={(e) => handleFileInputChange(e, "patrol")}
              className="hidden"
            />

            {/* AI OCR Shutter & High-Res Upload Action Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleVideoShutter("patrol")}
                disabled={isOcrProcessing || !cameraActive}
                className="py-3.5 px-3 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-lg shadow-sky-600/30 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isOcrProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>กำลังวิเคราะห์...</span>
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4" />
                    <span>ถ่ายจับป้าย (AI OCR)</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => patrolFileInputRef.current?.click()}
                disabled={isOcrProcessing}
                className="py-3.5 px-3 bg-white hover:bg-slate-50 border-2 border-sky-200 text-sky-800 font-bold text-xs sm:text-sm rounded-2xl shadow-xs active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Upload className="w-4 h-4 text-sky-600" />
                <span>ถ่ายชัดสูง / อัปโหลด</span>
              </button>
            </div>

            {isOcrProcessing && (
              <div className="p-3 bg-sky-50 border border-sky-300 rounded-2xl flex items-center gap-2.5 text-sky-900 text-xs animate-pulse">
                <Loader2 className="w-4 h-4 animate-spin text-sky-600 shrink-0" />
                <span className="font-semibold">{ocrStatusText || "กำลังประมวลผลวิเคราะห์ป้ายทะเบียนด้วย AI..."}</span>
              </div>
            )}

            {cameraError && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-amber-800 text-xs flex items-center gap-2">
                <Info className="w-4 h-4 text-amber-600 shrink-0" />
                <span>{cameraError}</span>
              </div>
            )}

            {/* Fast Continuous Entry Form */}
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
                <input
                  type="text"
                  value={cameraInputPlate}
                  onChange={(e) => setCameraInputPlate(e.target.value)}
                  placeholder="เช่น 1234 หรือ 9999"
                  className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 font-mono text-base font-bold focus:outline-none focus:border-sky-500 focus:bg-white focus:ring-1 focus:ring-sky-500"
                />
                <button
                  type="submit"
                  className="px-5 py-3 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-2xl shadow-md shadow-sky-600/20 active:scale-95 transition-all flex items-center gap-1.5 shrink-0"
                >
                  <Zap className="w-4 h-4 fill-current" /> บันทึก
                </button>
              </form>
            </div>

            {/* Scans List in Round */}
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  รายการสแกนรอบ {selectedRound === "22:00" ? "22:00 น. (ดึก)" : "06:00 น. (เช้า)"} ({currentRoundScans.length} คัน)
                </h3>
                <span className="text-[11px] text-sky-700 font-bold">แคชออฟไลน์ 0.01s</span>
              </div>

              {currentRoundScans.length === 0 ? (
                <div className="p-6 bg-white border border-slate-200 rounded-3xl text-center text-xs text-slate-400 space-y-1">
                  <p>ยังไม่มีรายการบันทึกในรอบ {selectedRound === "22:00" ? "22:00 น. (ดึก)" : "06:00 น. (เช้า)"}</p>
                  <p className="text-[11px]">พิมพ์เลข 4 ตัวท้ายด้านบนหรือใช้กล้องสแกนเพื่อบันทึก</p>
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
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-slate-900 text-sm">
                              {scan.plateNumber}
                            </span>
                            {scan.imageUrl && (
                              <button
                                type="button"
                                onClick={() => openFullImage(scan.imageUrl, `ตรวจรถ_${scan.plateNumber}`)}
                                className="inline-flex items-center gap-0.5 text-[9px] text-sky-600 hover:text-sky-800 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200 cursor-pointer active:scale-95"
                                title="ดูภาพถ่ายหลักฐานขนาดเต็ม"
                              >
                                <Camera className="w-2.5 h-2.5" />
                                <span>ภาพ</span>
                              </button>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-500 block">
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
      </main>
    </div>
  );
}

export default function VehiclePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f0f6fa] flex items-center justify-center text-xs text-slate-500">กำลังโหลดระบบตรวจสอบยานพาหนะ...</div>}>
      <VehicleContent />
    </Suspense>
  );
}
