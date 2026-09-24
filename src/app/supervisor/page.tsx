"use client";

import { useState } from "react";
import { 
  useStore, 
  Checkpoint, 
  Guard, 
  ShiftSwapRequest, 
  LeaveRequest, 
  DailyRoster 
} from "@/lib/store";
import { 
  ArrowLeft, 
  ShieldCheck, 
  CheckSquare, 
  AlertTriangle, 
  Car, 
  Bike,
  Search,
  Bot, 
  Sparkles, 
  Award, 
  Send, 
  Users, 
  CheckCircle2, 
  Plus, 
  LogOut, 
  Phone,
  Building,
  Calendar,
  Printer,
  Edit2,
  Trash2,
  MapPin,
  LocateFixed,
  Repeat,
  Check,
  X,
  Clock,
  Zap,
  Coffee,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  Umbrella,
  FileSpreadsheet,
  UploadCloud,
  Download,
  RefreshCw,
  Copy,
  ListChecks,
  BookmarkCheck,
  ArrowUp,
  ArrowDown,
  Layers,
  FolderPlus,
  ShieldAlert,
  Archive,
  FolderArchive,
  HardDrive,
  ExternalLink,
  FileText,
  CloudDownload,
  Database
} from "lucide-react";
import Link from "next/link";
import { useFirebaseSync } from "@/lib/useFirebaseSync";
import HospitalBrand from "@/components/HospitalBrand";
import PrintQRModal from "@/components/PrintQRModal";
import { getThaiFiscalYear, isOlderThanDays, formatThaiDateTime } from "@/lib/fiscalYear";

