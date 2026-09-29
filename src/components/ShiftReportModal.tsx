"use client";

import { useState, useRef, useEffect, useCallback } from "react";
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
  Car,
  Copy,
  Eye,
  RefreshCw,
  FileCheck
} from "lucide-react";
import { 
  defaultPatrolRounds, 
  getCurrentShift, 
  getRoundProgress,
  hospitalShifts,
  PatrolRound
} from "@/lib/patrolSchedule";
import { uploadImageToDrive } from "@/lib/uploadToDrive";

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
    addShiftReportLog,
    googleDriveWebhookUrl
  } = useStore();

  const [handoverNote, setHandoverNote] = useState(
    "ตรวจครบถ้วนเรียบร้อย ส่งมอบวิทยุสื่อสารและกุญแจประจำจุดให้กะถัดไปแล้ว"
  );
  const [isExporting, setIsExporting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [copiedImage, setCopiedImage] = useState(false);

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

  // Helper function to load logo image
  const loadLogoImage = (): Promise<HTMLImageElement | null> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = "/phon_hospital_logo.png";
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
    });
  };

  // Helper drawing functions
  const drawRoundRect = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
    fillColor?: string | CanvasGradient,
    strokeColor?: string | CanvasGradient,
    lineWidth?: number
  ) => {
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(x, y, w, h, r);
    } else {
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    }
    if (fillColor) {
      ctx.fillStyle = fillColor;
      ctx.fill();
    }
    if (strokeColor) {
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = lineWidth || 1;
      ctx.stroke();
    }
  };

  // Function to render executive, gorgeous canvas
  const drawReportToCanvas = async (): Promise<HTMLCanvasElement> => {
    const canvas = document.createElement("canvas");
    const width = 1080;
    const height = 1520;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return canvas;

    // 1. Main Clean Background
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(0, 0, width, height);

    // Subtle background mesh pattern / top glow
    const bgGlow = ctx.createRadialGradient(width / 2, 0, 50, width / 2, 600, 900);
    bgGlow.addColorStop(0, "rgba(2, 132, 199, 0.08)");
    bgGlow.addColorStop(1, "rgba(248, 250, 252, 0)");
    ctx.fillStyle = bgGlow;
    ctx.fillRect(0, 0, width, 800);

    // 2. Executive Header (Hospital Navy & Emerald)
    const headerHeight = 230;
    const headerGrad = ctx.createLinearGradient(0, 0, width, headerHeight);
    headerGrad.addColorStop(0, "#071b2f");
    headerGrad.addColorStop(0.5, "#0b2c4d");
    headerGrad.addColorStop(1, "#0284c7");
    ctx.fillStyle = headerGrad;
    ctx.fillRect(0, 0, width, headerHeight);

    // Decorative cyber grid accents on header
    ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, headerHeight);
      ctx.stroke();
    }

    // Emerald & Sky border strip under header
    const stripGrad = ctx.createLinearGradient(0, 0, width, 0);
    stripGrad.addColorStop(0, "#059669");
    stripGrad.addColorStop(0.5, "#38bdf8");
    stripGrad.addColorStop(1, "#10b981");
    ctx.fillStyle = stripGrad;
    ctx.fillRect(0, headerHeight, width, 6);

    // Official Logo Container
    const logoBoxX = 55;
    const logoBoxY = 40;
    const logoBoxSize = 135;

    // Soft glow shadow behind logo
    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.25)";
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 4;
    drawRoundRect(ctx, logoBoxX, logoBoxY, logoBoxSize, logoBoxSize, 28, "#ffffff", "rgba(255,255,255,0.4)", 2);
    ctx.restore();

    // Draw Official Logo inside
    const logoImg = await loadLogoImage();
    if (logoImg) {
      ctx.drawImage(logoImg, logoBoxX + 10, logoBoxY + 10, logoBoxSize - 20, logoBoxSize - 20);
    } else {
      // Fallback Medical Cross Logo
      drawRoundRect(ctx, logoBoxX + 15, logoBoxY + 15, logoBoxSize - 30, logoBoxSize - 30, 20, "#008b64");
      ctx.fillStyle = "#ffffff";
      const crossW = 28;
      const crossOffset = (logoBoxSize - 30 - crossW) / 2;
      ctx.fillRect(logoBoxX + 15 + crossOffset, logoBoxY + 30, crossW, logoBoxSize - 60);
      ctx.fillRect(logoBoxX + 30, logoBoxY + 15 + crossOffset, logoBoxSize - 60, crossW);
    }

    // Header Text Hierarchy
    const textStartX = 215;

    // Badge: Official Dispatch
    drawRoundRect(ctx, textStartX, 45, 330, 30, 15, "rgba(56, 189, 248, 0.15)", "rgba(56, 189, 248, 0.4)", 1);
    ctx.font = "bold 13px 'Sarabun', sans-serif";
    ctx.fillStyle = "#7dd3fc";
    ctx.fillText("🛡️ เอกสารรายงานการปฏิบัติงานรักษาความปลอดภัย", textStartX + 14, 65);

    // Main Hospital Brand
    ctx.font = "bold 32px 'Sarabun', sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.fillText("โรงพยาบาลพล • PHON HOSPITAL", textStartX, 106);

    // Department Subtitle
    ctx.font = "600 17px 'Sarabun', sans-serif";
    ctx.fillStyle = "#bae6fd";
    ctx.fillText("กลุ่มงานบริหารทั่วไป • แผนกรักษาความปลอดภัยและจัดการจราจร", textStartX, 134);

    // Report Title
    ctx.font = "bold 20px 'Sarabun', sans-serif";
    ctx.fillStyle = "#f0fdf4";
    ctx.fillText("รายงานผลการเดินตรวจและส่งมอบเวรประจำกะ (Shift Handover Report)", textStartX, 164);

    // Doc Reference Pill (Right corner)
    const docRef = `เลขที่: รพ.พล-รปภ-${new Date().getFullYear() + 543}`;
    drawRoundRect(ctx, width - 265, 45, 210, 30, 15, "rgba(255, 255, 255, 0.12)", "rgba(255, 255, 255, 0.2)", 1);
    ctx.font = "bold 13px 'Sarabun', sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(docRef, width - 253, 65);

    // 3. Card 1: Shift & Guard Identification Card
    const cardMargin = 50;
    const cardWidth = width - cardMargin * 2;
    const card1Y = 255;
    const card1H = 150;

    // Card 1 Container
    ctx.save();
    ctx.shadowColor = "rgba(15, 23, 42, 0.06)";
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 4;
    drawRoundRect(ctx, cardMargin, card1Y, cardWidth, card1H, 24, "#ffffff", "#e2e8f0", 1.5);
    ctx.restore();

    // Guard Avatar Icon & Name (Left side)
    const avatarX = cardMargin + 25;
    const avatarY = card1Y + 30;
    const avatarSize = 90;
    const avatarGrad = ctx.createLinearGradient(avatarX, avatarY, avatarX + avatarSize, avatarY + avatarSize);
    avatarGrad.addColorStop(0, "#0284c7");
    avatarGrad.addColorStop(1, "#0369a1");
    drawRoundRect(ctx, avatarX, avatarY, avatarSize, avatarSize, 22, avatarGrad);

    // White Guard Silhouette / Icon
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 44px 'Sarabun', sans-serif";
    ctx.fillText("👮‍♂️", avatarX + 18, avatarY + 62);

    // Guard Details
    ctx.font = "bold 26px 'Sarabun', sans-serif";
    ctx.fillStyle = "#0f172a";
    ctx.fillText(currentUser?.name || "พนักงานรักษาความปลอดภัย", avatarX + avatarSize + 22, card1Y + 58);

    ctx.font = "600 16px 'Sarabun', sans-serif";
    ctx.fillStyle = "#475569";
    ctx.fillText(`รหัสประจำตัว: ${currentUser?.pin || "1111"}   •   ตำแหน่ง: พนักงานรักษาความปลอดภัย`, avatarX + avatarSize + 22, card1Y + 90);

    // Verified Staff Badge
    drawRoundRect(ctx, avatarX + avatarSize + 22, card1Y + 105, 185, 26, 13, "#f0fdf4", "#86efac", 1);
    ctx.font = "bold 12px 'Sarabun', sans-serif";
    ctx.fillStyle = "#166534";
    ctx.fillText("✓ ยืนยันตัวตนในระบบเรียบร้อย", avatarX + avatarSize + 28, card1Y + 122);

    // Divider Line inside Card 1
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(width / 2 + 70, card1Y + 25);
    ctx.lineTo(width / 2 + 70, card1Y + card1H - 25);
    ctx.stroke();

    // Shift & Handover Timing (Right side)
    const shiftX = width / 2 + 100;
    const shiftColor = currentShift.id === "morning" ? "#d97706" : currentShift.id === "afternoon" ? "#0284c7" : "#4338ca";
    const shiftBg = currentShift.id === "morning" ? "#fffbeb" : currentShift.id === "afternoon" ? "#f0f9ff" : "#eef2ff";
    const shiftBorder = currentShift.id === "morning" ? "#fde68a" : currentShift.id === "afternoon" ? "#bae6fd" : "#c7d2fe";

    drawRoundRect(ctx, shiftX, card1Y + 28, 305, 36, 18, shiftBg, shiftBorder, 1);
    ctx.font = "bold 16px 'Sarabun', sans-serif";
    ctx.fillStyle = shiftColor;
    const shiftIcon = currentShift.id === "morning" ? "☀️" : currentShift.id === "afternoon" ? "⛅" : "🌙";
    ctx.fillText(`${shiftIcon} กะปฏิบัติการ: ${currentShift.name} (เวลา ${currentShift.timeRange} น.)`, shiftX + 16, card1Y + 52);

    ctx.font = "500 16px 'Sarabun', sans-serif";
    ctx.fillStyle = "#334155";
    ctx.fillText(`📅 ${thaiDateFormatted}`, shiftX, card1Y + 92);

    ctx.font = "bold 16px 'Sarabun', sans-serif";
    ctx.fillStyle = "#0369a1";
    ctx.fillText(`🕒 เวลาส่งมอบเวร: ${timeFormatted} น.`, shiftX, card1Y + 120);

    // 4. Card 2: 3 Executive KPI Hero Cards
    const kpiY = 425;
    const kpiW = (cardWidth - 36) / 3;
    const kpiH = 165;

    // KPI 1: Compliance
    ctx.save();
    ctx.shadowColor = "rgba(16, 185, 129, 0.1)";
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 3;
    drawRoundRect(ctx, cardMargin, kpiY, kpiW, kpiH, 22, "#ffffff", "#bbf7d0", 1.5);
    ctx.restore();

    drawRoundRect(ctx, cardMargin + 18, kpiY + 16, 38, 38, 12, "#ecfdf5");
    ctx.font = "20px 'Sarabun', sans-serif";
    ctx.fillText("🎯", cardMargin + 27, kpiY + 42);

    ctx.font = "bold 15px 'Sarabun', sans-serif";
    ctx.fillStyle = "#15803d";
    ctx.fillText("ความครอบคลุมของจุดตรวจ", cardMargin + 66, kpiY + 39);

    ctx.font = "bold 48px 'Sarabun', sans-serif";
    ctx.fillStyle = complianceRate >= 80 ? "#15803d" : "#b45309";
    ctx.fillText(`${complianceRate}%`, cardMargin + 20, kpiY + 102);

    ctx.font = "500 14px 'Sarabun', sans-serif";
    ctx.fillStyle = "#475569";
    ctx.fillText(`ตรวจแล้วเสร็จ ${totalPointsCompleted} จากทั้งหมด ${totalPointsExpected} จุด`, cardMargin + 20, kpiY + 130);

    drawRoundRect(ctx, cardMargin + 20, kpiY + 140, kpiW - 40, 6, 3, "#e2e8f0");
    drawRoundRect(ctx, cardMargin + 20, kpiY + 140, (kpiW - 40) * (complianceRate / 100), 6, 3, "#10b981");

    // KPI 2: On-Time (Golden Rule 1 Hour)
    const kpi2X = cardMargin + kpiW + 18;
    ctx.save();
    ctx.shadowColor = "rgba(2, 132, 199, 0.1)";
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 3;
    drawRoundRect(ctx, kpi2X, kpiY, kpiW, kpiH, 22, "#ffffff", "#bae6fd", 1.5);
    ctx.restore();

    drawRoundRect(ctx, kpi2X + 18, kpiY + 16, 38, 38, 12, "#f0f9ff");
    ctx.font = "20px 'Sarabun', sans-serif";
    ctx.fillText("⏱️", kpi2X + 27, kpiY + 42);

    ctx.font = "bold 15px 'Sarabun', sans-serif";
    ctx.fillStyle = "#0369a1";
    ctx.fillText("ความตรงต่อเวลาตามเกณฑ์", kpi2X + 66, kpiY + 39);

    ctx.font = "bold 48px 'Sarabun', sans-serif";
    ctx.fillStyle = onTimeRate >= 80 ? "#0284c7" : "#d97706";
    ctx.fillText(`${onTimeRate}%`, kpi2X + 20, kpiY + 102);

    ctx.font = "500 14px 'Sarabun', sans-serif";
    ctx.fillStyle = "#475569";
    ctx.fillText(`ตรงตามเกณฑ์ ${onTimeRoundsCount} จาก ${shiftRounds.length} รอบการตรวจ`, kpi2X + 20, kpiY + 130);

    drawRoundRect(ctx, kpi2X + 20, kpiY + 140, kpiW - 40, 6, 3, "#e2e8f0");
    drawRoundRect(ctx, kpi2X + 20, kpiY + 140, (kpiW - 40) * (onTimeRate / 100), 6, 3, "#0284c7");

    // KPI 3: Security & Incident Status
    const kpi3X = cardMargin + (kpiW + 18) * 2;
    const isNormal = issueLogs.length === 0;
    ctx.save();
    ctx.shadowColor = isNormal ? "rgba(16, 185, 129, 0.1)" : "rgba(225, 29, 72, 0.1)";
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 3;
    drawRoundRect(ctx, kpi3X, kpiY, kpiW, kpiH, 22, "#ffffff", isNormal ? "#bbf7d0" : "#fecdd3", 1.5);
    ctx.restore();

    drawRoundRect(ctx, kpi3X + 18, kpiY + 16, 38, 38, 12, isNormal ? "#ecfdf5" : "#fff1f2");
    ctx.font = "20px 'Sarabun', sans-serif";
    ctx.fillText(isNormal ? "🛡️" : "⚠️", kpi3X + 27, kpiY + 42);

    ctx.font = "bold 15px 'Sarabun', sans-serif";
    ctx.fillStyle = isNormal ? "#15803d" : "#be123c";
    ctx.fillText("ความสงบเรียบร้อยในพื้นที่", kpi3X + 66, kpiY + 39);

    ctx.font = "bold 48px 'Sarabun', sans-serif";
    ctx.fillStyle = isNormal ? "#15803d" : "#be123c";
    ctx.fillText(isNormal ? "เหตุการณ์ปกติ" : `${issueLogs.length} ข้อ`, kpi3X + 20, kpiY + 102);

    ctx.font = "500 14px 'Sarabun', sans-serif";
    ctx.fillStyle = isNormal ? "#166534" : "#be123c";
    ctx.fillText(isNormal ? "✅ ไม่พบสิ่งผิดปกติในผลัดปฏิบัติงาน" : "⚠️ พบข้อบกพร่อง/แจ้งดำเนินการแล้ว", kpi3X + 20, kpiY + 130);

    drawRoundRect(ctx, kpi3X + 20, kpiY + 140, kpiW - 40, 6, 3, isNormal ? "#86efac" : "#fda4af");

    // 5. Card 3: Patrol Rounds Timeline Cards
    const roundsContainerY = 610;
    const roundsContainerH = 475;

    ctx.save();
    ctx.shadowColor = "rgba(15, 23, 42, 0.05)";
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 4;
    drawRoundRect(ctx, cardMargin, roundsContainerY, cardWidth, roundsContainerH, 24, "#ffffff", "#e2e8f0", 1.5);
    ctx.restore();

    // Section Header
    drawRoundRect(ctx, cardMargin + 25, roundsContainerY + 25, 42, 42, 14, "#f0f9ff");
    ctx.font = "22px 'Sarabun', sans-serif";
    ctx.fillText("📋", cardMargin + 35, roundsContainerY + 54);

    ctx.font = "bold 24px 'Sarabun', sans-serif";
    ctx.fillStyle = "#0f172a";
    ctx.fillText(`บันทึกผลการเดินตรวจการณ์ตามรอบเวลา (${shiftRounds.length} รอบตรวจ)`, cardMargin + 80, roundsContainerY + 48);

    ctx.font = "500 15px 'Sarabun', sans-serif";
    ctx.fillStyle = "#64748b";
    ctx.fillText("เกณฑ์มาตรฐานโรงพยาบาลพล: กำหนดให้ดำเนินการตรวจเช็คอินให้ครบถ้วนภายใน 1 ชั่วโมงแรกของแต่ละรอบ", cardMargin + 80, roundsContainerY + 74);

    // Rounds Rows Loop
    const rowStartY = roundsContainerY + 95;
    const rowH = 82;
    const rowGap = 12;

    roundProgressList.forEach((item, idx) => {
      const rowY = rowStartY + idx * (rowH + rowGap);
      const isOntime = item.status === "completed_ontime";
      const isLate = item.status === "completed_late";
      const isActive = item.status === "active";
      const isMissed = item.status === "missed";

      // Row background
      const rowBg = isOntime ? "#f8fafc" : isActive ? "#f0f9ff" : isMissed ? "#fff1f2" : "#f8fafc";
      const rowBorder = isOntime ? "#e2e8f0" : isActive ? "#7dd3fc" : isMissed ? "#fecdd3" : "#e2e8f0";
      drawRoundRect(ctx, cardMargin + 25, rowY, cardWidth - 50, rowH, 18, rowBg, rowBorder, 1);

      // Left: Round Badge & Name
      drawRoundRect(ctx, cardMargin + 42, rowY + 16, 75, 50, 12, "#ffffff", "#cbd5e1", 1);
      ctx.font = "bold 13px 'Sarabun', sans-serif";
      ctx.fillStyle = "#64748b";
      ctx.fillText("รอบตรวจ", cardMargin + 52, rowY + 34);
      ctx.font = "bold 20px monospace";
      ctx.fillStyle = "#0284c7";
      ctx.fillText(item.round.id, cardMargin + 52, rowY + 56);

      ctx.font = "bold 20px 'Sarabun', sans-serif";
      ctx.fillStyle = "#0f172a";
      ctx.fillText(item.round.name, cardMargin + 130, rowY + 37);

      ctx.font = "500 14px 'Sarabun', sans-serif";
      ctx.fillStyle = "#64748b";
      ctx.fillText(`⏱️ กำหนดเสร็จสิ้นภายใน: ${item.round.deadlineTime} น.`, cardMargin + 130, rowY + 62);

      // Center: Progress Bar
      const progX = width / 2 + 10;
      ctx.font = "bold 14px 'Sarabun', sans-serif";
      ctx.fillStyle = "#334155";
      ctx.fillText(`ตรวจแล้ว ${item.completedCount}/${checkpoints.length} จุด (${item.percent}%)`, progX, rowY + 35);

      const barW = 200;
      drawRoundRect(ctx, progX, rowY + 46, barW, 10, 5, "#e2e8f0");
      if (item.percent > 0) {
        drawRoundRect(ctx, progX, rowY + 46, (barW * item.percent) / 100, 10, 5, isOntime ? "#10b981" : isLate ? "#f59e0b" : "#0284c7");
      }

      // Right: Status Badge
      const statusPillW = 180;
      const statusPillX = width - cardMargin - 45 - statusPillW;
      const statusPillY = rowY + 22;

      if (isOntime) {
        drawRoundRect(ctx, statusPillX, statusPillY, statusPillW, 38, 19, "#ecfdf5", "#86efac", 1);
        ctx.font = "bold 15px 'Sarabun', sans-serif";
        ctx.fillStyle = "#15803d";
        ctx.fillText("✅ ตรวจเสร็จสิ้นตามเวลา", statusPillX + 22, statusPillY + 24);
      } else if (isLate) {
        drawRoundRect(ctx, statusPillX, statusPillY, statusPillW, 38, 19, "#fffbeb", "#fde68a", 1);
        ctx.font = "bold 15px 'Sarabun', sans-serif";
        ctx.fillStyle = "#b45309";
        ctx.fillText("⚠️ ตรวจครบแต่เกินเวลา", statusPillX + 22, statusPillY + 24);
      } else if (isActive) {
        drawRoundRect(ctx, statusPillX, statusPillY, statusPillW, 38, 19, "#f0f9ff", "#7dd3fc", 1.5);
        ctx.font = "bold 15px 'Sarabun', sans-serif";
        ctx.fillStyle = "#0369a1";
        ctx.fillText("🟡 อยู่ระหว่างตรวจการณ์", statusPillX + 22, statusPillY + 24);
      } else if (isMissed) {
        drawRoundRect(ctx, statusPillX, statusPillY, statusPillW, 38, 19, "#fff1f2", "#fecdd3", 1);
        ctx.font = "bold 15px 'Sarabun', sans-serif";
        ctx.fillStyle = "#be123c";
        ctx.fillText("❌ ไม่พบการตรวจตามกำหนด", statusPillX + 16, statusPillY + 24);
      } else {
        drawRoundRect(ctx, statusPillX, statusPillY, statusPillW, 38, 19, "#f1f5f9", "#cbd5e1", 1);
        ctx.font = "bold 15px 'Sarabun', sans-serif";
        ctx.fillStyle = "#64748b";
        ctx.fillText("⚪ ยังไม่ถึงกำหนดรอบตรวจ", statusPillX + 20, statusPillY + 24);
      }
    });

    // 6. Shift Handover Remarks Bubble Card (Re-positioned cleanly after removing the 3 standard pills)
    const noteY = 1105;
    const noteH = 150;

    ctx.save();
    ctx.shadowColor = "rgba(15, 23, 42, 0.05)";
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 3;
    drawRoundRect(ctx, cardMargin, noteY, cardWidth, noteH, 22, "#ffffff", "#e2e8f0", 1.5);
    ctx.restore();

    ctx.font = "bold 18px 'Sarabun', sans-serif";
    ctx.fillStyle = "#0f172a";
    ctx.fillText("📝 บันทึกข้อความการส่งมอบเวรและอุปกรณ์ประจำผลัด", cardMargin + 25, noteY + 38);

    // Quote Box
    drawRoundRect(ctx, cardMargin + 25, noteY + 55, cardWidth - 50, 78, 16, "#f8fafc", "#e2e8f0", 1);
    ctx.font = "600 17px 'Sarabun', sans-serif";
    ctx.fillStyle = "#1e293b";
    ctx.fillText(`“${handoverNote}”`, cardMargin + 45, noteY + 90);

    ctx.font = "500 14px 'Sarabun', sans-serif";
    ctx.fillStyle = "#64748b";
    ctx.fillText("• ส่งมอบวิทยุสื่อสาร สมุดบันทึกเหตุการณ์ และกุญแจประจำจุดตรวจแก่เจ้าหน้าที่ผลัดถัดไปเรียบร้อยแล้ว", cardMargin + 45, noteY + 116);

    // 7. Executive Formal Footer with Official Handover Sign-off
    const footerY = 1275;
    const footerH = 205;

    const footerGrad = ctx.createLinearGradient(0, footerY, width, footerY + footerH);
    footerGrad.addColorStop(0, "#071b2f");
    footerGrad.addColorStop(1, "#0a2d50");
    drawRoundRect(ctx, cardMargin, footerY, cardWidth, footerH, 24, footerGrad);

    // Cyber accent strip on footer
    ctx.strokeStyle = "rgba(56, 189, 248, 0.25)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cardMargin + 25, footerY + 68);
    ctx.lineTo(width - cardMargin - 25, footerY + 68);
    ctx.stroke();

    // Footer Title
    drawRoundRect(ctx, cardMargin + 25, footerY + 22, 36, 36, 12, "rgba(56, 189, 248, 0.15)");
    ctx.font = "20px 'Sarabun', sans-serif";
    ctx.fillText("🛡️", cardMargin + 33, footerY + 48);

    ctx.font = "bold 19px 'Sarabun', sans-serif";
    ctx.fillStyle = "#38bdf8";
    ctx.fillText("ระบบบริหารจัดการงานรักษาความปลอดภัย โรงพยาบาลพล (SMART PATROL)", cardMargin + 72, footerY + 46);

    // Footer Content (Left side: Official Officer & Timestamp)
    ctx.font = "bold 19px 'Sarabun', sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(`ผู้ส่งมอบงาน: ${currentUser?.name || "-"} (รหัสพนักงาน: ${currentUser?.pin || "-"})`, cardMargin + 25, footerY + 108);

    ctx.font = "500 15px 'Sarabun', sans-serif";
    ctx.fillStyle = "#94a3b8";
    ctx.fillText(`วันและเวลาที่บันทึกส่งมอบ: ${thaiDateFormatted} เวลา ${timeFormatted} น.`, cardMargin + 25, footerY + 138);

    ctx.font = "500 14px 'Sarabun', sans-serif";
    ctx.fillStyle = "#64748b";
    ctx.fillText("งานรักษาความปลอดภัย กลุ่มงานบริหารทั่วไป โรงพยาบาลพล อำเภอพล จังหวัดขอนแก่น", cardMargin + 25, footerY + 168);

    // Official Handover Certification / Sign-off Block (Right side - replaces digital verification hash)
    const signW = 340;
    const signX = width - cardMargin - 25 - signW;
    const signY = footerY + 86;
    drawRoundRect(ctx, signX, signY, signW, 100, 16, "rgba(15, 23, 42, 0.5)", "rgba(56, 189, 248, 0.25)", 1);

    ctx.font = "500 14px 'Sarabun', sans-serif";
    ctx.fillStyle = "#cbd5e1";
    ctx.fillText("ลงชื่อ.................................................. ผู้ส่งมอบเวร", signX + 22, signY + 30);
    ctx.font = "bold 14px 'Sarabun', sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(`( ${currentUser?.name || "พนักงานรักษาความปลอดภัย"} )`, signX + 50, signY + 54);

    ctx.font = "bold 12px 'Sarabun', sans-serif";
    ctx.fillStyle = "#38bdf8";
    ctx.fillText("✓ บันทึกยืนยันข้อมูลผ่านระบบอย่างเป็นทางการ", signX + 50, signY + 80);

    return canvas;
  };

  // Generate live preview when modal opens or note changes
  const updatePreview = useCallback(async () => {
    setIsGeneratingPreview(true);
    try {
      const canvas = await drawReportToCanvas();
      const url = canvas.toDataURL("image/png");
      setPreviewUrl(url);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingPreview(false);
    }
  }, [handoverNote, shiftRounds, checkpoints, patrolLogs, currentUser, currentShift]);

  useEffect(() => {
    if (isOpen) {
      updatePreview();
    }
  }, [isOpen, updatePreview]);

  if (!isOpen || !currentUser) return null;

  const recordAndGetReportLog = async (imgDataUrl?: string): Promise<ShiftReportLog> => {
    let driveUrl = imgDataUrl;
    if (imgDataUrl && imgDataUrl.startsWith("data:image")) {
      try {
        driveUrl = (await uploadImageToDrive({
          image: imgDataUrl,
          title: `ShiftReport_${currentShift.id}_${todayStr}`,
          subfolder: "รายงานส่งมอบเวร (Shift Reports)",
          webhookUrl: googleDriveWebhookUrl,
        })) || imgDataUrl;
      } catch (uploadErr) {
        console.warn("Upload shift report image to Drive fallback:", uploadErr);
      }
    }

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
      exportedImageUrl: driveUrl,
    };
    addShiftReportLog(report);
    return report;
  };

  const handleDownloadImage = async () => {
    setIsExporting(true);
    try {
      const canvas = await drawReportToCanvas();
      const imgUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      const filename = `รายงานประจำกะ_${currentShift.name}_${todayStr}_${timeFormatted.replace(":", "")}.png`;
      link.download = filename;
      link.href = imgUrl;
      link.click();

      recordAndGetReportLog(imgUrl);
      setSuccessMessage("บันทึกรูปภาพรายงานสำเร็จ! สามารถเปิดส่งเข้า LINE กลุ่มได้ทันที");
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err) {
      console.error(err);
      alert("เกิดข้อผิดพลาดในการสร้างรูปภาพรายงาน");
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyImageToClipboard = async () => {
    setIsExporting(true);
    try {
      const canvas = await drawReportToCanvas();
      const imgUrl = canvas.toDataURL("image/png");
      canvas.toBlob(async (blob) => {
        if (!blob) {
          handleDownloadImage();
          return;
        }
        try {
          if (navigator.clipboard && (window as any).ClipboardItem) {
            await navigator.clipboard.write([
              new (window as any).ClipboardItem({ "image/png": blob })
            ]);
            recordAndGetReportLog(imgUrl);
            setCopiedImage(true);
            setSuccessMessage("คัดลอกรูปภาพลงคลิปบอร์ดแล้ว! สามารถกด Paste (วาง) ลงใน LINE ได้ทันที");
            setTimeout(() => {
              setCopiedImage(false);
              setSuccessMessage(null);
            }, 4000);
          } else {
            handleDownloadImage();
          }
        } catch {
          handleDownloadImage();
        } finally {
          setIsExporting(false);
        }
      }, "image/png");
    } catch (err) {
      console.error(err);
      setIsExporting(false);
    }
  };

  const handleShareToLine = async () => {
    setIsExporting(true);
    try {
      const canvas = await drawReportToCanvas();
      const imgUrl = canvas.toDataURL("image/png");
      const filename = `รายงานประจำกะ_${currentShift.name}_${todayStr}.png`;

      canvas.toBlob(async (blob) => {
        if (!blob) {
          handleDownloadImage();
          return;
        }

        const file = new File([blob], filename, { type: "image/png" });
        const shareData = {
          title: `รายงานผลการเดินตรวจและส่งมอบเวร ${currentShift.name} - รพ.พล`,
          text: `🏥 รายงานผลการเดินตรวจและส่งมอบเวรประจำกะ (${currentShift.name})\n📅 วันที่: ${thaiDateFormatted}\n👤 ผู้ส่งมอบเวร: ${currentUser.name}\n📊 ความครอบคลุม: ${complianceRate}% (ตรงเวลาตามเกณฑ์ ${onTimeRate}%)\n🛡️ บันทึกส่งมอบเวรเรียบร้อยแล้ว`,
          files: [file],
        };

        recordAndGetReportLog(imgUrl);

        if (navigator.canShare && navigator.canShare(shareData)) {
          try {
            await navigator.share(shareData);
            setSuccessMessage("แชร์รายงานเข้า LINE กลุ่มเรียบร้อยแล้ว!");
          } catch (e: any) {
            if (e.name !== "AbortError") {
              handleDownloadImage();
            }
          }
        } else {
          // Fallback: Download file directly and prompt LINE
          const link = document.createElement("a");
          link.download = filename;
          link.href = canvas.toDataURL("image/png");
          link.click();
          setSuccessMessage("ดาวน์โหลดรูปรายงานความละเอียดสูงแล้ว! กำลังเปิด LINE...");
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

  const sampleNotes = [
    "ดำเนินการตรวจการณ์ครบถ้วนตามเกณฑ์ ส่งมอบวิทยุสื่อสารและกุญแจประจำจุดตรวจแก่ผลัดถัดไปเรียบร้อยแล้ว",
    "เหตุการณ์ทั่วไปปกติ การจราจรคล่องตัว อุปกรณ์ระงับอัคคีภัยและประตูหนีไฟอยู่ในสภาพพร้อมใช้งาน",
    "ส่งมอบผลัดเวรเรียบร้อย พร้อมแจ้งข้อมูลจุดเฝ้าระวังพิเศษแก่เจ้าหน้าที่ผลัดถัดไปรับทราบแล้ว",
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-sky-100 flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-sky-900 text-white p-4 sm:p-5 flex items-start justify-between border-b border-sky-800/40">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white p-1.5 shadow-md flex items-center justify-center shrink-0">
              <img src="/phon_hospital_logo.png" alt="Phon Hospital" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider bg-sky-500/20 text-sky-300 border border-sky-400/30 px-2 py-0.5 rounded-full">
                  Smart Patrol Report
                </span>
                <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full">
                  ส่งมอบเวรประจำกะ
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black mt-1 text-white">
                รายงานประจำกะ ({currentShift.name})
              </h2>
              <p className="text-[11px] text-sky-200/80">
                {thaiDateFormatted} • ผู้ส่ง: {currentUser.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 text-slate-800 text-xs bg-slate-50/50">
          
          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-2xl font-bold flex items-center gap-2 shadow-xs animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Report Live Preview Banner */}
          <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-sky-600" />
                <h3 className="font-bold text-slate-900 text-sm">ตัวอย่างภาพรายงานที่จะส่งเข้า LINE</h3>
              </div>
              <button
                onClick={updatePreview}
                disabled={isGeneratingPreview}
                className="text-[11px] text-sky-600 hover:text-sky-700 font-bold flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingPreview ? "animate-spin" : ""}`} />
                รีเฟรชตัวอย่าง
              </button>
            </div>

            {/* Scrollable / Scaled Preview Frame */}
            <div className="relative rounded-2xl overflow-hidden border-2 border-slate-200/80 bg-slate-900 flex items-center justify-center max-h-72 shadow-inner group">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Shift Report Preview"
                  className="w-full h-auto object-contain max-h-72 transition-transform duration-300 group-hover:scale-102"
                />
              ) : (
                <div className="p-8 text-center text-slate-400 text-xs">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-sky-400" />
                  กำลังเรนเดอร์ภาพรายงานความละเอียดสูง...
                </div>
              )}
              <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-xs text-white text-[10px] px-2.5 py-1 rounded-full font-mono">
                1080 × 1520 HD • เอกสารรายงานทางการ
              </div>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <div className="p-3 bg-white border border-emerald-200 rounded-2xl text-center shadow-2xs">
              <span className="text-[10px] font-bold text-emerald-800 block">ความครอบคลุม</span>
              <span className="text-xl font-black text-emerald-700">{complianceRate}%</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">{totalPointsCompleted}/{totalPointsExpected} จุด</span>
            </div>
            <div className="p-3 bg-white border border-sky-200 rounded-2xl text-center shadow-2xs">
              <span className="text-[10px] font-bold text-sky-800 block">ตรงเวลาตามเกณฑ์</span>
              <span className="text-xl font-black text-sky-700">{onTimeRate}%</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">{onTimeRoundsCount}/{shiftRounds.length} รอบ</span>
            </div>
            <div className="p-3 bg-white border border-slate-200 rounded-2xl text-center shadow-2xs">
              <span className="text-[10px] font-bold text-slate-600 block">ความสงบเรียบร้อย</span>
              <span className={`text-xl font-black ${issueLogs.length === 0 ? "text-emerald-700" : "text-rose-600"}`}>
                {issueLogs.length === 0 ? "ปกติ" : `${issueLogs.length} ข้อ`}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {issueLogs.length === 0 ? "เหตุการณ์ปกติ" : "บันทึกแจ้งซ่อม"}
              </span>
            </div>
          </div>

          {/* Handover Note & Sample Presets */}
          <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs space-y-2.5">
            <label className="block text-xs font-bold text-slate-800">
              💬 บันทึกข้อความการส่งมอบเวรและอุปกรณ์ประจำผลัด:
            </label>
            <textarea
              rows={2}
              value={handoverNote}
              onChange={(e) => setHandoverNote(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-300 rounded-2xl text-xs text-slate-900 focus:outline-none focus:border-sky-500 focus:bg-white transition-all shadow-inner"
              placeholder="ระบุข้อความส่งมอบเวร..."
            />

            {/* Presets */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 block">เลือกข้อความทางการสำเร็จรูป:</span>
              <div className="flex flex-wrap gap-1.5">
                {sampleNotes.map((note, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setHandoverNote(note)}
                    className="text-[10px] px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-sky-50 text-slate-600 hover:text-sky-800 border border-slate-200 transition-colors cursor-pointer text-left"
                  >
                    {note}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-white border-t border-slate-200 flex flex-col sm:flex-row gap-2.5 shadow-lg">
          <button
            onClick={handleDownloadImage}
            disabled={isExporting}
            className="flex-1 py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all shadow-2xs cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-600" />
            <span>ดาวน์โหลดรูปภาพ (.PNG)</span>
          </button>

          <button
            onClick={handleCopyImageToClipboard}
            disabled={isExporting}
            className="py-3 px-4 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all shadow-2xs cursor-pointer"
            title="คัดลอกรูปภาพ สามารถกด Paste ลงใน LINE Chat ได้ทันที"
          >
            {copiedImage ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-sky-600" />}
            <span>{copiedImage ? "คัดลอกแล้ว!" : "คัดลอกรูปภาพ"}</span>
          </button>

          <button
            onClick={handleShareToLine}
            disabled={isExporting}
            className="flex-1 py-3 px-4 rounded-xl bg-[#06c755] hover:bg-[#05b54d] text-white font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all shadow-md shadow-emerald-500/25 cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
            <span>ส่งแชร์เข้า LINE กลุ่ม</span>
          </button>
        </div>
      </div>
    </div>
  );
}
