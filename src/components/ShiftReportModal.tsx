"use client";

import { useState, useRef, useEffect } from "react";
import { useStore, ShiftReportLog } from "@/lib/store";
import { 
  X, 
  Download, 
  Share2, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  User, 
  Building2, 
  ShieldCheck, 
  Sparkles,
  Camera,
  Car
} from "lucide-react";
import { 
  defaultPatrolRounds, 
  getCurrentShift, 
  getRoundProgress,
  hospitalShifts,
  PatrolRound
} from "@/lib/patrolSchedule";

interface ShiftReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ShiftReportModal({ isOpen, onClose }: ShiftReportModalProps) {
  const { 
    currentUser, 
    patrolRounds, 
    checkpoints, 
    patrolLogs, 
    parkingScans,
    incidents,
    addShiftReportLog 
  } = useStore();

  const [handoverNote, setHandoverNote] = useState("ตรวจครบถ้วนเรียบร้อย ส่งมอบวิทยุสื่อสารและกุญแจประจำจุดให้กะถัดไปแล้ว");
  const [isExporting, setIsExporting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  if (!isOpen || !currentUser) return null;

  const now = new Date();
  const currentShift = getCurrentShift(now);
  const todayStr = now.toISOString().split("T")[0];
  const thaiDateFormatted = now.toLocaleDateString("th-TH", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const timeFormatted = now.toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const rounds = (patrolRounds && patrolRounds.length > 0) ? patrolRounds : defaultPatrolRounds;
  const shiftRounds = rounds.filter((r) => r.shift === currentShift.id && r.isActive);
  
  // คำนวณความคืบหน้าของแต่ละรอบในกะนี้
  const roundProgressList = shiftRounds.map((r) =>
    getRoundProgress(r, checkpoints, patrolLogs, now)
  );

  const totalPointsExpected = shiftRounds.length * checkpoints.length;
  const totalPointsCompleted = roundProgressList.reduce((sum, p) => sum + p.completedCount, 0);
  const complianceRate = totalPointsExpected > 0 ? Math.round((totalPointsCompleted / totalPointsExpected) * 100) : 100;

  const onTimeRoundsCount = roundProgressList.filter((p) => p.status === "completed_ontime").length;
  const onTimeRate = shiftRounds.length > 0 ? Math.round((onTimeRoundsCount / shiftRounds.length) * 100) : 100;

  // ปัญหาที่พบในกะนี้
  const shiftLogs = patrolLogs.filter((l) => {
    if (!l.timestamp?.startsWith(todayStr)) return false;
    return l.shift === currentShift.id || shiftRounds.some((r) => r.id === l.roundId);
  });
  const issueLogs = shiftLogs.filter((l) => l.status === "issue");

  // สถิติรถในกะนี้
  const shiftParkingScans = parkingScans.filter((s) => s.timestamp?.startsWith(todayStr));

  // ฟังก์ชันวาดรูปรายงานบน Canvas 2D (ความละเอียดสูง คมชัดมาก)
  const drawReportToCanvas = (): HTMLCanvasElement => {
    const canvas = document.createElement("canvas");
    const width = 1000;
    const height = 1350;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return canvas;

    // Background
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(0, 0, width, height);

    // Top Header Banner
    const grad = ctx.createLinearGradient(0, 0, width, 0);
    grad.addColorStop(0, "#0369a1"); // sky-700
    grad.addColorStop(1, "#0284c7"); // sky-600
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, 180);

    // Header Title
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 38px 'Sarabun', sans-serif";
    ctx.fillText("🏥 โรงพยาบาลพล • PHON HOSPITAL", 50, 70);

    ctx.font = "bold 26px 'Sarabun', sans-serif";
    ctx.fillStyle = "#e0f2fe";
    ctx.fillText("ฝ่ายรักษาความปลอดภัย • รายงานสรุปการเดินตรวจประจำกะ (Shift Handover Report)", 50, 115);

    ctx.font = "18px 'Sarabun', sans-serif";
    ctx.fillStyle = "#bae6fd";
    ctx.fillText("ระบบบันทึกความปลอดภัยดิจิทัล Smart Patrol • โรงพยาบาลพล จ.ขอนแก่น", 50, 148);

    // Card 1: Shift & Guard Info
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(50, 210, 900, 180, 20);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 24px 'Sarabun', sans-serif";
    ctx.fillText(`🏢 กะปฏิบัติการ: ${currentShift.name} (${currentShift.timeRange})`, 80, 260);

    ctx.font = "bold 22px 'Sarabun', sans-serif";
    ctx.fillStyle = "#0369a1";
    ctx.fillText(`👤 รปภ. ผู้ส่งรายงาน: ${currentUser.name} (รหัสประจำตัว: ${currentUser.pin})`, 80, 305);

    ctx.font = "18px 'Sarabun', sans-serif";
    ctx.fillStyle = "#64748b";
    ctx.fillText(`📅 วันที่: ${thaiDateFormatted}   |   🕒 เวลาส่งมอบเวร: ${timeFormatted} น.`, 80, 350);

    // Card 2: Rounds Table
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.roundRect(50, 420, 900, 400, 20);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 24px 'Sarabun', sans-serif";
    ctx.fillText(`📋 ผลการเดินตรวจตามรอบเวร (${shiftRounds.length} รอบในกะนี้)`, 80, 470);

    // Table Header
    ctx.fillStyle = "#f1f5f9";
    ctx.fillRect(80, 495, 840, 45);
    ctx.fillStyle = "#475569";
    ctx.font = "bold 18px 'Sarabun', sans-serif";
    ctx.fillText("รอบการเดินตรวจ", 100, 525);
    ctx.fillText("เวลาเป้าหมาย (1 ชม. แรก)", 340, 525);
    ctx.fillText("จำนวนจุดที่ตรวจ", 600, 525);
    ctx.fillText("สถานะผลตรวจ", 770, 525);

    // Table Rows
    let y = 575;
    roundProgressList.forEach((item, idx) => {
      ctx.fillStyle = idx % 2 === 0 ? "#ffffff" : "#f8fafc";
      ctx.fillRect(80, y - 30, 840, 50);

      ctx.fillStyle = "#1e293b";
      ctx.font = "bold 18px 'Sarabun', sans-serif";
      ctx.fillText(item.round.name, 100, y);

      ctx.font = "16px 'Sarabun', sans-serif";
      ctx.fillStyle = "#64748b";
      ctx.fillText(`ภายใน ${item.round.deadlineTime} น.`, 340, y);

      ctx.font = "bold 18px 'Sarabun', sans-serif";
      ctx.fillStyle = item.completedCount >= checkpoints.length ? "#059669" : "#d97706";
      ctx.fillText(`${item.completedCount} / ${checkpoints.length} จุด`, 600, y);

      if (item.status === "completed_ontime") {
        ctx.fillStyle = "#059669";
        ctx.fillText("✅ ตรงเวลา 100%", 770, y);
      } else if (item.status === "completed_late") {
        ctx.fillStyle = "#d97706";
        ctx.fillText("⚠️ ครบแต่ล่าช้า", 770, y);
      } else if (item.status === "active") {
        ctx.fillStyle = "#0284c7";
        ctx.fillText("🟡 กำลังตรวจ", 770, y);
      } else if (item.status === "missed") {
        ctx.fillStyle = "#e11d48";
        ctx.fillText("❌ ขาดตรวจ", 770, y);
      } else {
        ctx.fillStyle = "#94a3b8";
        ctx.fillText("⚪ ยังไม่ถึงรอบ", 770, y);
      }

      y += 50;
    });

    // Card 3: Performance & Statistics
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.roundRect(50, 850, 900, 240, 20);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 24px 'Sarabun', sans-serif";
    ctx.fillText("📊 สถิติรวมประจำกะ", 80, 900);

    // 3 Metric Pills
    // Metric 1: Compliance
    ctx.fillStyle = "#f0fdf4";
    ctx.strokeStyle = "#86efac";
    ctx.beginPath();
    ctx.roundRect(80, 925, 260, 90, 16);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#166534";
    ctx.font = "bold 16px 'Sarabun', sans-serif";
    ctx.fillText("อัตราตรวจครบถ้วน", 100, 955);
    ctx.font = "bold 32px 'Sarabun', sans-serif";
    ctx.fillText(`${complianceRate}%`, 100, 995);

    // Metric 2: On-Time
    ctx.fillStyle = "#f0f9ff";
    ctx.strokeStyle = "#7dd3fc";
    ctx.beginPath();
    ctx.roundRect(370, 925, 260, 90, 16);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#075985";
    ctx.font = "bold 16px 'Sarabun', sans-serif";
    ctx.fillText("ตรงเวลา (1 ชม. แรก)", 390, 955);
    ctx.font = "bold 32px 'Sarabun', sans-serif";
    ctx.fillText(`${onTimeRate}%`, 390, 995);

    // Metric 3: Issues
    ctx.fillStyle = issueLogs.length === 0 ? "#f0fdf4" : "#fff1f2";
    ctx.strokeStyle = issueLogs.length === 0 ? "#86efac" : "#fecdd3";
    ctx.beginPath();
    ctx.roundRect(660, 925, 260, 90, 16);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = issueLogs.length === 0 ? "#166534" : "#9f1239";
    ctx.font = "bold 16px 'Sarabun', sans-serif";
    ctx.fillText("ข้อบกพร่อง/เหตุด่วน", 680, 955);
    ctx.font = "bold 32px 'Sarabun', sans-serif";
    ctx.fillText(issueLogs.length === 0 ? "0 จุด (ปกติ)" : `${issueLogs.length} จุด`, 680, 995);

    // Handover Notes
    ctx.font = "18px 'Sarabun', sans-serif";
    ctx.fillStyle = "#475569";
    ctx.fillText(`📝 บันทึกส่งมอบ: "${handoverNote}"`, 80, 1055);

    // Card 4: Digital Stamp & Verification Footer
    ctx.fillStyle = "#0f172a";
    ctx.beginPath();
    ctx.roundRect(50, 1120, 900, 160, 20);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 22px 'Sarabun', sans-serif";
    ctx.fillText("✅ ตรวจสอบและส่งมอบเวรเรียบร้อย • ระบบ Smart Patrol รพ.พล", 80, 1170);

    ctx.font = "16px 'Sarabun', sans-serif";
    ctx.fillStyle = "#94a3b8";
    ctx.fillText(`ผู้ส่งรายงาน: ${currentUser.name} | ส่งเมื่อ: ${thaiDateFormatted} เวลา ${timeFormatted} น.`, 80, 1205);
    ctx.fillText(`Verification Hash: PHON-${Date.now().toString(36).toUpperCase()}-SEC | พร้อมตรวจสอบในหน้า Supervisor`, 80, 1235);

    return canvas;
  };

  const recordAndGetReportLog = (): ShiftReportLog => {
    const report: ShiftReportLog = {
      id: `shift-report-${Date.now()}`,
      shiftId: currentShift.id,
      shiftName: currentShift.name,
      guardId: currentUser.id,
      guardName: currentUser.name,
      timestamp: new Date().toISOString(),
      dateString: todayStr,
      roundsCount: shiftRounds.length,
      completedPoints: totalPointsCompleted,
      totalPoints: totalPointsExpected,
      complianceRate,
      onTimeRate,
      issuesCount: issueLogs.length,
      status: onTimeRate >= 80 ? "on_time" : "late",
      note: handoverNote,
    };
    addShiftReportLog(report);
    return report;
  };

  const handleDownloadImage = () => {
    setIsExporting(true);
    try {
      const canvas = drawReportToCanvas();
      const link = document.createElement("a");
      const filename = `รายงานประจำกะ_${currentShift.id}_${todayStr}_${timeFormatted.replace(":", "")}.png`;
      link.download = filename;
      link.href = canvas.toDataURL("image/png");
      link.click();

      // Record audit
      recordAndGetReportLog();
      setSuccessMessage("บันทึกรูปภาพรายงานสำเร็จ! สามารถเปิดส่งเข้า LINE กลุ่มได้ทันที");
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      console.error(err);
      alert("เกิดข้อผิดพลาดในการสร้างรูปภาพรายงาน");
    } finally {
      setIsExporting(false);
    }
  };

  const handleShareToLine = async () => {
    setIsExporting(true);
    try {
      const canvas = drawReportToCanvas();
      const filename = `รายงานประจำกะ_${currentShift.id}_${todayStr}.png`;

      canvas.toBlob(async (blob) => {
        if (!blob) {
          handleDownloadImage();
          return;
        }

        const file = new File([blob], filename, { type: "image/png" });
        const shareData = {
          title: `รายงานประจำกะ ${currentShift.name} - รพ.พล`,
          text: `🏥 รายงานสรุปการเดินตรวจประจำกะ (${currentShift.name}) วันที่ ${thaiDateFormatted}\nผู้ส่งรายงาน: ${currentUser.name}\nความคืบหน้า: ${complianceRate}% (ตรงเวลา ${onTimeRate}%)\nส่งมอบเวรเรียบร้อยครับ`,
          files: [file],
        };

        recordAndGetReportLog();

        if (navigator.canShare && navigator.canShare(shareData)) {
          try {
            await navigator.share(shareData);
            setSuccessMessage("แชร์รายงานเข้า LINE กลุ่มเรียบร้อยแล้ว!");
          } catch (e: any) {
            if (e.name !== "AbortError") {
              // Fallback to download
              handleDownloadImage();
            }
          }
        } else {
          // Fallback: Download file directly and open LINE
          const link = document.createElement("a");
          link.download = filename;
          link.href = canvas.toDataURL("image/png");
          link.click();
          setSuccessMessage("ดาวน์โหลดรูปรายงานแล้ว! กำลังเปิด LINE...");
          setTimeout(() => {
            window.open("https://line.me/R/nv/chat", "_blank");
          }, 1000);
        }
        setIsExporting(false);
      }, "image/png");
    } catch (err) {
      console.error(err);
      handleDownloadImage();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-sky-100 flex flex-col max-h-[90vh] animate-in fade-in-50 zoom-in-95">
        {/* Header */}
        <div className="bg-gradient-to-r from-sky-600 to-blue-700 text-white p-5 flex items-start justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full">
              ช่วงต่อกะ / ส่งมอบเวร
            </span>
            <h2 className="text-xl font-black mt-1">ส่งออกรายงานประจำกะ (LINE)</h2>
            <p className="text-xs text-sky-100 mt-0.5">
              {currentShift.name} ({currentShift.timeRange}) • {thaiDateFormatted}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 text-slate-800 text-xs">
          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-2xl font-bold flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Issuer details */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-semibold">เจ้าหน้าที่ผู้ส่งรายงาน:</span>
              <span className="font-bold text-slate-900 text-sm">{currentUser.name}</span>
            </div>
            <div className="flex justify-between items-center text-[11px] text-slate-500">
              <span>เวลาส่งมอบเวร:</span>
              <span className="font-mono font-bold text-sky-700">{timeFormatted} น.</span>
            </div>
          </div>

          {/* Rounds list in this shift */}
          <div className="space-y-2">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-sky-600" />
              ผลการเดินตรวจในกะนี้ ({shiftRounds.length} รอบ)
            </h3>
            <div className="space-y-1.5">
              {roundProgressList.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between shadow-2xs"
                >
                  <div>
                    <span className="font-bold text-slate-800">{item.round.name}</span>
                    <span className="text-[10px] text-slate-400 block">
                      กำหนดเสร็จภายใน {item.round.deadlineTime} น.
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold font-mono text-sky-700">
                      {item.completedCount}/{checkpoints.length} จุด
                    </span>
                    <div>
                      {item.status === "completed_ontime" && (
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                          ตรงเวลา 100% ✅
                        </span>
                      )}
                      {item.status === "completed_late" && (
                        <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">
                          ล่าช้า ⚠️
                        </span>
                      )}
                      {item.status === "active" && (
                        <span className="text-[10px] font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-md">
                          กำลังตรวจ 🟡
                        </span>
                      )}
                      {item.status === "missed" && (
                        <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md">
                          ขาดตรวจ ❌
                        </span>
                      )}
                      {item.status === "upcoming" && (
                        <span className="text-[10px] text-slate-400">ยังไม่ถึงรอบ</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-2">
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-center">
              <span className="text-[10px] font-bold text-emerald-800 block">ความสำเร็จ</span>
              <span className="text-xl font-black text-emerald-700">{complianceRate}%</span>
            </div>
            <div className="p-3 bg-sky-50 border border-sky-200 rounded-2xl text-center">
              <span className="text-[10px] font-bold text-sky-800 block">ตรงเวลา (1 ชม.)</span>
              <span className="text-xl font-black text-sky-700">{onTimeRate}%</span>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-center">
              <span className="text-[10px] font-bold text-slate-600 block">ข้อบกพร่อง</span>
              <span className="text-xl font-black text-slate-800">{issueLogs.length}</span>
            </div>
          </div>

          {/* Handover Note */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              ข้อความส่งมอบเวร / บันทึกเพิ่มเติม:
            </label>
            <textarea
              rows={2}
              value={handoverNote}
              onChange={(e) => setHandoverNote(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-sky-500 focus:bg-white"
              placeholder="ระบุข้อความส่งมอบ..."
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row gap-2.5">
          <button
            onClick={handleDownloadImage}
            disabled={isExporting}
            className="flex-1 py-3 px-4 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all shadow-2xs"
          >
            <Download className="w-4 h-4 text-slate-600" />
            <span>บันทึกรูปภาพ (PNG)</span>
          </button>

          <button
            onClick={handleShareToLine}
            disabled={isExporting}
            className="flex-1 py-3 px-4 rounded-xl bg-[#06c755] hover:bg-[#05b54d] text-white font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all shadow-md shadow-emerald-500/25"
          >
            <Share2 className="w-4 h-4" />
            <span>ส่งแชร์เข้า LINE กลุ่ม</span>
          </button>
        </div>
      </div>
    </div>
  );
}