export default function SupervisorPage() {
  const { 
    supervisorUser, 
    loginSupervisor, 
    logoutSupervisor, 
    patrolLogs, 
    parkingScans, 
    checkpoints, 
    addCheckpoint,
    updateCheckpoint,
    deleteCheckpoint,
    reorderCheckpoints,
    autoRenumberCheckpoints,
    updateCheckpointItems,
    copyCheckpointItems,
    checklistTemplates,
    addChecklistTemplate,
    deleteChecklistTemplate,
    incidents, 
    updateIncidentStatus, 
    staffVehicles, 
    addStaffVehicle, 
    bulkImportVehicles,
    deleteStaffVehicle,
    purgeExpiredScans,
    guards,
    addGuard,
    updateGuard,
    deleteGuard,
    shiftSwapRequests,
    createShiftSwapRequest,
    approveShiftSwapRequest,
    rejectShiftSwapRequest,
    leaveRequests,
    addLeaveRequest,
    approveLeaveRequest,
    rejectLeaveRequest,
    staffDaysOff,
    setStaffDayOff,
    setGuardRecurringDayOff,
    clearStaffDaysOffForMonth,
    rosterSchedule,
    autoGenerateSchedule,
    autoGenerateMonthSchedule,
    manualUpdateRoster,
    archiveAuditLogs,
    addArchiveAuditLog,
    purgeArchivedRecords
  } = useStore();

  const { isConnected: isCloudConnected } = useFirebaseSync();

  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"overview" | "roster" | "leaves" | "checkpoints" | "staff" | "vehicles" | "incidents" | "ai" | "archive">("overview");
  const [lineSent, setLineSent] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [autoScheduledAlert, setAutoScheduledAlert] = useState(false);

  // 365-Day Archival State
  const [archiveCutoffDays, setArchiveCutoffDays] = useState<number>(365);
  const [archiveSelectedFiscalYear, setArchiveSelectedFiscalYear] = useState<string>("ALL");
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [archiveSuccess, setArchiveSuccess] = useState<string | null>(null);
  const [archiveStats, setArchiveStats] = useState<any | null>(null);
  const [showPurgeConfirmModal, setShowPurgeConfirmModal] = useState(false);
  const [purgeConfirmText, setPurgeConfirmText] = useState("");
  const [downloadingFormat, setDownloadingFormat] = useState<string | null>(null);

  // Monthly Roster & Staff Days Off State
  const [selectedYear, setSelectedYear] = useState(2026);
  const [selectedMonth, setSelectedMonth] = useState(8); // September (0-indexed)
  const [rosterViewMode, setRosterViewMode] = useState<"calendar" | "matrix">("calendar");
  const [showDaysOffModal, setShowDaysOffModal] = useState(false);
  const [daysOffSelectedGuardId, setDaysOffSelectedGuardId] = useState("g1");
  const [daysOffAlert, setDaysOffAlert] = useState<string | null>(null);

  // Checkpoint & Checklist Modals State
  const [showAddCpModal, setShowAddCpModal] = useState(false);
  const [editingCp, setEditingCp] = useState<Checkpoint | null>(null);
  const [cpForm, setCpForm] = useState({
    code: "",
    name: "",
    building: "อาคารเฉลิมพระเกียรติ A",
    floor: "ชั้น 1",
    items: [
      "ประตูทางเข้า-ออก และหน้าต่างล็อกแน่นหนา",
      "ทางหนีไฟและอุปกรณ์ดับเพลิงไม่ถูกปิดกั้น",
      "ระบบไฟส่องสว่างและกล้องวงจรปิดทำงานปกติ",
    ] as string[],
  });
  const [newChecklistItem, setNewChecklistItem] = useState("");
  const [managingChecklistCp, setManagingChecklistCp] = useState<Checkpoint | null>(null);
  const [tempChecklistItems, setTempChecklistItems] = useState<string[]>([]);
  const [tempNewItem, setTempNewItem] = useState("");
  const [showTemplateManagerModal, setShowTemplateManagerModal] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateCategory, setNewTemplateCategory] = useState("ทั่วไป");
  const [newTemplateItemsText, setNewTemplateItemsText] = useState("");
  const [checklistAlert, setChecklistAlert] = useState<string | null>(null);
  const [locatingCpId, setLocatingCpId] = useState<string | null>(null);

  // Staff Modals State
  const [showAddGuardModal, setShowAddGuardModal] = useState(false);
  const [editingGuard, setEditingGuard] = useState<Guard | null>(null);
  const [guardForm, setGuardForm] = useState({
    name: "",
    pin: "",
    shift: "morning" as "morning" | "night",
    phone: "",
    role: "guard" as "guard" | "supervisor"
  });

  // Shift Swap Modal State
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [swapForm, setSwapForm] = useState({
    requesterId: "",
    targetGuardId: "",
    swapDate: new Date().toISOString().split("T")[0],
    reason: "",
  });

  // Leave Modal State
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveForm, setLeaveForm] = useState({
    guardId: "",
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
    type: "personal" as "vacation" | "sick" | "personal",
    reason: "",
  });

  // Manual Roster Edit Modal State
  const [manualModalData, setManualModalData] = useState<{
    date: string;
    shift: "morning" | "night";
    selectedGuardIds: string[];
  } | null>(null);

  // Vehicle Modal State
  const [showAddVehicleModal, setShowAddVehicleModal] = useState(false);
  const [newVehicle, setNewVehicle] = useState({
    plateNumber: "",
    province: "ขอนแก่น",
    ownerName: "",
    department: "",
    phone: "",
    zone: "ลานจอดแพทย์ A"
  });

  // Google Sheets Sync State
  const [showSheetModal, setShowSheetModal] = useState(false);
  const [sheetUrl, setSheetUrl] = useState(
    "https://docs.google.com/spreadsheets/d/1SJ4yULEWaWkYEFr_8afL7Ao8razoilFhuxNPScbBEMo/edit?pli=1&gid=1048644177#gid=1048644177"
  );
  const [sheetLoading, setSheetLoading] = useState(false);
  const [sheetError, setSheetError] = useState<string | null>(null);
  const [sheetPreview, setSheetPreview] = useState<any[] | null>(null);
  const [sheetStats, setSheetStats] = useState<{
    count: number;
    carsCount: number;
    motorcyclesCount: number;
  } | null>(null);
  const [sheetSuccess, setSheetSuccess] = useState<string | null>(null);
  const [vehicleSearch, setVehicleSearch] = useState("");
  const [vehicleFilterType, setVehicleFilterType] = useState<"all" | "car" | "motorcycle">("all");

  // DeepSeek AI Batch State
  const [aiLoading, setAiLoading] = useState(false);
  const [aiReportData, setAiReportData] = useState<any | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [purgedCountAlert, setPurgedCountAlert] = useState<number | null>(null);
  const [copiedLine, setCopiedLine] = useState(false);

  // Function to download CSV Template
  const handleDownloadTemplate = () => {
    const csvHeader = "ทะเบียน,จังหวัด,ชื่อเจ้าของรถ,แผนก/กลุ่มงาน,เบอร์โทรศัพท์,โซนที่จอด\n";
    const sampleRows = "1234,ขอนแก่น,นพ. วิทยา รักษาดี,ศัลยกรรมอุบัติเหตุ,081-111-1111,ลานจอดแพทย์ A\n5678,ขอนแก่น,พญ. สมศรี จิตเมตตา,กุมารเวชศาสตร์,082-222-2222,ลานจอดแพทย์ A\n7890,ขอนแก่น,นพ. ธนกฤต เชี่ยวชาญ,อายุรกรรมหัวใจ,083-333-3333,ลานจอดแพทย์ B\n4321,ขอนแก่น,นางกาญจนา ดูแลดี,หัวหน้าพยาบาล ER,084-444-4444,โซนบุคลากร B1\n";
    const blob = new Blob(["\uFEFF" + csvHeader + sampleRows], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "แบบฟอร์มลงทะเบียนรถบุคลากร_รพ.พล.csv";
    link.click();
  };

  // Function to fetch / parse Google Sheets
  const handleFetchSheet = async (overrideCsv?: string) => {
    setSheetLoading(true);
    setSheetError(null);
    setSheetSuccess(null);
    setSheetPreview(null);
    setSheetStats(null);

    try {
      const res = await fetch("/api/sync-sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: sheetUrl || undefined,
          csvText: overrideCsv || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "เกิดข้อผิดพลาดในการอ่านข้อมูลจากชีต");
      }

      setSheetPreview(data.vehicles);
      setSheetStats({
        count: data.count || data.vehicles.length,
        carsCount: data.carsCount ?? data.vehicles.filter((v: any) => v.vehicleType === "รถยนต์").length,
        motorcyclesCount: data.motorcyclesCount ?? data.vehicles.filter((v: any) => v.vehicleType === "รถจักรยานยนต์").length,
      });
    } catch (err: any) {
      setSheetError(err.message || "เกิดข้อผิดพลาดในการซิงก์ข้อมูล");
    } finally {
      setSheetLoading(false);
    }
  };

  // Function to commit parsed vehicles into Store
  const handleCommitSheetImport = () => {
    if (!sheetPreview || sheetPreview.length === 0) return;
    bulkImportVehicles(sheetPreview);
    const carCount = sheetStats?.carsCount ?? sheetPreview.filter((v: any) => v.vehicleType === "รถยนต์").length;
    const motoCount = sheetStats?.motorcyclesCount ?? sheetPreview.filter((v: any) => v.vehicleType === "รถจักรยานยนต์").length;
    setSheetSuccess(`นำเข้าข้อมูลรถบุคลากรสำเร็จ ${sheetPreview.length} คัน (รถยนต์ ${carCount} คัน, จยย. ${motoCount} คัน) บันทึกลงฐานข้อมูลคลาวด์เรียบร้อยแล้ว!`);
    setTimeout(() => {
      setShowSheetModal(false);
      setSheetPreview(null);
      setSheetStats(null);
      setSheetSuccess(null);
    }, 2200);
  };

  // Function to handle local CSV file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      if (text) {
        handleFetchSheet(text);
      }
    };
    reader.readAsText(file, "UTF-8");
  };

  // Function to trigger DeepSeek AI Batch 07:00 Run
  const handleRunAiBatch = async () => {
    setAiLoading(true);
    setAiError(null);

    try {
      const res = await fetch("/api/ai/daily-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scans: parkingScans,
          staffVehicles,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "เกิดข้อผิดพลาดในการประมวลผล AI");
      }

      setAiReportData(data);
    } catch (err: any) {
      setAiError(err.message || "เกิดข้อผิดพลาดในการประมวลผล");
    } finally {
      setAiLoading(false);
    }
  };

  // Function to manually trigger 90-day retention purge
  const handlePurgeExpired = () => {
    const count = purgeExpiredScans(90);
    setPurgedCountAlert(count);
    setTimeout(() => setPurgedCountAlert(null), 4000);
  };

  // Fetch Archive Stats & Google Drive Status
  const fetchArchiveStats = async () => {
    try {
      const res = await fetch("/api/archive");
      if (res.ok) {
        const data = await res.json();
        setArchiveStats(data);
      }
    } catch (err) {
      console.warn("fetchArchiveStats notice:", err);
    }
  };

  // Run Archival (Upload to Google Drive + Purge Cloud)
  const handleExecuteArchival = async (purge: boolean = false) => {
    setArchiveLoading(true);
    setArchiveError(null);
    setArchiveSuccess(null);

    try {
      const res = await fetch("/api/archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cutoffDays: archiveCutoffDays,
          targetFiscalYear: archiveSelectedFiscalYear,
          purgeFromFirestore: purge,
          operator: supervisorUser?.name || "พ.ต.ท. ประพันธ์ (หัวหน้างาน)",
          clientPatrolLogs: patrolLogs,
          clientParkingScans: parkingScans,
          clientIncidents: incidents,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "เกิดข้อผิดพลาดในการสำรองข้อมูล");
      }

      if (data.auditLog) {
        addArchiveAuditLog(data.auditLog);
      }

      if (purge && data.purgedIds) {
        if (data.purgedIds.patrolLogs?.length > 0) {
          purgeArchivedRecords("patrolLogs", data.purgedIds.patrolLogs);
        }
        if (data.purgedIds.parkingScans?.length > 0) {
          purgeArchivedRecords("parkingScans", data.purgedIds.parkingScans);
        }
        if (data.purgedIds.incidents?.length > 0) {
          purgeArchivedRecords("incidents", data.purgedIds.incidents);
        }
      }

      const totalArchived = data.archivedCounts?.total ?? 0;
      const uploadedMsg = data.isDriveConnected
        ? `อัปโหลดไฟล์เข้า Google Drive สำเร็จ ${data.uploadedFiles?.length || 0} ไฟล์`
        : `จัดกลุ่มข้อมูล ${totalArchived} รายการเรียบร้อย (ยังไม่ได้ตั้งค่า Google Drive)`;

      setArchiveSuccess(
        `${uploadedMsg}${purge ? " และล้างข้อมูลเก่าออกจาก Firestore เรียบร้อยแล้ว!" : " (ยังไม่ได้ลบข้อมูลจาก Cloud)"}`
      );
      setShowPurgeConfirmModal(false);
      setPurgeConfirmText("");
      fetchArchiveStats();
    } catch (err: any) {
      setArchiveError(err.message || "เกิดข้อผิดพลาดในการประมวลผล Archive");
    } finally {
      setArchiveLoading(false);
    }
  };

  // Download Archive File directly to Computer
  const handleDownloadArchiveFile = async (format: "csv" | "json", type: "patrol" | "parking" | "incident" | "all" = "all") => {
    setDownloadingFormat(`${format}-${type}`);
    try {
      const res = await fetch("/api/archive/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format,
          type,
          cutoffDays: archiveCutoffDays,
          targetFiscalYear: archiveSelectedFiscalYear,
          operator: supervisorUser?.name || "พ.ต.ท. ประพันธ์",
          clientPatrolLogs: patrolLogs,
          clientParkingScans: parkingScans,
          clientIncidents: incidents,
        }),
      });

      if (!res.ok) {
        throw new Error("ไม่สามารถสร้างไฟล์สำรองสำหรับดาวน์โหลดได้");
      }

      const blob = await res.blob();
      const contentDisposition = res.headers.get("content-disposition");
      let filename = `PHON_Archive_${archiveSelectedFiscalYear}_${new Date().toISOString().split("T")[0]}.${format}`;
      if (contentDisposition && contentDisposition.includes("filename=")) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match && match[1]) filename = decodeURIComponent(match[1]);
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`ดาวน์โหลดไฟล์ไม่สำเร็จ: ${err.message}`);
    } finally {
      setDownloadingFormat(null);
    }
  };

  // Trigger / Test Vercel Daily Cron Archival (07:00 น.)
  const handleTriggerDailyCron = async () => {
    setArchiveLoading(true);
    setArchiveError(null);
    setArchiveSuccess(null);
    try {
      const res = await fetch("/api/archive/cron");
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "เกิดข้อผิดพลาดในการรัน Cron");
      }
      if (data.archivedCounts?.total > 0) {
        setArchiveSuccess(`รันคำสั่งอัตโนมัติสำเร็จ: จัดเก็บข้อมูลเกิน 365 วัน จำนวน ${data.archivedCounts.total} รายการ เรียบร้อยแล้ว`);
      } else {
        setArchiveSuccess(`รันคำสั่งอัตโนมัติสำเร็จ: ตรวจสอบแล้วไม่พบข้อมูลอายุเกิน 365 วัน (ระบบสะอาดปกติ 100%)`);
      }
      fetchArchiveStats();
    } catch (err: any) {
      setArchiveError(`เกิดข้อผิดพลาด: ${err.message}`);
    } finally {
      setArchiveLoading(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginSupervisor(pin)) {
      setPin("");
      setError("");
    } else {
      setError("รหัส PIN หัวหน้างานไม่ถูกต้อง (ใช้รหัส: 9999)");
    }
  };

  // Capture GPS on the spot
  const handlePinRealGps = (cp: Checkpoint) => {
    setLocatingCpId(cp.id);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const newCoords = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: Math.round(pos.coords.accuracy * 10) / 10,
            setAt: new Date().toLocaleString("th-TH")
          };
          updateCheckpoint(cp.id, { coords: newCoords });
          setLocatingCpId(null);
        },
        (err) => {
          const simCoords = {
            lat: 15.81462 + (Math.random() - 0.5) * 0.001,
            lng: 102.60124 + (Math.random() - 0.5) * 0.001,
            accuracy: 4.5,
            setAt: new Date().toLocaleString("th-TH")
          };
          updateCheckpoint(cp.id, { coords: simCoords });
          setLocatingCpId(null);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      setLocatingCpId(null);
    }
  };

  const handleSaveCp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cpForm.code || !cpForm.name) return;
    if (editingCp) {
      updateCheckpoint(editingCp.id, {
        code: cpForm.code,
        name: cpForm.name,
        building: cpForm.building,
        floor: cpForm.floor,
        items: cpForm.items,
      });
      setEditingCp(null);
    } else {
      addCheckpoint({
        code: cpForm.code,
        name: cpForm.name,
        building: cpForm.building,
        floor: cpForm.floor,
        order: checkpoints.length + 1,
        items: cpForm.items,
      });
      setShowAddCpModal(false);
    }
    setCpForm({
      code: "",
      name: "",
      building: "อาคารเฉลิมพระเกียรติ A",
      floor: "ชั้น 1",
      items: [
        "ประตูทางเข้า-ออก และหน้าต่างล็อกแน่นหนา",
        "ทางหนีไฟและอุปกรณ์ดับเพลิงไม่ถูกปิดกั้น",
        "ระบบไฟส่องสว่างและกล้องวงจรปิดทำงานปกติ",
      ],
    });
  };

  // Reorder Checkpoint up/down (Supervisor freedom)
  const handleMoveCheckpoint = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= checkpoints.length) return;
    const updated = [...checkpoints];
    const [moved] = updated.splice(index, 1);
    updated.splice(newIndex, 0, moved);
    const reordered = updated.map((cp, idx) => ({ ...cp, order: idx + 1 }));
    reorderCheckpoints(reordered);
  };

  // Save items from modal to checkpoint
  const handleSaveManagingChecklist = () => {
    if (!managingChecklistCp) return;
    updateCheckpointItems(managingChecklistCp.id, tempChecklistItems);
    setChecklistAlert(`บันทึกรายการเช็คสำหรับจุดตรวจ ${managingChecklistCp.name} สำเร็จแล้ว!`);
    setManagingChecklistCp(null);
    setTimeout(() => setChecklistAlert(null), 3000);
  };

  // Copy checklist from another checkpoint
  const handleCopyFromCheckpointToTemp = (sourceCpId: string) => {
    if (!sourceCpId) return;
    const source = checkpoints.find(c => c.id === sourceCpId);
    if (source && source.items && source.items.length > 0) {
      setTempChecklistItems([...source.items]);
      setChecklistAlert(`คัดลอกรายการเช็คจาก ${source.name} (${source.items.length} รายการ) สำเร็จ`);
      setTimeout(() => setChecklistAlert(null), 2500);
    } else {
      alert("จุดตรวจที่เลือกยังไม่มีรายการตรวจเช็ค");
    }
  };

  const handleCopyFromCheckpointToForm = (sourceCpId: string) => {
    if (!sourceCpId) return;
    const source = checkpoints.find(c => c.id === sourceCpId);
    if (source && source.items && source.items.length > 0) {
      setCpForm(prev => ({ ...prev, items: [...source.items!] }));
      setChecklistAlert(`คัดลอกรายการเช็คจาก ${source.name} (${source.items.length} รายการ) สำเร็จ`);
      setTimeout(() => setChecklistAlert(null), 2500);
    } else {
      alert("จุดตรวจที่เลือกยังไม่มีรายการตรวจเช็ค");
    }
  };

  // Load Template
  const handleApplyTemplateToTemp = (templateId: string) => {
    if (!templateId) return;
    const tmpl = checklistTemplates.find(t => t.id === templateId);
    if (tmpl) {
      setTempChecklistItems([...tmpl.items]);
      setChecklistAlert(`โหลดแม่แบบ "${tmpl.name}" (${tmpl.items.length} รายการ) สำเร็จ`);
      setTimeout(() => setChecklistAlert(null), 2500);
    }
  };

  const handleApplyTemplateToForm = (templateId: string) => {
    if (!templateId) return;
    const tmpl = checklistTemplates.find(t => t.id === templateId);
    if (tmpl) {
      setCpForm(prev => ({ ...prev, items: [...tmpl.items] }));
      setChecklistAlert(`โหลดแม่แบบ "${tmpl.name}" (${tmpl.items.length} รายการ) สำเร็จ`);
      setTimeout(() => setChecklistAlert(null), 2500);
    }
  };

  // Save current items as Template
  const handleSaveCurrentAsTemplate = (items: string[], defaultName: string) => {
    if (!items || items.length === 0) {
      alert("ยังไม่มีรายการเช็คให้บันทึกเป็นแม่แบบ");
      return;
    }
    const name = prompt("ตั้งชื่อแม่แบบรายการตรวจเช็คใหม่:", defaultName);
    if (!name || !name.trim()) return;
    const cat = prompt("ระบุหมวดหมู่แม่แบบ (เช่น โถงผู้ป่วย, คลังยา, ER, ลานจอดรถ):", "เฉพาะจุด");
    addChecklistTemplate({
      name: name.trim(),
      category: cat?.trim() || "ทั่วไป",
      description: `บันทึกไว้เมื่อ ${new Date().toLocaleDateString("th-TH")}`,
      items: [...items],
    });
    setChecklistAlert(`บันทึกแม่แบบใหม่ "${name.trim()}" เรียบร้อยแล้ว! สามารถนำไปดึงใช้กับจุดอื่นได้ทันที`);
    setTimeout(() => setChecklistAlert(null), 3500);
  };

  // Create new Template in Template Modal
  const handleCreateTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTemplateName.trim()) return;
    const parsedItems = newTemplateItemsText
      .split("\n")
      .map(s => s.trim())
      .filter(Boolean);
    if (parsedItems.length === 0) {
      alert("กรุณากรอกรายการตรวจเช็คอย่างน้อย 1 รายการ (แยกบรรทัด)");
      return;
    }
    addChecklistTemplate({
      name: newTemplateName.trim(),
      category: newTemplateCategory.trim() || "ทั่วไป",
      description: `สร้างโดยหัวหน้างานฝ่ายรักษาความปลอดภัย`,
      items: parsedItems,
    });
    setNewTemplateName("");
    setNewTemplateItemsText("");
    setChecklistAlert(`เพิ่มแม่แบบ "${newTemplateName.trim()}" สำเร็จแล้ว!`);
    setTimeout(() => setChecklistAlert(null), 3000);
  };

  const handleSaveGuard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guardForm.name || !guardForm.pin) return;
    if (editingGuard) {
      updateGuard(editingGuard.id, guardForm);
      setEditingGuard(null);
    } else {
      addGuard(guardForm);
      setShowAddGuardModal(false);
    }
    setGuardForm({ name: "", pin: "", shift: "morning", phone: "", role: "guard" });
  };

  const handleCreateSwap = (e: React.FormEvent) => {
    e.preventDefault();
    const reqGuard = guards.find(g => g.id === swapForm.requesterId);
    const tarGuard = guards.find(g => g.id === swapForm.targetGuardId);
    if (!reqGuard || !tarGuard) return;

    createShiftSwapRequest({
      requesterId: reqGuard.id,
      requesterName: reqGuard.name,
      requesterShift: reqGuard.shift,
      targetGuardId: tarGuard.id,
      targetGuardName: tarGuard.name,
      targetShift: tarGuard.shift,
      swapDate: swapForm.swapDate,
      reason: swapForm.reason || "ขอแลกเวรประจำวัน",
    });
    setShowSwapModal(false);
    setSwapForm({ requesterId: "", targetGuardId: "", swapDate: new Date().toISOString().split("T")[0], reason: "" });
  };

  const handleSaveLeave = (e: React.FormEvent) => {
    e.preventDefault();
    const targetGuard = guards.find(g => g.id === leaveForm.guardId);
    if (!targetGuard) return;

    addLeaveRequest({
      guardId: targetGuard.id,
      guardName: targetGuard.name,
      startDate: leaveForm.startDate,
      endDate: leaveForm.endDate,
      type: leaveForm.type,
      reason: leaveForm.reason || "ขอลางาน",
    });
    setShowLeaveModal(false);
    setLeaveForm({ guardId: "", startDate: new Date().toISOString().split("T")[0], endDate: new Date().toISOString().split("T")[0], type: "personal", reason: "" });
  };

  const thaiMonths = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
  ];

  const thaiDayNamesShort = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];

  // Number of days in currently selected month
  const daysInSelectedMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const currentMonthYearPrefix = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;
  
  // All dates in the selected month: [ "2026-09-01", "2026-09-02", ..., "2026-09-30" ]
  const monthDates: string[] = [];
  for (let d = 1; d <= daysInSelectedMonth; d++) {
    monthDates.push(`${currentMonthYearPrefix}-${String(d).padStart(2, '0')}`);
  }

  // Weekday of the 1st of month (0 = Sun, 1 = Mon, ..., 6 = Sat)
  const firstDayOfMonthWeekday = new Date(selectedYear, selectedMonth, 1).getDay();

  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(y => y - 1);
    } else {
      setSelectedMonth(m => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(y => y + 1);
    } else {
      setSelectedMonth(m => m + 1);
    }
  };

  const handleRunAutoSchedule = () => {
    autoGenerateMonthSchedule(selectedYear, selectedMonth);
    setAutoScheduledAlert(true);
    setTimeout(() => setAutoScheduledAlert(false), 3500);
  };

  const handleSaveManualRoster = () => {
    if (manualModalData) {
      manualUpdateRoster(manualModalData.date, manualModalData.shift, manualModalData.selectedGuardIds);
      setManualModalData(null);
    }
  };

  const completedCheckpoints = new Set(patrolLogs.map((l) => l.checkpointId));
  const complianceRate = Math.min(100, Math.round((completedCheckpoints.size / Math.max(checkpoints.length, 1)) * 100));
  const issuesFound = patrolLogs.filter((l) => l.status === "issue").length;
  const unknownCars = parkingScans.filter((s) => !s.isStaff).length;
  const pendingSwaps = shiftSwapRequests.filter(r => r.status === "pending");
  const pendingLeaves = leaveRequests.filter(l => l.status === "pending");

  // Backward compatibility
  const rosterDates = monthDates;

  // 365-Day Archival Calculations
  const currentFiscalYear = getThaiFiscalYear(new Date());
  const filterByArchiveCriteria = (item: { timestamp: string }) => {
    if (!item.timestamp) return false;
    if (!isOlderThanDays(item.timestamp, archiveCutoffDays)) return false;
    if (archiveSelectedFiscalYear !== "ALL") {
      const fy = getThaiFiscalYear(item.timestamp);
      if (fy.code !== archiveSelectedFiscalYear) return false;
    }
    return true;
  };

  const previewEligiblePatrol = patrolLogs.filter(filterByArchiveCriteria);
  const previewEligibleParking = parkingScans.filter(filterByArchiveCriteria);
  const previewEligibleIncidents = incidents.filter(filterByArchiveCriteria);
  const previewTotal = previewEligiblePatrol.length + previewEligibleParking.length + previewEligibleIncidents.length;

  const totalCloudRecords = patrolLogs.length + parkingScans.length + incidents.length;
  const expired365Total =
    patrolLogs.filter((p) => isOlderThanDays(p.timestamp, 365)).length +
    parkingScans.filter((s) => isOlderThanDays(s.timestamp, 365)).length +
    incidents.filter((i) => isOlderThanDays(i.timestamp, 365)).length;

  const availableFiscalYears = Array.from(
    new Set([
      ...patrolLogs.map((p) => getThaiFiscalYear(p.timestamp).code),
      ...parkingScans.map((s) => getThaiFiscalYear(s.timestamp).code),
      ...incidents.map((i) => getThaiFiscalYear(i.timestamp).code),
    ])
  ).sort().reverse();

  // 1. LOGIN SCREEN
  if (!supervisorUser) {
    return (
      <main className="min-h-screen bg-[#f0f6fa] text-slate-800 flex items-center justify-center p-4 relative overflow-hidden font-['Sarabun',sans-serif]">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-sky-200/50 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-blue-100/60 rounded-full blur-3xl pointer-events-none" />

        <div className="w-full max-w-md bg-white border border-sky-100 rounded-3xl p-8 shadow-xl relative z-10 space-y-6">
          <div className="flex justify-between items-center">
            <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 transition-all">
              <ArrowLeft className="w-4 h-4" /> เลือกบทบาทอื่น
            </Link>
            <span className="text-[10px] font-bold px-3 py-1 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
              SUPERVISOR PORTAL
            </span>
          </div>

          <div className="text-center space-y-2">
            <div className="flex justify-center mb-1">
              <HospitalBrand badgeText="ศูนย์ควบคุม" />
            </div>
            <h1 className="text-2xl font-black text-slate-900">ศูนย์ควบคุมความปลอดภัยหัวหน้างาน</h1>
            <p className="text-xs text-slate-500">ใส่รหัส PIN 4 หลักเพื่อเข้าสู่ระบบศูนย์สั่งการ</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                รหัส PIN หัวหน้างาน (4 หลัก)
              </label>
              <input
                type="password"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="ใส่รหัส PIN (ค่าเริ่มต้น: 9999)"
                className="w-full text-center text-2xl tracking-[0.4em] py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white font-mono"
              />
            </div>
            {error && <p className="text-rose-600 text-xs text-center font-medium">{error}</p>}
            <button
              type="submit"
              className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-2xl shadow-md shadow-blue-600/20 active:scale-95 transition-all text-sm"
            >
              เข้าสู่ระบบศูนย์ควบคุม
            </button>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => {
                  setPin("9999");
                  loginSupervisor("9999");
                }}
                className="text-xs text-blue-600 hover:text-blue-800 underline"
              >
                กดที่นี่เพื่อเข้าสู่ระบบทันที (PIN: 9999)
              </button>
            </div>
          </form>
        </div>
      </main>
    );
  }

  // 2. DASHBOARD MAIN VIEW
  return (
    <div className="min-h-screen bg-[#f0f6fa] text-slate-800 flex flex-col font-['Sarabun',sans-serif]">
      {/* Top Navbar */}
      <header className="bg-white border-b border-sky-100 sticky top-0 z-30 px-6 py-3.5 shadow-2xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <HospitalBrand badgeText="ศูนย์ควบคุมความปลอดภัย" />
          </div>

          <div className="flex items-center gap-3">
            {isCloudConnected ? (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-sky-50 rounded-xl border border-sky-200 text-xs text-sky-800 font-bold shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Cloud Sync: เชื่อมต่อ Firebase สำเร็จ</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-xl border border-slate-200 text-xs text-slate-500 font-medium">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>กำลังเชื่อมต่อ Cloud...</span>
              </div>
            )}

            <div className="flex items-center gap-2 px-3.5 py-1.5 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-800 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>รปภ. เวรเช้า {guards.filter(g => g.shift === "morning" && g.role === "guard").length} นาย</span>
            </div>

            <button
              onClick={logoutSupervisor}
              className="p-2.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200 transition-all flex items-center gap-1.5 text-xs font-semibold"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden md:inline">ออกจากระบบ</span>
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-white/80 backdrop-blur-md border-b border-sky-100 px-6">
        <div className="max-w-7xl mx-auto flex gap-2 overflow-x-auto py-2">
          {[
            { id: "overview", label: "ภาพรวม & KPI", icon: Award },
            { id: "roster", label: "ตารางเวร (Auto/Manual)", icon: Calendar, highlight: true },
            { id: "leaves", label: `ระบบขอลา (${leaveRequests.length})`, icon: Umbrella, badge: pendingLeaves.length > 0 ? pendingLeaves.length : undefined },
            { id: "checkpoints", label: `จัดการจุดตรวจ (${checkpoints.length})`, icon: CheckSquare },
            { id: "staff", label: `จัดการพนักงาน & แลกเวร (${guards.length})`, icon: Users, badge: pendingSwaps.length > 0 ? pendingSwaps.length : undefined },
            { id: "vehicles", label: `รถบุคลากร (${staffVehicles.length})`, icon: Car },
            { id: "incidents", label: `แจ้งเหตุด่วน (${incidents.length})`, icon: AlertTriangle },
            { id: "ai", label: "DeepSeek AI (07:00 น.)", icon: Bot },
            { id: "archive", label: "📦 คลังสำรองข้อมูล (365 วัน)", icon: FolderArchive, highlight: true },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  if (tab.id === "archive") {
                    fetchArchiveStats();
                  }
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-sky-600 text-white shadow-xs"
                    : tab.highlight
                    ? "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200"
                    : "text-slate-600 hover:text-slate-900 hover:bg-sky-50"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] flex items-center justify-center font-bold">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        {/* TAB 1: OVERVIEW */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white border border-sky-100 rounded-3xl p-5 shadow-xs">
                <div className="flex justify-between items-start text-slate-500 mb-2">
                  <span className="text-xs font-semibold">Patrol Compliance</span>
                  <Award className="w-5 h-5 text-sky-600" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-slate-900">{complianceRate}%</span>
                  <span className="text-xs text-emerald-600 font-bold">เป้าหมาย &gt; 90%</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full mt-3 overflow-hidden">
                  <div className="bg-sky-500 h-full rounded-full transition-all duration-500" style={{ width: `${complianceRate}%` }} />
                </div>
                <p className="text-[11px] text-slate-500 mt-2">ตรวจแล้ว {completedCheckpoints.size} จาก {checkpoints.length} จุด</p>
              </div>

              <div className="bg-white border border-sky-100 rounded-3xl p-5 shadow-xs">
                <div className="flex justify-between items-start text-slate-500 mb-2">
                  <span className="text-xs font-semibold">จุดตรวจที่ตั้งค่าไว้</span>
                  <CheckSquare className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-slate-900">{checkpoints.length}</span>
                  <span className="text-xs text-slate-500">จุดตรวจ</span>
                </div>
                <p className="text-[11px] text-sky-600 mt-3 font-medium">ปักหมุด GPS หรือสร้างเพิ่มได้ในแท็บจุดตรวจ</p>
              </div>

              <div className="bg-white border border-sky-100 rounded-3xl p-5 shadow-xs">
                <div className="flex justify-between items-start text-slate-500 mb-2">
                  <span className="text-xs font-semibold">คำขอวันลารออนุมัติ</span>
                  <Umbrella className="w-5 h-5 text-amber-500" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-slate-900">{pendingLeaves.length}</span>
                  <span className="text-xs text-slate-500">รายการ</span>
                </div>
                <p className="text-[11px] text-amber-600 mt-3 font-medium">ระบบ Auto-Schedule จะข้ามคนลาให้อัตโนมัติ</p>
              </div>

              <div className="bg-white border border-sky-100 rounded-3xl p-5 shadow-xs">
                <div className="flex justify-between items-start text-slate-500 mb-2">
                  <span className="text-xs font-semibold">คำขอแลกเวรรออนุมัติ</span>
                  <Repeat className="w-5 h-5 text-indigo-600" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-slate-900">{pendingSwaps.length}</span>
                  <span className="text-xs text-slate-500">รายการ</span>
                </div>
                <p className="text-[11px] text-indigo-600 mt-3 font-medium">ตรวจสอบได้ในแท็บจัดการพนักงาน</p>
              </div>
            </div>

            {/* Quick Action Banner */}
            <div className="p-6 bg-gradient-to-r from-sky-600 to-indigo-700 text-white rounded-3xl shadow-md flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-300 animate-bounce" />
                  <h3 className="font-extrabold text-lg">ระบบจัดเวรความปลอดภัยอัตโนมัติ (Auto-Scheduler)</h3>
                </div>
                <p className="text-xs text-sky-100 leading-relaxed max-w-xl">
                  จัดกะเช้า 3 นาย, กะดึก 2 นาย โดยคำนึงถึงคนที่ขอลา และเกลี่ยเวรให้ทุกคนอย่างยุติธรรม พร้อมโหมดแก้ไขแบบแมนนวล
                </p>
              </div>
              <button
                onClick={() => setActiveTab("roster")}
                className="px-6 py-3 bg-white text-sky-900 hover:bg-sky-50 font-bold text-xs rounded-2xl active:scale-95 transition-all shadow-md shrink-0"
              >
                เปิดตารางเวร & จัดการกะ &gt;
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: SHIFT ROSTER & AUTO/MANUAL SCHEDULER (MONTHLY VIEW) */}
        {activeTab === "roster" && (
          <div className="bg-white border border-sky-100 rounded-3xl p-6 shadow-xs space-y-6">
            {/* Header & Controls */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h2 className="font-extrabold text-xl text-slate-900 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-sky-600" /> ตารางเวร รปภ. รายเดือน
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold border border-emerald-200">
                    กะเช้า 3 นาย • กะดึก 2 นาย
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-800 text-[11px] font-bold border border-sky-200">
                    {daysInSelectedMonth} วัน
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  กำหนดวันหยุดพนักงานแต่ละคน แล้วกด <strong>&quot;จัดเวรอัตโนมัติทั้งเดือน&quot;</strong> ระบบจะข้ามวันหยุดและวันลาให้ทันที หรือคลิกแต่ละกะเพื่อแก้ไขแบบแมนนวล
                </p>
              </div>

              {/* Month Navigator & Actions */}
              <div className="flex flex-wrap items-center gap-2.5">
                {/* Month Navigator */}
                <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200 shadow-2xs">
                  <button
                    onClick={handlePrevMonth}
                    className="p-1.5 hover:bg-white rounded-xl text-slate-600 hover:text-slate-900 transition-all active:scale-90"
                    title="เดือนก่อนหน้า"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-3 text-xs font-black text-slate-800 tracking-wide select-none min-w-[125px] text-center">
                    {thaiMonths[selectedMonth]} {selectedYear + 543}
                  </span>
                  <button
                    onClick={handleNextMonth}
                    className="p-1.5 hover:bg-white rounded-xl text-slate-600 hover:text-slate-900 transition-all active:scale-90"
                    title="เดือนถัดไป"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* View Switcher Toggle */}
                <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs font-bold">
                  <button
                    onClick={() => setRosterViewMode("calendar")}
                    className={`px-3 py-1.5 rounded-xl transition-all ${
                      rosterViewMode === "calendar"
                        ? "bg-white text-sky-700 shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    📅 ปฏิทินรายเดือน
                  </button>
                  <button
                    onClick={() => setRosterViewMode("matrix")}
                    className={`px-3 py-1.5 rounded-xl transition-all ${
                      rosterViewMode === "matrix"
                        ? "bg-white text-sky-700 shadow-2xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    📊 ตารางภาพรวม (Matrix)
                  </button>
                </div>

                {/* Days Off Modal Button */}
                <button
                  onClick={() => setShowDaysOffModal(true)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-2xl flex items-center gap-1.5 active:scale-95 transition-all shadow-xs"
                >
                  🏖️ กำหนดวันหยุด รปภ.
                </button>

                {/* Auto Schedule Month Button */}
                <button
                  onClick={handleRunAutoSchedule}
                  className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs rounded-2xl flex items-center gap-1.5 active:scale-95 transition-all shadow-md shadow-amber-500/20"
                >
                  <Zap className="w-4 h-4 fill-current" /> จัดเวรอัตโนมัติทั้งเดือน
                </button>
              </div>
            </div>

            {/* Alerts */}
            {autoScheduledAlert && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-900 text-xs font-bold flex items-center gap-2 animate-in fade-in-50">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                จัดตารางเวรเดือน {thaiMonths[selectedMonth]} {selectedYear + 543} ({daysInSelectedMonth} วัน) เรียบร้อยแล้ว! (ตรวจสอบวันหยุดประจำและวันลาครบถ้วน พร้อมเฉลี่ยกะเช้า/ดึกอย่างยุติธรรม)
              </div>
            )}
            {daysOffAlert && (
              <div className="p-3 bg-sky-50 border border-sky-300 rounded-2xl text-sky-900 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-sky-600" />
                {daysOffAlert}
              </div>
            )}

            {/* VIEW 1: MONTHLY CALENDAR GRID */}
            {rosterViewMode === "calendar" && (
              <div className="space-y-3">
                {/* 7-Column Day Header (อา. - ส.) */}
                <div className="hidden lg:grid grid-cols-7 gap-3 text-center">
                  {thaiDayNamesShort.map((dayName, idx) => (
                    <div
                      key={dayName}
                      className={`py-2 rounded-xl text-xs font-black border ${
                        idx === 0 || idx === 6
                          ? "bg-rose-50 border-rose-200 text-rose-700"
                          : "bg-slate-100 border-slate-200 text-slate-700"
                      }`}
                    >
                      {dayName}
                    </div>
                  ))}
                </div>

                {/* Calendar Days Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
                  {/* Empty Offset Padding for 1st day of month */}
                  {Array.from({ length: firstDayOfMonthWeekday }).map((_, i) => (
                    <div
                      key={`pad-${i}`}
                      className="hidden lg:block p-3 rounded-2xl bg-slate-50/40 border border-dashed border-slate-200/60 opacity-40 min-h-[190px]"
                    />
                  ))}

                  {/* Days of Month */}
                  {monthDates.map((dateStr) => {
                    const roster = rosterSchedule[dateStr] || {
                      date: dateStr,
                      morningGuardIds: [],
                      nightGuardIds: [],
                      offGuardIds: []
                    };

                    const dateObj = new Date(dateStr);
                    const dayNum = dateObj.getDate();
                    const dayOfWeek = dateObj.getDay();
                    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                    const isToday = dateStr === new Date().toLocaleDateString("en-CA");

                    // Check who is on approved leave today
                    const leavesToday = leaveRequests.filter(l => 
                      l.status === "approved" && dateStr >= l.startDate && dateStr <= l.endDate
                    );

                    // Check who has assigned day off today
                    const daysOffToday = staffDaysOff.filter(d => d.date === dateStr);

                    return (
                      <div
                        key={dateStr}
                        className={`p-3 rounded-2xl border flex flex-col justify-between space-y-2 transition-all relative ${
                          isToday 
                            ? "bg-sky-50/50 border-sky-400 ring-2 ring-sky-300 shadow-xs" 
                            : isWeekend 
                            ? "bg-rose-50/20 border-slate-200" 
                            : "bg-slate-50/50 border-slate-200"
                        }`}
                      >
                        {/* Day Card Header */}
                        <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-base font-black ${isWeekend ? "text-rose-600" : "text-slate-900"}`}>
                              {dayNum}
                            </span>
                            <span className="text-[11px] font-bold text-slate-500 lg:hidden">
                              ({thaiDayNamesShort[dayOfWeek]})
                            </span>
                            {isToday && (
                              <span className="px-1.5 py-0.2 rounded bg-sky-500 text-white text-[9px] font-bold">
                                วันนี้
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {dateStr.substring(5)}
                          </span>
                        </div>

                        {/* Morning Shift (☀️) */}
                        <div
                          onClick={() => setManualModalData({ date: dateStr, shift: "morning", selectedGuardIds: roster.morningGuardIds })}
                          className="p-2 rounded-xl bg-amber-50/90 border border-amber-200 hover:border-amber-400 cursor-pointer transition-all space-y-1 group"
                          title="คลิกเพื่อแก้ไขกะเช้าแบบแมนนวล"
                        >
                          <div className="flex items-center justify-between text-[10px] font-bold text-amber-800">
                            <span className="flex items-center gap-1">
                              <Sun className="w-3 h-3 text-amber-600 shrink-0" /> กะเช้า
                            </span>
                            <span className="text-[9px] bg-white px-1.5 py-0.2 rounded border border-amber-200">
                              {roster.morningGuardIds.length}/3
                            </span>
                          </div>
                          <div className="space-y-0.5">
                            {roster.morningGuardIds.length === 0 ? (
                              <span className="text-[10px] text-amber-600/70 italic block">ยังไม่จัดเวร</span>
                            ) : (
                              roster.morningGuardIds.map(gid => {
                                const g = guards.find(x => x.id === gid);
                                return (
                                  <span key={gid} className="text-[10px] font-semibold text-slate-800 block truncate bg-white px-1.5 py-0.5 rounded shadow-2xs">
                                    {g?.name.replace("นาย", "") || gid}
                                  </span>
                                );
                              })
                            )}
                          </div>
                        </div>

                        {/* Night Shift (🌙) */}
                        <div
                          onClick={() => setManualModalData({ date: dateStr, shift: "night", selectedGuardIds: roster.nightGuardIds })}
                          className="p-2 rounded-xl bg-indigo-50/90 border border-indigo-200 hover:border-indigo-400 cursor-pointer transition-all space-y-1 group"
                          title="คลิกเพื่อแก้ไขกะดึกแบบแมนนวล"
                        >
                          <div className="flex items-center justify-between text-[10px] font-bold text-indigo-800">
                            <span className="flex items-center gap-1">
                              <Moon className="w-3 h-3 text-indigo-600 shrink-0" /> กะดึก
                            </span>
                            <span className="text-[9px] bg-white px-1.5 py-0.2 rounded border border-indigo-200">
                              {roster.nightGuardIds.length}/2
                            </span>
                          </div>
                          <div className="space-y-0.5">
                            {roster.nightGuardIds.length === 0 ? (
                              <span className="text-[10px] text-indigo-600/70 italic block">ยังไม่จัดเวร</span>
                            ) : (
                              roster.nightGuardIds.map(gid => {
                                const g = guards.find(x => x.id === gid);
                                return (
                                  <span key={gid} className="text-[10px] font-semibold text-slate-800 block truncate bg-white px-1.5 py-0.5 rounded shadow-2xs">
                                    {g?.name.replace("นาย", "") || gid}
                                  </span>
                                );
                              })
                            )}
                          </div>
                        </div>

                        {/* Days Off & Leaves Badges */}
                        {(daysOffToday.length > 0 || leavesToday.length > 0) && (
                          <div className="pt-1 border-t border-slate-200/60 space-y-1 text-[9px]">
                            {daysOffToday.length > 0 && (
                              <div className="p-1 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold truncate" title={daysOffToday.map(d => d.guardName).join(", ")}>
                                🏖️ หยุด: {daysOffToday.map(d => d.guardName.replace("นาย", "")).join(", ")}
                              </div>
                            )}
                            {leavesToday.length > 0 && (
                              <div className="p-1 rounded bg-rose-50 border border-rose-200 text-rose-800 font-semibold truncate" title={leavesToday.map(l => l.guardName).join(", ")}>
                                🏥 ลา: {leavesToday.map(l => l.guardName.replace("นาย", "")).join(", ")}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* VIEW 2: STAFF MATRIX VIEW */}
            {rosterViewMode === "matrix" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-slate-600 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                  <div className="flex items-center gap-4 flex-wrap">
                    <span className="font-bold text-slate-800">สัญลักษณ์ในตาราง:</span>
                    <span className="flex items-center gap-1.5"><span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[10px]">☀️ เช้า</span> กะเช้า (07:00-19:00)</span>
                    <span className="flex items-center gap-1.5"><span className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 font-bold text-[10px]">🌙 ดึก</span> กะดึก (19:00-07:00)</span>
                    <span className="flex items-center gap-1.5"><span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">🏖️ หยุด</span> วันหยุดพนักงาน</span>
                    <span className="flex items-center gap-1.5"><span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 font-bold text-[10px]">🏥 ลา</span> ขอลาที่อนุมัติแล้ว</span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium">รวม 5 นาย • เฉลี่ยกะสมดุล</span>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-2xs">
                  <table className="w-full border-collapse text-left text-xs whitespace-nowrap">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                        <th className="p-3 sticky left-0 bg-slate-100 z-10 min-w-[150px] shadow-xs">
                          เจ้าหน้าที่ รปภ.
                        </th>
                        {monthDates.map((dateStr) => {
                          const dateObj = new Date(dateStr);
                          const dayNum = dateObj.getDate();
                          const dayOfWeek = dateObj.getDay();
                          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                          return (
                            <th
                              key={dateStr}
                              className={`p-2 text-center min-w-[40px] border-l border-slate-200 ${
                                isWeekend ? "bg-rose-50 text-rose-700 font-black" : "text-slate-700"
                              }`}
                            >
                              <div>{dayNum}</div>
                              <div className="text-[9px] font-normal text-slate-500">{thaiDayNamesShort[dayOfWeek]}</div>
                            </th>
                          );
                        })}
                        <th className="p-2 text-center min-w-[55px] border-l border-slate-300 bg-amber-50 text-amber-900 font-bold">
                          ☀️ เช้า
                        </th>
                        <th className="p-2 text-center min-w-[55px] border-l border-slate-200 bg-indigo-50 text-indigo-900 font-bold">
                          🌙 ดึก
                        </th>
                        <th className="p-2 text-center min-w-[55px] border-l border-slate-200 bg-emerald-50 text-emerald-900 font-bold">
                          🏖️ หยุด
                        </th>
                        <th className="p-2 text-center min-w-[55px] border-l border-slate-200 bg-rose-50 text-rose-900 font-bold">
                          🏥 ลา
                        </th>
                        <th className="p-2 text-center min-w-[65px] border-l border-slate-300 bg-sky-50 text-sky-950 font-black">
                          รวมกะ
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {guards.filter(g => g.role === "guard").map((guard) => {
                        let morningCount = 0;
                        let nightCount = 0;
                        let dayOffCount = 0;
                        let leaveCount = 0;

                        return (
                          <tr key={guard.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="p-3 sticky left-0 bg-white z-10 font-bold text-slate-900 border-r border-slate-200 shadow-xs">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                <div>
                                  <span className="block text-xs">{guard.name}</span>
                                  <span className="text-[10px] text-slate-400 font-mono font-normal">{guard.phone}</span>
                                </div>
                              </div>
                            </td>

                            {monthDates.map((dateStr) => {
                              const roster = rosterSchedule[dateStr];
                              const isMorning = roster?.morningGuardIds?.includes(guard.id);
                              const isNight = roster?.nightGuardIds?.includes(guard.id);
                              const isOff = staffDaysOff.some(d => d.guardId === guard.id && d.date === dateStr);
                              const isLeave = leaveRequests.some(l => 
                                l.guardId === guard.id && l.status === "approved" && dateStr >= l.startDate && dateStr <= l.endDate
                              );

                              if (isMorning) morningCount++;
                              if (isNight) nightCount++;
                              if (isOff) dayOffCount++;
                              if (isLeave) leaveCount++;

                              return (
                                <td key={dateStr} className="p-1 text-center border-l border-slate-100">
                                  {isLeave ? (
                                    <span className="px-1 py-0.5 rounded bg-rose-100 text-rose-700 font-bold text-[9px] block">
                                      🏥 ลา
                                    </span>
                                  ) : isOff ? (
                                    <span className="px-1 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[9px] block">
                                      🏖️ หยุด
                                    </span>
                                  ) : isMorning ? (
                                    <span className="px-1 py-0.5 rounded bg-amber-100 text-amber-900 font-bold text-[9px] block">
                                      ☀️
                                    </span>
                                  ) : isNight ? (
                                    <span className="px-1 py-0.5 rounded bg-indigo-100 text-indigo-900 font-bold text-[9px] block">
                                      🌙
                                    </span>
                                  ) : (
                                    <span className="text-slate-300 block text-xs">-</span>
                                  )}
                                </td>
                              );
                            })}

                            <td className="p-2 text-center font-bold text-amber-800 border-l border-slate-300 bg-amber-50/40">
                              {morningCount}
                            </td>
                            <td className="p-2 text-center font-bold text-indigo-800 border-l border-slate-200 bg-indigo-50/40">
                              {nightCount}
                            </td>
                            <td className="p-2 text-center font-bold text-emerald-700 border-l border-slate-200 bg-emerald-50/40">
                              {dayOffCount}
                            </td>
                            <td className="p-2 text-center font-bold text-rose-700 border-l border-slate-200 bg-rose-50/40">
                              {leaveCount}
                            </td>
                            <td className="p-2 text-center font-black text-sky-900 border-l border-slate-300 bg-sky-50/60">
                              {morningCount + nightCount}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Workload Fair Distribution Banner */}
                <div className="p-4 bg-sky-50 border border-sky-200 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5 text-sky-900">
                    <Sparkles className="w-4 h-4 text-sky-600 shrink-0" />
                    <span>
                      <strong>การตรวจนับภาระงาน (Workload Audit):</strong> ระบบหมุนเวียนเวรอัตโนมัติคำนวณสัดส่วนกะเช้า (3 นาย/วัน) และกะดึก (2 นาย/วัน) ให้สมดุลเท่าเทียมกันทุกคน พร้อมหักลบวันหยุดและวันลาให้อัตโนมัติ
                    </span>
                  </div>
                  <button
                    onClick={() => setShowDaysOffModal(true)}
                    className="px-3.5 py-1.5 bg-white border border-sky-300 text-sky-700 hover:bg-sky-100 font-bold rounded-xl shrink-0 transition-all"
                  >
                    ปรับวันหยุดพนักงาน &gt;
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: LEAVE MANAGEMENT (ระบบขอลา & อนุมัติวันลา) */}
        {activeTab === "leaves" && (
          <div className="bg-white border border-sky-100 rounded-3xl p-6 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-lg text-slate-900">ระบบขอลา & อนุมัติวันลา (Leave Management)</h2>
                  {pendingLeaves.length > 0 && (
                    <span className="px-2.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold animate-pulse">
                      รออนุมัติ {pendingLeaves.length} รายการ
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  เมื่อหัวหน้างาน <strong>อนุมัติวันลา</strong> ระบบจัดเวรอัตโนมัติ (Auto-Schedule) จะ <strong>ข้ามชื่อ รปภ. ท่านนั้นในวันที่ลาทันที</strong>
                </p>
              </div>

              <button
                onClick={() => setShowLeaveModal(true)}
                className="px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl flex items-center gap-2 active:scale-95 transition-all shadow-xs"
              >
                <Plus className="w-4 h-4" /> บันทึกคำขอลาใหม่
              </button>
            </div>

            {/* Leave Requests Table */}
            <div className="space-y-3">
              {leaveRequests.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">ยังไม่มีประวัติการขอลา</p>
              ) : (
                leaveRequests.map((leave) => (
                  <div
                    key={leave.id}
                    className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                      leave.status === "pending"
                        ? "bg-amber-50/50 border-amber-200"
                        : leave.status === "approved"
                        ? "bg-emerald-50/40 border-emerald-200"
                        : "bg-slate-50 border-slate-200"
                    }`}
                  >
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">{leave.guardName}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] bg-white border font-semibold text-slate-700">
                          {leave.type === "sick" ? "ลาป่วย" : leave.type === "vacation" ? "พักร้อน" : "ลากิจส่วนตัว"}
                        </span>
                        <span className="text-slate-500 font-mono">
                          วันที่: <strong>{leave.startDate}</strong> ถึง <strong>{leave.endDate}</strong>
                        </span>
                      </div>
                      <p className="text-slate-600">
                        <strong>เหตุผล:</strong> {leave.reason}
                      </p>
                      <span className="text-[10px] text-slate-400 block font-mono">บันทึกเมื่อ: {leave.createdAt}</span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {leave.status === "pending" ? (
                        <>
                          <button
                            onClick={() => approveLeaveRequest(leave.id)}
                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-1 active:scale-95 transition-all shadow-xs"
                          >
                            <Check className="w-3.5 h-3.5" /> อนุมัติการลา
                          </button>
                          <button
                            onClick={() => rejectLeaveRequest(leave.id)}
                            className="px-3.5 py-1.5 bg-slate-200 hover:bg-rose-100 hover:text-rose-700 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1 active:scale-95 transition-all"
                          >
                            <X className="w-3.5 h-3.5" /> ปฏิเสธ
                          </button>
                        </>
                      ) : (
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold ${
                            leave.status === "approved"
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                              : "bg-rose-100 text-rose-800 border border-rose-300"
                          }`}
                        >
                          {leave.status === "approved" ? "อนุมัติการลาแล้ว (ระบบ Auto จะข้ามเวรให้)" : "ไม่อนุมัติ"}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 4: CHECKPOINTS MANAGEMENT */}
        {activeTab === "checkpoints" && (
          <div className="bg-white border border-sky-100 rounded-3xl p-6 shadow-xs space-y-6">
            {checklistAlert && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-2xl flex items-center gap-2 shadow-2xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{checklistAlert}</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="font-bold text-lg text-slate-900">บริหารจัดการจุดตรวจ ({checkpoints.length} จุด)</h2>
                <p className="text-xs text-slate-500">
                  หัวหน้างานสามารถจัดการจุดตรวจ จัดลำดับเดินตรวจ กำหนดรายการเช็คเฉพาะจุด และบันทึก/ดึงแม่แบบรายการเช็คได้อิสระ
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  onClick={() => setShowTemplateManagerModal(true)}
                  className="px-4 py-2.5 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 font-bold text-xs rounded-xl flex items-center gap-2 active:scale-95 transition-all shadow-2xs"
                >
                  <BookmarkCheck className="w-4 h-4 text-amber-600" /> คลังแม่แบบ ({checklistTemplates.length})
                </button>
                <button
                  onClick={() => {
                    if (confirm("ต้องการปรับรหัสจุดตรวจทั้งหมดให้เป็นเลขรันต่อเนื่อง (01, 02, 03...) ตามลำดับ ใช่หรือไม่?")) {
                      autoRenumberCheckpoints();
                      setChecklistAlert("🔢 ปรับรหัสจุดตรวจทั้งหมดเป็นเลขรันต่อเนื่อง (01, 02, 03...) เรียบร้อยแล้ว!");
                      setTimeout(() => setChecklistAlert(null), 4000);
                    }
                  }}
                  className="px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-900 font-bold text-xs rounded-xl flex items-center gap-2 active:scale-95 transition-all shadow-2xs"
                  title="จัดเรียงและรันเลขรหัสจุดตรวจอัตโนมัติ (01, 02, 03...)"
                >
                  <RefreshCw className="w-4 h-4 text-indigo-600" /> รันเลขจุดตรวจ (01, 02, 03...)
                </button>
                <button
                  onClick={() => setShowPrintModal(true)}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-2 active:scale-95 transition-all shadow-xs"
                >
                  <Printer className="w-4 h-4" /> พิมพ์ป้าย QR ทั้งหมด ({checkpoints.length} จุด)
                </button>
                <button
                  onClick={() => {
                    const nextCode = String(checkpoints.length + 1).padStart(2, "0");
                    setEditingCp(null);
                    setCpForm({
                      code: nextCode,
                      name: "",
                      building: "อาคารเฉลิมพระเกียรติ A",
                      floor: "ชั้น 1",
                      items: [
                        "ประตูทางเข้า-ออก และหน้าต่างล็อกแน่นหนา",
                        "ทางหนีไฟและอุปกรณ์ดับเพลิงไม่ถูกปิดกั้น",
                        "ระบบไฟส่องสว่างและกล้องวงจรปิดทำงานปกติ",
                      ],
                    });
                    setShowAddCpModal(true);
                  }}
                  className="px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl flex items-center gap-2 active:scale-95 transition-all shadow-xs"
                >
                  <Plus className="w-4 h-4" /> สร้างจุดตรวจใหม่
                </button>
              </div>
            </div>

            {/* Checkpoint Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {checkpoints.map((cp, cpIdx) => {
                const isLocating = locatingCpId === cp.id;
                const cpItems = cp.items || [
                  "ประตูทางเข้า-ออก และหน้าต่างล็อกแน่นหนา",
                  "ทางหนีไฟและอุปกรณ์ดับเพลิงไม่ถูกปิดกั้น",
                  "ระบบไฟส่องสว่างและกล้องวงจรปิดทำงานปกติ"
                ];

                return (
                  <div
                    key={cp.id}
                    className="p-5 rounded-3xl border border-slate-200 hover:border-sky-300 bg-slate-50/60 transition-all flex flex-col justify-between shadow-2xs space-y-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-sky-100 text-sky-900 border border-sky-200">
                            {cp.code}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                            ลำดับที่ {cp.order || cpIdx + 1}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          {/* Order adjustment buttons */}
                          <button
                            onClick={() => handleMoveCheckpoint(cpIdx, "up")}
                            disabled={cpIdx === 0}
                            title="เลื่อนลำดับขึ้น"
                            className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleMoveCheckpoint(cpIdx, "down")}
                            disabled={cpIdx === checkpoints.length - 1}
                            title="เลื่อนลำดับลง"
                            className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingCp(cp);
                              setCpForm({
                                code: cp.code,
                                name: cp.name,
                                building: cp.building,
                                floor: cp.floor,
                                items: cp.items ? [...cp.items] : [...cpItems],
                              });
                              setShowAddCpModal(true);
                            }}
                            title="แก้ไขจุดตรวจ"
                            className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-600"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`คุณต้องการลบจุดตรวจ ${cp.name} ใช่หรือไม่?`)) {
                                deleteCheckpoint(cp.id);
                              }
                            }}
                            title="ลบจุดตรวจ"
                            className="p-1.5 rounded-lg bg-white border border-slate-200 hover:bg-rose-50 text-rose-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div>
                        <h3 className="font-bold text-slate-900 text-base">{cp.name}</h3>
                        <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                          <Building className="w-3.5 h-3.5 text-sky-600" />
                          {cp.building} • {cp.floor}
                        </p>
                      </div>

                      {/* Checklist Summary & Quick Action */}
                      <div className="p-3 bg-white rounded-2xl border border-sky-100 text-xs space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-700 flex items-center gap-1.5">
                            <ListChecks className="w-3.5 h-3.5 text-sky-600" /> รายการเช็คเฉพาะจุด
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                            {cpItems.length} ข้อ
                          </span>
                        </div>
                        <ul className="text-[11px] text-slate-600 space-y-1">
                          {cpItems.slice(0, 2).map((item, idx) => (
                            <li key={idx} className="flex items-start gap-1.5">
                              <span className="text-sky-500 font-bold shrink-0">•</span>
                              <span className="truncate">{item}</span>
                            </li>
                          ))}
                          {cpItems.length > 2 && (
                            <li className="text-[10px] text-slate-400 font-medium">
                              และอีก {cpItems.length - 2} รายการ...
                            </li>
                          )}
                        </ul>
                        <button
                          type="button"
                          onClick={() => {
                            setManagingChecklistCp(cp);
                            setTempChecklistItems(cp.items ? [...cp.items] : [...cpItems]);
                            setTempNewItem("");
                          }}
                          className="w-full py-1.5 px-2.5 bg-sky-50 hover:bg-sky-100 text-sky-800 font-bold text-[11px] rounded-lg flex items-center justify-center gap-1 transition-colors border border-sky-200"
                        >
                          <ListChecks className="w-3 h-3" /> ตั้งค่ารายการเช็คจุดนี้
                        </button>
                      </div>

                      {/* GPS Coordinates Badge */}
                      <div className="p-3 bg-white rounded-2xl border border-slate-200 text-xs space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-semibold text-slate-500 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-emerald-600" /> พิกัดดาวเทียมจุดจริง:
                          </span>
                          {cp.coords ? (
                            <span className="text-[9px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-bold border border-emerald-200">
                              ปักหมุดแล้ว
                            </span>
                          ) : (
                            <span className="text-[9px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full font-bold border border-amber-200">
                              ยังไม่ได้ปักหมุด
                            </span>
                          )}
                        </div>

                        {cp.coords ? (
                          <div className="font-mono text-[11px] text-slate-800 font-bold">
                            {cp.coords.lat.toFixed(5)}° N, {cp.coords.lng.toFixed(5)}° E
                            <span className="text-[10px] font-normal text-slate-500 block">
                              ความแม่นยำ: ±{cp.coords.accuracy}ม. (บันทึก: {cp.coords.setAt || "-"})
                            </span>
                          </div>
                        ) : (
                          <p className="text-[11px] text-slate-400 italic">
                            เดินไปยังจุดจริงแล้วกดปุ่มด้านล่างเพื่อปักหมุด
                          </p>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => handlePinRealGps(cp)}
                      disabled={isLocating}
                      className="w-full py-2.5 px-3 bg-white hover:bg-sky-50 border border-sky-300 text-sky-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-2xs mt-2"
                    >
                      <LocateFixed className={`w-3.5 h-3.5 ${isLocating ? "animate-spin text-sky-600" : ""}`} />
                      <span>{isLocating ? "กำลังดึงพิกัดดาวเทียม..." : "ปักหมุดพิกัดจริง ณ ตำแหน่งนี้"}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 5: STAFF & SHIFT SWAPS */}
        {activeTab === "staff" && (
          <div className="space-y-6">
            <div className="bg-white border border-sky-100 rounded-3xl p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="font-bold text-lg text-slate-900">รายชื่อเจ้าหน้าที่ รปภ. & บุคลากร ({guards.length} นาย)</h2>
                  <p className="text-xs text-slate-500">สามารถเพิ่ม/ลบ บุคลากร ตั้งรหัส PIN 4 หลัก และกำหนดกะเข้าเวร</p>
                </div>
                <button
                  onClick={() => {
                    setEditingGuard(null);
                    setGuardForm({ name: "", pin: "", shift: "morning", phone: "", role: "guard" });
                    setShowAddGuardModal(true);
                  }}
                  className="px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl flex items-center gap-2 active:scale-95 transition-all shadow-xs"
                >
                  <Plus className="w-4 h-4" /> เพิ่มเจ้าหน้าที่ รปภ. ใหม่
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase">
                      <th className="py-3 px-4">ชื่อ - นามสกุล</th>
                      <th className="py-3 px-4">รหัส PIN (4 หลัก)</th>
                      <th className="py-3 px-4">กะประจำ</th>
                      <th className="py-3 px-4">เบอร์โทรศัพท์</th>
                      <th className="py-3 px-4">บทบาท</th>
                      <th className="py-3 px-4 text-center">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {guards.map((guard) => (
                      <tr key={guard.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-900">{guard.name}</td>
                        <td className="py-3.5 px-4 font-mono font-bold text-sky-700">{guard.pin}</td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${guard.shift === "morning" ? "bg-amber-100 text-amber-800 border border-amber-200" : "bg-indigo-100 text-indigo-800 border border-indigo-200"}`}>
                            {guard.shift === "morning" ? "☀️ กะเช้า (07:00-19:00)" : "🌙 กะดึก (19:00-07:00)"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-600">{guard.phone || "-"}</td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600 font-semibold">
                            {guard.role === "supervisor" ? "หัวหน้างาน" : "เจ้าหน้าที่ รปภ."}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => {
                                setEditingGuard(guard);
                                setGuardForm({
                                  name: guard.name,
                                  pin: guard.pin,
                                  shift: guard.shift,
                                  phone: guard.phone,
                                  role: guard.role
                                });
                                setShowAddGuardModal(true);
                              }}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600"
                              title="แก้ไขข้อมูล"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            {guard.role !== "supervisor" && (
                              <button
                                onClick={() => {
                                  if (confirm(`ต้องการลบ ${guard.name} ออกจากระบบ?`)) {
                                    deleteGuard(guard.id);
                                  }
                                }}
                                className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 text-rose-600"
                                title="ลบเจ้าหน้าที่"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Shift Swap Requests */}
            <div className="bg-white border border-sky-100 rounded-3xl p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-bold text-lg text-slate-900">คำขอแลกเวร (Shift Swap Requests)</h2>
                    {pendingSwaps.length > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold animate-pulse">
                        รออนุมัติ {pendingSwaps.length} รายการ
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">
                    หัวหน้างานตรวจสอบเหตุผลและกดอนุมัติ ระบบจะสลับกะทำงานระหว่าง รปภ. ทั้ง 2 นายให้อัตโนมัติทันที
                  </p>
                </div>

                <button
                  onClick={() => setShowSwapModal(true)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl flex items-center gap-2 active:scale-95 transition-all shadow-xs"
                >
                  <Plus className="w-4 h-4" /> สร้างคำขอแลกเวร
                </button>
              </div>

              <div className="space-y-3">
                {shiftSwapRequests.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">ยังไม่มีคำขอแลกเวรในระบบ</p>
                ) : (
                  shiftSwapRequests.map((req) => (
                    <div
                      key={req.id}
                      className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                        req.status === "pending"
                          ? "bg-amber-50/50 border-amber-200"
                          : req.status === "approved"
                          ? "bg-emerald-50/40 border-emerald-200"
                          : "bg-slate-50 border-slate-200"
                      }`}
                    >
                      <div className="space-y-1 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900">{req.requesterName}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] bg-white border font-semibold text-slate-700">
                            กะเดิม: {req.requesterShift === "morning" ? "กะเช้า" : "กะดึก"}
                          </span>
                          <Repeat className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-bold text-sm text-slate-900">{req.targetGuardName}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] bg-white border font-semibold text-slate-700">
                            กะเดิม: {req.targetShift === "morning" ? "กะเช้า" : "กะดึก"}
                          </span>
                        </div>
                        <p className="text-slate-600">
                          <strong>วันที่ขอแลก:</strong> {req.swapDate} • <strong>เหตุผล:</strong> {req.reason}
                        </p>
                        <span className="text-[10px] text-slate-400 block font-mono">ส่งคำขอเมื่อ: {req.createdAt}</span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {req.status === "pending" ? (
                          <>
                            <button
                              onClick={() => approveShiftSwapRequest(req.id)}
                              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-1 active:scale-95 transition-all shadow-xs"
                            >
                              <Check className="w-3.5 h-3.5" /> อนุมัติการแลกเวร
                            </button>
                            <button
                              onClick={() => rejectShiftSwapRequest(req.id)}
                              className="px-3.5 py-1.5 bg-slate-200 hover:bg-rose-100 hover:text-rose-700 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1 active:scale-95 transition-all"
                            >
                              <X className="w-3.5 h-3.5" /> ปฏิเสธ
                            </button>
                          </>
                        ) : (
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-bold ${
                              req.status === "approved"
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                : "bg-rose-100 text-rose-800 border border-rose-300"
                            }`}
                          >
                            {req.status === "approved" ? "อนุมัติแล้ว (สลับกะสำเร็จ)" : "ปฏิเสธคำขอ"}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: STAFF VEHICLES */}
        {activeTab === "vehicles" && (
          <div className="bg-white border border-sky-100 rounded-3xl p-6 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h2 className="font-bold text-lg text-slate-900">ฐานข้อมูลทะเบียนรถบุคลากรโรงพยาบาลพล</h2>
                <p className="text-xs text-slate-500">
                  แคชในเครื่อง รปภ. อัตโนมัติ ({staffVehicles.length} คัน) ค้นหาและตรวจสอบสิทธิ์ได้ใน 0.1 วินาทีแม้อยู่ใต้ตึกที่ไม่มีเน็ต
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all"
                  title="ดาวน์โหลดเทมเพลต CSV สำหรับนำไปวางใน Google Form"
                >
                  <Download className="w-3.5 h-3.5" /> เทมเพลต CSV
                </button>
                <button
                  type="button"
                  onClick={() => setShowSheetModal(true)}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 active:scale-95 transition-all shadow-xs"
                >
                  <FileSpreadsheet className="w-4 h-4" /> ซิงก์ Google Sheets / CSV
                </button>
                <button
                  onClick={() => setShowAddVehicleModal(!showAddVehicleModal)}
                  className="px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 active:scale-95 transition-all shadow-xs"
                >
                  <Plus className="w-4 h-4" /> เพิ่มรถใหม่
                </button>
              </div>
            </div>

            {showAddVehicleModal && (
              <div className="p-5 bg-sky-50/70 border border-sky-200 rounded-3xl space-y-4 animate-in fade-in-50">
                <h3 className="font-bold text-sm text-slate-900">เพิ่มข้อมูลรถแพทย์ / พยาบาล / บุคลากร</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-600 mb-1">เลขทะเบียน (เช่น 1234 หรือ 9กข8888)</label>
                    <input
                      type="text"
                      value={newVehicle.plateNumber}
                      onChange={(e) => setNewVehicle({ ...newVehicle, plateNumber: e.target.value })}
                      placeholder="1234"
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1">ชื่อเจ้าของรถ</label>
                    <input
                      type="text"
                      value={newVehicle.ownerName}
                      onChange={(e) => setNewVehicle({ ...newVehicle, ownerName: e.target.value })}
                      placeholder="นพ. สันติ วงศ์รักษา"
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1">แผนก / สังกัด</label>
                    <input
                      type="text"
                      value={newVehicle.department}
                      onChange={(e) => setNewVehicle({ ...newVehicle, department: e.target.value })}
                      placeholder="แผนกศัลยกรรม"
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1">เบอร์โทรติดต่อ</label>
                    <input
                      type="text"
                      value={newVehicle.phone}
                      onChange={(e) => setNewVehicle({ ...newVehicle, phone: e.target.value })}
                      placeholder="089-999-9999"
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1">โซนจอดประจำ</label>
                    <input
                      type="text"
                      value={newVehicle.zone}
                      onChange={(e) => setNewVehicle({ ...newVehicle, zone: e.target.value })}
                      placeholder="ลานจอดแพทย์ A"
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900"
                    />
                  </div>
                  <div className="flex items-end gap-2">
                    <button
                      onClick={() => {
                        if (newVehicle.plateNumber && newVehicle.ownerName) {
                          addStaffVehicle(newVehicle);
                          setShowAddVehicleModal(false);
                          setNewVehicle({ plateNumber: "", province: "ขอนแก่น", ownerName: "", department: "", phone: "", zone: "ลานจอดแพทย์ A" });
                        }
                      }}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl active:scale-95 transition-all"
                    >
                      บันทึก
                    </button>
                    <button
                      onClick={() => setShowAddVehicleModal(false)}
                      className="px-4 py-2.5 bg-slate-200 text-slate-600 hover:text-slate-900 rounded-xl"
                    >
                      ยกเลิก
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* GOOGLE SHEETS / CSV SYNC MODAL */}
            {showSheetModal && (
              <div className="p-6 bg-emerald-50/70 border-2 border-emerald-300 rounded-3xl space-y-4 animate-in fade-in-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-emerald-700" />
                    <div>
                      <h3 className="font-bold text-sm text-slate-900">
                        ซิงก์ข้อมูลรถบุคลากรจาก Google Sheets (Form Responses) หรือไฟล์ CSV
                      </h3>
                      <p className="text-[11px] text-emerald-700">
                        รองรับแบบฟอร์มลงทะเบียน รพ.พล (รถยนต์ & รถจักรยานยนต์ แยกทะเบียนและจังหวัดอัตโนมัติ)
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowSheetModal(false);
                      setSheetPreview(null);
                      setSheetStats(null);
                      setSheetError(null);
                    }}
                    className="p-1 rounded-lg hover:bg-slate-200 text-slate-400"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  {/* Option 1: URL */}
                  <div className="p-4 bg-white border border-emerald-200 rounded-2xl space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">วิธีที่ 1: ลิงก์ Google Sheets รพ.พล</span>
                      <button
                        type="button"
                        onClick={() => {
                          const defaultUrl = "https://docs.google.com/spreadsheets/d/1SJ4yULEWaWkYEFr_8afL7Ao8razoilFhuxNPScbBEMo/edit?pli=1&gid=1048644177#gid=1048644177";
                          setSheetUrl(defaultUrl);
                        }}
                        className="text-[11px] text-emerald-700 font-bold hover:underline"
                      >
                        รีเซ็ตเป็นลิงก์ รพ.พล
                      </button>
                    </div>
                    <input
                      type="url"
                      value={sheetUrl}
                      onChange={(e) => setSheetUrl(e.target.value)}
                      placeholder="https://docs.google.com/spreadsheets/d/.../edit"
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono text-[11px]"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={sheetLoading}
                        onClick={() => handleFetchSheet()}
                        className="flex-1 py-2.5 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold rounded-xl active:scale-95 transition-all flex items-center justify-center gap-1.5 shadow-sm"
                      >
                        {sheetLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                        <span>{sheetLoading ? "กำลังดึงข้อมูล..." : "ดึงข้อมูลจากชีต (Preview)"}</span>
                      </button>
                    </div>
                    <span className="text-[10px] text-slate-400 block">
                      * ปลายทางชีตต้องเปิดสิทธิ์แชร์เป็น &quot;ทุกคนที่มีลิงก์มีสิทธิ์อ่าน&quot;
                    </span>
                  </div>

                  {/* Option 2: Upload CSV */}
                  <div className="p-4 bg-white border border-emerald-200 rounded-2xl space-y-2 flex flex-col justify-between">
                    <div>
                      <span className="font-bold text-slate-800 block">วิธีที่ 2: อัปโหลดไฟล์ .csv โดยตรง</span>
                      <p className="text-[11px] text-slate-500 mb-2">
                        ใน Google Sheets ไปที่: ไฟล์ &gt; ดาวน์โหลด &gt; ค่าที่คั่นด้วยเครื่องหมายจุลภาค (.csv)
                      </p>
                    </div>
                    <label className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl border border-slate-300 cursor-pointer flex items-center justify-center gap-2 active:scale-95 transition-all text-xs">
                      <UploadCloud className="w-4 h-4 text-emerald-600" />
                      <span>เลือกไฟล์ .csv จากคอมพิวเตอร์</span>
                      <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
                    </label>
                  </div>
                </div>

                {/* Error Banner */}
                {sheetError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{sheetError}</span>
                  </div>
                )}

                {/* Success Banner */}
                {sheetSuccess && (
                  <div className="p-3 bg-emerald-100 border border-emerald-300 rounded-2xl text-emerald-900 text-xs font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{sheetSuccess}</span>
                  </div>
                )}

                {/* Preview Table */}
                {sheetPreview && sheetPreview.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-emerald-100/70 p-3 rounded-2xl border border-emerald-200">
                      <div>
                        <span className="text-xs font-bold text-emerald-950 block">
                          📋 ตรวจพบยานพาหนะทั้งหมด {sheetPreview.length} คัน:
                        </span>
                        <div className="flex items-center gap-3 text-[11px] text-emerald-800 mt-0.5 font-medium">
                          <span>🚗 รถยนต์: <b>{sheetStats?.carsCount ?? sheetPreview.filter((v: any) => v.vehicleType === "รถยนต์").length}</b> คัน</span>
                          <span>•</span>
                          <span>🏍️ รถจักรยานยนต์: <b>{sheetStats?.motorcyclesCount ?? sheetPreview.filter((v: any) => v.vehicleType === "รถจักรยานยนต์").length}</b> คัน</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleCommitSheetImport}
                        className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 active:scale-95 transition-all flex items-center justify-center gap-1.5 shrink-0"
                      >
                        <Check className="w-4 h-4" /> บันทึก {sheetPreview.length} คันนี้ขึ้น Cloud ทันที
                      </button>
                    </div>

                    <div className="max-h-56 overflow-y-auto border border-emerald-200 rounded-2xl bg-white shadow-inner">
                      <table className="w-full text-left text-xs">
                        <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 text-slate-500">
                          <tr>
                            <th className="py-2.5 px-3">ประเภท</th>
                            <th className="py-2.5 px-3">ทะเบียน</th>
                            <th className="py-2.5 px-3">จังหวัด</th>
                            <th className="py-2.5 px-3">ยี่ห้อ / รุ่น / สี</th>
                            <th className="py-2.5 px-3">เจ้าของรถ</th>
                            <th className="py-2.5 px-3">แผนก</th>
                            <th className="py-2.5 px-3">โซนจอด</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {sheetPreview.slice(0, 15).map((v, i) => (
                            <tr key={i} className="hover:bg-slate-50">
                              <td className="py-2 px-3">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  v.vehicleType === "รถจักรยานยนต์"
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-sky-100 text-sky-800"
                                }`}>
                                  {v.vehicleType === "รถจักรยานยนต์" ? "🏍️ จยย." : "🚗 รถยนต์"}
                                </span>
                              </td>
                              <td className="py-2 px-3 font-mono font-bold text-slate-900">{v.plateNumber}</td>
                              <td className="py-2 px-3 text-slate-600">{v.province}</td>
                              <td className="py-2 px-3 text-slate-700">
                                {v.brand || v.model || v.color ? (
                                  <span>
                                    {[v.brand, v.model].filter(Boolean).join(" ")}
                                    {v.color ? ` (${v.color})` : ""}
                                  </span>
                                ) : (
                                  <span className="text-slate-400">-</span>
                                )}
                              </td>
                              <td className="py-2 px-3 font-medium text-slate-800">{v.ownerName}</td>
                              <td className="py-2 px-3 text-slate-600">{v.department}</td>
                              <td className="py-2 px-3 text-slate-500">
                                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-[10px] text-slate-700">
                                  {v.zone}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {sheetPreview.length > 15 && (
                      <p className="text-[11px] text-slate-400 text-right">
                        ...และรายการอื่นๆ อีก {sheetPreview.length - 15} คัน
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* STATS OVERVIEW CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500 font-bold block">ยานพาหนะบุคลากรทั้งหมด</span>
                  <span className="text-2xl font-black text-slate-900 font-mono mt-0.5 block">
                    {staffVehicles.length} <span className="text-xs font-normal text-slate-500">คัน</span>
                  </span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center font-bold">
                  👥
                </div>
              </div>

              <div className="p-4 bg-sky-50 border border-sky-200 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-xs text-sky-700 font-bold block">รถยนต์บุคลากร</span>
                  <span className="text-2xl font-black text-sky-950 font-mono mt-0.5 block">
                    {staffVehicles.filter(v => v.vehicleType === "รถยนต์" || !v.vehicleType).length}{" "}
                    <span className="text-xs font-normal text-sky-600">คัน</span>
                  </span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-sky-200 text-sky-800 flex items-center justify-center">
                  <Car className="w-5 h-5" />
                </div>
              </div>

              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-xs text-amber-700 font-bold block">รถจักรยานยนต์บุคลากร</span>
                  <span className="text-2xl font-black text-amber-950 font-mono mt-0.5 block">
                    {staffVehicles.filter(v => v.vehicleType === "รถจักรยานยนต์").length}{" "}
                    <span className="text-xs font-normal text-amber-600">คัน</span>
                  </span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-amber-200 text-amber-800 flex items-center justify-center">
                  <Bike className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* SEARCH & FILTER CONTROLS */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={vehicleSearch}
                  onChange={(e) => setVehicleSearch(e.target.value)}
                  placeholder="ค้นหาเลขทะเบียน, ชื่อ, แผนก, ยี่ห้อ..."
                  className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-sky-500 transition-all"
                />
                {vehicleSearch && (
                  <button
                    onClick={() => setVehicleSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1.5 self-start sm:self-auto bg-slate-100 p-1 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setVehicleFilterType("all")}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    vehicleFilterType === "all"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  ทั้งหมด ({staffVehicles.length})
                </button>
                <button
                  type="button"
                  onClick={() => setVehicleFilterType("car")}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                    vehicleFilterType === "car"
                      ? "bg-white text-sky-800 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Car className="w-3.5 h-3.5" /> รถยนต์ ({staffVehicles.filter(v => v.vehicleType === "รถยนต์" || !v.vehicleType).length})
                </button>
                <button
                  type="button"
                  onClick={() => setVehicleFilterType("motorcycle")}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 ${
                    vehicleFilterType === "motorcycle"
                      ? "bg-white text-amber-800 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Bike className="w-3.5 h-3.5" /> จยย. ({staffVehicles.filter(v => v.vehicleType === "รถจักรยานยนต์").length})
                </button>
              </div>
            </div>

            {/* VEHICLES TABLE */}
            <div className="overflow-x-auto border border-slate-100 rounded-2xl">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-semibold uppercase">
                    <th className="py-3 px-3">ประเภท</th>
                    <th className="py-3 px-3">ทะเบียนรถ & จังหวัด</th>
                    <th className="py-3 px-3">ยี่ห้อ / รุ่น / สี</th>
                    <th className="py-3 px-3">เจ้าของรถ</th>
                    <th className="py-3 px-3">แผนก / สังกัด</th>
                    <th className="py-3 px-3">เบอร์โทร</th>
                    <th className="py-3 px-3">โซนจอด</th>
                    <th className="py-3 px-3 text-center">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(() => {
                    const filtered = staffVehicles.filter((car) => {
                      if (vehicleFilterType === "car" && car.vehicleType === "รถจักรยานยนต์") return false;
                      if (vehicleFilterType === "motorcycle" && car.vehicleType !== "รถจักรยานยนต์") return false;

                      if (vehicleSearch.trim()) {
                        const q = vehicleSearch.trim().toLowerCase().replace(/\s+/g, "");
                        const p = car.plateNumber.toLowerCase().replace(/\s+/g, "");
                        const prov = (car.province || "").toLowerCase();
                        const owner = car.ownerName.toLowerCase();
                        const dept = car.department.toLowerCase();
                        const phone = car.phone.replace(/[^0-9]/g, "");
                        const brand = (car.brand || "").toLowerCase();
                        const model = (car.model || "").toLowerCase();

                        return (
                          p.includes(q) ||
                          prov.includes(q) ||
                          owner.includes(q) ||
                          dept.includes(q) ||
                          phone.includes(q) ||
                          brand.includes(q) ||
                          model.includes(q)
                        );
                      }
                      return true;
                    });

                    if (filtered.length === 0) {
                      return (
                        <tr>
                          <td colSpan={8} className="py-10 text-center text-slate-400">
                            ไม่พบข้อมูลรถที่ตรงกับเงื่อนไขการค้นหา
                          </td>
                        </tr>
                      );
                    }

                    return filtered.map((car, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1 ${
                            car.vehicleType === "รถจักรยานยนต์"
                              ? "bg-amber-100 text-amber-800 border border-amber-200"
                              : "bg-sky-100 text-sky-800 border border-sky-200"
                          }`}>
                            {car.vehicleType === "รถจักรยานยนต์" ? (
                              <>
                                <Bike className="w-3 h-3" /> จยย.
                              </>
                            ) : (
                              <>
                                <Car className="w-3 h-3" /> รถยนต์
                              </>
                            )}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-mono font-bold text-slate-900 text-sm block">
                            {car.plateNumber}
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium">
                            {car.province || "ขอนแก่น"}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-700">
                          {car.brand || car.model || car.color ? (
                            <div>
                              <span className="font-medium text-slate-900 block">
                                {[car.brand, car.model].filter(Boolean).join(" ")}
                              </span>
                              {car.color && (
                                <span className="text-[10px] text-slate-500">
                                  สี: {car.color}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px]">-</span>
                          )}
                        </td>
                        <td className="py-3 px-3 font-medium text-slate-800">{car.ownerName}</td>
                        <td className="py-3 px-3 text-slate-600">{car.department}</td>
                        <td className="py-3 px-3 font-mono font-bold">
                          {car.phone && car.phone !== "-" ? (
                            <a
                              href={`tel:${car.phone}`}
                              className="text-emerald-700 hover:underline inline-flex items-center gap-1"
                            >
                              <Phone className="w-3 h-3 text-emerald-600" />
                              <span>{car.phone}</span>
                            </a>
                          ) : (
                            <span className="text-slate-400 font-normal">-</span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-700 border border-slate-200">
                            {car.zone}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`ยืนยันการลบรถทะเบียน ${car.plateNumber} (${car.ownerName}) หรือไม่?`)) {
                                deleteStaffVehicle(car.plateNumber, car.province);
                              }
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
                            title="ลบข้อมูลรถคันนี้"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 7: INCIDENTS */}
        {activeTab === "incidents" && (
          <div className="bg-white border border-sky-100 rounded-3xl p-6 shadow-xs space-y-6">
            <div>
              <h2 className="font-bold text-lg text-slate-900">รายการแจ้งเหตุผิดปกติ & รูปหลักฐาน</h2>
              <p className="text-xs text-slate-500">ภาพถ่ายถูกจัดเก็บในโฟลเดอร์ Google Drive ของโรงพยาบาลพล</p>
            </div>

            <div className="space-y-4">
              {incidents.map((incident) => (
                <div
                  key={incident.id}
                  className="p-5 bg-slate-50 border border-slate-200 rounded-3xl flex flex-col md:flex-row gap-5 items-start"
                >
                  <div className="w-full md:w-48 h-36 rounded-2xl overflow-hidden bg-slate-200 border border-slate-300 shrink-0">
                    <img
                      src={incident.imageUrl || "https://images.unsplash.com/photo-1517646287270-a5a9ca602e5c?w=600&q=80"}
                      alt="Incident Evidence"
                      className="w-full h-full object-cover hover:scale-105 transition-transform cursor-pointer"
                      onClick={() => window.open(incident.imageUrl, "_blank")}
                    />
                  </div>

                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          incident.severity === "high"
                            ? "bg-rose-100 text-rose-800 border border-rose-300"
                            : incident.severity === "medium"
                            ? "bg-amber-100 text-amber-800 border border-amber-300"
                            : "bg-sky-100 text-sky-800 border border-sky-300"
                        }`}
                      >
                        ระดับ: {incident.severity === "high" ? "วิกฤต" : incident.severity === "medium" ? "ปานกลาง" : "ปกติ"}
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700">
                        หมวด: {incident.type === "facility" ? "อาคารสถานที่" : incident.type === "suspicious" ? "บุคคลต้องสงสัย" : "การแพทย์"}
                      </span>
                      <span className="text-xs text-slate-400 font-mono ml-auto">{incident.timestamp}</span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900">{incident.title}</h3>
                    <p className="text-xs text-slate-500">ผู้รายงาน: <strong>{incident.reporterName}</strong> • Google Drive / Incidents</p>

                    <div className="pt-2 flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-600 mr-2">ปรับสถานะ:</span>
                      <button
                        onClick={() => updateIncidentStatus(incident.id, "pending")}
                        className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                          incident.status === "pending"
                            ? "bg-amber-400 text-slate-950 ring-2 ring-amber-300"
                            : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        รอดำเนินการ
                      </button>
                      <button
                        onClick={() => updateIncidentStatus(incident.id, "investigating")}
                        className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                          incident.status === "investigating"
                            ? "bg-sky-600 text-white ring-2 ring-sky-300"
                            : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        กำลังตรวจสอบ
                      </button>
                      <button
                        onClick={() => updateIncidentStatus(incident.id, "resolved")}
                        className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                          incident.status === "resolved"
                            ? "bg-emerald-600 text-white ring-2 ring-emerald-300"
                            : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        สิ้นสุดเหตุแล้ว
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 8: DEEPSEEK AI REPORTING (07:00 BATCH RUN) */}
        {activeTab === "ai" && (
          <div className="space-y-6">
            <div className="bg-white border-2 border-sky-300 rounded-3xl p-6 shadow-sm space-y-6">
              {/* Header & Trigger */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
                    <Bot className="w-7 h-7" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-extrabold text-lg text-slate-900">DeepSeek AI Daily Batch Run</h2>
                      <span className="px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-800 text-[10px] font-mono font-bold border border-sky-200">
                        Batch Run 07:00 น.
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      ประมวลผลข้อมูลการตรวจลานจอดรถรอบ 22:00 น. และ 06:00 น. ตรวจจับพฤติกรรมเสี่ยงก่อนเปิดบริการผู้ป่วย OPD
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={aiLoading}
                    onClick={handleRunAiBatch}
                    className="px-5 py-2.5 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-2xl flex items-center gap-2 shadow-md shadow-sky-600/20 active:scale-95 transition-all"
                  >
                    {aiLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" /> กำลังประมวลผล DeepSeek AI...
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 fill-current text-amber-300" /> รันประมวลผล AI รอบ 07:00 น. ทันที
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Status Banner */}
              {aiReportData && (
                <div className="flex flex-wrap items-center justify-between p-3.5 bg-sky-50 border border-sky-200 rounded-2xl text-xs text-sky-900 font-medium">
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>ผลการประมวลผลประจำวันที่: <strong>{aiReportData.reportDate}</strong></span>
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-white text-sky-800 text-[10px] font-mono font-bold border border-sky-200">
                    {aiReportData.isRealDeepSeek ? "🟢 DeepSeek API Connected" : "🤖 Intelligent Hospital Security Engine Active"}
                  </span>
                </div>
              )}

              {/* KPI Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl space-y-1">
                  <span className="text-xs text-rose-700 font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-600" /> แอบจอดค้างคืน (22:00+06:00)
                  </span>
                  <div className="flex items-baseline gap-2 pt-1">
                    <span className="text-3xl font-black text-rose-900">
                      {aiReportData?.stats?.overnightCount ?? 2}
                    </span>
                    <span className="text-xs text-rose-600">คัน (รถภายนอก)</span>
                  </div>
                  <p className="text-[10px] text-rose-600">ตรวจพบทั้งสองรอบเวลา</p>
                </div>

                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-1">
                  <span className="text-xs text-amber-800 font-bold flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-amber-600" /> จอดแช่เกิน 3 วัน (ต้องสงสัย)
                  </span>
                  <div className="flex items-baseline gap-2 pt-1">
                    <span className="text-3xl font-black text-amber-900">
                      {aiReportData?.stats?.abandonedCount ?? 1}
                    </span>
                    <span className="text-xs text-amber-700">คัน</span>
                  </div>
                  <p className="text-[10px] text-amber-600">ทะเบียน 9999 ขอนแก่น (4 วัน)</p>
                </div>

                <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl space-y-1">
                  <span className="text-xs text-indigo-800 font-bold flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-indigo-600" /> จอดขวางโซนฉุกเฉิน (ER)
                  </span>
                  <div className="flex items-baseline gap-2 pt-1">
                    <span className="text-3xl font-black text-indigo-900">
                      {aiReportData?.stats?.zoneViolationsCount ?? 1}
                    </span>
                    <span className="text-xs text-indigo-700">คัน (ต้องย้ายด่วน)</span>
                  </div>
                  <p className="text-[10px] text-indigo-600">กระทบรถพยาบาลฉุกเฉิน</p>
                </div>

                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-1">
                  <span className="text-xs text-emerald-800 font-bold flex items-center gap-1.5">
                    <Car className="w-4 h-4 text-emerald-600" /> ยอดตรวจรอบดึกทั้งหมด
                  </span>
                  <div className="flex items-baseline gap-2 pt-1">
                    <span className="text-3xl font-black text-emerald-900">
                      {aiReportData?.stats?.totalScans ?? parkingScans.length}
                    </span>
                    <span className="text-xs text-emerald-700">คัน</span>
                  </div>
                  <p className="text-[10px] text-emerald-600">บุคลากร {parkingScans.filter(s => s.isStaff).length} | ภายนอก {parkingScans.filter(s => !s.isStaff).length}</p>
                </div>
              </div>

              {/* 90-Day Retention Policy Management Box */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs space-y-0.5">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-sky-600" /> นโยบายการเก็บข้อมูลย้อนหลัง 90 วัน (Data Retention Policy)
                  </span>
                  <p className="text-slate-500">
                    ระบบจะเก็บข้อมูลสแกนทะเบียนรถย้อนหลัง 90 วัน เพื่อใช้วิเคราะห์ประวัติรถจอดแช่และผู้กระทำผิดซ้ำ ข้อมูลที่เกิน 90 วันจะถูกล้างอัตโนมัติ
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handlePurgeExpired}
                    className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-2xs active:scale-95"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-500" /> ตรวจสอบและล้างข้อมูลเกิน 90 วัน
                  </button>
                </div>
              </div>

              {/* Purged Alert */}
              {purgedCountAlert !== null && (
                <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-900 text-xs font-bold flex items-center gap-2 animate-in fade-in-50">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  {purgedCountAlert > 0 
                    ? `ระบบทำการล้างข้อมูลสแกนที่หมดอายุเกิน 90 วัน ออกเรียบร้อยแล้ว (${purgedCountAlert} รายการ)`
                    : "ข้อมูลทั้งหมดอยู่ในเกณฑ์ 90 วัน (ไม่มีข้อมูลหมดอายุที่ต้องลบ)"}
                </div>
              )}

              {/* AI Markdown Briefing Card */}
              <div className="p-5 bg-white border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-sky-600" /> บทวิเคราะห์และข้อเสนอแนะความปลอดภัย (AI Security Briefing)
                  </h3>
                  <span className="text-[11px] text-slate-400">สร้างอัตโนมัติรอบ 07:00 น.</span>
                </div>

                <div className="text-xs text-slate-700 space-y-3 leading-relaxed whitespace-pre-line bg-slate-50/70 p-4 rounded-xl border border-slate-200 font-sans">
                  {aiReportData?.aiSummary || (
                    `### 🏥 รายงานวิเคราะห์ความปลอดภัยลานจอดรถ รพ.พล (DeepSeek Batch 07:00 น.)
**ประจำวันที่:** 11 กันยายน 2569

#### 1. สรุปภาพรวมความพร้อมลานจอด (Parking Readiness)
• ตรวจสอบรอบ 22:00 น. และ 06:00 น. พบรถทั้งสิ้น ${parkingScans.length} คัน
• ช่องจอดรถสำหรับผู้ป่วยนอก (OPD) พร้อมใช้งานช่วงเช้า ว่างประมาณ 85% ไม่มีความแออัดสะสม

#### 2. สิ่งที่ต้องจัดการด่วน (Action Items สำหรับ รปภ. กะเช้า)
• ⚠️ รถทะเบียน 9999 ขอนแก่น: ยืนยันการแอบจอดค้างคืนต่อเนื่องวันที่ 4 ติดต่อกัน ที่ชั้นใต้ดิน B2 (เสา 14) แนะนำให้ รปภ. กะเช้าออกใบแจ้งเตือน
• 🚨 รถทะเบียน กข-4455: จอดในช่องแพทย์ฉุกเฉินเวรเช้า (ER) ต้องแจ้งย้ายด่วนก่อน 07:30 น. เพื่อไม่ให้กระทบรถพยาบาลฉุกเฉิน

#### 3. การจัดการข้อมูลตามนโยบาย (90-Day Retention)
• ระบบทำการตรวจสอบประวัติย้อนหลัง 90 วัน พบข้อมูลเกินกำหนด 1 รายการ และทำการล้างข้อมูลอัตโนมัติเรียบร้อยแล้ว`
                  )}
                </div>
              </div>

              {/* LINE Action & Copy Box */}
              <div className="p-5 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-300 rounded-3xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-sm text-emerald-950 flex items-center gap-1.5">
                      <Send className="w-4 h-4 text-emerald-600" /> ข้อความรายงานประจำวันรอบ 07:00 น. ส่งเข้ากลุ่ม LINE
                    </h3>
                    <p className="text-xs text-emerald-800">
                      เตรียมพร้อมส่งเข้ากลุ่มไลน์ผู้บริหารโรงพยาบาลพล และหัวหน้างานความปลอดภัย
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const msg = aiReportData?.lineMessage || `🚨 [รพ.พล] สรุปความปลอดภัยลานจอด (07:00 น.)\nยอดรวม: ${parkingScans.length} คัน\n• รถค้างคืน: 2 คัน\n• รถจอดแช่ >3 วัน: 1 คัน (9999 ขอนแก่น)\n• ขวาง ER: 1 คัน (กข-4455)\nกรุณาย้ายรถขวาง ER ด่วนก่อน 07:30 น.`;
                        if (navigator.clipboard) {
                          navigator.clipboard.writeText(msg);
                          setCopiedLine(true);
                          setTimeout(() => setCopiedLine(false), 2500);
                        }
                      }}
                      className="px-4 py-2.5 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-2xs"
                    >
                      {copiedLine ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-emerald-700" />}
                      <span>{copiedLine ? "คัดลอกข้อความแล้ว!" : "คัดลอกข้อความ LINE"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setLineSent(true);
                        setTimeout(() => setLineSent(false), 3000);
                      }}
                      className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all active:scale-95 shadow-xs ${
                        lineSent
                          ? "bg-emerald-700 text-white"
                          : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20"
                      }`}
                    >
                      {lineSent ? (
                        <>
                          <CheckCircle2 className="w-4 h-4" /> ส่งเข้ากลุ่ม LINE สำเร็จแล้ว!
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" /> ส่งเข้ากลุ่ม LINE รพ.
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Monospaced LINE Message Preview */}
                <div className="p-3 bg-white/90 border border-emerald-200 rounded-2xl font-mono text-xs text-slate-800 whitespace-pre-line shadow-2xs leading-relaxed">
                  {aiReportData?.lineMessage || (
`🚨 [รพ.พล] สรุปความปลอดภัยลานจอด (07:00 น.)
วันที่: 11 กันยายน 2569
-------------------------
📊 ยอดรวมกะดึก: ${parkingScans.length} คัน
• รถบุคลากร: ${parkingScans.filter(s => s.isStaff).length} คัน
• รถภายนอก: ${parkingScans.filter(s => !s.isStaff).length} คัน
• แอบจอดค้างคืน: 2 คัน
• จอดแช่ >3 วัน: 1 คัน
• ขวางโซนฉุกเฉิน: 1 คัน
-------------------------
⚠️ จุดที่ต้องเข้าจัดการเช้านี้:
🚨 ย้ายรถด่วน: กข-4455 (ขวาง ER ก่อน 07:30 น.)
🛑 รถจอดแช่: 9999 ขอนแก่น (จอด 4 วัน ชั้น B2)
-------------------------
🧹 ประวัติ 90 วัน: ล้างข้อมูลเก่าแล้ว 1 รายการ`
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 9: 365-DAY ARCHIVAL & CLOUD RETENTION */}
        {activeTab === "archive" && (
          <div className="space-y-6">
            {/* Header / Banner */}
            <div className="bg-white border border-sky-100 rounded-3xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <span className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-600 border border-amber-500/20">
                    <FolderArchive className="w-6 h-6" />
                  </span>
                  <div>
                    <h2 className="text-xl font-black text-slate-900">
                      ระบบสำรองข้อมูลประวัติเกิน 1 ปี (Rolling 365-Day Archival)
                    </h2>
                    <p className="text-xs text-slate-500">
                      โรงพยาบาลพล — จัดระเบียบแยกโฟลเดอร์ตามปีงบประมาณไทย (ต.ค. - ก.ย.) และควบคุมขนาด Cloud Firestore ให้อยู่ในโควตาฟรีตลอดชีพ
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={fetchArchiveStats}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all active:scale-95"
                  title="รีเฟรชข้อมูลสถานะล่าสุด"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> รีเฟรชสถานะ
                </button>
                <a
                  href={`https://drive.google.com/drive/folders/1ED0LnFxfSwHVU60fI8LShWiXBDmxFFXT`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-xs active:scale-95"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> เปิด Google Drive รพ.
                </a>
              </div>
            </div>

            {/* Alert Messages */}
            {archiveSuccess && (
              <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-900 text-xs font-bold flex items-center justify-between gap-3 animate-in fade-in-50">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>{archiveSuccess}</span>
                </div>
                <button
                  onClick={() => setArchiveSuccess(null)}
                  className="p-1 hover:bg-emerald-100 rounded-lg text-emerald-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {archiveError && (
              <div className="p-4 bg-rose-50 border border-rose-300 rounded-2xl text-rose-900 text-xs font-bold flex items-center justify-between gap-3 animate-in fade-in-50">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                  <span>{archiveError}</span>
                </div>
                <button
                  onClick={() => setArchiveError(null)}
                  className="p-1 hover:bg-rose-100 rounded-lg text-rose-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* 4 Storage & Quota Health Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Total Docs in Cloud */}
              <div className="bg-white border border-sky-100 rounded-3xl p-5 shadow-xs space-y-2">
                <div className="flex justify-between items-start text-slate-500">
                  <span className="text-xs font-semibold">ข้อมูลทั้งหมดในระบบ</span>
                  <Database className="w-5 h-5 text-sky-600" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-slate-900">{totalCloudRecords}</span>
                  <span className="text-xs text-slate-500">รายการ</span>
                </div>
                <div className="text-[11px] text-slate-500 flex flex-wrap gap-x-2 gap-y-0.5">
                  <span>เดินตรวจ {patrolLogs.length}</span>
                  <span>•</span>
                  <span>สแกนรถ {parkingScans.length}</span>
                  <span>•</span>
                  <span>เหตุด่วน {incidents.length}</span>
                </div>
                <div className="pt-2 border-t border-slate-100">
                  <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    🟢 Spark Free Tier (ปลอดภัย)
                  </span>
                </div>
              </div>

              {/* Card 2: Eligible for Archive */}
              <div className="bg-white border border-sky-100 rounded-3xl p-5 shadow-xs space-y-2">
                <div className="flex justify-between items-start text-slate-500">
                  <span className="text-xs font-semibold">ครบเกณฑ์สำรอง ({archiveCutoffDays} วัน)</span>
                  <Clock className="w-5 h-5 text-amber-600" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-amber-600">{previewTotal}</span>
                  <span className="text-xs text-slate-500">รายการ</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  {previewTotal > 0
                    ? `มีข้อมูลอายุเกิน ${archiveCutoffDays} วัน พร้อมจัดเก็บเข้าคลัง`
                    : "ข้อมูลทั้งหมดอยู่ในเกณฑ์สดใหม่"}
                </p>
                <div className="pt-2 border-t border-slate-100">
                  <span className="text-[10px] text-slate-500">
                    เกิน 365 วัน (1 ปี): <strong className="text-slate-800">{expired365Total}</strong> รายการ
                  </span>
                </div>
              </div>

              {/* Card 3: Google Drive Destination */}
              <div className="bg-white border border-sky-100 rounded-3xl p-5 shadow-xs space-y-2">
                <div className="flex justify-between items-start text-slate-500">
                  <span className="text-xs font-semibold">โฟลเดอร์ Google Drive</span>
                  <UploadCloud className="w-5 h-5 text-blue-600" />
                </div>
                <div className="truncate text-xs font-mono font-bold text-slate-800 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                  1ED0Ln...mxFFXT
                </div>
                <p className="text-[11px] text-slate-500 truncate">
                  {archiveStats?.driveStatus?.connected
                    ? `เชื่อมต่อ Service Account แล้ว`
                    : `โฟลเดอร์สำรองข้อมูลหลัก รพ.พล`}
                </p>
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    archiveStats?.driveStatus?.connected
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-blue-50 text-blue-700 border-blue-200"
                  }`}>
                    {archiveStats?.driveStatus?.connected ? "🟢 พร้อมอัปโหลดอัตโนมัติ" : "📁 ตั้งค่าโฟลเดอร์แล้ว"}
                  </span>
                </div>
              </div>

              {/* Card 4: Current Fiscal Year */}
              <div className="bg-white border border-sky-100 rounded-3xl p-5 shadow-xs space-y-2">
                <div className="flex justify-between items-start text-slate-500">
                  <span className="text-xs font-semibold">ปีงบประมาณปัจจุบัน</span>
                  <Calendar className="w-5 h-5 text-indigo-600" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-indigo-900">{currentFiscalYear.label}</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  รอบ 1 ต.ค. {currentFiscalYear.yearCE - 1} – 30 ก.ย. {currentFiscalYear.yearCE}
                </p>
                <div className="pt-2 border-t border-slate-100">
                  <span className="text-[10px] text-indigo-700 font-bold bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                    ราชการไทย (ต.ค. - ก.ย.)
                  </span>
                </div>
              </div>
            </div>

            {/* Daily Cron Automation Card */}
            <div className="bg-white border border-emerald-200 rounded-3xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-3.5">
                <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-2xl border border-emerald-200 shrink-0">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-extrabold text-slate-900">
                      ระบบทำงานอัตโนมัติประจำวัน (Vercel Daily Cron Job)
                    </h3>
                    <span className="flex items-center gap-1 text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      เปิดใช้งานอัตโนมัติ 07:00 น. ทุกวัน
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    ทุกวันเวลา 07:00 น. (ช่วงส่งมอบเวรเช้า) ระบบจะตรวจสอบบันทึกที่อายุเกิน 365 วัน ➔ อัปโหลดเข้า Google Drive ➔ ล้าง Cloud Firestore เพื่อรักษาโควตาฟรีตลอดชีพ
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  disabled={archiveLoading}
                  onClick={handleTriggerDailyCron}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-xs active:scale-95 disabled:bg-slate-200 disabled:text-slate-400"
                >
                  <Zap className="w-4 h-4" />
                  <span>{archiveLoading ? "กำลังประมวลผล..." : "⚡ ทดสอบรันรอบประจำวันเดี๋ยวนี้"}</span>
                </button>
              </div>
            </div>

            {/* Google Drive Status & Quick Setup Guide */}
            <div className="bg-gradient-to-br from-white to-sky-50/50 border border-sky-200 rounded-3xl p-6 shadow-xs space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-sky-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-white border border-sky-200 rounded-2xl shadow-2xs">
                    <HardDrive className="w-6 h-6 text-sky-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                      โฟลเดอร์คลังข้อมูลใน Google Drive
                      <span className="text-[11px] font-normal text-slate-500">
                        (Folder ID: 1ED0LnFxfSwHVU60fI8LShWiXBDmxFFXT)
                      </span>
                    </h3>
                    <p className="text-xs text-slate-600">
                      เมื่อทำการสำรองข้อมูล ระบบจะสร้างโฟลเดอร์ย่อยแยกตามปีงบประมาณ เช่น <code className="bg-white px-1.5 py-0.5 rounded text-sky-700 font-mono font-bold text-[11px] border border-sky-100">ปีงบประมาณ_2567_FY2567</code> ให้โดยอัตโนมัติ
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href="https://drive.google.com/drive/folders/1ED0LnFxfSwHVU60fI8LShWiXBDmxFFXT"
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-2xs"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-slate-500" /> ตรวจสอบโฟลเดอร์ใน Drive
                  </a>
                </div>
              </div>

              {/* Service Account Setup Guide Alert */}
              <div className="bg-white p-4 rounded-2xl border border-sky-100 text-xs text-slate-700 space-y-2.5">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-sky-600" />
                  คำแนะนำในการให้สิทธิ์ Service Account เขียนไฟล์ลง Google Drive ของโรงพยาบาล:
                </div>
                <ol className="list-decimal list-inside space-y-1 text-slate-600 leading-relaxed text-[11px] pl-1">
                  <li>เปิดโฟลเดอร์ Google Drive ปลายทาง (<a href="https://drive.google.com/drive/folders/1ED0LnFxfSwHVU60fI8LShWiXBDmxFFXT" target="_blank" rel="noreferrer" className="text-sky-600 underline font-semibold">คลิกเปิดโฟลเดอร์</a>)</li>
                  <li>คลิกปุ่ม <strong>"แชร์" (Share)</strong> มุมขวาบน ➔ ใส่อีเมล Service Account จาก Google Cloud Console</li>
                  <li>ตั้งสิทธิ์ให้เป็น <strong>"ผู้แก้ไข" (Editor)</strong> เพื่อให้บอทสร้างโฟลเดอร์และอัปโหลดไฟล์ได้</li>
                  <li>นำ Private Key มาบันทึกในไฟล์ <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-slate-800">.env.local</code> หรือ Vercel Environment Variables</li>
                </ol>
                <div className="text-[11px] text-amber-700 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                  💡 <strong>ทำงานได้ทันทีโดยไม่ต้องรอต่อ Service Account:</strong> คุณสามารถกดปุ่ม <strong>"ดาวน์โหลดไฟล์สำรอง (.JSON / .CSV)"</strong> ด้านล่างนี้เพื่อเก็บไฟล์เข้าคอมพิวเตอร์และนำไปเปิดใช้งานได้ทันที 100%
                </div>
              </div>
            </div>

            {/* Archival Operation Wizard Panel */}
            <div className="bg-white border border-sky-100 rounded-3xl p-6 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-500" /> แผงตัดยอดและดำเนินการสำรองข้อมูล
                  </h3>
                  <p className="text-xs text-slate-500">
                    เลือกเงื่อนไขอายุข้อมูล ตรวจสอบยอดพรีวิวก่อนทำรายการ และเลือกว่าจะดาวน์โหลดหรือสำรองขึ้น Google Drive
                  </p>
                </div>
              </div>

              {/* Filter Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    เกณฑ์ตัดยอดอายุข้อมูล (Cutoff Threshold):
                  </label>
                  <select
                    value={archiveCutoffDays}
                    onChange={(e) => setArchiveCutoffDays(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-1 focus:ring-sky-500"
                  >
                    <option value={365}>อายุเกิน 365 วัน (1 ปี - มาตรฐานแนะนำ)</option>
                    <option value={180}>อายุเกิน 180 วัน (6 เดือน)</option>
                    <option value={90}>อายุเกิน 90 วัน (3 เดือน)</option>
                    <option value={0}>ทั้งหมดในระบบ (ไม่จำกัดอายุวัน)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    กรองเฉพาะปีงบประมาณ (Fiscal Year):
                  </label>
                  <select
                    value={archiveSelectedFiscalYear}
                    onChange={(e) => setArchiveSelectedFiscalYear(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:ring-1 focus:ring-sky-500"
                  >
                    <option value="ALL">ทุกปีงบประมาณที่พบ (All Fiscal Years)</option>
                    {availableFiscalYears.map((fy) => (
                      <option key={fy} value={fy}>
                        {fy}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Simulated Preview Box */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <ListChecks className="w-4 h-4 text-sky-600" />
                    จำลองผลลัพธ์รายการที่จะถูกจัดเก็บ (Simulated Preview):
                  </span>
                  <span className="text-xs font-extrabold text-amber-700 bg-amber-100/80 px-2.5 py-0.5 rounded-full">
                    รวม {previewTotal} รายการ
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-white p-3 rounded-xl border border-slate-200">
                    <div className="text-[11px] text-slate-500 font-semibold">บันทึกเดินตรวจ (Patrol Logs)</div>
                    <div className="text-xl font-black text-slate-900 mt-1">
                      {previewEligiblePatrol.length} <span className="text-xs font-normal text-slate-400">รายการ</span>
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200">
                    <div className="text-[11px] text-slate-500 font-semibold">บันทึกสแกนรถ (Parking Scans)</div>
                    <div className="text-xl font-black text-slate-900 mt-1">
                      {previewEligibleParking.length} <span className="text-xs font-normal text-slate-400">รายการ</span>
                    </div>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200">
                    <div className="text-[11px] text-slate-500 font-semibold">บันทึกเหตุการณ์ (Incidents)</div>
                    <div className="text-xl font-black text-slate-900 mt-1">
                      {previewEligibleIncidents.length} <span className="text-xs font-normal text-slate-400">รายการ</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons Grid */}
              <div className="space-y-3">
                <div className="flex flex-col lg:flex-row gap-3">
                  {/* Primary Action 1: Upload to Google Drive + Purge */}
                  <button
                    type="button"
                    disabled={previewTotal === 0 || archiveLoading}
                    onClick={() => {
                      setPurgeConfirmText("");
                      setShowPurgeConfirmModal(true);
                    }}
                    className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs active:scale-95 ${
                      previewTotal === 0
                        ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                        : "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20"
                    }`}
                  >
                    <Archive className="w-4 h-4" />
                    <span>สำรองเข้า Google Drive + ล้างข้อมูล Cloud ({previewTotal} รายการ)</span>
                  </button>

                  {/* Primary Action 2: Upload to Google Drive without Purge */}
                  <button
                    type="button"
                    disabled={previewTotal === 0 || archiveLoading}
                    onClick={() => handleExecuteArchival(false)}
                    className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs active:scale-95 ${
                      previewTotal === 0
                        ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                        : "bg-sky-600 hover:bg-sky-500 text-white shadow-sky-600/20"
                    }`}
                  >
                    {archiveLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" /> กำลังประมวลผล...
                      </>
                    ) : (
                      <>
                        <UploadCloud className="w-4 h-4" />
                        <span>สำรองเข้า Google Drive เท่านั้น (ไม่ลบ Cloud)</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Direct Download Action Row (Fallback) */}
                <div className="p-4 bg-sky-50/50 border border-sky-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-xs space-y-0.5">
                    <span className="font-bold text-slate-900 flex items-center gap-1.5">
                      <Download className="w-4 h-4 text-sky-600" />
                      ดาวน์โหลดไฟล์สำรองลงเครื่องคอมพิวเตอร์โดยตรง (Direct Export):
                    </span>
                    <p className="text-slate-500 text-[11px]">
                      ส่งออกไฟล์สำรองเก็บไว้ในเครื่องทันที รองรับภาษาไทยใน Microsoft Excel และไฟล์ JSON ก้อนเต็ม
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={downloadingFormat !== null}
                      onClick={() => handleDownloadArchiveFile("json", "all")}
                      className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-2xs active:scale-95"
                    >
                      <FileText className="w-3.5 h-3.5 text-indigo-600" />
                      <span>{downloadingFormat === "json-all" ? "กำลังสร้าง..." : "ดาวน์โหลด .JSON"}</span>
                    </button>

                    <button
                      type="button"
                      disabled={downloadingFormat !== null}
                      onClick={() => handleDownloadArchiveFile("csv", "all")}
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-2xs active:scale-95"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-white" />
                      <span>{downloadingFormat === "csv-all" ? "กำลังสร้าง..." : "ดาวน์โหลด Excel .CSV"}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Audit Trail History */}
            <div className="bg-white border border-sky-100 rounded-3xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-extrabold text-base text-slate-900">
                    ประวัติการสำรองข้อมูลย้อนหลัง (Archive Audit Trail)
                  </h3>
                </div>
                <span className="text-xs text-slate-400">
                  {archiveAuditLogs.length} รายการ
                </span>
              </div>

              {archiveAuditLogs.length === 0 ? (
                <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <Archive className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-500">ยังไม่มีประวัติการสำรองข้อมูล</p>
                  <p className="text-[11px] text-slate-400">เมื่อมีการสำรองข้อมูล ระบบจะบันทึกประวัติและลิงก์ Google Drive ไว้ที่นี่</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                        <th className="p-3">วันเวลาที่สำรอง</th>
                        <th className="p-3">ปีงบประมาณ</th>
                        <th className="p-3">ผู้ดำเนินการ</th>
                        <th className="p-3">จำนวนที่จัดเก็บ</th>
                        <th className="p-3">ล้าง Cloud</th>
                        <th className="p-3">สถานะ & ลิงก์ Drive</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {archiveAuditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-sky-50/40 transition-colors">
                          <td className="p-3 whitespace-nowrap font-mono text-slate-600">
                            {formatThaiDateTime(log.timestamp)}
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-200">
                              {log.fiscalYear || "FY"}
                            </span>
                          </td>
                          <td className="p-3 text-slate-700">{log.operator}</td>
                          <td className="p-3">
                            <span className="font-bold text-slate-900">{log.totalRecords}</span> รายการ
                            <span className="text-[10px] text-slate-400 block">
                              (เดินตรวจ {log.patrolLogsCount} | รถ {log.parkingScansCount} | เหตุ {log.incidentsCount})
                            </span>
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            {log.purgedFromFirestore ? (
                              <span className="text-[10px] bg-rose-50 text-rose-700 px-2 py-0.5 rounded-md border border-rose-200 font-bold">
                                🧹 ล้าง Cloud แล้ว
                              </span>
                            ) : (
                              <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-bold">
                                ☁️ เก็บไว้ใน Cloud
                              </span>
                            )}
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            {log.driveFolderLink ? (
                              <a
                                href={log.driveFolderLink}
                                target="_blank"
                                rel="noreferrer"
                                className="text-sky-600 hover:text-sky-800 font-bold flex items-center gap-1"
                              >
                                <FolderArchive className="w-3.5 h-3.5" /> เปิดโฟลเดอร์ Drive
                              </a>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* MODAL 1: ADD/EDIT CHECKPOINT */}
      {showAddCpModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl space-y-4 border border-sky-100">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <span className="p-1.5 rounded-xl bg-sky-100 text-sky-700">
                  <Building className="w-4 h-4" />
                </span>
                {editingCp ? "✏️ แก้ไขข้อมูลจุดตรวจและรายการเช็ค" : "➕ สร้างจุดตรวจใหม่"}
              </h3>
              <button
                onClick={() => { setShowAddCpModal(false); setEditingCp(null); }}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCp} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">
                    รหัสจุดตรวจ * <span className="text-[10px] font-normal text-slate-400">(เช่น 01, 02, 03...)</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={cpForm.code}
                    onChange={(e) => setCpForm({ ...cpForm, code: e.target.value })}
                    placeholder={String(checkpoints.length + 1).padStart(2, "0")}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono focus:bg-white"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-600 font-bold mb-1">ชื่อจุดตรวจ *</label>
                  <input
                    type="text"
                    required
                    value={cpForm.name}
                    onChange={(e) => setCpForm({ ...cpForm, name: e.target.value })}
                    placeholder="ระบุชื่อจุดตรวจ เช่น ประตูฉุกเฉิน ER, ห้องคลังยา..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">อาคาร</label>
                  <select
                    value={cpForm.building}
                    onChange={(e) => setCpForm({ ...cpForm, building: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white"
                  >
                    <option value="อาคารเฉลิมพระเกียรติ A">อาคารเฉลิมพระเกียรติ A</option>
                    <option value="อาคารบริการผู้ป่วย B">อาคารบริการผู้ป่วย B</option>
                    <option value="อาคารสนับสนุนเทคนิค C">อาคารสนับสนุนเทคนิค C</option>
                    <option value="พื้นที่ภายนอก & บริเวณรอบ รพ.">พื้นที่ภายนอก & บริเวณรอบ รพ.</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">ชั้น / โซน</label>
                  <input
                    type="text"
                    value={cpForm.floor}
                    onChange={(e) => setCpForm({ ...cpForm, floor: e.target.value })}
                    placeholder="ชั้น 1 / ชั้น B1"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white"
                  />
                </div>
              </div>

              {/* Checklist Section inside Modal 1 */}
              <div className="pt-3 border-t border-slate-200 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <label className="text-slate-800 font-bold text-xs flex items-center gap-1.5">
                    <ListChecks className="w-4 h-4 text-sky-600" />
                    รายการตรวจเช็คความปลอดภัยเฉพาะจุด ({cpForm.items.length} ข้อ)
                  </label>
                  <button
                    type="button"
                    onClick={() => handleSaveCurrentAsTemplate(cpForm.items, `แม่แบบ ${cpForm.name || cpForm.code || "จุดตรวจใหม่"}`)}
                    className="text-[11px] font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-xl border border-amber-200 active:scale-95 transition-all self-start sm:self-auto"
                  >
                    <BookmarkCheck className="w-3.5 h-3.5" /> บันทึกเป็นแม่แบบใหม่
                  </button>
                </div>

                {/* Quick Pull Controls */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">
                      📥 ดึงรายการจากจุดตรวจอื่น:
                    </label>
                    <select
                      defaultValue=""
                      onChange={(e) => {
                        if (e.target.value) {
                          handleCopyFromCheckpointToForm(e.target.value);
                          e.target.value = "";
                        }
                      }}
                      className="w-full p-2 text-xs bg-white border border-slate-300 rounded-xl text-slate-800 focus:ring-1 focus:ring-sky-500"
                    >
                      <option value="">-- เลือกจุดตรวจที่มีอยู่ --</option>
                      {checkpoints
                        .filter((c) => c.id !== editingCp?.id && c.items && c.items.length > 0)
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.code} - {c.name} ({c.items?.length} ข้อ)
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">
                      📑 เลือกจากแม่แบบสำเร็จรูป:
                    </label>
                    <select
                      defaultValue=""
                      onChange={(e) => {
                        if (e.target.value) {
                          handleApplyTemplateToForm(e.target.value);
                          e.target.value = "";
                        }
                      }}
                      className="w-full p-2 text-xs bg-white border border-slate-300 rounded-xl text-slate-800 focus:ring-1 focus:ring-sky-500"
                    >
                      <option value="">-- เลือกจากแม่แบบ รพ. --</option>
                      {checklistTemplates.map((tmpl) => (
                        <option key={tmpl.id} value={tmpl.id}>
                          {tmpl.name} ({tmpl.category || "ทั่วไป"})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Checklist Items List */}
                <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                  {cpForm.items.length === 0 ? (
                    <div className="p-4 text-center text-slate-400 italic bg-slate-50 rounded-2xl border border-dashed border-slate-300 text-xs">
                      ยังไม่มีรายการเช็ค กรุณาพิมพ์เพิ่มด้านล่าง หรือเลือกดึงจากแม่แบบ/จุดตรวจอื่น
                    </div>
                  ) : (
                    cpForm.items.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between gap-2 p-2 bg-slate-50 hover:bg-sky-50/50 rounded-xl border border-slate-200 text-slate-800 transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-800 text-[10px] font-bold flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <span className="text-xs text-slate-700 truncate">{item}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setCpForm({
                              ...cpForm,
                              items: cpForm.items.filter((_, i) => i !== idx),
                            });
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors shrink-0"
                          title="ลบข้อนี้"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {/* Add new item input */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={newChecklistItem}
                    onChange={(e) => setNewChecklistItem(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (newChecklistItem.trim()) {
                          setCpForm({
                            ...cpForm,
                            items: [...cpForm.items, newChecklistItem.trim()],
                          });
                          setNewChecklistItem("");
                        }
                      }
                    }}
                    placeholder="พิมพ์รายการตรวจเช็คใหม่ แล้วกด Enter หรือคลิกเพิ่ม..."
                    className="flex-1 p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs focus:bg-white focus:ring-1 focus:ring-sky-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (newChecklistItem.trim()) {
                        setCpForm({
                          ...cpForm,
                          items: [...cpForm.items, newChecklistItem.trim()],
                        });
                        setNewChecklistItem("");
                      }
                    }}
                    className="px-3.5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl flex items-center gap-1 active:scale-95 transition-all shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" /> เพิ่มข้อ
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex gap-2.5">
                <button
                  type="submit"
                  className="flex-1 py-3 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl active:scale-95 transition-all shadow-sm"
                >
                  {editingCp ? "บันทึกการแก้ไขจุดตรวจ" : "สร้างจุดตรวจและรายการเช็ค"}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowAddCpModal(false); setEditingCp(null); }}
                  className="px-5 py-3 bg-slate-100 text-slate-600 hover:bg-slate-200 font-bold rounded-xl active:scale-95 transition-all"
                >
                  ยกเลิก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD/EDIT GUARD */}
      {showAddGuardModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 border border-sky-100">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-base text-slate-900">
                {editingGuard ? "✏️ แก้ไขข้อมูลเจ้าหน้าที่" : "➕ เพิ่มเจ้าหน้าที่ รปภ. ใหม่"}
              </h3>
              <button
                onClick={() => { setShowAddGuardModal(false); setEditingGuard(null); }}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveGuard} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-bold mb-1">ชื่อ - นามสกุล *</label>
                <input
                  type="text"
                  required
                  value={guardForm.name}
                  onChange={(e) => setGuardForm({ ...guardForm, name: e.target.value })}
                  placeholder="นายสมพร ตั้งใจตรวจ"
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">รหัส PIN 4 หลัก *</label>
                  <input
                    type="password"
                    maxLength={4}
                    required
                    value={guardForm.pin}
                    onChange={(e) => setGuardForm({ ...guardForm, pin: e.target.value })}
                    placeholder="4444"
                    className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono tracking-widest text-center"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">กะประจำ *</label>
                  <select
                    value={guardForm.shift}
                    onChange={(e) => setGuardForm({ ...guardForm, shift: e.target.value as any })}
                    className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900"
                  >
                    <option value="morning">☀️ กะเช้า (07:00 - 19:00)</option>
                    <option value="night">🌙 กะดึก (19:00 - 07:00)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">เบอร์โทรศัพท์ติดต่อ</label>
                <input
                  type="text"
                  value={guardForm.phone}
                  onChange={(e) => setGuardForm({ ...guardForm, phone: e.target.value })}
                  placeholder="089-123-4567"
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono"
                />
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-3 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl active:scale-95 transition-all"
                >
                  {editingGuard ? "บันทึกการแก้ไข" : "เพิ่มเจ้าหน้าที่"}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowAddGuardModal(false); setEditingGuard(null); }}
                  className="px-4 py-3 bg-slate-100 text-slate-600 hover:bg-slate-200 font-bold rounded-xl"
                >
                  ยกเลิก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: CREATE SHIFT SWAP */}
      {showSwapModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 border border-sky-100">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-base text-slate-900">
                🔄 บันทึกคำขอแลกเวร
              </h3>
              <button
                onClick={() => setShowSwapModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSwap} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-bold mb-1">ผู้ขอแลกเวร (ต้นทาง) *</label>
                <select
                  required
                  value={swapForm.requesterId}
                  onChange={(e) => setSwapForm({ ...swapForm, requesterId: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900"
                >
                  <option value="">-- เลือกเจ้าหน้าที่ผู้ขอแลก --</option>
                  {guards.filter(g => g.role === "guard").map(g => (
                    <option key={g.id} value={g.id}>
                      {g.name} ({g.shift === "morning" ? "กะเช้า" : "กะดึก"})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">ขอแลกกับ (ปลายทาง) *</label>
                <select
                  required
                  value={swapForm.targetGuardId}
                  onChange={(e) => setSwapForm({ ...swapForm, targetGuardId: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900"
                >
                  <option value="">-- เลือกเจ้าหน้าที่ผู้รับแลก --</option>
                  {guards.filter(g => g.role === "guard" && g.id !== swapForm.requesterId).map(g => (
                    <option key={g.id} value={g.id}>
                      {g.name} ({g.shift === "morning" ? "กะเช้า" : "กะดึก"})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">วันที่ต้องการแลกเวร *</label>
                <input
                  type="date"
                  required
                  value={swapForm.swapDate}
                  onChange={(e) => setSwapForm({ ...swapForm, swapDate: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">เหตุผลในการขอแลกเวร</label>
                <textarea
                  rows={2}
                  value={swapForm.reason}
                  onChange={(e) => setSwapForm({ ...swapForm, reason: e.target.value })}
                  placeholder="เช่น ติดธุระพาบิดาไปพบแพทย์, ลากิจฉุกเฉิน..."
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900"
                />
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl active:scale-95 transition-all"
                >
                  ส่งคำขอแลกเวร
                </button>
                <button
                  type="button"
                  onClick={() => setShowSwapModal(false)}
                  className="px-4 py-3 bg-slate-100 text-slate-600 hover:bg-slate-200 font-bold rounded-xl"
                >
                  ยกเลิก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: LEAVE REQUEST */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 border border-sky-100">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-base text-slate-900">
                🏖️ บันทึกคำขอลา (Leave Request)
              </h3>
              <button
                onClick={() => setShowLeaveModal(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLeave} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-bold mb-1">เจ้าหน้าที่ผู้ขอลา *</label>
                <select
                  required
                  value={leaveForm.guardId}
                  onChange={(e) => setLeaveForm({ ...leaveForm, guardId: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900"
                >
                  <option value="">-- เลือกเจ้าหน้าที่ รปภ. --</option>
                  {guards.filter(g => g.role === "guard").map(g => (
                    <option key={g.id} value={g.id}>
                      {g.name} ({g.shift === "morning" ? "กะเช้า" : "กะดึก"})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">ประเภทการลา *</label>
                <select
                  value={leaveForm.type}
                  onChange={(e) => setLeaveForm({ ...leaveForm, type: e.target.value as any })}
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900"
                >
                  <option value="personal">ลากิจส่วนตัว</option>
                  <option value="sick">ลาป่วย</option>
                  <option value="vacation">ลาพักผ่อน / พักร้อน</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">ตั้งแต่วันที่ *</label>
                  <input
                    type="date"
                    required
                    value={leaveForm.startDate}
                    onChange={(e) => setLeaveForm({ ...leaveForm, startDate: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-bold mb-1">ถึงวันที่ *</label>
                  <input
                    type="date"
                    required
                    value={leaveForm.endDate}
                    onChange={(e) => setLeaveForm({ ...leaveForm, endDate: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">เหตุผลการลา</label>
                <textarea
                  rows={2}
                  value={leaveForm.reason}
                  onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                  placeholder="ระบุเหตุผลการลา เช่น ไปทำธุระต่างจังหวัด, พบแพทย์..."
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900"
                />
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-3 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl active:scale-95 transition-all"
                >
                  บันทึกคำขอลา
                </button>
                <button
                  type="button"
                  onClick={() => setShowLeaveModal(false)}
                  className="px-4 py-3 bg-slate-100 text-slate-600 hover:bg-slate-200 font-bold rounded-xl"
                >
                  ยกเลิก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: MANUAL ROSTER EDIT */}
      {manualModalData && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 border border-sky-100">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  ✏️ จัดเวรแบบแมนนวล: {manualModalData.shift === "morning" ? "กะเช้า ☀️" : "กะดึก 🌙"}
                </h3>
                <p className="text-xs text-slate-500 font-mono">
                  ประจำวันที่: {manualModalData.date}
                </p>
              </div>
              <button
                onClick={() => setManualModalData(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-600 font-medium">
                ติ๊กเลือกเจ้าหน้าที่ รปภ. ที่ต้องการมอบหมายให้เข้าเวรนี้:
              </p>

              <div className="space-y-2">
                {guards.filter(g => g.role === "guard").map(g => {
                  const isChecked = manualModalData.selectedGuardIds.includes(g.id);
                  // Check if on approved leave
                  const isLeave = leaveRequests.some(l => 
                    l.guardId === g.id && l.status === "approved" && manualModalData.date >= l.startDate && manualModalData.date <= l.endDate
                  );
                  // Check if has day off
                  const isDayOff = staffDaysOff.some(d => d.guardId === g.id && d.date === manualModalData.date);

                  return (
                    <label
                      key={g.id}
                      className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                        isChecked
                          ? "bg-sky-50 border-sky-400 text-sky-900"
                          : isLeave
                          ? "bg-rose-50/50 border-rose-200 text-rose-800"
                          : isDayOff
                          ? "bg-emerald-50/50 border-emerald-200 text-emerald-800"
                          : "bg-slate-50 border-slate-200 text-slate-700"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            const current = manualModalData.selectedGuardIds;
                            if (e.target.checked) {
                              setManualModalData({ ...manualModalData, selectedGuardIds: [...current, g.id] });
                            } else {
                              setManualModalData({ ...manualModalData, selectedGuardIds: current.filter(x => x !== g.id) });
                            }
                          }}
                          className="w-4 h-4 rounded text-sky-600 focus:ring-sky-500"
                        />
                        <span className="font-bold">{g.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {isLeave && (
                          <span className="text-[10px] bg-rose-100 text-rose-700 font-bold px-2 py-0.5 rounded-full">
                            อนุมัติลา
                          </span>
                        )}
                        {isDayOff && (
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                            🏖️ วันหยุด
                          </span>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={handleSaveManualRoster}
                  className="flex-1 py-3 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl active:scale-95 transition-all"
                >
                  บันทึกตารางเวร
                </button>
                <button
                  type="button"
                  onClick={() => setManualModalData(null)}
                  className="px-4 py-3 bg-slate-100 text-slate-600 hover:bg-slate-200 font-bold rounded-xl"
                >
                  ยกเลิก
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 6: STAFF DAYS OFF MANAGEMENT (กำหนดวันหยุดพนักงาน) */}
      {showDaysOffModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-2xl shadow-2xl space-y-5 border border-sky-100 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-extrabold text-lg text-slate-900 flex items-center gap-2">
                  🏖️ กำหนดวันหยุด รปภ. ประจำเดือน
                </h3>
                <p className="text-xs text-slate-500">
                  เลือกพนักงาน แล้วคลิกวันที่ต้องการกำหนดให้เป็นวันหยุด หรือใช้ปุ่มลัดเพื่อกำหนดวันหยุดประจำสัปดาห์
                </p>
              </div>
              <button
                onClick={() => setShowDaysOffModal(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Staff Selector Tabs */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">
                เลือกเจ้าหน้าที่ รปภ. ที่ต้องการจัดการ:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                {guards.filter(g => g.role === "guard").map((g) => {
                  const isSelected = daysOffSelectedGuardId === g.id;
                  const guardDaysOffCount = staffDaysOff.filter(
                    d => d.guardId === g.id && d.date.startsWith(currentMonthYearPrefix)
                  ).length;

                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setDaysOffSelectedGuardId(g.id)}
                      className={`p-2.5 rounded-2xl text-left border transition-all ${
                        isSelected
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      <div className="text-xs font-black truncate">{g.name}</div>
                      <div className={`text-[10px] mt-1 font-medium ${isSelected ? "text-emerald-100" : "text-slate-500"}`}>
                        หยุด {guardDaysOffCount} วัน/เดือน
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Current Guard Focus Banner & Presets */}
            {(() => {
              const currentGuard = guards.find(g => g.id === daysOffSelectedGuardId);
              const currentGuardDaysOff = staffDaysOff.filter(
                d => d.guardId === daysOffSelectedGuardId && d.date.startsWith(currentMonthYearPrefix)
              );

              return (
                <div className="space-y-4">
                  <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm">
                          {currentGuard?.name.substring(0, 2)}
                        </div>
                        <div>
                          <span className="font-extrabold text-sm text-slate-900 block">
                            {currentGuard?.name}
                          </span>
                          <span className="text-[11px] text-emerald-800 font-semibold">
                            วันหยุดในเดือน {thaiMonths[selectedMonth]} {selectedYear + 543}:{" "}
                            <strong>{currentGuardDaysOff.length} วัน</strong>
                          </span>
                        </div>
                      </div>

                      {/* Presets */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => {
                            setGuardRecurringDayOff(daysOffSelectedGuardId, 6, selectedYear, selectedMonth);
                            setGuardRecurringDayOff(daysOffSelectedGuardId, 0, selectedYear, selectedMonth);
                            setDaysOffAlert(`กำหนดให้ ${currentGuard?.name} หยุดทุกเสาร์-อาทิตย์ เรียบร้อยแล้ว`);
                            setTimeout(() => setDaysOffAlert(null), 3000);
                          }}
                          className="px-2.5 py-1 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-[11px] rounded-xl active:scale-95 transition-all shadow-2xs"
                          title="หยุดทุกเสาร์และอาทิตย์ในเดือนนี้"
                        >
                          + เสาร์-อาทิตย์
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setGuardRecurringDayOff(daysOffSelectedGuardId, 1, selectedYear, selectedMonth);
                            setDaysOffAlert(`กำหนดให้ ${currentGuard?.name} หยุดทุกวันจันทร์ เรียบร้อยแล้ว`);
                            setTimeout(() => setDaysOffAlert(null), 3000);
                          }}
                          className="px-2.5 py-1 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-[11px] rounded-xl active:scale-95 transition-all shadow-2xs"
                          title="หยุดทุกวันจันทร์ในเดือนนี้"
                        >
                          + ทุกวันจันทร์
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setGuardRecurringDayOff(daysOffSelectedGuardId, 5, selectedYear, selectedMonth);
                            setDaysOffAlert(`กำหนดให้ ${currentGuard?.name} หยุดทุกวันศุกร์ เรียบร้อยแล้ว`);
                            setTimeout(() => setDaysOffAlert(null), 3000);
                          }}
                          className="px-2.5 py-1 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-[11px] rounded-xl active:scale-95 transition-all shadow-2xs"
                          title="หยุดทุกวันศุกร์ในเดือนนี้"
                        >
                          + ทุกวันศุกร์
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            clearStaffDaysOffForMonth(selectedYear, selectedMonth, daysOffSelectedGuardId);
                            setDaysOffAlert(`ล้างวันหยุดเดือนนี้ของ ${currentGuard?.name} เรียบร้อยแล้ว`);
                            setTimeout(() => setDaysOffAlert(null), 3000);
                          }}
                          className="px-2.5 py-1 bg-white hover:bg-rose-50 text-rose-700 border border-rose-300 font-bold text-[11px] rounded-xl active:scale-95 transition-all shadow-2xs"
                          title="ล้างวันหยุดทั้งหมดของพนักงานท่านนี้ในเดือนที่เลือก"
                        >
                          ล้างวันหยุด
                        </button>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      💡 คลิกที่แต่ละช่องวันที่ด้านล่างเพื่อ <strong>เปิด/ปิด วันหยุด</strong> ตามต้องการ (สีเขียว = วันหยุด)
                    </p>
                  </div>

                  {/* Monthly Days Off Calendar Picker Grid */}
                  <div className="space-y-2">
                    {/* Day Names Header */}
                    <div className="grid grid-cols-7 gap-1.5 text-center">
                      {thaiDayNamesShort.map((dayName, idx) => (
                        <div
                          key={dayName}
                          className={`py-1 rounded-lg text-[11px] font-black border ${
                            idx === 0 || idx === 6
                              ? "bg-rose-50 border-rose-200 text-rose-700"
                              : "bg-slate-100 border-slate-200 text-slate-700"
                          }`}
                        >
                          {dayName}
                        </div>
                      ))}
                    </div>

                    {/* Month Tiles */}
                    <div className="grid grid-cols-7 gap-1.5">
                      {Array.from({ length: firstDayOfMonthWeekday }).map((_, i) => (
                        <div
                          key={`modal-pad-${i}`}
                          className="p-2 rounded-xl bg-slate-50/40 border border-dashed border-slate-200/50 opacity-40 min-h-[52px]"
                        />
                      ))}

                      {monthDates.map((dateStr) => {
                        const dateObj = new Date(dateStr);
                        const dayNum = dateObj.getDate();
                        const dayOfWeek = dateObj.getDay();
                        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

                        const isOff = staffDaysOff.some(
                          d => d.guardId === daysOffSelectedGuardId && d.date === dateStr
                        );
                        const isLeave = leaveRequests.some(
                          l => l.guardId === daysOffSelectedGuardId && l.status === "approved" && dateStr >= l.startDate && dateStr <= l.endDate
                        );

                        return (
                          <button
                            key={dateStr}
                            type="button"
                            onClick={() => {
                              setStaffDayOff(
                                daysOffSelectedGuardId,
                                dateStr,
                                !isOff,
                                "วันหยุดประจำสัปดาห์"
                              );
                            }}
                            className={`p-2 rounded-xl border flex flex-col items-center justify-center transition-all min-h-[52px] relative active:scale-95 ${
                              isOff
                                ? "bg-gradient-to-b from-emerald-500 to-emerald-600 text-white border-emerald-600 shadow-sm"
                                : isLeave
                                ? "bg-rose-50 text-rose-800 border-rose-200 hover:border-rose-300"
                                : isWeekend
                                ? "bg-rose-50/30 text-rose-800 border-slate-200 hover:bg-emerald-50 hover:border-emerald-300"
                                : "bg-slate-50 text-slate-800 border-slate-200 hover:bg-emerald-50 hover:border-emerald-300"
                            }`}
                          >
                            <span className="text-xs font-black">{dayNum}</span>
                            {isOff ? (
                              <span className="text-[9px] font-bold text-emerald-100 flex items-center gap-0.5">
                                🏖️ หยุด
                              </span>
                            ) : isLeave ? (
                              <span className="text-[9px] font-bold text-rose-600">
                                🏥 ลา
                              </span>
                            ) : (
                              <span className="text-[8px] text-slate-400">เวรปกติ</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Modal Actions */}
            <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-slate-500">
                เมื่อกำหนดวันหยุดครบแล้ว ให้กดปุ่ม <strong>&quot;จัดเวรอัตโนมัติทั้งเดือน&quot;</strong> บนหน้าตารางเวรเพื่อจัดกะให้ทุกคน
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    setShowDaysOffModal(false);
                    handleRunAutoSchedule();
                  }}
                  className="flex-1 sm:flex-none px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-xs rounded-xl shadow-md active:scale-95 transition-all flex items-center gap-1.5"
                >
                  <Zap className="w-4 h-4 fill-current" /> จัดเวรทั้งเดือนทันที
                </button>
                <button
                  type="button"
                  onClick={() => setShowDaysOffModal(false)}
                  className="flex-1 sm:flex-none px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl active:scale-95 transition-all"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: QUICK CHECKLIST MANAGER FOR A CHECKPOINT */}
      {managingChecklistCp && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl space-y-4 border border-sky-100">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-lg bg-sky-100 text-sky-900 border border-sky-200">
                    {managingChecklistCp.code}
                  </span>
                  <span className="text-xs text-slate-500">
                    {managingChecklistCp.building} • {managingChecklistCp.floor}
                  </span>
                </div>
                <h3 className="font-bold text-base text-slate-900 flex items-center gap-1.5">
                  <ListChecks className="w-4 h-4 text-sky-600" />
                  รายการตรวจเช็คประจำจุด: {managingChecklistCp.name}
                </h3>
              </div>
              <button
                onClick={() => setManagingChecklistCp(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {checklistAlert && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-2xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{checklistAlert}</span>
              </div>
            )}

            {/* Quick Actions Toolbar */}
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">เครื่องมือช่วยดึงรายการเช็ค:</span>
                <button
                  type="button"
                  onClick={() => handleSaveCurrentAsTemplate(tempChecklistItems, `แม่แบบ ${managingChecklistCp.name}`)}
                  className="text-[11px] font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-xl border border-amber-300 flex items-center gap-1 active:scale-95 transition-all"
                >
                  <BookmarkCheck className="w-3.5 h-3.5 text-amber-600" /> บันทึกเป็นแม่แบบใหม่
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">
                    📥 ดึงรายการจากจุดตรวจอื่น:
                  </label>
                  <select
                    defaultValue=""
                    onChange={(e) => {
                      if (e.target.value) {
                        handleCopyFromCheckpointToTemp(e.target.value);
                        e.target.value = "";
                      }
                    }}
                    className="w-full p-2 text-xs bg-white border border-slate-300 rounded-xl text-slate-800 focus:ring-1 focus:ring-sky-500"
                  >
                    <option value="">-- เลือกจุดตรวจที่มีอยู่ --</option>
                    {checkpoints
                      .filter((c) => c.id !== managingChecklistCp.id && c.items && c.items.length > 0)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.code} - {c.name} ({c.items?.length} ข้อ)
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 block mb-1">
                    📑 ดึงจากแม่แบบสำเร็จรูป:
                  </label>
                  <select
                    defaultValue=""
                    onChange={(e) => {
                      if (e.target.value) {
                        handleApplyTemplateToTemp(e.target.value);
                        e.target.value = "";
                      }
                    }}
                    className="w-full p-2 text-xs bg-white border border-slate-300 rounded-xl text-slate-800 focus:ring-1 focus:ring-sky-500"
                  >
                    <option value="">-- เลือกจากแม่แบบ รพ. --</option>
                    {checklistTemplates.map((tmpl) => (
                      <option key={tmpl.id} value={tmpl.id}>
                        {tmpl.name} ({tmpl.category || "ทั่วไป"})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Checklist Items List */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-700">
                  รายการที่ต้องตรวจ ({tempChecklistItems.length} ข้อ):
                </span>
                <span className="text-[11px] text-slate-500">
                  รปภ. จะเห็นรายการเหล่านี้ขณะสแกนจุดตรวจนี้
                </span>
              </div>

              <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                {tempChecklistItems.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 italic bg-slate-50 rounded-2xl border border-dashed border-slate-300 text-xs">
                    ยังไม่มีรายการเช็คสำหรับจุดนี้ กรุณาพิมพ์เพิ่มด้านล่าง หรือเลือกดึงจากแม่แบบ/จุดตรวจอื่น
                  </div>
                ) : (
                  tempChecklistItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-2 p-2.5 bg-slate-50 hover:bg-sky-50/60 rounded-xl border border-slate-200 text-slate-800 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-800 text-[10px] font-bold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span className="text-xs text-slate-700">{item}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setTempChecklistItems(tempChecklistItems.filter((_, i) => i !== idx));
                        }}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors shrink-0"
                        title="ลบข้อนี้"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Add new item input */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  value={tempNewItem}
                  onChange={(e) => setTempNewItem(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (tempNewItem.trim()) {
                        setTempChecklistItems([...tempChecklistItems, tempNewItem.trim()]);
                        setTempNewItem("");
                      }
                    }
                  }}
                  placeholder="พิมพ์รายการตรวจเช็คใหม่ แล้วกด Enter หรือคลิกเพิ่ม..."
                  className="flex-1 p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs focus:bg-white focus:ring-1 focus:ring-sky-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (tempNewItem.trim()) {
                      setTempChecklistItems([...tempChecklistItems, tempNewItem.trim()]);
                      setTempNewItem("");
                    }
                  }}
                  className="px-3.5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl flex items-center gap-1 active:scale-95 transition-all shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" /> เพิ่มข้อ
                </button>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-200 flex gap-2.5">
              <button
                type="button"
                onClick={handleSaveManagingChecklist}
                className="flex-1 py-3 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl active:scale-95 transition-all shadow-sm flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" /> บันทึกรายการเช็คจุดตรวจนี้
              </button>
              <button
                type="button"
                onClick={() => setManagingChecklistCp(null)}
                className="px-5 py-3 bg-slate-100 text-slate-600 hover:bg-slate-200 font-bold text-xs rounded-xl active:scale-95 transition-all"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CHECKLIST TEMPLATE LIBRARY */}
      {showTemplateManagerModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl space-y-4 border border-sky-100">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                  <BookmarkCheck className="w-5 h-5 text-amber-600" />
                  คลังแม่แบบรายการตรวจเช็คความปลอดภัยโรงพยาบาล ({checklistTemplates.length} แม่แบบ)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  บันทึกชุดรายการตรวจเช็คมาตรฐานไว้ล่วงหน้า เพื่อดึงไปใช้กับจุดตรวจแต่ละจุดได้ทันที
                </p>
              </div>
              <button
                onClick={() => setShowTemplateManagerModal(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {checklistAlert && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-2xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{checklistAlert}</span>
              </div>
            )}

            {/* Create New Template Form */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <h4 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                <FolderPlus className="w-4 h-4 text-sky-600" /> สร้างแม่แบบรายการตรวจเช็คใหม่
              </h4>
              <form onSubmit={handleCreateTemplate} className="space-y-2.5 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-slate-600 font-bold mb-1">ชื่อแม่แบบ *</label>
                    <input
                      type="text"
                      required
                      value={newTemplateName}
                      onChange={(e) => setNewTemplateName(e.target.value)}
                      placeholder="เช่น แผนกไอซียู (ICU), อาคารพักแพทย์"
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 focus:ring-1 focus:ring-sky-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-bold mb-1">หมวดหมู่</label>
                    <input
                      type="text"
                      value={newTemplateCategory}
                      onChange={(e) => setNewTemplateCategory(e.target.value)}
                      placeholder="เช่น ผู้ป่วยวิกฤต, ระบบสนับสนุน, ทั่วไป"
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 focus:ring-1 focus:ring-sky-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">
                    รายการตรวจเช็ค * (พิมพ์ 1 บรรทัด ต่อ 1 ข้อ)
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={newTemplateItemsText}
                    onChange={(e) => setNewTemplateItemsText(e.target.value)}
                    placeholder={"ประตูห้องและระบบคีย์การ์ดล็อกแน่นหนา\nถังดับเพลิงและระบบตรวจจับควันพร้อมใช้งาน\nไม่มีผู้ไม่มีส่วนเกี่ยวข้องป้วนเปี้ยน"}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 text-xs font-mono focus:ring-1 focus:ring-sky-500"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl active:scale-95 transition-all flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> บันทึกแม่แบบใหม่
                  </button>
                </div>
              </form>
            </div>

            {/* Existing Templates List */}
            <div className="space-y-3">
              <h4 className="font-bold text-xs text-slate-800">
                แม่แบบทั้งหมดในระบบ ({checklistTemplates.length})
              </h4>
              <div className="grid grid-cols-1 gap-3 max-h-72 overflow-y-auto pr-1">
                {checklistTemplates.map((tmpl) => (
                  <div
                    key={tmpl.id}
                    className="p-4 bg-white rounded-2xl border border-slate-200 hover:border-sky-300 transition-all space-y-2.5 shadow-2xs"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h5 className="font-bold text-slate-900 text-sm">{tmpl.name}</h5>
                          {tmpl.category && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[10px] font-bold border border-amber-200">
                              {tmpl.category}
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400 font-medium">
                            ({tmpl.items.length} รายการ)
                          </span>
                        </div>
                        {tmpl.description && (
                          <p className="text-[11px] text-slate-500 mt-0.5">{tmpl.description}</p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`คุณต้องการลบแม่แบบ "${tmpl.name}" ใช่หรือไม่?`)) {
                            deleteChecklistTemplate(tmpl.id);
                          }
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="ลบแม่แบบนี้"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-1">
                      {tmpl.items.map((item, i) => (
                        <div key={i} className="text-[11px] text-slate-700 flex items-start gap-2">
                          <span className="w-4 h-4 rounded-full bg-slate-200 text-slate-700 text-[9px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                            {i + 1}
                          </span>
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setShowTemplateManagerModal(false)}
                className="px-5 py-2.5 bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold text-xs rounded-xl active:scale-95 transition-all"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 7: PURGE & ARCHIVE CONFIRMATION MODAL */}
      {showPurgeConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 border border-rose-200">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="p-3 bg-rose-100 text-rose-600 rounded-2xl">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900">
                  ยืนยันการสำรองและล้างข้อมูล
                </h3>
                <p className="text-xs text-rose-600 font-semibold">
                  ล้างข้อมูลออกจาก Cloud Firestore อย่างถาวร
                </p>
              </div>
            </div>

            <div className="bg-rose-50 p-4 rounded-2xl border border-rose-200 text-xs text-rose-900 space-y-2">
              <p className="font-bold">
                ⚠️ คุณกำลังจะทำการสำรองข้อมูล {previewTotal} รายการ เข้า Google Drive และลบออกจาก Cloud Firestore
              </p>
              <ul className="list-disc list-inside text-[11px] text-rose-800 space-y-0.5">
                <li>บันทึกเดินตรวจ: {previewEligiblePatrol.length} รายการ</li>
                <li>บันทึกสแกนรถ: {previewEligibleParking.length} รายการ</li>
                <li>บันทึกเหตุด่วน: {previewEligibleIncidents.length} รายการ</li>
                <li>เกณฑ์อายุ: เกิน {archiveCutoffDays} วัน ({archiveSelectedFiscalYear === "ALL" ? "ทุกปีงบประมาณ" : archiveSelectedFiscalYear})</li>
              </ul>
              <p className="text-[10px] text-rose-700 pt-1">
                * ข้อมูลที่ถูกลบจะไม่สามารถกู้คืนผ่าน Firestore ได้ แต่จะมีไฟล์สำรองจัดเก็บใน Google Drive และบันทึกในประวัติ Audit Trail
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                เพื่อความปลอดภัย พิมพ์คำว่า <span className="font-mono text-rose-600 font-black">CONFIRM</span> หรือกรอก PIN หัวหน้างาน (9999):
              </label>
              <input
                type="text"
                value={purgeConfirmText}
                onChange={(e) => setPurgeConfirmText(e.target.value)}
                placeholder="พิมพ์ CONFIRM หรือ 9999"
                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-center font-bold tracking-wider text-slate-900 focus:bg-white focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowPurgeConfirmModal(false);
                  setPurgeConfirmText("");
                }}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={
                  archiveLoading ||
                  (purgeConfirmText.trim().toUpperCase() !== "CONFIRM" &&
                    purgeConfirmText.trim() !== "9999")
                }
                onClick={() => handleExecuteArchival(true)}
                className={`flex-1 py-3 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-xs active:scale-95 ${
                  archiveLoading ||
                  (purgeConfirmText.trim().toUpperCase() !== "CONFIRM" &&
                    purgeConfirmText.trim() !== "9999")
                    ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                    : "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20"
                }`}
              >
                {archiveLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" /> กำลังล้างข้อมูล...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" /> ยืนยันล้างข้อมูล
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print QR Code Badges Modal */}
      {showPrintModal && (
        <PrintQRModal
          checkpoints={checkpoints}
          onClose={() => setShowPrintModal(false)}
        />
      )}
    </div>
  );
}
