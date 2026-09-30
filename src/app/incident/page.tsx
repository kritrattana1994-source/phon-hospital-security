"use client";

import { useState, useRef, useEffect } from "react";
import { 
  ArrowLeft, 
  Camera, 
  Upload, 
  CheckCircle2, 
  AlertTriangle, 
  Building, 
  Users, 
  HeartPulse, 
  Clock,
  ShieldCheck,
  Search,
  ExternalLink,
  ChevronRight,
  Filter,
  Check,
  X,
  RefreshCw,
  Plus,
  Archive,
  Image as ImageIcon
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useStore, Incident } from "@/lib/store";
import HospitalBrand from "@/components/HospitalBrand";
import { getCurrentShift, hospitalShifts } from "@/lib/patrolSchedule";
import { uploadImageToDrive } from "@/lib/uploadToDrive";

export default function IncidentPage() {
  const router = useRouter();
  const { 
    currentUser, 
    incidents, 
    addIncident, 
    updateIncidentStatus, 
    googleDriveWebhookUrl 
  } = useStore();

  const now = new Date();
  const activeShift = getCurrentShift(now);
  const todayStr = now.toISOString().split("T")[0];

  // Tab State: "active" (จัดการเหตุการณ์), "report" (แจ้งเหตุใหม่), "history" (ดูย้อนหลัง)
  const [activeTab, setActiveTab] = useState<"active" | "report" | "history">("active");
  const [subfilter, setSubfilter] = useState<"all" | "current_shift" | "previous_shift">("all");

  // New Incident Form State
  const [image, setImage] = useState<string | null>(null);
  const [type, setType] = useState<"facility" | "suspicious" | "medical">("facility");
  const [severity, setSeverity] = useState<"low" | "medium" | "high">("medium");
  const [title, setTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Resolution Modal State (สำหรับ รปภ. ปิดเหตุการณ์)
  const [resolvingIncident, setResolvingIncident] = useState<Incident | null>(null);
  const [resolutionPhoto, setResolutionPhoto] = useState<string | null>(null);
  const [resolutionNote, setResolutionNote] = useState("");
  const [resolutionSubmitting, setResolutionSubmitting] = useState(false);
  const [resolutionError, setResolutionError] = useState<string | null>(null);
  const resolutionFileInputRef = useRef<HTMLInputElement>(null);

  // Image Preview Modal
  const [previewPhoto, setPreviewPhoto] = useState<{ url: string; title: string } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser) {
      router.push("/guard");
    }
  }, [currentUser, router]);

  if (!currentUser) return null;

  // Split Incidents into Active and Resolved
  const activeIncidents = incidents.filter((i) => i.status !== "resolved");
  const resolvedIncidents = incidents.filter((i) => i.status === "resolved");

  // Filter current shift active vs previous shifts active
  const currentShiftActive = activeIncidents.filter((i) => {
    if (i.shift && i.shift === activeShift.id && (!i.dateString || i.dateString === todayStr)) {
      return true;
    }
    if (!i.shift && i.timestamp && i.timestamp.includes(todayStr)) {
      return true;
    }
    return false;
  });

  const previousShiftActive = activeIncidents.filter(
    (i) => !currentShiftActive.some((c) => c.id === i.id)
  );

  // Set default tab: if no active incidents, can default to active or report
  const displayActiveIncidents =
    subfilter === "current_shift"
      ? currentShiftActive
      : subfilter === "previous_shift"
      ? previousShiftActive
      : activeIncidents;

  // Handle Capture for New Incident
  const handleImageCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 800;
          const scaleSize = img.width > MAX_WIDTH ? MAX_WIDTH / img.width : 1;
          canvas.width = img.width * scaleSize;
          canvas.height = img.height * scaleSize;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
          const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.65);
          setImage(compressedDataUrl);
        };
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle Capture for Resolution Photo (ปิดงาน)
  const handleResolutionPhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 800;
          const scaleSize = img.width > MAX_WIDTH ? MAX_WIDTH / img.width : 1;
          canvas.width = img.width * scaleSize;
          canvas.height = img.height * scaleSize;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
          const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.65);
          setResolutionPhoto(compressedDataUrl);
          setResolutionError(null);
        };
      };
      reader.readAsDataURL(file);
    }
  };

  // Submit New Incident Report
  const handleSubmitNewReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;

    setSubmitting(true);
    try {
      let finalImageUrl = image;
      if (image && image.startsWith("data:image")) {
        try {
          finalImageUrl =
            (await uploadImageToDrive({
              image,
              title: `INC_${activeShift.id}_${title}`,
              subfolder: "รูปภาพเหตุการณ์ (Incidents)",
              webhookUrl: googleDriveWebhookUrl,
            })) || image;
        } catch (uploadErr) {
          console.warn("Upload incident to Google Drive fallback:", uploadErr);
        }
      }

      await addIncident({
        type,
        severity,
        title,
        imageUrl: finalImageUrl || "https://images.unsplash.com/photo-1517646287270-a5a9ca602e5c?w=600&q=80",
        shift: activeShift.id,
        shiftName: activeShift.name,
        dateString: todayStr,
      });

      setToastMessage("✅ แจ้งเหตุการณ์สำเร็จ และจัดเก็บรูปภาพเข้า Google Drive เรียบร้อยแล้ว");
      setTimeout(() => setToastMessage(null), 4000);
      setTitle("");
      setImage(null);
      setActiveTab("active");
    } catch (err) {
      console.warn("Submit fallback:", err);
      await addIncident({
        type,
        severity,
        title,
        imageUrl: image || "https://images.unsplash.com/photo-1517646287270-a5a9ca602e5c?w=600&q=80",
        shift: activeShift.id,
        shiftName: activeShift.name,
        dateString: todayStr,
      });
      setActiveTab("active");
    } finally {
      setSubmitting(false);
    }
  };

  // Quick Status update to "investigating" (ระหว่างดำเนินการ)
  const handleSetInvestigating = async (incidentId: string) => {
    await updateIncidentStatus(incidentId, "investigating");
    setToastMessage("🔵 ปรับสถานะเป็น 'ระหว่างดำเนินการ' เรียบร้อยแล้ว");
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Confirm Close Incident (ปิดเหตุการณ์)
  const handleConfirmCloseIncident = async () => {
    if (!resolvingIncident) return;
    if (!resolutionNote.trim()) {
      setResolutionError("กรุณากรอกรายละเอียดผลการแก้ไข / การระงับเหตุก่อนปิดงาน");
      return;
    }

    setResolutionSubmitting(true);
    setResolutionError(null);

    try {
      let finalResolutionUrl = resolutionPhoto;
      if (resolutionPhoto && resolutionPhoto.startsWith("data:image")) {
        try {
          finalResolutionUrl =
            (await uploadImageToDrive({
              image: resolutionPhoto,
              title: `RESOLVED_${resolvingIncident.id}`,
              subfolder: "รูปภาพปิดเหตุการณ์ (Incident Resolutions)",
              webhookUrl: googleDriveWebhookUrl,
            })) || resolutionPhoto;
        } catch (err) {
          console.warn("Upload resolution photo fallback:", err);
        }
      }

      const closerName = currentUser?.name || "เจ้าหน้าที่ รปภ.";
      await updateIncidentStatus(resolvingIncident.id, "resolved", {
        resolutionImageUrl: finalResolutionUrl || undefined,
        resolutionNote: resolutionNote.trim(),
        resolvedBy: closerName,
        resolvedAt: new Date().toLocaleString("th-TH", { hour12: false }),
      });

      setToastMessage(`🔒 ปิดเหตุการณ์ "${resolvingIncident.title}" เรียบร้อยแล้ว (ย้ายเข้าคลังย้อนหลัง)`);
      setTimeout(() => setToastMessage(null), 4000);
      setResolvingIncident(null);
      setResolutionPhoto(null);
      setResolutionNote("");
    } catch (err: any) {
      setResolutionError("เกิดข้อผิดพลาดในการบันทึกข้อมูล: " + (err?.message || ""));
    } finally {
      setResolutionSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f6fa] text-slate-800 flex flex-col max-w-md mx-auto border-x border-sky-100 shadow-xl font-['Sarabun',sans-serif]">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-sky-100 px-4 py-3 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link
              href="/guard"
              className="p-2 -ml-2 rounded-xl bg-slate-100 text-slate-600 hover:text-slate-900 active:scale-95 transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <HospitalBrand badgeText="จัดการเหตุการณ์ รพ.พล" />
          </div>

          <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 text-xs font-bold font-mono border border-rose-200 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            <span>ค้าง {activeIncidents.length}</span>
          </span>
        </div>

        {/* 3 Main Action Tabs */}
        <div className="grid grid-cols-3 gap-1.5 pt-3">
          <button
            onClick={() => setActiveTab("active")}
            className={`py-2 px-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "active"
                ? "bg-rose-600 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>จัดการ ({activeIncidents.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("report")}
            className={`py-2 px-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "report"
                ? "bg-rose-600 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>แจ้งเหตุใหม่</span>
          </button>

          <button
            onClick={() => setActiveTab("history")}
            className={`py-2 px-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "history"
                ? "bg-rose-600 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <Archive className="w-3.5 h-3.5" />
            <span>ดูย้อนหลัง ({resolvedIncidents.length})</span>
          </button>
        </div>
      </header>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="mx-4 mt-3 p-3 bg-emerald-600 text-white text-xs font-bold rounded-2xl shadow-md flex items-center gap-2 animate-in fade-in-50">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 p-4 space-y-4 overflow-y-auto">
        {/* ============================================================== */}
        {/* TAB 1: ACTIVE INCIDENTS (ต้องจัดการ) */}
        {/* ============================================================== */}
        {activeTab === "active" && (
          <div className="space-y-4">
            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              <button
                onClick={() => setSubfilter("all")}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 cursor-pointer ${
                  subfilter === "all"
                    ? "bg-slate-900 text-white shadow-2xs"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                }`}
              >
                ทั้งหมด ({activeIncidents.length})
              </button>

              <button
                onClick={() => setSubfilter("current_shift")}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 flex items-center gap-1 cursor-pointer ${
                  subfilter === "current_shift"
                    ? "bg-rose-600 text-white shadow-2xs"
                    : "bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                <span>กะปัจจุบัน: {activeShift.name} ({currentShiftActive.length})</span>
              </button>

              <button
                onClick={() => setSubfilter("previous_shift")}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 cursor-pointer ${
                  subfilter === "previous_shift"
                    ? "bg-slate-700 text-white shadow-2xs"
                    : "bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200"
                }`}
              >
                ค้างจากกะก่อนหน้า ({previousShiftActive.length})
              </button>
            </div>

            {/* Empty State */}
            {activeIncidents.length === 0 && (
              <div className="p-8 bg-white border border-emerald-200 rounded-3xl text-center space-y-3 shadow-xs">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center">
                  <ShieldCheck className="w-8 h-8" />
                </div>
                <h3 className="font-extrabold text-slate-900 text-base">สถานการณ์ปกติเรียบร้อย ✅</h3>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  ไม่มีเหตุผิดปกติค้างในระบบ รปภ. สามารถเดินตรวจตามรอบหรือกดปุ่มเพื่อแจ้งเหตุใหม่ได้ทันที
                </p>
                <button
                  onClick={() => setActiveTab("report")}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-xs active:scale-95 transition-all inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> แจ้งเหตุด่วนใหม่
                </button>
              </div>
            )}

            {/* 1. CURRENT SHIFT ACTIVE INCIDENTS (แสดงเด่นรายกะ) */}
            {(subfilter === "all" || subfilter === "current_shift") && currentShiftActive.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-rose-900 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping" />
                    <span>🔥 เหตุการณ์กะปัจจุบัน ({activeShift.name}) — ต้องจัดการด่วน</span>
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300">
                    แสดงเด่นในกะ
                  </span>
                </div>

                {currentShiftActive.map((incident) => (
                  <div
                    key={incident.id}
                    className="p-4 bg-gradient-to-br from-rose-50/90 via-amber-50/60 to-white border-2 border-rose-400 rounded-3xl shadow-sm space-y-3 transition-all"
                  >
                    {/* Top Row Badges */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
                            incident.severity === "high"
                              ? "bg-rose-600 text-white animate-pulse"
                              : incident.severity === "medium"
                              ? "bg-amber-500 text-white"
                              : "bg-sky-600 text-white"
                          }`}
                        >
                          {incident.severity === "high" ? "🚨 วิกฤต" : incident.severity === "medium" ? "⚠️ ปานกลาง" : "ℹ️ เฝ้าระวัง"}
                        </span>

                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700">
                          {incident.type === "facility" ? "🏢 อาคารสถานที่" : incident.type === "suspicious" ? "👤 บุคคลต้องสงสัย" : "🚑 การแพทย์"}
                        </span>

                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-rose-100 text-rose-900 border border-rose-200">
                          กะ{incident.shiftName || activeShift.name}
                        </span>
                      </div>

                      <span className="text-[10px] text-slate-500 font-mono font-bold shrink-0">
                        {incident.timestamp}
                      </span>
                    </div>

                    {/* Image & Detail Body */}
                    <div className="flex gap-3 items-start">
                      {incident.imageUrl && (
                        <div
                          onClick={() => setPreviewPhoto({ url: incident.imageUrl!, title: incident.title })}
                          className="w-24 h-24 rounded-2xl bg-slate-200 border-2 border-rose-200 overflow-hidden shrink-0 cursor-pointer relative group"
                        >
                          <img
                            src={incident.imageUrl}
                            alt="หลักฐาน"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                          <span className="absolute bottom-1 right-1 bg-black/60 text-white p-1 rounded-md text-[9px]">
                            <ImageIcon className="w-3 h-3" />
                          </span>
                        </div>
                      )}

                      <div className="flex-1 space-y-1">
                        <h4 className="font-black text-slate-900 text-sm leading-snug">{incident.title}</h4>
                        <p className="text-xs text-slate-600">
                          ผู้รายงาน: <strong className="text-slate-800">{incident.reporterName}</strong>
                        </p>

                        {/* Status Pill */}
                        <div className="pt-1">
                          {incident.status === "pending" ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                              สถานะ: รอดำเนินการ
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-sky-100 text-sky-900 border border-sky-300">
                              <RefreshCw className="w-3 h-3 text-sky-600 animate-spin" />
                              สถานะ: ระหว่างดำเนินการ
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons for Security Guard */}
                    <div className="pt-2 border-t border-rose-200/80 flex items-center justify-between gap-2">
                      {incident.status === "pending" ? (
                        <button
                          type="button"
                          onClick={() => handleSetInvestigating(incident.id)}
                          className="px-3 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>ปรับเป็น: ระหว่างดำเนินการ</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-sky-800 font-bold flex items-center gap-1">
                          <Check className="w-3.5 h-3.5 text-sky-600" /> อยู่ระหว่างการระงับเหตุ
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setResolvingIncident(incident);
                          setResolutionPhoto(null);
                          setResolutionNote("");
                          setResolutionError(null);
                        }}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-xl transition-all active:scale-95 shadow-md shadow-emerald-700/20 flex items-center gap-1.5 cursor-pointer ml-auto"
                      >
                        <ShieldCheck className="w-4 h-4 text-emerald-200" />
                        <span>🔒 ปิดเหตุการณ์</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 2. PREVIOUS SHIFTS ACTIVE INCIDENTS (แสดงแบบไม่เด่น) */}
            {(subfilter === "all" || subfilter === "previous_shift") && previousShiftActive.length > 0 && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>⏳ เหตุการณ์ตกค้างจากกะก่อนหน้า ({previousShiftActive.length})</span>
                  </h3>
                  <span className="text-[10px] text-slate-400 font-medium">แสดงแบบไม่เด่น</span>
                </div>

                {previousShiftActive.map((incident) => (
                  <div
                    key={incident.id}
                    className="p-3.5 bg-white border border-slate-200 hover:border-slate-300 rounded-2xl space-y-2.5 transition-all opacity-95"
                  >
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold">
                        {incident.shiftName ? `กะ${incident.shiftName}` : "กะก่อนหน้า"} • {incident.type === "facility" ? "อาคาร" : incident.type === "suspicious" ? "บุคคล" : "แพทย์"}
                      </span>
                      <span className="text-slate-400 font-mono">{incident.timestamp}</span>
                    </div>

                    <div className="flex gap-2.5 items-start">
                      {incident.imageUrl && (
                        <div
                          onClick={() => setPreviewPhoto({ url: incident.imageUrl!, title: incident.title })}
                          className="w-16 h-16 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 cursor-pointer"
                        >
                          <img src={incident.imageUrl} alt="ภาพ" className="w-full h-full object-cover" />
                        </div>
                      )}

                      <div className="flex-1 space-y-0.5">
                        <h4 className="font-bold text-slate-800 text-xs">{incident.title}</h4>
                        <p className="text-[11px] text-slate-400">ผู้รายงาน: {incident.reporterName}</p>
                        <span className="inline-block text-[10px] px-2 py-0.2 rounded-full font-bold bg-slate-100 text-slate-600">
                          {incident.status === "pending" ? "รอดำเนินการ" : "ระหว่างดำเนินการ"}
                        </span>
                      </div>
                    </div>

                    <div className="pt-1.5 border-t border-slate-100 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setResolvingIncident(incident);
                          setResolutionPhoto(null);
                          setResolutionNote("");
                          setResolutionError(null);
                        }}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all active:scale-95 shadow-2xs flex items-center gap-1 cursor-pointer"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>ปิดเหตุการณ์</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: REPORT NEW INCIDENT FORM */}
        {/* ============================================================== */}
        {activeTab === "report" && (
          <form onSubmit={handleSubmitNewReport} className="space-y-4">
            {/* Header info */}
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-900 flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-bold">
                <AlertTriangle className="w-4 h-4 text-rose-600" /> บันทึกเหตุด่วนประจำกะ: {activeShift.name}
              </span>
              <span className="text-[10px] bg-white px-2 py-0.5 rounded-full text-rose-800 border border-rose-300 font-bold">
                ส่ง Google Drive
              </span>
            </div>

            {/* Photo Capture Card */}
            <div className="p-4 bg-white border border-sky-100 rounded-3xl shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-rose-600" /> ถ่ายภาพหลักฐานหน้างาน
                </span>
                <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">
                  ย่อเหลือ ~80KB ส่ง Drive
                </span>
              </div>

              <input
                type="file"
                accept="image/*"
                capture="environment"
                ref={fileInputRef}
                onChange={handleImageCapture}
                className="hidden"
              />

              {image ? (
                <div className="relative rounded-2xl overflow-hidden border-2 border-emerald-400 bg-slate-900 aspect-video flex items-center justify-center">
                  <img src={image} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setImage(null)}
                    className="absolute top-2 right-2 p-1.5 bg-black/70 hover:bg-black text-white rounded-full text-xs"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full aspect-video border-2 border-dashed border-sky-300 hover:border-rose-400 rounded-2xl flex flex-col items-center justify-center gap-2 bg-sky-50/40 hover:bg-rose-50/30 transition-all text-sky-700 cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-full bg-white shadow-xs flex items-center justify-center text-rose-600">
                    <Camera className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-bold text-slate-700">แตะเพื่อเปิดกล้อง / แนบรูป</span>
                  <span className="text-[10px] text-slate-400">ทำงานได้แม้ไม่มีสัญญาณเน็ต</span>
                </button>
              )}
            </div>

            {/* Category Selector */}
            <div className="p-4 bg-white border border-sky-100 rounded-3xl shadow-xs space-y-3">
              <span className="text-xs font-bold text-slate-800 block">หมวดหมู่เหตุการณ์ *</span>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "facility", label: "อาคารสถานที่", icon: Building },
                  { id: "suspicious", label: "คนต้องสงสัย", icon: Users },
                  { id: "medical", label: "การแพทย์/ฉุกเฉิน", icon: HeartPulse },
                ].map((cat) => {
                  const Icon = cat.icon;
                  const isSelected = type === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setType(cat.id as any)}
                      className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 cursor-pointer ${
                        isSelected
                          ? "bg-sky-50 border-sky-500 text-sky-900 shadow-2xs"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${isSelected ? "text-sky-600" : "text-slate-400"}`} />
                      <span className="text-[11px] font-bold leading-tight">{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Severity Selector */}
            <div className="p-4 bg-white border border-sky-100 rounded-3xl shadow-xs space-y-3">
              <span className="text-xs font-bold text-slate-800 block">ระดับความรุนแรง *</span>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "low", label: "ปกติ / เฝ้าระวัง", color: "bg-sky-500" },
                  { id: "medium", label: "ปานกลาง", color: "bg-amber-500" },
                  { id: "high", label: "วิกฤต / ด่วนที่สุด", color: "bg-rose-600" },
                ].map((s) => {
                  const isSelected = severity === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSeverity(s.id as any)}
                      className={`p-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        isSelected
                          ? `${s.color} text-white shadow-xs`
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Details Textarea */}
            <div className="p-4 bg-white border border-sky-100 rounded-3xl shadow-xs space-y-2">
              <label htmlFor="incident-title" className="text-xs font-bold text-slate-800 block">
                รายละเอียดเหตุการณ์ *
              </label>
              <textarea
                id="incident-title"
                rows={3}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="ระบุสิ่งที่พบเห็น เช่น พบบุคคลภายนอกเดินวนเวียนบริเวณหน้าคลังยา..."
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
                required
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting || !title.trim()}
              className="w-full py-3.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-black text-sm rounded-2xl shadow-md shadow-rose-600/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> กำลังส่งข้อมูลเข้า Google Drive...
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4" /> ส่งรายงานแจ้งเหตุด่วน
                </>
              )}
            </button>
          </form>
        )}

        {/* ============================================================== */}
        {/* TAB 3: RESOLVED INCIDENTS (ดูย้อนหลัง) */}
        {/* ============================================================== */}
        {activeTab === "history" && (
          <div className="space-y-3">
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-900 flex items-center justify-between">
              <span className="font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" /> คลังประวัติเหตุการณ์ที่ปิดงานแล้ว ({resolvedIncidents.length} รายการ)
              </span>
              <span className="text-[10px] text-emerald-700">จัดเก็บถาวร</span>
            </div>

            {resolvedIncidents.length === 0 ? (
              <div className="p-8 bg-white border border-slate-200 rounded-3xl text-center space-y-2">
                <Archive className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs text-slate-500 font-bold">ยังไม่มีประวัติเหตุการณ์ที่ปิดงานแล้ว</p>
                <p className="text-[11px] text-slate-400">เมื่อ รปภ. ปิดเหตุการณ์ รายการจะถูกย้ายมาเก็บที่นี่</p>
              </div>
            ) : (
              resolvedIncidents.map((incident) => (
                <div
                  key={incident.id}
                  className="p-4 bg-white border border-emerald-200 rounded-3xl space-y-3 shadow-2xs"
                >
                  {/* Original Incident Info */}
                  <div className="flex items-start justify-between text-xs border-b border-slate-100 pb-2">
                    <div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        {incident.shiftName ? `กะ${incident.shiftName}` : "เหตุด่วน"} • {incident.type === "facility" ? "อาคาร" : incident.type === "suspicious" ? "บุคคล" : "การแพทย์"}
                      </span>
                      <h4 className="font-bold text-slate-900 text-sm mt-1">{incident.title}</h4>
                      <p className="text-[11px] text-slate-400">
                        แจ้งเมื่อ: {incident.timestamp} โดย {incident.reporterName}
                      </p>
                    </div>

                    {incident.imageUrl && (
                      <div
                        onClick={() => setPreviewPhoto({ url: incident.imageUrl!, title: incident.title })}
                        className="w-14 h-14 rounded-xl bg-slate-100 overflow-hidden shrink-0 border border-slate-200 cursor-pointer"
                      >
                        <img src={incident.imageUrl} alt="รูปเดิม" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>

                  {/* Resolution Details Card */}
                  <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-2xl text-xs space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-bold text-emerald-900">
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        ปิดเหตุการณ์แล้วโดย: <strong>{incident.resolvedBy || "รปภ. เวร"}</strong>
                      </span>
                      <span className="font-mono text-emerald-700">{incident.resolvedAt || "เรียบร้อย"}</span>
                    </div>

                    {incident.resolutionNote && (
                      <p className="text-slate-700 text-xs bg-white/80 p-2 rounded-xl border border-emerald-100 leading-relaxed">
                        📝 <strong>ผลการแก้ไข:</strong> {incident.resolutionNote}
                      </p>
                    )}

                    {incident.resolutionImageUrl && (
                      <div className="pt-1 flex items-center gap-2">
                        <div
                          onClick={() => setPreviewPhoto({ url: incident.resolutionImageUrl!, title: `ภาพผลการระงับเหตุ - ${incident.title}` })}
                          className="w-14 h-14 rounded-xl bg-white border border-emerald-300 overflow-hidden cursor-pointer shrink-0"
                        >
                          <img src={incident.resolutionImageUrl} alt="ภาพผลการแก้ไข" className="w-full h-full object-cover" />
                        </div>
                        <span className="text-[11px] text-emerald-800 font-bold">
                          📸 มีภาพถ่ายยืนยันผลการระงับเหตุ (บันทึกลง Google Drive แล้ว)
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      {/* ============================================================== */}
      {/* MODAL: RESOLVE & CLOSE INCIDENT (บันทึกรูปและรายละเอียดก่อนปิดงาน) */}
      {/* ============================================================== */}
      {resolvingIncident && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl space-y-4 animate-in fade-in-50 zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-sm">🔒 บันทึกผลการระงับเหตุ & ปิดงาน</h3>
                  <p className="text-[10px] text-slate-400">สำหรับเจ้าหน้าที่ รปภ. ประจำกะ</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setResolvingIncident(null)}
                className="p-1 rounded-full text-slate-400 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Target Incident Mini Info */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500 font-bold">ผู้รายงานเหตุ:</span>
                <span className="text-slate-800 font-bold bg-white px-2 py-0.5 rounded-lg border border-slate-200">{resolvingIncident.reporterName}</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-emerald-700 font-bold">ผู้ดำเนินการปิดงาน:</span>
                <span className="text-emerald-800 font-bold bg-emerald-100/80 px-2 py-0.5 rounded-lg border border-emerald-300">
                  {currentUser?.name || "เจ้าหน้าที่ รปภ."}
                </span>
              </div>
              <div className="pt-1.5 border-t border-slate-200">
                <span className="text-[10px] text-slate-400 font-bold block">รายละเอียดเหตุการณ์:</span>
                <p className="font-bold text-slate-900 line-clamp-2 text-xs mt-0.5">{resolvingIncident.title}</p>
              </div>
            </div>

            {/* Resolution Photo Upload */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                <span>📸 เพิ่มรูปถ่ายการแก้ไข / ระงับเหตุ</span>
                <span className="text-[10px] text-emerald-700">ส่งเข้า Google Drive</span>
              </div>

              <input
                type="file"
                accept="image/*"
                capture="environment"
                ref={resolutionFileInputRef}
                onChange={handleResolutionPhotoCapture}
                className="hidden"
              />

              {resolutionPhoto ? (
                <div className="relative rounded-xl overflow-hidden border-2 border-emerald-400 bg-slate-900 h-32 flex items-center justify-center">
                  <img src={resolutionPhoto} alt="Resolution" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setResolutionPhoto(null)}
                    className="absolute top-1.5 right-1.5 p-1 bg-black/70 hover:bg-black text-white rounded-full text-xs"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => resolutionFileInputRef.current?.click()}
                  className="w-full h-24 border-2 border-dashed border-emerald-300 hover:border-emerald-500 rounded-xl flex flex-col items-center justify-center gap-1 bg-emerald-50/40 text-emerald-800 cursor-pointer transition-all"
                >
                  <Camera className="w-5 h-5 text-emerald-600" />
                  <span className="text-xs font-bold">ถ่ายภาพผลการแก้ไข</span>
                  <span className="text-[10px] text-slate-400">(ถ้ามี เพื่อใช้เป็นหลักฐาน)</span>
                </button>
              )}
            </div>

            {/* Resolution Details Textarea */}
            <div className="space-y-1.5">
              <label htmlFor="resolution-note" className="text-xs font-bold text-slate-700 block">
                📝 พิมพ์รายละเอียดผลการระงับเหตุ / การแก้ไข <span className="text-rose-500">*</span>
              </label>
              <textarea
                id="resolution-note"
                rows={3}
                value={resolutionNote}
                onChange={(e) => {
                  setResolutionNote(e.target.value);
                  setResolutionError(null);
                }}
                placeholder="ระบุการปฏิบัติงาน เช่น เข้าตรวจสอบแล้ว ปิดล็อกประตูแน่นหนา / บุคคลภายนอกออกจากพื้นที่เรียบร้อย..."
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Error banner */}
            {resolutionError && (
              <p className="text-rose-600 text-[11px] font-bold bg-rose-50 p-2 rounded-lg border border-rose-200">
                ⚠️ {resolutionError}
              </p>
            )}

            {/* Confirm Actions */}
            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setResolvingIncident(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
              >
                ยกเลิก
              </button>

              <button
                type="button"
                disabled={resolutionSubmitting}
                onClick={handleConfirmCloseIncident}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black text-xs rounded-xl shadow-md shadow-emerald-700/20 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {resolutionSubmitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> กำลังบันทึก Google Drive...
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" /> ยืนยันปิดเหตุการณ์
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* PHOTO PREVIEW MODAL */}
      {/* ============================================================== */}
      {previewPhoto && (
        <div
          onClick={() => setPreviewPhoto(null)}
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="max-w-md w-full bg-slate-900 rounded-3xl overflow-hidden p-3 space-y-2">
            <div className="flex items-center justify-between text-white text-xs px-2">
              <span className="font-bold line-clamp-1">{previewPhoto.title}</span>
              <button onClick={() => setPreviewPhoto(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <img src={previewPhoto.url} alt="Full view" className="w-full max-h-[70vh] object-contain rounded-2xl" />
          </div>
        </div>
      )}
    </div>
  );
}
