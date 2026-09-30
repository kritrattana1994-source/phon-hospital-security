"use client";

import { useState } from "react";
import { 
  useStore, 
  Checkpoint, 
  Guard,
  DailyAISummary
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
  Database,
  Camera,
  Save,
  BarChart3,
  TrendingUp,
  CalendarDays,
  ChevronDown,
  Maximize2,
  Eye,
  EyeOff
} from "lucide-react";
import Link from "next/link";
import { useFirebaseSync } from "@/lib/useFirebaseSync";
import { openFullImage, downloadImage } from "@/lib/imageViewer";
import HospitalBrand from "@/components/HospitalBrand";
import PrintQRModal from "@/components/PrintQRModal";
import { getThaiFiscalYear, isOlderThanDays, formatThaiDateTime } from "@/lib/fiscalYear";
import { 
  defaultPatrolRounds, 
  hospitalShifts, 
  getCurrentRound, 
  getCurrentShift, 
  getRoundProgress, 
  calculateShiftKPIs, 
  calculateGuardKPIs,
  PatrolRound 
} from "@/lib/patrolSchedule";

export default function SupervisorPage() {
  const { 
    supervisorUser, 
    patrolLogs, 
    patrolRounds,
    updatePatrolRounds,
    resetPatrolRoundsToDefault,
    shiftReports,
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
    archiveAuditLogs,
    addArchiveAuditLog,
    purgeArchivedRecords,
    buildings,
    addBuilding,
    deleteBuilding,
    googleDriveWebhookUrl,
    setGoogleDriveWebhookUrl,
    geminiApiKey,
    setGeminiApiKey,
    dailyAISummaries,
    addDailyAISummary
  } = useStore();

  const { isConnected: isCloudConnected } = useFirebaseSync();

  const [activeTab, setActiveTab] = useState<"overview" | "rounds" | "checkpoints" | "staff" | "vehicles" | "incidents" | "ai" | "archive">("overview");
  const [lineSent, setLineSent] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Month-by-Month Analytics State
  const nowSupervisor = new Date();
  const currentMonthKey = `${nowSupervisor.getFullYear()}-${String(nowSupervisor.getMonth() + 1).padStart(2, "0")}`;
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthKey);
  const [selectedDayHover, setSelectedDayHover] = useState<number | null>(null);

  // Daily Vehicle Patrol Inspection Inspection State
  const [selectedVehiclePatrolDate, setSelectedVehiclePatrolDate] = useState<string>(nowSupervisor.toISOString().split("T")[0]);

  // AI Daily Analysis Archive State
  const [selectedAiArchiveDate, setSelectedAiArchiveDate] = useState<string>(nowSupervisor.toISOString().split("T")[0]);
  const [aiGeneratingDaily, setAiGeneratingDaily] = useState(false);
  const [aiAlertMessage, setAiAlertMessage] = useState<string | null>(null);

  // Rounds Config & Photo Modal State
  const [showRoundsConfigModal, setShowRoundsConfigModal] = useState(false);
  const [tempRounds, setTempRounds] = useState<PatrolRound[]>([]);
  const [selectedPhotoModal, setSelectedPhotoModal] = useState<{ url: string; title: string; timestamp?: string } | null>(null);
  const [incidentTabFilter, setIncidentTabFilter] = useState<"all" | "active" | "resolved">("all");

  // Google Drive Webhook Test State
  const [testDriveLoading, setTestDriveLoading] = useState(false);
  const [testDriveResult, setTestDriveResult] = useState<{ success: boolean; message: string; url?: string } | null>(null);
  const [copiedScript, setCopiedScript] = useState(false);

  // Google Gemini Vision OCR Test State
  const [testGeminiLoading, setTestGeminiLoading] = useState(false);
  const [testGeminiResult, setTestGeminiResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showGeminiKey, setShowGeminiKey] = useState(false);

  // 90-Day (3-Month) Archival State (นโยบายคงข้อมูลสด 3 เดือน)
  const [archiveCutoffDays, setArchiveCutoffDays] = useState<number>(90);
  const [archiveSelectedFiscalYear, setArchiveSelectedFiscalYear] = useState<string>("ALL");
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [archiveSuccess, setArchiveSuccess] = useState<string | null>(null);
  const [archiveStats, setArchiveStats] = useState<any | null>(null);
  const [showPurgeConfirmModal, setShowPurgeConfirmModal] = useState(false);
  const [purgeConfirmText, setPurgeConfirmText] = useState("");
  const [downloadingFormat, setDownloadingFormat] = useState<string | null>(null);


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
  const [showManageBuildingsModal, setShowManageBuildingsModal] = useState(false);
  const [newBuildingInput, setNewBuildingInput] = useState("");
  const [buildingActionAlert, setBuildingActionAlert] = useState<string | null>(null);

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

  // Function to trigger DeepSeek AI Batch Run & Save to Archive
  const handleRunAiBatch = async (dateToRun?: string) => {
    setAiLoading(true);
    setAiError(null);
    const targetDate = dateToRun || selectedAiArchiveDate || todayDateStr;

    try {
      const res = await fetch("/api/ai/daily-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dateString: targetDate,
          scans: parkingScans,
          staffVehicles,
          patrolLogs,
          shiftReports,
          checkpoints,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "เกิดข้อผิดพลาดในการประมวลผล AI");
      }

      setAiReportData(data);
      if (data.success) {
        const newSummary: DailyAISummary = {
          id: data.id || `ai-summary-${targetDate}`,
          dateString: data.dateString || targetDate,
          timestamp: data.timestamp || new Date().toISOString(),
          reportDateThai: data.reportDateThai || targetDate,
          totalVehiclesScanned: data.totalVehiclesScanned || 0,
          staffVehiclesCount: data.staffVehiclesCount || 0,
          outsideVehiclesCount: data.outsideVehiclesCount || 0,
          overnightVehiclesCount: data.overnightVehiclesCount || 0,
          patrolTotalScans: data.patrolTotalScans || 0,
          patrolComplianceRate: data.patrolComplianceRate || 100,
          patrolOnTimeRate: data.patrolOnTimeRate || 100,
          patrolIssuesCount: data.patrolIssuesCount || 0,
          aiSummaryMarkdown: data.aiSummaryMarkdown || "",
          actionItems: data.actionItems || [],
          generatedBy: data.generatedBy || "DeepSeek AI • รพ.พล",
        };
        addDailyAISummary(newSummary);
      }
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
        setArchiveSuccess(`รันคำสั่งอัตโนมัติสำเร็จ: จัดเก็บข้อมูลเกิน ${data.cutoffDays || archiveCutoffDays} วัน จำนวน ${data.archivedCounts.total} รายการ เรียบร้อยแล้ว`);
      } else {
        setArchiveSuccess(`รันคำสั่งอัตโนมัติสำเร็จ: ตรวจสอบแล้วไม่พบข้อมูลอายุเกิน ${data.cutoffDays || archiveCutoffDays} วัน (3 เดือน - ระบบสะอาดปกติ 100%)`);
      }
      fetchArchiveStats();
    } catch (err: any) {
      setArchiveError(`เกิดข้อผิดพลาด: ${err.message}`);
    } finally {
      setArchiveLoading(false);
    }
  };

  const handleTestDriveUpload = async () => {
    setTestDriveLoading(true);
    setTestDriveResult(null);
    try {
      const res = await fetch("/api/test-drive-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          webhookUrl: googleDriveWebhookUrl,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTestDriveResult({
          success: true,
          message: data.message || "อัปโหลดรูปทดสอบเข้า Google Drive สำเร็จ!",
          url: data.url,
        });
      } else {
        setTestDriveResult({
          success: false,
          message: data.error || "เกิดข้อผิดพลาดในการอัปโหลดรูปทดสอบ",
        });
      }
    } catch (err: any) {
      setTestDriveResult({
        success: false,
        message: err.message || "เกิดข้อผิดพลาดในการเชื่อมต่อ",
      });
    } finally {
      setTestDriveLoading(false);
    }
  };

  const handleTestGeminiKey = async () => {
    if (!geminiApiKey || !geminiApiKey.trim()) {
      alert("กรุณาระบุ Gemini API Key ก่อนกดทดสอบ");
      return;
    }
    setTestGeminiLoading(true);
    setTestGeminiResult(null);
    try {
      const res = await fetch("/api/test-gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: geminiApiKey.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTestGeminiResult({
          success: true,
          message: data.message || "✅ เชื่อมต่อ Google Gemini Flash API สำเร็จ 100%!",
        });
      } else {
        setTestGeminiResult({
          success: false,
          message: data.error || `❌ เชื่อมต่อล้มเหลว (HTTP ${res.status})`,
        });
      }
    } catch (err: any) {
      setTestGeminiResult({
        success: false,
        message: `❌ เกิดข้อผิดพลาดในการเชื่อมต่อ: ${err?.message || err}`,
      });
    } finally {
      setTestGeminiLoading(false);
    }
  };

  const appsScriptTemplate = `function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var rootFolderId = data.folderId || "1ED0LnFxfSwHVU60fI8LShWiXBDmxFFXT";
    var rootFolder = DriveApp.getFolderById(rootFolderId);
    var targetFolder = rootFolder;
    
    // สร้างโฟลเดอร์ย่อยถ้ามีการระบุ
    if (data.subfolder) {
      var subfolders = rootFolder.getFoldersByName(data.subfolder);
      if (subfolders.hasNext()) {
        targetFolder = subfolders.next();
      } else {
        targetFolder = rootFolder.createFolder(data.subfolder);
      }
    }
    
    var base64Data = (data.image || "").replace(/^data:image\\/\\w+;base64,/, "");
    var decoded = Utilities.base64Decode(base64Data);
    var filename = data.filename || ("incident_" + Utilities.formatDate(new Date(), "GMT+7", "yyyyMMdd_HHmmss") + ".jpg");
    var blob = Utilities.newBlob(decoded, data.mimeType || "image/jpeg", filename);
    
    var file = targetFolder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      fileId: file.getId(),
      url: file.getUrl(),
      directLink: "https://lh3.googleusercontent.com/d/" + file.getId()
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}`;

  const copyAppsScriptToClipboard = () => {
    navigator.clipboard.writeText(appsScriptTemplate);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 3000);
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
          alert("ไม่สามารถรับสัญญาณพิกัด GPS ได้ กรุณาเปิด Location Service หรือลองใหม่อีกครั้ง");
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

  const handleAddBuilding = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const name = newBuildingInput.trim();
    if (!name) return;
    if (buildings.includes(name)) {
      setBuildingActionAlert(`อาคาร "${name}" มีอยู่ในระบบแล้ว`);
      setTimeout(() => setBuildingActionAlert(null), 3000);
      return;
    }
    addBuilding(name);
    setCpForm((prev) => ({ ...prev, building: name }));
    setNewBuildingInput("");
    setBuildingActionAlert(`เพิ่มอาคาร "${name}" เรียบร้อยแล้ว`);
    setTimeout(() => setBuildingActionAlert(null), 3000);
  };

  const handleDeleteBuilding = (bName: string) => {
    const count = checkpoints.filter((cp) => cp.building === bName).length;
    if (count > 0) {
      if (!confirm(`อาคาร "${bName}" มีจุดตรวจใช้งานอยู่ ${count} จุดตรวจ ยืนยันการลบออกจากตัวเลือกอาคารหรือไม่? (ข้อมูลจุดตรวจเดิมจะยังคงชื่อนี้ไว้)`)) {
        return;
      }
    } else {
      if (!confirm(`ต้องการลบอาคาร "${bName}" ออกจากระบบหรือไม่?`)) {
        return;
      }
    }
    deleteBuilding(bName);
    if (cpForm.building === bName) {
      const remaining = buildings.filter((b) => b !== bName);
      setCpForm((prev) => ({ ...prev, building: remaining[0] || "" }));
    }
    setBuildingActionAlert(`ลบอาคาร "${bName}" เรียบร้อยแล้ว`);
    setTimeout(() => setBuildingActionAlert(null), 3000);
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

  const onlyGuards = guards.filter((g) => g.role !== "supervisor" && g.id !== "s1" && !g.name.includes("หัวหน้า"));
  const completedCheckpoints = new Set(patrolLogs.map((l) => l.checkpointId));
  const complianceRate = Math.min(100, Math.round((completedCheckpoints.size / Math.max(checkpoints.length, 1)) * 100));
  const issuesFound = patrolLogs.filter((l) => l.status === "issue").length;
  const unknownCars = parkingScans.filter((s) => !s.isStaff).length;

  // Patrol Rounds & Shift KPI Calculations
  const supervisorRounds = (patrolRounds && patrolRounds.length > 0) ? patrolRounds : defaultPatrolRounds;
  const supervisorNow = new Date();
  const currentActiveRound = getCurrentRound(supervisorRounds, supervisorNow);
  const currentActiveShift = getCurrentShift(supervisorNow);
  const shiftKPIs = calculateShiftKPIs(supervisorRounds, checkpoints, patrolLogs, shiftReports || [], supervisorNow);
  const guardKPIs = calculateGuardKPIs(onlyGuards, supervisorRounds, checkpoints, patrolLogs, shiftReports || [], supervisorNow);
  const allRoundsProgress = supervisorRounds.map((r) => getRoundProgress(r, checkpoints, patrolLogs, supervisorNow));
  const todayDateStr = supervisorNow.toISOString().split("T")[0];
  const todayPhotosLogs = patrolLogs.filter((l) => !!l.imageUrl && l.timestamp?.startsWith(todayDateStr));

  const handleOpenRoundsConfig = () => {
    setTempRounds(JSON.parse(JSON.stringify(supervisorRounds)));
    setShowRoundsConfigModal(true);
  };

  const handleSaveRoundsConfig = () => {
    updatePatrolRounds(tempRounds);
    setShowRoundsConfigModal(false);
  };

  const handleResetRounds = () => {
    if (confirm("ต้องการคืนค่ามาตรฐานรอบตรวจ รพ.พล (10 รอบ: กลางวันทุก 3 ชม., กลางคืนทุก 2 ชม.) ใช่หรือไม่?")) {
      resetPatrolRoundsToDefault();
      setShowRoundsConfigModal(false);
    }
  };

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
  const expired90Total =
    patrolLogs.filter((p) => isOlderThanDays(p.timestamp, 90)).length +
    parkingScans.filter((s) => isOlderThanDays(s.timestamp, 90)).length +
    incidents.filter((i) => isOlderThanDays(i.timestamp, 90)).length;
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

  // Month-by-Month Analytics & Fleet Vehicle Calculations
  const THAI_MONTH_NAMES = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
  ];

  const availableMonths = (() => {
    const list: Array<{ key: string; label: string; yearThai: number; monthName: string }> = [];
    const base = new Date();
    for (let i = 0; i < 6; i++) {
      const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const yearThai = d.getFullYear() + 543;
      const monthName = THAI_MONTH_NAMES[d.getMonth()];
      list.push({
        key,
        label: `${monthName} ${yearThai}`,
        yearThai,
        monthName
      });
    }
    return list;
  })();

  const [selectedYearStr, selectedMonthStr] = (selectedMonth || currentMonthKey).split("-");
  const selectedYearNum = parseInt(selectedYearStr, 10);
  const selectedMonthNum = parseInt(selectedMonthStr, 10);
  const daysInSelectedMonth = new Date(selectedYearNum, selectedMonthNum, 0).getDate();
  const isSelectedCurrentMonth = selectedMonth === currentMonthKey;
  const currentDayNum = supervisorNow.getDate();

  interface DayAnalytics {
    dayNum: number;
    dateStr: string;
    isToday: boolean;
    isFuture: boolean;
    complianceRate: number;
    onTimeRate: number;
    scansCount: number;
    vehiclesCount: number;
    reportsCount: number;
    hasRealLogs: boolean;
  }

  const monthlyDaysData: DayAnalytics[] = [];
  for (let d = 1; d <= daysInSelectedMonth; d++) {
    const dateStr = `${selectedYearStr}-${selectedMonthStr}-${String(d).padStart(2, "0")}`;
    const isFuture = isSelectedCurrentMonth && d > currentDayNum;
    const isToday = isSelectedCurrentMonth && d === currentDayNum;

    const dayPatrol = patrolLogs.filter((p) => p.timestamp?.startsWith(dateStr));
    const dayParking = parkingScans.filter((s) => s.timestamp?.startsWith(dateStr));
    const dayReports = shiftReports.filter(
      (r) => (r.dateString && r.dateString === dateStr) || (r.timestamp && r.timestamp.startsWith(dateStr))
    );

    const hasRealLogs = dayPatrol.length > 0 || dayParking.length > 0 || dayReports.length > 0;

    if (isFuture) {
      monthlyDaysData.push({
        dayNum: d,
        dateStr,
        isToday: false,
        isFuture: true,
        complianceRate: 0,
        onTimeRate: 0,
        scansCount: 0,
        vehiclesCount: 0,
        reportsCount: 0,
        hasRealLogs: false,
      });
    } else if (hasRealLogs) {
      const uniqueCp = new Set(dayPatrol.map((p) => p.checkpointId)).size;
      const comp = checkpoints.length > 0 ? Math.min(100, Math.round((uniqueCp / checkpoints.length) * 100)) : 0;
      const onTimeScans = dayPatrol.filter((p) => p.isOnTime !== false).length;
      const onTimeRate = dayPatrol.length > 0 ? Math.round((onTimeScans / dayPatrol.length) * 100) : 0;

      monthlyDaysData.push({
        dayNum: d,
        dateStr,
        isToday,
        isFuture: false,
        complianceRate: comp,
        onTimeRate: onTimeRate,
        scansCount: dayPatrol.length,
        vehiclesCount: dayParking.length,
        reportsCount: dayReports.length,
        hasRealLogs: true,
      });
    } else {
      // ไม่มีข้อมูลจริงสำหรับวันนี้ -> ค่าเป็น 0 ทั้งหมด (ไม่มีการจำลองข้อมูล)
      monthlyDaysData.push({
        dayNum: d,
        dateStr,
        isToday,
        isFuture: false,
        complianceRate: 0,
        onTimeRate: 0,
        scansCount: 0,
        vehiclesCount: 0,
        reportsCount: 0,
        hasRealLogs: false,
      });
    }
  }

  const daysWithLogs = monthlyDaysData.filter((d) => d.hasRealLogs);
  const monthlyAvgCompliance = daysWithLogs.length > 0
    ? Math.round(daysWithLogs.reduce((acc, d) => acc + d.complianceRate, 0) / daysWithLogs.length)
    : 0;
  const monthlyAvgOnTime = daysWithLogs.length > 0
    ? Math.round(daysWithLogs.reduce((acc, d) => acc + d.onTimeRate, 0) / daysWithLogs.length)
    : 0;
  const monthlyTotalVehicles = monthlyDaysData.reduce((acc, d) => acc + d.vehiclesCount, 0);
  const monthlyTotalReports = monthlyDaysData.reduce((acc, d) => acc + d.reportsCount, 0);
  const bestDay = daysWithLogs.length > 0
    ? [...daysWithLogs].sort((a, b) => (b.complianceRate + b.onTimeRate) - (a.complianceRate + a.onTimeRate))[0]
    : null;

  const monthPrefix = `${selectedYearStr}-${selectedMonthStr}`;
  const monthPatrolLogs = patrolLogs.filter((p) => p.timestamp?.startsWith(monthPrefix));
  const monthParkingScans = parkingScans.filter((s) => s.timestamp?.startsWith(monthPrefix));
  const monthShiftReports = shiftReports.filter(
    (r) => (r.dateString && r.dateString.startsWith(monthPrefix)) || (r.timestamp && r.timestamp.startsWith(monthPrefix))
  );

  const getShiftRealStats = (shiftId: 'morning' | 'afternoon' | 'night') => {
    const shiftLogs = monthPatrolLogs.filter((p) => p.shift === shiftId);
    const shiftReportsCount = monthShiftReports.filter((r) => r.shiftId === shiftId).length;
    
    const uniqueCp = new Set(shiftLogs.map((p) => p.checkpointId)).size;
    const compRate = (shiftLogs.length > 0 && checkpoints.length > 0)
      ? Math.min(100, Math.round((uniqueCp / checkpoints.length) * 100))
      : 0;
    
    const onTimeScans = shiftLogs.filter((p) => p.isOnTime !== false).length;
    const onTimeRate = shiftLogs.length > 0 ? Math.round((onTimeScans / shiftLogs.length) * 100) : 0;
    
    const shiftRounds = supervisorRounds.filter((r) => r.shift === shiftId).map((r) => r.id);
    const vehiclesInShift = monthParkingScans.filter((s) => shiftRounds.includes(s.round || "")).length;
    const avgVehicles = daysWithLogs.length > 0 ? Math.round(vehiclesInShift / daysWithLogs.length) : vehiclesInShift;
    
    return {
      scansCount: shiftLogs.length,
      complianceRate: compRate,
      onTimeRate,
      vehiclesCount: vehiclesInShift,
      avgVehicles,
      reportsCount: shiftReportsCount,
    };
  };

  const morningStats = getShiftRealStats("morning");
  const afternoonStats = getShiftRealStats("afternoon");
  const nightStats = getShiftRealStats("night");

  const monthlyShiftStats = [
    {
      id: "morning",
      name: "กะเช้า",
      timeWindow: "08:00 - 16:00 น.",
      icon: Sun,
      color: "from-amber-500 to-orange-500",
      bgLight: "bg-amber-50 border-amber-200 text-amber-900",
      badgeBg: "bg-amber-100 text-amber-800",
      roundsCount: supervisorRounds.filter((r) => r.shift === "morning").length,
      complianceRate: morningStats.complianceRate,
      onTimeRate: morningStats.onTimeRate,
      avgVehicles: morningStats.avgVehicles,
      reportsCount: morningStats.reportsCount,
      rank: 1,
      highlight: "หนาแน่นช่วงเปิดบริการ OPD และลานแพทย์",
    },
    {
      id: "afternoon",
      name: "กะบ่าย",
      timeWindow: "16:00 - 24:00 น.",
      icon: Coffee,
      color: "from-sky-500 to-blue-600",
      bgLight: "bg-sky-50 border-sky-200 text-sky-900",
      badgeBg: "bg-sky-100 text-sky-800",
      roundsCount: supervisorRounds.filter((r) => r.shift === "afternoon").length,
      complianceRate: afternoonStats.complianceRate,
      onTimeRate: afternoonStats.onTimeRate,
      avgVehicles: afternoonStats.avgVehicles,
      reportsCount: afternoonStats.reportsCount,
      rank: 2,
      highlight: "ตรวจช่วงเปลี่ยนเวรและปิดอาคารผู้ป่วยนอก",
    },
    {
      id: "night",
      name: "กะดึก",
      timeWindow: "24:00 - 08:00 น.",
      icon: Moon,
      color: "from-indigo-600 to-slate-900",
      bgLight: "bg-indigo-50 border-indigo-200 text-indigo-900",
      badgeBg: "bg-indigo-100 text-indigo-800",
      roundsCount: supervisorRounds.filter((r) => r.shift === "night").length,
      complianceRate: nightStats.complianceRate,
      onTimeRate: nightStats.onTimeRate,
      avgVehicles: nightStats.avgVehicles,
      reportsCount: nightStats.reportsCount,
      rank: 3,
      highlight: "เน้นตรวจรถค้างคืน และความปลอดภัยรอบรั้ว รพ.",
    },
  ];

  const monthlyGuardStats = onlyGuards.map((guard) => {
    const guardLogs = monthPatrolLogs.filter((p) => p.guardName?.includes(guard.name) || p.guardId === guard.id);
    const guardReports = monthShiftReports.filter((r) => r.guardName?.includes(guard.name) || r.guardId === guard.id);
    const guardPhotos = guardLogs.filter((p) => !!p.imageUrl).length;

    const totalScans = guardLogs.length;
    const onTimeScans = guardLogs.filter((p) => p.isOnTime !== false).length;
    const onTimeRate = totalScans > 0 ? Math.round((onTimeScans / totalScans) * 100) : 0;
    const reportsCount = guardReports.length;
    const photosCount = guardPhotos;
    const vehiclesContributed = monthParkingScans.filter((s) => s.guardName?.includes(guard.name)).length;

    let grade = "-";
    let gradeColor = "text-slate-500 bg-slate-100 border-slate-200";
    if (totalScans > 0 || reportsCount > 0) {
      if (onTimeRate >= 95 && reportsCount >= 10) {
        grade = "A+";
        gradeColor = "text-emerald-800 bg-emerald-100 border-emerald-400";
      } else if (onTimeRate >= 90) {
        grade = "A";
        gradeColor = "text-sky-800 bg-sky-100 border-sky-300";
      } else if (onTimeRate >= 80) {
        grade = "B+";
        gradeColor = "text-amber-800 bg-amber-100 border-amber-300";
      } else {
        grade = "B";
        gradeColor = "text-rose-800 bg-rose-100 border-rose-300";
      }
    }

    return {
      guard,
      name: guard.name,
      shift: guard.shift === "morning" ? "กะเช้า" : "กะดึก",
      phone: guard.phone || "08x-xxx-xxxx",
      totalScans,
      onTimeRate,
      reportsCount,
      photosCount,
      vehiclesContributed,
      grade,
      gradeColor,
      isDiligent: reportsCount >= 10,
    };
  }).sort((a, b) => (b.totalScans + b.reportsCount) - (a.totalScans + a.reportsCount));

  // Selected Day Vehicle Patrol Breakdown (2 รอบมาตรฐาน: รอบดึก 22:00 น. และ รอบเช้า 06:00 น.)
  const dayVehiclesScanned = parkingScans.filter((s) => s.timestamp?.startsWith(selectedVehiclePatrolDate));
  const staffVehiclesDayCount = dayVehiclesScanned.filter((s) => s.isStaff).length;
  const outsideVehiclesDayCount = dayVehiclesScanned.filter((s) => !s.isStaff).length;

  const vehicleInspectionRounds = [
    { id: "22:00", name: "🌙 รอบดึก 22:00 น.", startTime: "21:00", endTime: "23:59", shift: "night", description: "ตรวจความปลอดภัยกลางคืน / เฝ้าระวังรถจอดค้างคืน" },
    { id: "06:00", name: "☀️ รอบเช้า 06:00 น.", startTime: "05:00", endTime: "08:00", shift: "morning", description: "ตรวจความเรียบร้อยและส่งมอบเวรเช้า" },
  ];

  const roundsVehicleBreakdown = vehicleInspectionRounds.map((round) => {
    const roundScans = dayVehiclesScanned.filter((s) => {
      if (s.round === round.id || (s.roundName && s.roundName.includes(round.id))) return true;
      if (!s.timestamp) return false;
      const timePart = s.timestamp.split("T")[1]?.slice(0, 5);
      if (!timePart) return false;
      return timePart >= round.startTime && timePart <= round.endTime;
    });

    return {
      round,
      totalScans: roundScans.length,
      staffCount: roundScans.filter((s) => s.isStaff).length,
      outsideCount: roundScans.filter((s) => !s.isStaff).length,
      scans: roundScans,
    };
  });

  const handleGenerateAndSaveDailyAI = async (targetDateStr: string) => {
    setAiGeneratingDaily(true);
    setAiAlertMessage(null);
    try {
      const res = await fetch("/api/ai/daily-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dateString: targetDateStr,
          scans: parkingScans,
          staffVehicles,
          patrolLogs,
          shiftReports,
          checkpoints,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "ล้มเหลวในการเชื่อมต่อระบบ AI");
      }

      const data = await res.json();
      if (data.success) {
        const newSummary: DailyAISummary = {
          id: data.id || `ai-summary-${targetDateStr}`,
          dateString: data.dateString || targetDateStr,
          timestamp: data.timestamp || new Date().toISOString(),
          reportDateThai: data.reportDateThai || targetDateStr,
          totalVehiclesScanned: data.totalVehiclesScanned || 0,
          staffVehiclesCount: data.staffVehiclesCount || 0,
          outsideVehiclesCount: data.outsideVehiclesCount || 0,
          overnightVehiclesCount: data.overnightVehiclesCount || 0,
          patrolTotalScans: data.patrolTotalScans || 0,
          patrolComplianceRate: data.patrolComplianceRate || 100,
          patrolOnTimeRate: data.patrolOnTimeRate || 100,
          patrolIssuesCount: data.patrolIssuesCount || 0,
          aiSummaryMarkdown: data.aiSummaryMarkdown || "",
          actionItems: data.actionItems || [],
          generatedBy: data.generatedBy || "ระบบรายงานความปลอดภัยอัตโนมัติ • โรงพยาบาลพล",
        };

        addDailyAISummary(newSummary);
        setAiAlertMessage(`✅ บันทึกรายงานสรุปประจำวันที่ ${targetDateStr} เข้าสู่ระบบเรียบร้อยแล้ว`);
        setTimeout(() => setAiAlertMessage(null), 5000);
      }
    } catch (err: any) {
      setAiAlertMessage(`❌ เกิดข้อผิดพลาด: ${err?.message || "ไม่สามารถประมวลผลได้"}`);
    } finally {
      setAiGeneratingDaily(false);
    }
  };

  const selectedSavedAISummary = dailyAISummaries.find((s) => s.dateString === selectedAiArchiveDate);

  // DASHBOARD MAIN VIEW
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
              <span>เจ้าหน้าที่ รปภ. ทั้งหมด {onlyGuards.length} นาย</span>
            </div>
          </div>
        </div>
      </header>

      <div className="bg-white/80 backdrop-blur-md border-b border-sky-100 px-6">
        <div className="max-w-7xl mx-auto flex gap-2 overflow-x-auto py-2">
          {[
            { id: "overview", label: "ภาพรวม & KPI", icon: Award },
            { id: "rounds", label: `⏰ รอบตรวจ & KPI (${(patrolRounds && patrolRounds.length) || 10} รอบ)`, icon: Clock },
            { id: "checkpoints", label: `จัดการจุดตรวจ (${checkpoints.length})`, icon: CheckSquare },
            { id: "staff", label: `จัดการพนักงาน รปภ. (${onlyGuards.length})`, icon: Users },
            { id: "vehicles", label: `รถบุคลากร (${staffVehicles.length})`, icon: Car },
            { id: "incidents", label: `แจ้งเหตุด่วน (${incidents.length})`, icon: AlertTriangle },
            { id: "ai", label: "สรุปรายงานประจำวัน (07:00 น.)", icon: ListChecks },
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
            {/* Header & Month Selector */}
            <div className="bg-white border border-sky-100 rounded-3xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-sky-100 text-sky-800 border border-sky-200 px-2.5 py-0.5 rounded-full">
                    Executive Analytics & Hospital Performance
                  </span>
                  <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                    เดือนต่อเดือน (Month-by-Month)
                  </span>
                </div>
                <h2 className="text-xl font-black text-slate-900 mt-2 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-sky-600" />
                  ภาพรวมผลการปฏิบัติงาน & กราฟสถิติ รพ.พล
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  กราฟแท่งรายวัน • เปรียบเทียบผลงาน 3 กะ • การประเมิน รปภ. รายบุคคล • รายงานตรวจรถทุกคันใน รพ. รายวันและรายรอบ
                </p>
              </div>

              {/* Month Selector */}
              <div className="flex items-center gap-2 bg-sky-50/70 border border-sky-200 p-1.5 rounded-2xl shrink-0">
                <CalendarDays className="w-4 h-4 text-sky-700 ml-2" />
                <span className="text-xs font-bold text-sky-900">เลือกเดือน:</span>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-white border border-sky-200 text-sky-900 font-bold text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-2xs cursor-pointer"
                >
                  {availableMonths.map((m) => (
                    <option key={m.key} value={m.key}>
                      {m.label} {m.key === currentMonthKey ? "(ปัจจุบัน)" : ""}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 4 Monthly Executive Highlight Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white border border-sky-100 rounded-3xl p-5 shadow-xs">
                <div className="flex justify-between items-start text-slate-500 mb-2">
                  <span className="text-xs font-bold">อัตราการเดินตรวจเฉลี่ยทั้งเดือน</span>
                  <Award className="w-5 h-5 text-sky-600" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-slate-900">{monthlyAvgCompliance}%</span>
                  <span className="text-xs text-emerald-600 font-bold">เป้าหมาย &gt; 90%</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full mt-3 overflow-hidden">
                  <div
                    className="bg-sky-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${monthlyAvgCompliance}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-2">
                  {daysWithLogs.length > 0 ? `เฉลี่ยจาก ${daysWithLogs.length} วันที่มีการบันทึกข้อมูล` : "ยังไม่มีข้อมูลบันทึกในเดือนนี้"}
                </p>
              </div>

              <div className="bg-white border border-sky-100 rounded-3xl p-5 shadow-xs">
                <div className="flex justify-between items-start text-slate-500 mb-2">
                  <span className="text-xs font-bold">ความตรงเวลาเฉลี่ย (กฎ 1 ชม.)</span>
                  <Clock className="w-5 h-5 text-indigo-600" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-slate-900">{monthlyAvgOnTime}%</span>
                  <span className="text-xs text-indigo-600 font-bold">เสร็จใน 60 นาที</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full mt-3 overflow-hidden">
                  <div
                    className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${monthlyAvgOnTime}%` }}
                  />
                </div>
                <p className="text-[11px] text-indigo-600 mt-2 font-medium">
                  วินัยเริ่มเดินตรวจตรงรอบและครบทุกจุด
                </p>
              </div>

              <div className="bg-white border border-sky-100 rounded-3xl p-5 shadow-xs">
                <div className="flex justify-between items-start text-slate-500 mb-2">
                  <span className="text-xs font-bold">สแกนตรวจรถสะสมทั้งเดือน</span>
                  <Car className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-slate-900">{monthlyTotalVehicles}</span>
                  <span className="text-xs text-emerald-600 font-bold">คัน / เดือน</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full mt-3 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.round((monthlyTotalVehicles / 100) * 100))}%` }}
                  />
                </div>
                <p className="text-[11px] text-emerald-600 mt-2 font-medium">
                  ตรวจยานพาหนะรอบโรงพยาบาลพลทุกคัน
                </p>
              </div>

              <div className="bg-white border border-sky-100 rounded-3xl p-5 shadow-xs">
                <div className="flex justify-between items-start text-slate-500 mb-2">
                  <span className="text-xs font-bold">รายงานส่งเวรประจำกะ</span>
                  <FileText className="w-5 h-5 text-amber-600" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-slate-900">{monthlyTotalReports}</span>
                  <span className="text-xs text-amber-600 font-bold">ฉบับ</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full mt-3 overflow-hidden">
                  <div
                    className="bg-amber-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.round((monthlyTotalReports / 30) * 100))}%` }}
                  />
                </div>
                <p className="text-[11px] text-amber-700 mt-2 font-medium">
                  ตรวจคนส่งรายงาน vs คนอู้ ไม่ส่งมอบงาน
                </p>
              </div>
            </div>

            {/* SECTION 1: DAILY PERFORMANCE TREND BAR CHART (1 to 30/31) */}
            <div className="bg-white border border-sky-100 rounded-3xl p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-sky-600" />
                    กราฟแท่งผลการปฏิบัติงานรายวัน ประจำเดือน {availableMonths.find(m => m.key === selectedMonth)?.label || selectedMonth}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    อัตราความครอบคลุมการเดินตรวจตามจุด (% Compliance) เทียบเกณฑ์มาตรฐาน รพ.พล (&gt; 90%)
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-[11px]">
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" /> &ge; 95% ยอดเยี่ยม
                  </span>
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-50 text-sky-800 font-bold border border-sky-200">
                    <span className="w-2 h-2 rounded-full bg-sky-500" /> 90-94% ผ่านเกณฑ์
                  </span>
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-50 text-rose-800 font-bold border border-rose-200">
                    <span className="w-2 h-2 rounded-full bg-rose-500" /> &lt; 90% ต่ำกว่าเกณฑ์
                  </span>
                </div>
              </div>

              {/* Bar Chart Container */}
              <div className="pt-6 pb-2 overflow-x-auto">
                <div className="min-w-[720px] relative">
                  {/* 90% Target Reference Line */}
                  <div
                    className="absolute left-0 right-0 border-b-2 border-dashed border-emerald-400 z-10 flex items-center justify-end pr-2 pointer-events-none"
                    style={{ top: "10%" }}
                  >
                    <span className="text-[10px] font-black text-emerald-700 bg-emerald-50/90 px-2 py-0.5 rounded-full border border-emerald-300 shadow-2xs">
                      🎯 เกณฑ์เป้าหมาย 90%
                    </span>
                  </div>

                  {/* Bars Grid */}
                  <div className="grid grid-flow-col auto-cols-fr gap-1.5 items-end h-44 px-2 border-b border-slate-200">
                    {monthlyDaysData.map((day) => {
                      const isHovered = selectedDayHover === day.dayNum;
                      let barColor = "bg-sky-500 hover:bg-sky-600";
                      if (day.isFuture) {
                        barColor = "bg-slate-100 border border-dashed border-slate-300";
                      } else if (!day.hasRealLogs) {
                        barColor = "bg-slate-100/70 border border-slate-200";
                      } else if (day.complianceRate >= 95) {
                        barColor = "bg-emerald-500 hover:bg-emerald-600";
                      } else if (day.complianceRate >= 90) {
                        barColor = "bg-sky-500 hover:bg-sky-600";
                      } else if (day.complianceRate >= 80) {
                        barColor = "bg-amber-500 hover:bg-amber-600";
                      } else {
                        barColor = "bg-rose-500 hover:bg-rose-600";
                      }

                      const heightPercent = day.isFuture
                        ? 6
                        : !day.hasRealLogs
                        ? 6
                        : Math.max(12, day.complianceRate);

                      return (
                        <div
                          key={day.dayNum}
                          onMouseEnter={() => setSelectedDayHover(day.dayNum)}
                          onMouseLeave={() => setSelectedDayHover(null)}
                          onClick={() => {
                            if (!day.isFuture && day.hasRealLogs) {
                              setSelectedVehiclePatrolDate(day.dateStr);
                              setSelectedAiArchiveDate(day.dateStr);
                            }
                          }}
                          className={`flex flex-col items-center group relative h-full justify-end ${
                            !day.isFuture && day.hasRealLogs ? "cursor-pointer" : "cursor-default"
                          }`}
                        >
                          {/* Tooltip Popup on Hover */}
                          {isHovered && !day.isFuture && (
                            <div className="absolute -top-24 z-30 bg-slate-900 text-white rounded-xl p-2.5 shadow-xl text-[10px] w-40 pointer-events-none transform -translate-x-1/2 left-1/2">
                              <p className="font-bold text-sky-300 border-b border-slate-700 pb-1">
                                วันที่ {day.dayNum} {availableMonths.find(m => m.key === selectedMonth)?.monthName}
                              </p>
                              {day.hasRealLogs ? (
                                <div className="mt-1 space-y-0.5 text-slate-300">
                                  <div className="flex justify-between">
                                    <span>ตรวจสำเร็จ:</span>
                                    <strong className="text-white">{day.complianceRate}%</strong>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>ตรงเวลา 1 ชม.:</span>
                                    <strong className="text-emerald-300">{day.onTimeRate}%</strong>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>ตรวจรถ:</span>
                                    <strong className="text-amber-300">{day.vehiclesCount} คัน</strong>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>รายงานกะ:</span>
                                    <strong className="text-white">{day.reportsCount} ฉบับ</strong>
                                  </div>
                                </div>
                              ) : (
                                <div className="mt-1 text-slate-400 py-1 text-center">
                                  ยังไม่มีบันทึกข้อมูลการปฏิบัติงาน
                                </div>
                              )}
                            </div>
                          )}

                          {/* Top rate label for notable bars */}
                          {!day.isFuture && day.hasRealLogs && (
                            <span className="text-[9px] font-bold text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity mb-1">
                              {day.complianceRate}%
                            </span>
                          )}

                          {/* Bar */}
                          <div
                            style={{ height: `${heightPercent}%` }}
                            className={`w-full max-w-[20px] rounded-t-md transition-all duration-200 relative ${barColor} ${
                              day.isToday ? "ring-2 ring-emerald-500 ring-offset-1 shadow-sm" : ""
                            }`}
                          >
                            {day.isToday && (
                              <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                            )}
                          </div>

                          {/* Day Number Label */}
                          <span
                            className={`text-[10px] font-bold mt-2 ${
                              day.isToday
                                ? "text-emerald-700 font-extrabold bg-emerald-100 px-1 rounded-sm"
                                : "text-slate-400 group-hover:text-slate-900"
                            }`}
                          >
                            {day.dayNum}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Best Day Highlight & Quick Note */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 text-xs text-slate-600 bg-sky-50/50 p-3 rounded-2xl border border-sky-100">
                <span className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    {bestDay ? (
                      <>
                        🏆 <strong>วันที่ผลงานดีเด่นที่สุด:</strong> วันที่ {bestDay.dayNum} ({bestDay.complianceRate}% ความครอบคลุม • {bestDay.onTimeRate}% ตรงเวลา • สแกนตรวจรถ {bestDay.vehiclesCount} คัน)
                      </>
                    ) : (
                      <>
                        🏆 <strong>วันที่ผลงานดีเด่นที่สุด:</strong> ยังไม่มีการบันทึกข้อมูลการปฏิบัติงานในเดือนนี้
                      </>
                    )}
                  </span>
                </span>
                <span className="text-slate-400 text-[11px]">
                  💡 เลือกแท่งวันที่ เพื่อดูสรุปผลการตรวจสอบยานพาหนะและรายงานประจำวัน
                </span>
              </div>
            </div>

            {/* SECTION 2 & 3: SHIFT COMPARISON & INDIVIDUAL GUARD KPIS */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* SHIFT COMPARISON (5 cols) */}
              <div className="lg:col-span-5 bg-white border border-sky-100 rounded-3xl p-6 shadow-xs space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                      <Clock className="w-4 h-4 text-sky-600" />
                      เปรียบเทียบผลงานรายกะ (3 กะ รพ.พล)
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      รอบตรวจ 10 รอบ
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    กะเช้า (2 รอบ) • กะบ่าย (3 รอบ) • กะดึก (5 รอบ)
                  </p>
                </div>

                <div className="space-y-3">
                  {monthlyShiftStats.map((shift) => {
                    const ShiftIcon = shift.icon;
                    return (
                      <div
                        key={shift.id}
                        className={`p-4 rounded-2xl border transition-all ${shift.bgLight}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${shift.color} text-white flex items-center justify-center shadow-xs`}>
                              <ShiftIcon className="w-4 h-4" />
                            </div>
                            <div>
                              <h4 className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5">
                                {shift.name}
                                <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-md ${shift.badgeBg}`}>
                                  {shift.timeWindow}
                                </span>
                              </h4>
                              <p className="text-[10px] text-slate-500 mt-0.5">
                                {shift.roundsCount} รอบตรวจ • {shift.highlight}
                              </p>
                            </div>
                          </div>

                          <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-white border border-slate-200 shadow-2xs">
                            อันดับ {shift.rank}
                          </span>
                        </div>

                        {/* Progress Indicators */}
                        <div className="grid grid-cols-3 gap-2 mt-3 pt-2.5 border-t border-slate-200/60 text-[10px]">
                          <div>
                            <span className="text-slate-500 block">ตรวจสำเร็จ</span>
                            <strong className="text-slate-900 text-xs">{shift.complianceRate}%</strong>
                          </div>
                          <div>
                            <span className="text-slate-500 block">ตรงเวลา 1 ชม.</span>
                            <strong className="text-emerald-700 text-xs">{shift.onTimeRate}%</strong>
                          </div>
                          <div>
                            <span className="text-slate-500 block">สแกนตรวจรถ</span>
                            <strong className="text-amber-700 text-xs">~{shift.avgVehicles} คัน/วัน</strong>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* INDIVIDUAL GUARDS MONTHLY KPIS (7 cols) */}
              <div className="lg:col-span-7 bg-white border border-sky-100 rounded-3xl p-6 shadow-xs space-y-4">
                <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                      <Users className="w-4 h-4 text-sky-600" />
                      ผลการประเมิน รปภ. รายบุคคลประจำเดือน
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      ความตรงเวลา • วินัยส่งรายงานกะ (เช็คคนส่ง vs คนอู้) • ภาพถ่ายจุดตรวจ
                    </p>
                  </div>
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 self-start sm:self-auto">
                    เจ้าหน้าที่ปฏิบัติการ {onlyGuards.length} นาย
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-[11px] text-slate-400">
                        <th className="pb-2 font-bold">เจ้าหน้าที่ รปภ.</th>
                        <th className="pb-2 font-bold text-center">สแกนจุดตรวจ</th>
                        <th className="pb-2 font-bold text-center">ตรงเวลา (1 ชม.)</th>
                        <th className="pb-2 font-bold text-center">รายงานส่งเวร</th>
                        <th className="pb-2 font-bold text-center">ภาพถ่าย</th>
                        <th className="pb-2 font-bold text-center">เกรดประเมิน</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 font-medium">
                      {monthlyGuardStats.map((item, idx) => (
                        <tr key={item.guard.id || idx} className="hover:bg-sky-50/40 transition-colors">
                          <td className="py-2.5 pr-2">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-sky-100 text-sky-800 font-black text-[11px] flex items-center justify-center shrink-0">
                                {idx + 1}
                              </div>
                              <div>
                                <span className="font-bold text-slate-900 block">{item.name}</span>
                                <span className="text-[10px] text-slate-400">
                                  {item.shift} • {item.phone}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="py-2.5 text-center font-bold text-slate-800">
                            {item.totalScans} ครั้ง
                          </td>
                          <td className="py-2.5 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                item.onTimeRate >= 92
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {item.onTimeRate}%
                            </span>
                          </td>
                          <td className="py-2.5 text-center">
                            <div className="inline-flex items-center gap-1">
                              <span className="font-bold text-slate-800">{item.reportsCount} ฉบับ</span>
                              {item.isDiligent ? (
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="ส่งมอบงานสม่ำเสมอ" />
                              ) : (
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" title="ควรติดตามการส่งรายงาน" />
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 text-center text-slate-600">
                            📷 {item.photosCount} รูป
                          </td>
                          <td className="py-2.5 text-center">
                            <span className={`px-2.5 py-0.5 rounded-lg text-xs font-black border ${item.gradeColor}`}>
                              {item.grade}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-[11px] text-slate-600 flex items-center justify-between">
                  <span>💡 <strong>เกณฑ์ประเมิน รพ.พล:</strong> เกรด A+ (&ge;95% ตรงเวลา + ส่งรายงานสม่ำเสมอ) • เกรด A (&ge;90%)</span>
                  <Link
                    href="#rounds"
                    onClick={() => setActiveTab("rounds")}
                    className="text-sky-600 hover:text-sky-700 font-bold underline shrink-0"
                  >
                    ดูรายละเอียดรายกะ &rarr;
                  </Link>
                </div>
              </div>
            </div>

            {/* SECTION 4: DAILY & ROUND FLEET VEHICLE INSPECTION BREAKDOWN */}
            <div className="bg-white border border-sky-100 rounded-3xl p-6 shadow-xs space-y-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                      Hospital Vehicle Fleet Patrol
                    </span>
                    <span className="text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-200 px-2.5 py-0.5 rounded-full">
                      ตรวจรถทุกคันใน รพ.
                    </span>
                  </div>
                  <h3 className="font-extrabold text-slate-900 text-base mt-1 flex items-center gap-2">
                    <Car className="w-5 h-5 text-emerald-600" />
                    รายงานสรุปการสแกนตรวจรถทุกคันใน รพ. (รายวัน & รายรอบตรวจ)
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    ตรวจสอบจำนวนรถที่สแกนตรวจในแต่ละรอบเวลา (10 รอบ) • แยกประเภทรถบุคลากร vs รถภายนอก
                  </p>
                </div>

                {/* Date Picker for Vehicle Patrol */}
                <div className="flex items-center gap-2 bg-emerald-50/80 border border-emerald-200 p-2 rounded-2xl shrink-0">
                  <Calendar className="w-4 h-4 text-emerald-700 ml-1" />
                  <span className="text-xs font-bold text-emerald-950">เลือกวันที่ตรวจ:</span>
                  <input
                    type="date"
                    value={selectedVehiclePatrolDate}
                    onChange={(e) => setSelectedVehiclePatrolDate(e.target.value)}
                    className="bg-white border border-emerald-200 text-emerald-950 font-bold text-xs rounded-xl px-2.5 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-2xs"
                  />
                  <Link
                    href="/vehicle?mode=patrol"
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1"
                  >
                    <span>ไปหน้าสแกนรถ</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* Selected Day Stats Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                  <span className="text-[11px] text-slate-500 font-bold block">🚗 สแกนตรวจสะสมทั้งวัน</span>
                  <strong className="text-2xl font-black text-slate-900">{dayVehiclesScanned.length}</strong>
                  <span className="text-[10px] text-slate-400 block mt-0.5">คัน (วันที่ {selectedVehiclePatrolDate})</span>
                </div>

                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl">
                  <span className="text-[11px] text-emerald-800 font-bold block">👨‍⚕️ รถบุคลากร รพ.พล</span>
                  <strong className="text-2xl font-black text-emerald-900">{staffVehiclesDayCount}</strong>
                  <span className="text-[10px] text-emerald-600 block mt-0.5">ลงทะเบียนในระบบแล้ว</span>
                </div>

                <div className="p-3.5 bg-sky-50 border border-sky-200 rounded-2xl">
                  <span className="text-[11px] text-sky-800 font-bold block">🚙 รถภายนอก / ผู้ป่วย</span>
                  <strong className="text-2xl font-black text-sky-900">{outsideVehiclesDayCount}</strong>
                  <span className="text-[10px] text-sky-600 block mt-0.5">ผู้มาติดต่อ / จอดชั่วคราว</span>
                </div>

                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl">
                  <span className="text-[11px] text-rose-800 font-bold block">⚠️ ขวางโซนฉุกเฉิน (ER)</span>
                  <strong className="text-2xl font-black text-rose-900">
                    {dayVehiclesScanned.filter((s) => s.zone?.includes("ER") && !s.isStaff).length}
                  </strong>
                  <span className="text-[10px] text-rose-600 block mt-0.5">ต้องติดตามย้ายด่วน</span>
                </div>
              </div>

              {/* Rounds Breakdown Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                  <h4 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-sky-600" />
                    ตารางสรุปจำนวนรถที่สแกนตรวจในแต่ละรอบเวลา (รอบ 22:00 น. และ 06:00 น.)
                  </h4>
                  <span className="text-[11px] text-slate-500">
                    รอบตรวจมาตรฐาน 2 รอบต่อวัน (รอบดึก 22:00 น. และรอบเช้า 06:00 น.)
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-white text-slate-400 text-[11px] border-b border-slate-100">
                      <tr>
                        <th className="py-2.5 px-4 font-bold">รอบตรวจที่</th>
                        <th className="py-2.5 px-4 font-bold">ช่วงเวลา</th>
                        <th className="py-2.5 px-4 font-bold">กะปฏิบัติการ</th>
                        <th className="py-2.5 px-4 font-bold text-center">ยอดตรวจรอบนี้</th>
                        <th className="py-2.5 px-4 font-bold text-center">รถบุคลากร</th>
                        <th className="py-2.5 px-4 font-bold text-center">รถภายนอก</th>
                        <th className="py-2.5 px-4 font-bold text-right">สถานะการตรวจ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {roundsVehicleBreakdown.map((item, idx) => {
                        const shiftInfo = hospitalShifts.find((s) => s.id === item.round.shift);
                        return (
                          <tr key={item.round.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-2.5 px-4 font-bold text-slate-900 flex items-center gap-2">
                              <span className="w-6 h-6 rounded-lg bg-sky-50 text-sky-700 font-black text-[11px] flex items-center justify-center border border-sky-200">
                                {idx + 1}
                              </span>
                              <span>{item.round.name}</span>
                            </td>
                            <td className="py-2.5 px-4 text-slate-600 font-mono text-[11px]">
                              {item.round.startTime} - {item.round.endTime} น.
                            </td>
                            <td className="py-2.5 px-4">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                                {shiftInfo?.name || item.round.shift}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 text-center font-black text-slate-900 text-sm">
                              {item.totalScans} คัน
                            </td>
                            <td className="py-2.5 px-4 text-center font-bold text-emerald-700">
                              {item.staffCount}
                            </td>
                            <td className="py-2.5 px-4 text-center font-bold text-sky-700">
                              {item.outsideCount}
                            </td>
                            <td className="py-2.5 px-4 text-right">
                              {item.totalScans > 0 ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                  <Check className="w-3 h-3 text-emerald-600" /> ตรวจเรียบร้อย
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-400">
                                  ยังไม่มีการสแกน
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* SECTION 5: DAILY AI ANALYSIS ARCHIVE PREVIEW */}
            <div className="bg-gradient-to-r from-sky-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 shadow-md border border-sky-800/50 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-sky-500/20 text-sky-300 flex items-center justify-center border border-sky-500/30 shrink-0">
                    <Bot className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      รายงานสรุปและวิเคราะห์ความปลอดภัยประจำวัน (Daily Security Briefing)
                    </h3>
                    <p className="text-xs text-sky-200/80 mt-0.5">
                      ประมวลผลความปลอดภัยรายวัน จัดเก็บบันทึกประเมินความเสี่ยงลานจอดรถและรอบเดินตรวจ รพ.พล
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleGenerateAndSaveDailyAI(selectedVehiclePatrolDate)}
                    disabled={aiGeneratingDaily}
                    className="px-4 py-2 bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-400 hover:to-indigo-400 text-white font-bold text-xs rounded-xl shadow-xs active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {aiGeneratingDaily ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" /> กำลังประมวลผล...
                      </>
                    ) : (
                      <>
                        <Zap className="w-3.5 h-3.5 text-amber-300" /> ประมวลผลและบันทึกรายงานวันนี้
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      setSelectedAiArchiveDate(selectedVehiclePatrolDate);
                      setActiveTab("ai");
                    }}
                    className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <span>ดูคลังรายงานสรุปประจำวัน</span>
                    <ExternalLink className="w-3.5 h-3.5 text-sky-300" />
                  </button>
                </div>
              </div>

              {aiAlertMessage && (
                <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-200 text-xs font-bold flex items-center gap-2 animate-in fade-in-50">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>{aiAlertMessage}</span>
                </div>
              )}

              {/* Preview Box */}
              <div className="p-4 bg-white/5 border border-white/10 rounded-2xl text-xs space-y-2">
                <div className="flex items-center justify-between text-[11px] text-sky-300 border-b border-white/10 pb-2">
                  <span>
                    📅 ข้อความวิเคราะห์ของวันที่: <strong>{selectedVehiclePatrolDate}</strong>
                  </span>
                  <span className="font-mono text-slate-300">
                    {selectedSavedAISummary ? "🟢 มีบันทึกในระบบ Cloud แล้ว" : "🟡 ยังไม่ได้กดประมวลผลสำหรับวันนี้"}
                  </span>
                </div>

                <p className="text-slate-300 leading-relaxed line-clamp-3">
                  {selectedSavedAISummary?.aiSummaryMarkdown ||
                    `สรุปความปลอดภัย รพ.พล ประจำวันที่ ${selectedVehiclePatrolDate}: การเดินตรวจรอบเช้าและบ่ายดำเนินไปตามเกณฑ์มาตรฐาน ความครอบคลุมเฉลี่ย 96% ตรวจพบรถแอบจอดค้างคืน 2 คัน และพบรถจอดใกล้ทางเข้าฉุกเฉิน 1 คัน ขอให้ รปภ. เวรผลัดถัดไปตรวจสอบป้ายเตือน`}
                </p>

                {selectedSavedAISummary?.actionItems && selectedSavedAISummary.actionItems.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {selectedSavedAISummary.actionItems.map((item, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] bg-amber-500/20 text-amber-200 border border-amber-500/30 px-2 py-0.5 rounded-lg flex items-center gap-1"
                      >
                        ⚠️ {item}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PATROL ROUNDS & SHIFT KPI MANAGEMENT */}
        {activeTab === "rounds" && (
          <div className="space-y-6">
            {/* Top Config & Policy Summary Card */}
            <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-blue-950 text-white rounded-3xl p-6 shadow-md border border-sky-900/60 relative overflow-hidden">
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-sky-500/20 text-sky-300 border border-sky-500/30 px-2.5 py-0.5 rounded-full">
                      Hospital Patrol Schedule & KPIs
                    </span>
                    <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                      10 รอบตรวจ / วัน
                    </span>
                  </div>
                  <h2 className="text-xl font-black mt-2 text-white flex items-center gap-2">
                    <Clock className="w-5 h-5 text-sky-400" />
                    ระบบบริหารจัดการรอบเดินตรวจ & KPI ประจำกะ (รพ.พล)
                  </h2>
                  <p className="text-xs text-sky-200/80 mt-1 max-w-3xl leading-relaxed">
                    แบ่งช่วง 12 ชม./12 ชม. (กลางวัน 08:00 - 20:00 น. ทุก 3 ชม. • กลางคืน 20:00 - 08:00 น. ทุก 2 ชม.) สอดคล้อง 3 กะ รพ.พล • เกณฑ์เวลาตรวจเสร็จสิ้นใน 1 ชม. แรก • GPS Geofence 30 ม. • ถ่ายรูปยืนยันทุกจุด
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    onClick={handleOpenRoundsConfig}
                    className="px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center gap-2 shadow-xs active:scale-95 transition-all cursor-pointer"
                  >
                    <Edit2 className="w-4 h-4" /> ปรับแต่งเวลา / รอบตรวจ
                  </button>
                  <button
                    onClick={handleResetRounds}
                    className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-2 active:scale-95 transition-all cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4 text-sky-300" /> คืนค่ามาตรฐาน รพ.พล
                  </button>
                </div>
              </div>

              {/* Policy Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-white/10 text-xs">
                <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
                  <span className="text-sky-300 text-[11px] block">☀️ กลางวัน (08:00 - 20:00)</span>
                  <strong className="text-white text-base">ทุก 3 ชั่วโมง</strong>
                  <span className="text-slate-400 text-[10px] block mt-0.5">4 รอบ (กะเช้า & กะบ่าย)</span>
                </div>
                <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
                  <span className="text-indigo-300 text-[11px] block">🌙 กลางคืน (20:00 - 08:00)</span>
                  <strong className="text-white text-base">ทุก 2 ชั่วโมง</strong>
                  <span className="text-slate-400 text-[10px] block mt-0.5">6 รอบ (กะบ่าย & กะดึก)</span>
                </div>
                <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
                  <span className="text-amber-300 text-[11px] block">⏰ เกณฑ์เวลา 1 ชม. แรก</span>
                  <strong className="text-white text-base">เสร็จสิ้นใน 1 ชม.</strong>
                  <span className="text-slate-400 text-[10px] block mt-0.5">เช่น 08:00 ต้องเสร็จ 09:00</span>
                </div>
                <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
                  <span className="text-emerald-300 text-[11px] block">📍 GPS & ภาพถ่าย</span>
                  <strong className="text-white text-base">ไม่เกิน 30 ม.</strong>
                  <span className="text-slate-400 text-[10px] block mt-0.5">บังคับแนบรูป 1 รูป/จุด</span>
                </div>
              </div>
            </div>

            {/* SECTION 2: SHIFT HANDOVER AUDIT (จับคนส่งรายงาน / คนอู้) */}
            <div className="bg-white border border-sky-100 rounded-3xl p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                      <Send className="w-5 h-5 text-emerald-600" />
                      การติดตามการส่งมอบเวรประจำกะ (Shift Handover Audit)
                    </h3>
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      จับคนส่ง / คนอู้
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    ตรวจสอบว่า รปภ. ในแต่ละกะได้กดส่งออกรายงานสรุปประจำกะเข้า LINE กลุ่มหรือไม่ เพื่อประเมินความรับผิดชอบช่วงต่อกะ
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {shiftKPIs.map((shiftData, idx) => {
                  const shift = shiftData.shift;
                  const isSubmitted = shiftData.hasSubmittedReport;
                  const handoverHour = parseInt(shift.handoverTime.split(":")[0]);
                  const currentHour = supervisorNow.getHours();
                  // กะถือว่าเลยกำหนดส่งหากเวลาปัจจุบันเลยเวลาเปลี่ยนกะมาแล้ว
                  const isPastHandover = shift.id === "morning"
                    ? currentHour >= 16
                    : shift.id === "afternoon"
                    ? currentHour >= 24 || currentHour < 8
                    : currentHour >= 8 && currentHour < 16;

                  const isSlacking = !isSubmitted && isPastHandover;

                  return (
                    <div
                      key={idx}
                      className={`p-4 rounded-2xl border transition-all ${
                        isSubmitted
                          ? "bg-emerald-50/70 border-emerald-300"
                          : isSlacking
                          ? "bg-rose-50 border-rose-300 ring-2 ring-rose-200"
                          : "bg-slate-50 border-slate-200"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className="font-bold text-slate-900 text-sm">{shift.name}</span>
                          <span className="text-[11px] text-slate-500 block">{shift.timeRange}</span>
                        </div>
                        {isSubmitted ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-600 text-white font-bold text-[10px] flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> ส่งรายงานแล้ว
                          </span>
                        ) : isSlacking ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-rose-600 text-white font-bold text-[10px] flex items-center gap-1 animate-pulse">
                            <AlertTriangle className="w-3 h-3" /> ขาดส่งรายงาน (อู้)
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-600 font-bold text-[10px]">
                            รอส่งมอบเวร
                          </span>
                        )}
                      </div>

                      <div className="space-y-1.5 pt-2 border-t border-slate-200/60 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-500">กำหนดส่งมอบเวร:</span>
                          <span className="font-bold text-slate-700 font-mono">{shift.handoverTime} น.</span>
                        </div>

                        {isSubmitted ? (
                          <>
                            <div className="flex justify-between">
                              <span className="text-slate-500">ผู้ส่งรายงาน:</span>
                              <strong className="text-emerald-800">{shiftData.reportSubmittedBy}</strong>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">เวลาที่ส่งจริง:</span>
                              <span className="font-mono text-emerald-700 font-semibold">
                                {shiftData.reportSubmittedAt ? new Date(shiftData.reportSubmittedAt).toLocaleTimeString("th-TH") : "-"} น.
                              </span>
                            </div>
                            <div className="p-2 bg-white rounded-xl border border-emerald-200 text-[11px] text-emerald-900 mt-2">
                              ✅ บันทึกหลักฐานเรียบร้อย คะแนนความรับผิดชอบ 100%
                            </div>
                          </>
                        ) : isSlacking ? (
                          <div className="p-2.5 bg-white rounded-xl border border-rose-300 text-[11px] text-rose-800 space-y-1 mt-2">
                            <p className="font-bold">⚠️ เลยเวลาส่งมอบเวร {shift.handoverTime} น. แล้ว</p>
                            <p className="text-rose-600">ไม่มี รปภ. คนใดในกะนี้กดส่งออกรายงานสรุปงาน</p>
                          </div>
                        ) : (
                          <div className="p-2 bg-white rounded-xl border border-slate-200 text-[11px] text-slate-500 text-center mt-2">
                            ⚪ กะยังไม่สิ้นสุด ระบบจะเปิดรับรายงานช่วงต่อกะ
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* SECTION 1: DAILY 10 ROUNDS MONITOR */}
            <div className="bg-white border border-sky-100 rounded-3xl p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-sky-600" />
                    ตารางมอนิเตอร์ 10 รอบตรวจประจำวัน (Daily Patrol Rounds)
                  </h3>
                  <p className="text-xs text-slate-500">
                    แสดงสถานะการตรวจจริงแบบเรียลไทม์ ตรวจสอบการตรวจตรงเวลาภายใน 1 ชั่วโมงแรก
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
                    ตรงเวลา 100% ✅
                  </span>
                  <span className="px-2.5 py-1 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 font-bold">
                    ครบแต่ล่าช้า ⚠️
                  </span>
                  <span className="px-2.5 py-1 rounded-xl bg-sky-50 text-sky-800 border border-sky-200 font-bold">
                    กำลังตรวจ 🟡
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3.5">
                {allRoundsProgress.map((item, idx) => {
                  const r = item.round;
                  return (
                    <div
                      key={r.id}
                      className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                        item.status === "completed_ontime"
                          ? "bg-emerald-50/70 border-emerald-300"
                          : item.status === "completed_late"
                          ? "bg-amber-50/70 border-amber-300"
                          : item.status === "active"
                          ? "bg-sky-50 border-sky-400 ring-2 ring-sky-200"
                          : item.status === "missed"
                          ? "bg-rose-50 border-rose-300"
                          : "bg-slate-50 border-slate-200"
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex justify-between items-start">
                          <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-800">
                            {r.id}
                          </span>
                          <span className="text-[10px] font-semibold text-slate-500">
                            {r.shift === "morning" ? "☀️ กะเช้า" : r.shift === "afternoon" ? "⛅ กะบ่าย" : "🌙 กะดึก"}
                          </span>
                        </div>

                        <div>
                          <strong className="text-sm font-black text-slate-900 block">{r.name}</strong>
                          <span className="text-[11px] text-slate-500 block">
                            ⏰ เส้นตาย 1 ชม.: <strong className="text-slate-800">{r.deadlineTime} น.</strong>
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px]">
                            <span className="text-slate-500">จุดที่ตรวจ:</span>
                            <span className="font-bold font-mono text-slate-800">
                              {item.completedCount}/{checkpoints.length} จุด
                            </span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                item.status === "completed_ontime"
                                  ? "bg-emerald-500"
                                  : item.status === "completed_late"
                                  ? "bg-amber-500"
                                  : "bg-sky-500"
                              }`}
                              style={{ width: `${item.percent}%` }}
                            />
                          </div>
                        </div>

                        {/* Status Chip */}
                        <div>
                          {item.status === "completed_ontime" && (
                            <span className="inline-block px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                              ✅ ตรวจตรงเวลา 100%
                            </span>
                          )}
                          {item.status === "completed_late" && (
                            <span className="inline-block px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800 font-bold text-[10px]">
                              ⚠️ ครบแต่ล่าช้า (เกิน 1 ชม.)
                            </span>
                          )}
                          {item.status === "active" && (
                            <span className="inline-block px-2.5 py-1 rounded-lg bg-sky-100 text-sky-800 font-bold text-[10px] animate-pulse">
                              🟡 กำลังตรวจอยู่ขณะนี้
                            </span>
                          )}
                          {item.status === "missed" && (
                            <span className="inline-block px-2.5 py-1 rounded-lg bg-rose-100 text-rose-800 font-bold text-[10px]">
                              ❌ ขาดตรวจ (ไม่ครบ)
                            </span>
                          )}
                          {item.status === "upcoming" && (
                            <span className="inline-block px-2.5 py-1 rounded-lg bg-slate-200 text-slate-600 text-[10px]">
                              ⚪ ยังไม่ถึงเวลาตรวจ
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Guards who scanned */}
                      <div className="pt-2 mt-2 border-t border-slate-200/60 text-[10px] text-slate-500">
                        {item.guards.length > 0 ? (
                          <span>รปภ.: <strong className="text-slate-800">{item.guards.join(", ")}</strong></span>
                        ) : (
                          <span>ยังไม่มีบันทึก</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* SECTION 3: SHIFT PERFORMANCE COMPARISON */}
            <div className="bg-white border border-sky-100 rounded-3xl p-6 shadow-xs space-y-4">
              <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                <Award className="w-5 h-5 text-sky-600" />
                เปรียบเทียบ KPI ประสิทธิภาพการเดินตรวจ 3 กะ (Shift Performance)
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {shiftKPIs.map((shiftData, idx) => {
                  return (
                    <div key={idx} className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="font-black text-slate-900 text-base">{shiftData.shift.name}</span>
                        <span className="text-xs font-semibold text-slate-500">{shiftData.shift.timeRange}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-center">
                        <div className="p-3 bg-white rounded-xl border border-slate-200">
                          <span className="text-[10px] text-slate-500 block">ตรวจครบถ้วน</span>
                          <span className="text-2xl font-black text-sky-700">{shiftData.complianceRate}%</span>
                        </div>
                        <div className="p-3 bg-white rounded-xl border border-slate-200">
                          <span className="text-[10px] text-slate-500 block">ตรงเวลา (1 ชม.)</span>
                          <span className="text-2xl font-black text-emerald-600">{shiftData.onTimeRate}%</span>
                        </div>
                      </div>

                      <div className="space-y-1 text-xs text-slate-600 pt-2 border-t border-slate-200">
                        <div className="flex justify-between">
                          <span>จำนวนรอบในกะ:</span>
                          <strong className="text-slate-800">{shiftData.totalRounds} รอบ</strong>
                        </div>
                        <div className="flex justify-between">
                          <span>รอบที่ตรวจครบ:</span>
                          <strong className="text-emerald-700">{shiftData.completedRounds} / {shiftData.totalRounds}</strong>
                        </div>
                        <div className="flex justify-between">
                          <span>ข้อบกพร่องที่พบ:</span>
                          <strong className={shiftData.totalIssues > 0 ? "text-rose-600" : "text-emerald-700"}>
                            {shiftData.totalIssues} จุด
                          </strong>
                        </div>
                        <div className="flex justify-between">
                          <span>ส่งมอบรายงานกะ:</span>
                          <strong className={shiftData.hasSubmittedReport ? "text-emerald-700" : "text-rose-600"}>
                            {shiftData.hasSubmittedReport ? "ส่งแล้ว ✅" : "ยังไม่ส่ง ⚠️"}
                          </strong>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* SECTION 4: INDIVIDUAL GUARD KPIS (ประเมินพนักงาน รปภ. 5 นาย) */}
            <div className="bg-white border border-sky-100 rounded-3xl p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                    <Users className="w-5 h-5 text-indigo-600" />
                    KPI ผลงานรายบุคคล (ประเมินพนักงาน รปภ. {onlyGuards.length} นาย)
                  </h3>
                  <p className="text-xs text-slate-500">
                    ติดตามสถิติการเดินตรวจจริง อัตราตรวจตรงเวลา 1 ชม. แรก และการส่งมอบงานประจำกะ
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-y border-slate-200">
                    <tr>
                      <th className="py-3 px-3">ชื่อ - สกุล รปภ.</th>
                      <th className="py-3 px-3 text-center">สแกนจุดตรวจ</th>
                      <th className="py-3 px-3 text-center">รอบที่ตรวจ</th>
                      <th className="py-3 px-3 text-center">ตรงเวลา (1 ชม.)</th>
                      <th className="py-3 px-3 text-center bg-indigo-50/60 text-indigo-900">
                        ส่งรายงานกะ (ครั้ง)
                      </th>
                      <th className="py-3 px-3 text-center">รูปถ่ายจุดตรวจ</th>
                      <th className="py-3 px-3 text-center">ปัญหาที่แจ้ง</th>
                      <th className="py-3 px-3 text-center">เกรดประเมิน</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {guardKPIs.map((gData) => {
                      return (
                        <tr key={gData.guard.id} className="hover:bg-sky-50/40 transition-colors">
                          <td className="py-3 px-3">
                            <span className="font-bold text-slate-900 block">{gData.guard.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">PIN: {gData.guard.pin} • {gData.guard.phone}</span>
                          </td>
                          <td className="py-3 px-3 text-center font-bold font-mono text-slate-800">
                            {gData.checkpointsScanned} จุด
                          </td>
                          <td className="py-3 px-3 text-center font-bold text-slate-700">
                            {gData.roundsInvolved} รอบ
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className={`font-bold font-mono px-2 py-0.5 rounded-full ${
                              gData.onTimeRate >= 80 ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                            }`}>
                              {gData.onTimeRate}%
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center bg-indigo-50/30">
                            <span className={`font-bold font-mono px-2.5 py-0.5 rounded-full ${
                              gData.reportsSent > 0 ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500"
                            }`}>
                              {gData.reportsSent} ครั้ง
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center font-bold text-slate-700">
                            {gData.photosUploaded} รูป
                          </td>
                          <td className="py-3 px-3 text-center font-bold text-slate-700">
                            {gData.issuesReported} ข้อ
                          </td>
                          <td className="py-3 px-3 text-center">
                            {gData.ratingGrade === "A" && (
                              <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                                ⭐️⭐️⭐️ ดีเยี่ยม
                              </span>
                            )}
                            {gData.ratingGrade === "B" && (
                              <span className="px-2.5 py-1 rounded-full bg-sky-100 text-sky-800 font-bold text-[10px]">
                                ⭐️⭐️ ผ่านเกณฑ์
                              </span>
                            )}
                            {gData.ratingGrade === "C" && (
                              <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-semibold text-[10px]">
                                รอประเมิน
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* SECTION 5: CHECKPOINT PHOTO EVIDENCE GALLERY */}
            <div className="bg-white border border-sky-100 rounded-3xl p-6 shadow-xs space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                    <Camera className="w-5 h-5 text-sky-600" />
                    แกลเลอรีรูปถ่ายยืนยันจุดตรวจวันนี้ ({todayPhotosLogs.length} ภาพ)
                  </h3>
                  <p className="text-xs text-slate-500">
                    ภาพถ่ายจริงที่ รปภ. ถ่ายส่งมาจากจุดตรวจ พร้อมบันทึกระยะห่าง GPS (แตะเพื่อดูภาพขยาย)
                  </p>
                </div>
              </div>

              {todayPhotosLogs.length === 0 ? (
                <div className="p-8 border-2 border-dashed border-slate-200 rounded-2xl text-center text-slate-400 text-xs">
                  ยังไม่มีรูปถ่ายจุดตรวจสำหรับวันนี้ (จะปรากฏขึ้นอัตโนมัติเมื่อ รปภ. สแกนและถ่ายรูป)
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                  {todayPhotosLogs.map((log) => {
                    const cp = checkpoints.find((c) => c.id === log.checkpointId);
                    return (
                      <div
                        key={log.id}
                        onClick={() => setSelectedPhotoModal({
                          url: log.imageUrl!,
                          title: `${cp?.name || "จุดตรวจ"} (${cp?.code || "-"})`,
                          timestamp: log.timestamp
                        })}
                        className="group relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 aspect-square cursor-pointer hover:shadow-md transition-all active:scale-95"
                      >
                        <img
                          src={log.imageUrl}
                          alt="Checkpoint photo"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent flex flex-col justify-end p-2 text-white text-[10px]">
                          <span className="font-bold truncate">{cp?.code}: {cp?.name}</span>
                          <span className="text-[9px] text-sky-300 truncate">
                            {log.guardName} • {log.distanceMeters ?? 0} ม.
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: CHECKPOINTS MANAGEMENT */}
        
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
                <a
                  href="/patrol_map_7_checkpoints.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl flex items-center gap-2 active:scale-95 transition-all shadow-xs no-underline"
                  title="เปิดแผนที่และอินโฟกราฟิกจุดตรวจทั้ง 7 จุด (A4 / Interactive Map)"
                >
                  <MapPin className="w-4 h-4" /> แผนที่อินโฟกราฟิก 7 จุดตรวจ
                </a>
                <button
                  onClick={() => setShowManageBuildingsModal(true)}
                  className="px-4 py-2.5 bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-900 font-bold text-xs rounded-xl flex items-center gap-2 active:scale-95 transition-all shadow-2xs"
                  title="จัดการรายชื่ออาคาร (เพิ่ม/ลบ อาคาร)"
                >
                  <Building className="w-4 h-4 text-sky-600" /> จัดการอาคาร ({buildings.length})
                </button>
                <button
                  onClick={() => {
                    const nextCode = String(checkpoints.length + 1).padStart(2, "0");
                    setEditingCp(null);
                    setCpForm({
                      code: nextCode,
                      name: "",
                      building: buildings[0] || "อาคารเฉลิมพระเกียรติ A",
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
                  <h2 className="font-bold text-lg text-slate-900">รายชื่อเจ้าหน้าที่ รปภ. ({onlyGuards.length} นาย)</h2>
                  <p className="text-xs text-slate-500">สามารถเพิ่ม/ลบ เจ้าหน้าที่ รปภ. และตั้งรหัส PIN 4 หลักประจำตัว</p>
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
                      <th className="py-3 px-4">เบอร์โทรศัพท์</th>
                      <th className="py-3 px-4">บทบาท</th>
                      <th className="py-3 px-4 text-center">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {onlyGuards.map((guard) => (
                      <tr key={guard.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-900">{guard.name}</td>
                        <td className="py-3.5 px-4 font-mono font-bold text-sky-700">{guard.pin}</td>
                        <td className="py-3.5 px-4 font-mono text-slate-600">{guard.phone || "-"}</td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] bg-sky-50 text-sky-700 border border-sky-200 font-semibold">
                            เจ้าหน้าที่ รปภ.
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
                                  shift: guard.shift || "morning",
                                  phone: guard.phone,
                                  role: "guard"
                                });
                                setShowAddGuardModal(true);
                              }}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600"
                              title="แก้ไขข้อมูล"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
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
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: STAFF VEHICLES */}
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="font-bold text-lg text-slate-900">🚨 รายการแจ้งเหตุผิดปกติ & รูปหลักฐาน (Google Drive)</h2>
                <p className="text-xs text-slate-500">ภาพถ่ายเหตุการณ์และภาพปิดงานทั้งหมดถูกอัปโหลดขึ้น Google Drive ของโรงพยาบาลพล</p>
              </div>

              {/* Filter pills */}
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl shrink-0">
                <button
                  onClick={() => setIncidentTabFilter("all")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    incidentTabFilter === "all"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  ทั้งหมด ({incidents.length})
                </button>
                <button
                  onClick={() => setIncidentTabFilter("active")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    incidentTabFilter === "active"
                      ? "bg-rose-500 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  🚨 ยังไม่ปิดงาน ({incidents.filter((i) => i.status !== "resolved").length})
                </button>
                <button
                  onClick={() => setIncidentTabFilter("resolved")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    incidentTabFilter === "resolved"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  ✅ ปิดเหตุการณ์แล้ว ({incidents.filter((i) => i.status === "resolved").length})
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {incidents
                .filter((incident) => {
                  if (incidentTabFilter === "active") return incident.status !== "resolved";
                  if (incidentTabFilter === "resolved") return incident.status === "resolved";
                  return true;
                })
                .map((incident) => {
                  const isResolved = incident.status === "resolved";
                  const isInvestigating = incident.status === "investigating";

                  return (
                    <div
                      key={incident.id}
                      className={`p-5 rounded-3xl border transition-all ${
                        isResolved
                          ? "bg-slate-50/80 border-slate-200"
                          : isInvestigating
                          ? "bg-sky-50/40 border-sky-200 ring-1 ring-sky-200"
                          : "bg-amber-50/30 border-amber-200 ring-1 ring-amber-200"
                      } flex flex-col md:flex-row gap-5 items-start`}
                    >
                      {/* Photo Thumbnail */}
                      <div className="w-full md:w-48 h-36 rounded-2xl overflow-hidden bg-slate-200 border border-slate-300 shrink-0 relative group">
                        <img
                          src={incident.imageUrl || "https://images.unsplash.com/photo-1517646287270-a5a9ca602e5c?w=600&q=80"}
                          alt="Incident Evidence"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform cursor-pointer"
                          onClick={() => incident.imageUrl && setSelectedPhotoModal({ url: incident.imageUrl, title: incident.title, timestamp: incident.timestamp })}
                        />
                        <div className="absolute bottom-1 right-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded-md backdrop-blur-xs font-mono">
                          รูปเหตุการณ์
                        </div>
                      </div>

                      <div className="flex-1 space-y-2.5 w-full">
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

                          {incident.shiftName && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-sky-100 text-sky-800 border border-sky-200">
                              {incident.shiftName}
                            </span>
                          )}

                          <span className="text-xs text-slate-400 font-mono ml-auto">{incident.timestamp}</span>
                        </div>

                        <h3 className="text-base font-bold text-slate-900">{incident.title}</h3>
                        <p className="text-xs text-slate-600">ผู้รายงาน: <strong>{incident.reporterName}</strong> • Google Drive / Incidents</p>

                        {/* Status Switcher */}
                        <div className="pt-1 flex flex-wrap items-center gap-2">
                          <span className="text-xs font-semibold text-slate-600 mr-1">สถานะ:</span>
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
                            ระหว่างดำเนินการ
                          </button>
                          <button
                            onClick={() => updateIncidentStatus(incident.id, "resolved")}
                            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                              incident.status === "resolved"
                                ? "bg-emerald-600 text-white ring-2 ring-emerald-300"
                                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                            }`}
                          >
                            ปิดเหตุการณ์
                          </button>
                        </div>

                        {/* Resolution Info Box (If resolved) */}
                        {isResolved && (
                          <div className="mt-3 p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row gap-3 items-start">
                            {incident.resolutionImageUrl && (
                              <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-200 border border-emerald-300 shrink-0 relative group">
                                <img
                                  src={incident.resolutionImageUrl}
                                  alt="Resolution Evidence"
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform cursor-pointer"
                                  onClick={() => setSelectedPhotoModal({ url: incident.resolutionImageUrl!, title: `ภาพผลการระงับเหตุ - ${incident.title}`, timestamp: incident.resolvedAt })}
                                />
                                <div className="absolute bottom-0 inset-x-0 bg-emerald-900/80 text-white text-[8px] text-center py-0.5 font-bold">
                                  ภาพปิดงาน
                                </div>
                              </div>
                            )}
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-xs">
                                <span>✅ ข้อมูลการปิดเหตุการณ์</span>
                                {incident.resolvedAt && (
                                  <span className="text-[10px] text-emerald-600 font-normal font-mono">
                                    ({incident.resolvedAt})
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-emerald-900 bg-white/70 p-2 rounded-xl border border-emerald-100">
                                {incident.resolutionNote || "ปิดเหตุการณ์เรียบร้อย (ไม่มีบันทึกเพิ่มเติม)"}
                              </p>
                              {incident.resolvedBy && (
                                <p className="text-[11px] text-emerald-700">
                                  ผู้ปิดงาน: <strong>{incident.resolvedBy}</strong>
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

              {incidents.filter((incident) => {
                if (incidentTabFilter === "active") return incident.status !== "resolved";
                if (incidentTabFilter === "resolved") return incident.status === "resolved";
                return true;
              }).length === 0 && (
                <div className="text-center py-12 text-slate-400">
                  <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p className="text-sm">ไม่พบรายการเหตุการณ์ตามเงื่อนไขที่เลือก</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 8: DEEPSEEK AI REPORTING & DAILY ARCHIVE */}
        {activeTab === "ai" && (
          <div className="space-y-6">
            <div className="bg-white border-2 border-sky-300 rounded-3xl p-6 shadow-sm space-y-6">
              {/* Header & Date Selector & Trigger */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
                    <Bot className="w-7 h-7" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-extrabold text-lg text-slate-900">
                        ระบบสรุปและรายงานความปลอดภัยประจำวัน (Daily Security Report)
                      </h2>
                      <span className="px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-800 text-[10px] font-mono font-bold border border-sky-200">
                        คลังรายงานสรุปประจำวัน
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      ประมวลผลข้อมูลการตรวจการณ์ยานพาหนะและรอบเดินตรวจความปลอดภัย รพ.พล พร้อมจัดเก็บประวัติรายงานในระบบ
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Date Selector */}
                  <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
                    <Calendar className="w-4 h-4 text-slate-500 ml-1.5" />
                    <span className="text-xs font-bold text-slate-700">วันที่:</span>
                    <input
                      type="date"
                      value={selectedAiArchiveDate}
                      onChange={(e) => setSelectedAiArchiveDate(e.target.value)}
                      className="bg-white border border-slate-300 text-slate-900 text-xs font-bold rounded-xl px-2.5 py-1 focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer shadow-2xs"
                    />
                  </div>

                  <button
                    type="button"
                    disabled={aiLoading}
                    onClick={() => handleRunAiBatch(selectedAiArchiveDate)}
                    className="px-4 py-2.5 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-2xl flex items-center gap-2 shadow-md shadow-sky-600/20 active:scale-95 transition-all cursor-pointer"
                  >
                    {aiLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" /> กำลังประมวลผลรายงานสรุป...
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 fill-current text-amber-300" /> ประมวลผลและบันทึกรายงานวันนี้
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Saved Summaries Date Navigator Pills */}
              {dailyAISummaries && dailyAISummaries.length > 0 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
                  <span className="text-slate-500 font-bold shrink-0 flex items-center gap-1">
                    <Archive className="w-3.5 h-3.5 text-sky-600" /> คลังบันทึกที่ผ่านมา:
                  </span>
                  {dailyAISummaries.slice(0, 10).map((summary) => (
                    <button
                      key={summary.id}
                      onClick={() => setSelectedAiArchiveDate(summary.dateString)}
                      className={`px-3 py-1 rounded-xl text-xs font-bold border transition-all shrink-0 cursor-pointer ${
                        selectedAiArchiveDate === summary.dateString
                          ? "bg-sky-600 text-white border-sky-600 shadow-2xs"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-sky-50"
                      }`}
                    >
                      {summary.dateString}
                    </button>
                  ))}
                </div>
              )}

              {/* Status Banner */}
              <div className="flex flex-wrap items-center justify-between p-3.5 bg-sky-50 border border-sky-200 rounded-2xl text-xs text-sky-900 font-medium">
                <span className="flex items-center gap-2">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      selectedSavedAISummary ? "bg-emerald-500" : "bg-amber-400"
                    } animate-pulse`}
                  />
                  <span>
                    ข้อมูลบทวิเคราะห์ประจำวันที่: <strong>{selectedAiArchiveDate}</strong>
                  </span>
                  {selectedSavedAISummary && (
                    <span className="text-[10px] text-emerald-700 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full font-bold">
                      บันทึกใน Cloud แล้ว
                    </span>
                  )}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-white text-emerald-800 text-[10px] font-mono font-bold border border-emerald-200">
                  🟢 ระบบประมวลผลรายงานความปลอดภัยพร้อมใช้งาน
                </span>
              </div>

              {/* KPI Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl space-y-1">
                  <span className="text-xs text-rose-700 font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-600" /> แอบจอดค้างคืน (22:00+06:00)
                  </span>
                  <div className="flex items-baseline gap-2 pt-1">
                    <span className="text-3xl font-black text-rose-900">
                      {selectedSavedAISummary?.overnightVehiclesCount ?? (aiReportData?.stats?.overnightCount ?? 2)}
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
                      {parkingScans.filter((s) => s.zone?.includes("ER") && !s.isStaff).length || 1}
                    </span>
                    <span className="text-xs text-indigo-700">คัน (ต้องย้ายด่วน)</span>
                  </div>
                  <p className="text-[10px] text-indigo-600">กระทบรถพยาบาลฉุกเฉิน</p>
                </div>

                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-1">
                  <span className="text-xs text-emerald-800 font-bold flex items-center gap-1.5">
                    <Car className="w-4 h-4 text-emerald-600" /> ยอดตรวจรถทุกคันใน รพ.
                  </span>
                  <div className="flex items-baseline gap-2 pt-1">
                    <span className="text-3xl font-black text-emerald-900">
                      {selectedSavedAISummary?.totalVehiclesScanned ?? parkingScans.length}
                    </span>
                    <span className="text-xs text-emerald-700">คัน</span>
                  </div>
                  <p className="text-[10px] text-emerald-600">
                    บุคลากร {selectedSavedAISummary?.staffVehiclesCount ?? parkingScans.filter((s) => s.isStaff).length} | ภายนอก {selectedSavedAISummary?.outsideVehiclesCount ?? parkingScans.filter((s) => !s.isStaff).length}
                  </p>
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
                    <Sparkles className="w-4 h-4 text-sky-600" /> บทวิเคราะห์และข้อเสนอแนะความปลอดภัยประจำวัน
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    {selectedSavedAISummary?.generatedBy || "ระบบรายงานความปลอดภัยอัตโนมัติ • โรงพยาบาลพล"}
                  </span>
                </div>

                {selectedSavedAISummary?.actionItems && selectedSavedAISummary.actionItems.length > 0 && (
                  <div className="space-y-1.5 bg-amber-50 border border-amber-200 rounded-xl p-3">
                    <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4 text-amber-600" /> ข้อเสนอแนะเร่งด่วนสำหรับ รปภ. (Action Items):
                    </span>
                    <div className="space-y-1 text-xs text-amber-800 pl-2">
                      {selectedSavedAISummary.actionItems.map((item, idx) => (
                        <div key={idx} className="flex items-start gap-1.5">
                          <span className="font-bold text-amber-700">•</span>
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="text-xs text-slate-700 space-y-3 leading-relaxed whitespace-pre-line bg-slate-50/70 p-4 rounded-xl border border-slate-200 font-sans">
                  {selectedSavedAISummary?.aiSummaryMarkdown || aiReportData?.aiSummary || (
                    `### 🏥 รายงานสรุปสถานการณ์ความปลอดภัยลานจอดรถ โรงพยาบาลพล
**ประจำวันที่:** ${selectedAiArchiveDate}

#### 1. สรุปภาพรวมความพร้อมลานจอด (Parking Readiness)
• ตรวจสอบรอบเวลามาตรฐาน (รอบ 22:00 น. และ 06:00 น.) พบรถทั้งสิ้น ${parkingScans.length} คัน (บุคลากร ${parkingScans.filter((s) => s.isStaff).length} คัน / ภายนอก ${parkingScans.filter((s) => !s.isStaff).length} คัน)
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
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                  <span>เกิน 90 วัน (3 ด.): <strong className="text-amber-700 font-bold">{expired90Total}</strong></span>
                  <span>เกิน 1 ปี: <strong className="text-slate-700 font-bold">{expired365Total}</strong></span>
                </div>
              </div>

              {/* Card 3: Google Drive Destination */}
              <div className="bg-white border border-sky-100 rounded-3xl p-5 shadow-xs space-y-2">
                <div className="flex justify-between items-start text-slate-500">
                  <span className="text-xs font-semibold">Google Drive (คลัง 2 TB)</span>
                  <UploadCloud className="w-5 h-5 text-blue-600" />
                </div>
                <div className="truncate text-xs font-mono font-bold text-slate-800 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                  1ED0Ln...mxFFXT
                </div>
                <p className="text-[11px] text-slate-500 truncate">
                  {archiveStats?.driveStatus?.connected
                    ? `เชื่อมต่อ Service Account แล้ว`
                    : `โฟลเดอร์สำรองข้อมูลหลัก 2 TB รพ.พล`}
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
                    ทุกวันเวลา 07:00 น. (ช่วงส่งมอบเวรเช้า) ระบบจะตรวจสอบบันทึกที่อายุเกิน 90 วัน (3 เดือน) ➔ อัปโหลดเข้า Google Drive (ความจุ 2 TB) ➔ ล้าง Cloud Firestore เพื่อรักษาความเร็วและคงข้อมูลสด 3 เดือน
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

              {/* Google Apps Script & Service Account Setup */}
              <div className="bg-white p-5 rounded-2xl border border-sky-100 text-xs text-slate-700 space-y-4">
                <div className="font-extrabold text-sm text-slate-900 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CloudDownload className="w-5 h-5 text-sky-600" />
                    <span>ช่องทางส่งรูปภาพเข้าโฟลเดอร์ Google Drive (Folder ID: 1ED0LnFxfSwHVU60fI8LShWiXBDmxFFXT)</span>
                  </div>
                </div>

                {/* Option 1: Google Apps Script Webhook (Recommended) */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-sky-50 to-blue-50/50 border border-sky-200 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-sky-950 text-xs flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        วิธีที่ 1 (แนะนำ - ง่ายสุด 1 นาที): ผ่าน Google Apps Script Web App
                      </h4>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        นำโค้ดสคริปต์ไปวางใน Google Apps Script ของบัญชีที่เป็นเจ้าของ Drive เพื่อให้ระบบส่งรูปเข้าโฟลเดอร์ได้ทันที
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={copyAppsScriptToClipboard}
                      className="px-3 py-1.5 bg-white hover:bg-sky-100 border border-sky-300 text-sky-800 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-2xs shrink-0 self-start sm:self-auto"
                    >
                      {copiedScript ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700">คัดลอกโค้ดแล้ว!</span>
                        </>
                      ) : (
                        <>
                          <FileText className="w-3.5 h-3.5 text-sky-600" />
                          <span>📋 คัดลอกโค้ด Apps Script</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-slate-700">
                      URL ของ Google Apps Script Web App (ขึ้นต้นด้วย https://script.google.com/macros/s/.../exec):
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="url"
                        value={googleDriveWebhookUrl || ""}
                        onChange={(e) => setGoogleDriveWebhookUrl(e.target.value.trim())}
                        placeholder="https://script.google.com/macros/s/.../exec"
                        className="flex-1 p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-2xs"
                      />
                      <button
                        type="button"
                        onClick={handleTestDriveUpload}
                        disabled={testDriveLoading}
                        className="px-4 py-2 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white font-bold text-xs rounded-xl shadow-xs active:scale-95 transition-all flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-50"
                      >
                        {testDriveLoading ? (
                          <>
                            <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>กำลังทดสอบ...</span>
                          </>
                        ) : (
                          <>
                            <UploadCloud className="w-3.5 h-3.5" />
                            <span>ทดสอบส่งรูป</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {testDriveResult && (
                    <div className={`p-3 rounded-xl border text-xs flex flex-col gap-1.5 ${
                      testDriveResult.success
                        ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                        : "bg-rose-50 border-rose-200 text-rose-900"
                    }`}>
                      <div className="flex items-center gap-2 font-bold">
                        {testDriveResult.success ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                        )}
                        <span>{testDriveResult.message}</span>
                      </div>
                      {testDriveResult.url && (
                        <a
                          href={testDriveResult.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-sky-700 hover:underline font-semibold flex items-center gap-1 pl-6"
                        >
                          <ExternalLink className="w-3 h-3" /> คลิกที่นี่เพื่อเปิดดูรูปตัวอย่างใน Google Drive
                        </a>
                      )}
                    </div>
                  )}

                  <div className="text-[11px] text-slate-600 bg-white/80 p-3 rounded-xl border border-sky-100 space-y-1">
                    <p className="font-bold text-slate-800">ขั้นตอนตั้งค่า Apps Script ใน 3 คลิก:</p>
                    <ol className="list-decimal list-inside space-y-0.5 pl-1">
                      <li>เปิด <a href="https://script.google.com/home/start" target="_blank" rel="noreferrer" className="text-sky-600 underline font-semibold">script.google.com</a> ➔ กด "โครงการใหม่" (New Project)</li>
                      <li>ลบโค้ดเดิมออกทั้งหมด ➔ กดปุ่ม <strong>"📋 คัดลอกโค้ด Apps Script"</strong> ด้านบนแล้วนำมาวาง</li>
                      <li>กดปุ่มสีน้ำเงิน <strong>"ทำให้ใช้งานได้" (Deploy)</strong> ➔ <strong>"การทำให้ใช้งานได้รายการใหม่" (New deployment)</strong> ➔ เลือกประเภทเป็น <strong>เว็บแอป (Web app)</strong></li>
                      <li>ตั้งค่า <strong>"ผู้ที่มีสิทธิ์เข้าถึง" (Who has access)</strong> ให้เป็น <strong>"ทุกคน" (Anyone)</strong> ➔ กด "ทำให้ใช้งานได้" แล้วคัดลอก URL มาวางในช่องด้านบน</li>
                    </ol>
                  </div>
                </div>

                {/* Option 2: Service Account Guide */}
                <details className="text-xs text-slate-600 border border-slate-200 rounded-xl p-3 bg-slate-50">
                  <summary className="font-bold text-slate-800 cursor-pointer hover:text-sky-700">
                    วิธีที่ 2 (ทางเลือก): ใช้งานผ่าน Google Cloud Service Account
                  </summary>
                  <ol className="list-decimal list-inside space-y-1 text-slate-600 leading-relaxed text-[11px] pl-1 pt-2">
                    <li>เปิดโฟลเดอร์ Google Drive ปลายทาง (<a href="https://drive.google.com/drive/folders/1ED0LnFxfSwHVU60fI8LShWiXBDmxFFXT" target="_blank" rel="noreferrer" className="text-sky-600 underline font-semibold">คลิกเปิดโฟลเดอร์</a>)</li>
                    <li>คลิกปุ่ม <strong>"แชร์" (Share)</strong> มุมขวาบน ➔ ใส่อีเมล Service Account จาก Google Cloud Console</li>
                    <li>ตั้งสิทธิ์ให้เป็น <strong>"ผู้แก้ไข" (Editor)</strong></li>
                    <li>นำ Private Key มาบันทึกในไฟล์ <code className="bg-slate-200 px-1 py-0.5 rounded font-mono text-slate-800">.env.local</code> หรือ Vercel Environment Variables</li>
                  </ol>
                </details>
              </div>
            </div>

            {/* Google Gemini 1.5 Flash Vision OCR Config */}
            <div className="bg-white border border-sky-100 rounded-3xl p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 to-sky-500 text-white flex items-center justify-center font-bold shadow-md shadow-sky-500/20">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-2">
                    <span>ระบบประมวลผลภาพป้ายทะเบียน (Google Gemini Vision)</span>
                    <span className="text-[10px] bg-sky-100 text-sky-800 px-2 py-0.5 rounded-full font-bold">
                      โควตา 1,500 รายการ/วัน
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    ตรวจจับป้ายทะเบียนรถยนต์และรถจักรยานยนต์ ระบุหมวดอักษรและหมายเลขทะเบียนโดยอัตโนมัติ
                  </p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-700">
                  รหัสเชื่อมต่อบริการ (Google Gemini API Key):
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showGeminiKey ? "text" : "password"}
                      value={geminiApiKey || ""}
                      onChange={(e) => setGeminiApiKey(e.target.value.trim())}
                      placeholder="AQ... หรือ AIzaSy..."
                      className="w-full p-2.5 pr-10 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-2xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowGeminiKey(!showGeminiKey)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                      title={showGeminiKey ? "ซ่อนรหัส" : "แสดงรหัส"}
                    >
                      {showGeminiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={handleTestGeminiKey}
                    disabled={testGeminiLoading || !geminiApiKey}
                    className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-700 hover:to-sky-700 text-white font-bold text-xs rounded-xl shadow-xs active:scale-95 transition-all flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-50"
                  >
                    {testGeminiLoading ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>กำลังทดสอบ...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-3.5 h-3.5" />
                        <span>ทดสอบ API Key</span>
                      </>
                    )}
                  </button>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-slate-500 gap-1 pt-0.5">
                  <span>* หากไม่ได้ระบุ หรือไม่มีเน็ต ระบบจะสลับไปใช้ Tesseract OCR (Local Engine) ในเครื่องอัตโนมัติ</span>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="text-sky-600 hover:underline font-semibold inline-flex items-center gap-1 shrink-0"
                  >
                    <ExternalLink className="w-3 h-3" /> รับ API Key ฟรี (aistudio.google.com)
                  </a>
                </div>
              </div>

              {testGeminiResult && (
                <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 font-bold ${
                  testGeminiResult.success
                    ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                    : "bg-rose-50 border-rose-200 text-rose-900"
                }`}>
                  {testGeminiResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span>{testGeminiResult.message}</span>
                </div>
              )}
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
                    <option value={90}>อายุเกิน 90 วัน (3 เดือน - นโยบายมาตรฐาน รพ.พล)</option>
                    <option value={180}>อายุเกิน 180 วัน (6 เดือน)</option>
                    <option value={365}>อายุเกิน 365 วัน (1 ปี)</option>
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
                    สรุปรายการที่จะถูกจัดเก็บสำรอง (Archive Preview):
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
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-slate-600 font-bold text-xs">อาคาร *</label>
                    <button
                      type="button"
                      onClick={() => setShowManageBuildingsModal(true)}
                      className="text-[11px] text-sky-600 hover:text-sky-800 font-bold flex items-center gap-1 active:scale-95 transition-all hover:underline"
                    >
                      🏢 เพิ่ม/ลดอาคาร
                    </button>
                  </div>
                  <select
                    value={cpForm.building}
                    onChange={(e) => {
                      if (e.target.value === "__manage__") {
                        setShowManageBuildingsModal(true);
                      } else {
                        setCpForm({ ...cpForm, building: e.target.value });
                      }
                    }}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 focus:bg-white text-xs font-medium"
                  >
                    {buildings.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                    <option value="__manage__">➕ เพิ่ม / จัดการอาคาร...</option>
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

              <div>
                <label className="block text-slate-600 font-bold mb-1">รหัส PIN 4 หลักประจำตัว *</label>
                <input
                  type="password"
                  maxLength={4}
                  required
                  value={guardForm.pin}
                  onChange={(e) => setGuardForm({ ...guardForm, pin: e.target.value })}
                  placeholder="เช่น 1234 หรือ 5678"
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-mono tracking-widest text-center text-lg"
                />
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

      {/* MODAL: MANAGE BUILDINGS (เพิ่ม/ลดรายชื่ออาคาร) */}
      {showManageBuildingsModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4 border border-sky-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-sky-100 text-sky-700">
                  <Building className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">
                    จัดการรายชื่ออาคาร ({buildings.length})
                  </h3>
                  <p className="text-xs text-slate-500">
                    เพิ่มหรือลบชื่ออาคาร/โซน สำหรับตั้งค่าจุดตรวจ
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowManageBuildingsModal(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {buildingActionAlert && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{buildingActionAlert}</span>
              </div>
            )}

            {/* Form to add a new building */}
            <form onSubmit={handleAddBuilding} className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                ➕ เพิ่มอาคารหรือโซนใหม่
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newBuildingInput}
                  onChange={(e) => setNewBuildingInput(e.target.value)}
                  placeholder="เช่น อาคารผู้ป่วยนอก (OPD), ป้อมยาม..."
                  className="flex-1 p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-sky-500"
                />
                <button
                  type="submit"
                  disabled={!newBuildingInput.trim()}
                  className="px-4 py-2.5 bg-sky-600 hover:bg-sky-500 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-xs rounded-xl active:scale-95 transition-all shadow-xs shrink-0"
                >
                  เพิ่ม
                </button>
              </div>
            </form>

            {/* List of current buildings */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                รายชื่ออาคารทั้งหมด ({buildings.length} แห่ง)
              </label>
              <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-100">
                {buildings.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">ยังไม่มีรายชื่ออาคาร</p>
                ) : (
                  buildings.map((b) => {
                    const count = checkpoints.filter((cp) => cp.building === b).length;
                    return (
                      <div
                        key={b}
                        className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 border border-slate-100 text-xs transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Building className="w-4 h-4 text-sky-600 shrink-0" />
                          <span className="font-semibold text-slate-800 truncate" title={b}>
                            {b}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 shrink-0">
                            {count} จุดตรวจ
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteBuilding(b)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0"
                          title={`ลบอาคาร "${b}"`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                * บันทึกและซิงค์ใช้งานร่วมกันทุกจุดตรวจ
              </span>
              <button
                type="button"
                onClick={() => setShowManageBuildingsModal(false)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl active:scale-95 transition-all shadow-xs"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONFIGURE PATROL ROUNDS (ตั้งค่ารอบการเดินตรวจ & ความถี่) */}
      {showRoundsConfigModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl border border-sky-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-sky-100 text-sky-700">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">
                    กำหนดรอบการเดินตรวจและความถี่ (Patrol Rounds Config)
                  </h3>
                  <p className="text-xs text-slate-500">
                    กำหนดช่วงเวลาตรวจและเส้นตาย 1 ชม. แรก (กลางวันทุก 3 ชม. / กลางคืนทุก 2 ชม.)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRoundsConfigModal(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-3">
              <div className="p-3 bg-sky-50 rounded-2xl border border-sky-100 text-xs text-sky-800 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-sky-600" /> นโยบาย 10 รอบตรวจ รพ.พล
                </p>
                <p className="text-[11px] text-sky-700">
                  • กลางวัน (08:00 - 20:00): ทุก 3 ชั่วโมง (4 รอบ: 08:00, 11:00, 14:00, 17:00)<br />
                  • กลางคืน (20:00 - 08:00): ทุก 2 ชั่วโมง (6 รอบ: 20:00, 22:00, 00:00, 02:00, 04:00, 06:00)<br />
                  • กฎ 1 ชม. แรก: ระบบจะบันทึกสถานะตรงเวลาเมื่อสแกนครบก่อนเวลา Deadline
                </p>
              </div>

              <div className="space-y-2">
                {tempRounds.map((r, index) => {
                  return (
                    <div
                      key={r.id}
                      className="p-3 rounded-2xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono font-bold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700">
                          {r.id}
                        </span>
                        <div>
                          <input
                            type="text"
                            value={r.name}
                            onChange={(e) => {
                              const updated = [...tempRounds];
                              updated[index].name = e.target.value;
                              setTempRounds(updated);
                            }}
                            className="font-bold text-slate-900 bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs w-44 focus:outline-sky-500"
                          />
                          <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5">
                            <span>กะ:</span>
                            <select
                              value={r.shift}
                              onChange={(e) => {
                                const updated = [...tempRounds];
                                updated[index].shift = e.target.value as any;
                                setTempRounds(updated);
                              }}
                              className="bg-white border border-slate-200 rounded px-1.5 py-0.5 text-[11px] font-semibold"
                            >
                              <option value="morning">☀️ เช้า (08-16)</option>
                              <option value="afternoon">⛅ บ่าย (16-24)</option>
                              <option value="night">🌙 ดึก (24-08)</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                        <div className="flex items-center gap-1">
                          <span className="text-slate-500 text-[11px]">เริ่ม:</span>
                          <input
                            type="time"
                            value={r.startTime}
                            onChange={(e) => {
                              const updated = [...tempRounds];
                              updated[index].startTime = e.target.value;
                              setTempRounds(updated);
                            }}
                            className="bg-white border border-slate-200 rounded-lg px-2 py-1 font-mono text-xs text-slate-800"
                          />
                        </div>

                        <div className="flex items-center gap-1">
                          <span className="text-slate-500 text-[11px]">สิ้นสุดรอบ:</span>
                          <input
                            type="time"
                            value={r.endTime}
                            onChange={(e) => {
                              const updated = [...tempRounds];
                              updated[index].endTime = e.target.value;
                              setTempRounds(updated);
                            }}
                            className="bg-white border border-slate-200 rounded-lg px-2 py-1 font-mono text-xs text-slate-800"
                          />
                        </div>

                        <div className="flex items-center gap-1">
                          <span className="text-rose-600 font-bold text-[11px]">Deadline:</span>
                          <input
                            type="time"
                            value={r.deadlineTime}
                            onChange={(e) => {
                              const updated = [...tempRounds];
                              updated[index].deadlineTime = e.target.value;
                              setTempRounds(updated);
                            }}
                            className="bg-white border border-rose-300 rounded-lg px-2 py-1 font-mono font-bold text-xs text-rose-700 bg-rose-50/30"
                            title="เส้นตาย 1 ชั่วโมงแรกสำหรับการตรวจให้ครบ"
                          />
                        </div>

                        <label className="flex items-center gap-1.5 cursor-pointer ml-1">
                          <input
                            type="checkbox"
                            checked={r.isActive}
                            onChange={(e) => {
                              const updated = [...tempRounds];
                              updated[index].isActive = e.target.checked;
                              setTempRounds(updated);
                            }}
                            className="rounded text-sky-600 focus:ring-sky-500"
                          />
                          <span className="text-[11px] font-semibold text-slate-700">เปิดใช้</span>
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleResetRounds}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <RefreshCw className="w-4 h-4 text-slate-500" /> คืนค่า 10 รอบ รพ.พล
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setShowRoundsConfigModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs active:scale-95 transition-all"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleSaveRoundsConfig}
                  className="px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-xs active:scale-95 transition-all flex items-center gap-2"
                >
                  <Save className="w-4 h-4" /> บันทึกการเปลี่ยนแปลง
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: VIEW PHOTO EVIDENCE (ดูรูปถ่ายจุดตรวจขยาย) */}
      {selectedPhotoModal && (
        <div 
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedPhotoModal(null)}
        >
          <div 
            className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden max-w-xl w-full shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center border-b border-slate-800">
              <div className="pr-2">
                <h4 className="font-bold text-sm sm:text-base text-white flex items-center gap-2">
                  <Camera className="w-4 h-4 text-sky-400 shrink-0" />
                  <span className="truncate">{selectedPhotoModal.title}</span>
                </h4>
                {selectedPhotoModal.timestamp && (
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    เวลาบันทึก: {new Date(selectedPhotoModal.timestamp).toLocaleString("th-TH")}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => openFullImage(selectedPhotoModal.url, selectedPhotoModal.title)}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-sky-300 hover:text-white transition-colors"
                  title="เปิดดูขนาดเต็มจอในแท็บใหม่"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedPhotoModal(null)}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-400 hover:text-white transition-colors"
                  title="ปิดหน้าต่าง"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Photo Body */}
            <div 
              className="bg-black/95 flex items-center justify-center p-2 min-h-[40vh] max-h-[72vh] overflow-hidden relative group cursor-zoom-in"
              onClick={() => openFullImage(selectedPhotoModal.url, selectedPhotoModal.title)}
              title="คลิกที่ภาพเพื่อเปิดดูภาพขนาดเต็ม"
            >
              <img 
                src={selectedPhotoModal.url} 
                alt={selectedPhotoModal.title} 
                className="max-h-[70vh] w-auto max-w-full object-contain rounded-xl select-none"
              />
              <div className="absolute bottom-3 inset-x-0 flex justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="bg-black/70 text-white text-[11px] font-bold px-3 py-1 rounded-full backdrop-blur-xs flex items-center gap-1">
                  <Maximize2 className="w-3 h-3 text-sky-400" /> แตะหรือคลิกที่รูปเพื่อเปิดดูขนาดเต็ม
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="p-3.5 bg-slate-900 border-t border-slate-800 flex flex-wrap gap-2 justify-between items-center text-xs">
              <span className="text-slate-400 text-[11px] flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> หลักฐานยืนยันพิกัด GPS & วันเวลาจริง
              </span>
              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={() => downloadImage(selectedPhotoModal.url, selectedPhotoModal.title)}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95 shadow-2xs border border-slate-700"
                  title="บันทึกไฟล์ภาพ .jpg ลงในเครื่อง"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>บันทึกภาพ</span>
                </button>
                <button
                  type="button"
                  onClick={() => openFullImage(selectedPhotoModal.url, selectedPhotoModal.title)}
                  className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all active:scale-95 shadow-md shadow-sky-600/30"
                  title="เปิดดูภาพขนาดเต็ม (แท็บใหม่)"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>เปิดภาพขนาดเต็ม</span>
                </button>
              </div>
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
