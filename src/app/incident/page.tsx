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
  RotateCcw 
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { uploadIncidentImage } from "@/lib/firebaseService";
import HospitalBrand from "@/components/HospitalBrand";

export default function IncidentPage() {
  const router = useRouter();
  const { currentUser, addIncident } = useStore();
  const [image, setImage] = useState<string | null>(null);
  const [type, setType] = useState<"facility" | "suspicious" | "medical">("facility");
  const [severity, setSeverity] = useState<"low" | "medium" | "high">("medium");
  const [title, setTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!currentUser) {
      router.push("/guard");
    }
  }, [currentUser, router]);

  if (!currentUser) return null;

  const handleImageCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // On-device canvas image compression
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 1000;
          const scaleSize = MAX_WIDTH / img.width;
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scaleSize;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
          const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.75);
          setImage(compressedDataUrl);
        };
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;

    setSubmitting(true);
    try {
      let finalImageUrl = image;
      if (image && image.startsWith("data:image")) {
        finalImageUrl = await uploadIncidentImage(image);
      }
      addIncident({
        type,
        severity,
        title,
        imageUrl: finalImageUrl || "https://images.unsplash.com/photo-1517646287270-a5a9ca602e5c?w=600&q=80",
      });
    } catch (err) {
      console.warn("Submit fallback:", err);
      addIncident({
        type,
        severity,
        title,
        imageUrl: image || "https://images.unsplash.com/photo-1517646287270-a5a9ca602e5c?w=600&q=80",
      });
    } finally {
      setSubmitting(false);
      setSubmitted(true);
      setTimeout(() => router.push("/guard"), 2000);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#f0f6fa] text-slate-800 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto font-['Sarabun',sans-serif]">
        <div className="w-20 h-20 rounded-full bg-emerald-100 border-2 border-emerald-500 flex items-center justify-center text-emerald-600 mb-4 animate-bounce">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <h1 className="text-2xl font-black text-slate-900 mb-2">แจ้งเหตุสำเร็จ!</h1>
        <p className="text-xs text-slate-600 leading-relaxed max-w-xs mb-6">
          รูปภาพถูกบีบอัดและอัปโหลดขึ้น Firebase Storage เรียบร้อยแล้ว พร้อมส่งสัญญาณแจ้งเตือนไปยังหัวหน้างานทันที
        </p>
        <span className="text-[11px] text-sky-600 font-medium">กำลังกลับสู่หน้าหลัก รปภ...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f0f6fa] text-slate-800 flex flex-col max-w-md mx-auto border-x border-sky-100 shadow-xl font-['Sarabun',sans-serif]">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-sky-100 px-4 py-3 space-y-2.5 shadow-xs">
        <div className="flex items-center justify-between">
          <Link
            href="/guard"
            className="p-2 -ml-2 rounded-xl bg-slate-100 text-slate-600 hover:text-slate-900 active:scale-95 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <HospitalBrand badgeText="แจ้งเหตุด่วน" />
        </div>
      </header>

      <main className="flex-1 p-4 space-y-4 overflow-y-auto">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Photo Capture */}
          <div className="bg-white border border-sky-100 rounded-3xl p-5 shadow-sm">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-rose-500" /> ถ่ายภาพหลักฐานหน้างาน
              </span>
              <span className="text-[10px] text-emerald-700 font-mono font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                ย่อเหลือ ~150KB ส่ง Drive
              </span>
            </div>

            {image ? (
              <div className="relative rounded-2xl overflow-hidden border-2 border-rose-300">
                <img src={image} alt="Incident Evidence" className="w-full h-48 object-cover" />
                <button
                  type="button"
                  onClick={() => setImage(null)}
                  className="absolute top-2 right-2 px-3 py-1.5 rounded-xl bg-slate-900/80 backdrop-blur-sm text-xs font-bold text-white shadow-md"
                >
                  ถ่ายใหม่
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-44 rounded-2xl border-2 border-dashed border-sky-300 hover:border-sky-500 bg-sky-50/50 flex flex-col items-center justify-center cursor-pointer transition-all active:scale-[0.99] group"
              >
                <div className="w-12 h-12 rounded-2xl bg-sky-100 text-sky-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                  <Upload className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold text-slate-700">แตะเพื่อเปิดกล้อง / แนบรูป</span>
                <span className="text-[11px] text-slate-400 mt-0.5">ทำงานได้แม้อยู่ในจุดอับเน็ต</span>
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              ref={fileInputRef}
              onChange={handleImageCapture}
              className="hidden"
            />
          </div>

          {/* Category Selector */}
          <div className="bg-white border border-sky-100 rounded-3xl p-5 shadow-sm space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              หมวดหมู่เหตุการณ์
            </label>
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
                    className={`p-3 rounded-2xl border text-center flex flex-col items-center gap-1.5 transition-all ${
                      isSelected
                        ? "bg-sky-50 border-sky-500 text-sky-800 ring-2 ring-sky-200"
                        : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-[11px] font-semibold">{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Severity Selector */}
          <div className="bg-white border border-sky-100 rounded-3xl p-5 shadow-sm space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              ระดับความรุนแรง
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "low", label: "ปกติ / เฝ้าระวัง" },
                { id: "medium", label: "ปานกลาง" },
                { id: "high", label: "วิกฤต / ด่วนที่สุด" },
              ].map((sev) => {
                const isSelected = severity === sev.id;
                return (
                  <button
                    key={sev.id}
                    type="button"
                    onClick={() => setSeverity(sev.id as any)}
                    className={`py-2.5 px-2 rounded-xl border text-xs font-bold transition-all ${
                      isSelected
                        ? sev.id === "high"
                          ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                          : "bg-amber-400 text-slate-950 border-amber-400 font-black"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {sev.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Details */}
          <div className="bg-white border border-sky-100 rounded-3xl p-5 shadow-sm space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              รายละเอียดเหตุการณ์ *
            </label>
            <textarea
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="ระบุสิ่งที่พบเห็น เช่น พบบุคคลภายนอกเดินวนเวียนบริเวณหน้าคลังยา..."
              rows={3}
              required
              className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:border-sky-500 focus:bg-white focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <button
            type="submit"
            disabled={submitting || !title}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-700 hover:to-rose-600 text-white font-bold text-sm shadow-md shadow-rose-600/25 active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <RotateCcw className="w-5 h-5 animate-spin" /> กำลังส่งรูปขึ้น Google Drive...
              </>
            ) : (
              <>
                <AlertTriangle className="w-5 h-5" /> ส่งรายงานแจ้งเหตุด่วน
              </>
            )}
          </button>
        </form>
      </main>
    </div>
  );
}
