import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { 
  savePatrolLogToCloud, 
  saveParkingScanToCloud, 
  saveIncidentToCloud, 
  saveCheckpointToCloud, 
  deleteCheckpointFromCloud,
  saveStaffVehiclesToCloud,
  deleteStaffVehicleFromCloud,
  saveGuardToCloud,
  deleteGuardFromCloud,
  saveAllGuardsToCloud,
  saveShiftReportToCloud,
  saveDailyAISummaryToCloud,
  saveGoogleDriveWebhookToCloud,
  saveGeminiApiKeyToCloud
} from './firebaseService';
import { 
  PatrolRound, 
  ShiftReportLog, 
  defaultPatrolRounds, 
  getCurrentRound, 
  isScanOnTime,
  getCurrentShift
} from './patrolSchedule';

export type { PatrolRound, ShiftReportLog };

export interface Guard {
  id: string;
  name: string;
  pin: string;
  shift: 'morning' | 'night';
  phone: string;
  role: 'guard' | 'supervisor';
}

export interface Checkpoint {
  id: string;
  code: string;
  name: string;
  building: string;
  floor: string;
  order: number;
  coords?: { lat: number; lng: number; accuracy?: number; setAt?: string };
  items?: string[]; // รายการเช็คความปลอดภัยประจำจุดตรวจ
}

export interface ChecklistTemplate {
  id: string;
  name: string;
  category?: string;
  description?: string;
  items: string[];
}

export interface PatrolLog {
  id: string;
  checkpointId: string;
  guardId: string;
  guardName: string;
  timestamp: string;
  status: 'normal' | 'issue';
  notes?: string;
  coords?: { lat: number; lng: number; accuracy?: number };
  synced: boolean;
  roundId?: string;
  roundName?: string;
  shift?: 'morning' | 'afternoon' | 'night';
  imageUrl?: string;
  distanceMeters?: number;
  isOnTime?: boolean;
}

export interface Incident {
  id: string;
  type: 'facility' | 'suspicious' | 'medical';
  severity: 'low' | 'medium' | 'high';
  title: string;
  imageUrl?: string;
  reporterName: string;
  timestamp: string;
  status: 'pending' | 'investigating' | 'resolved';
  shift?: 'morning' | 'afternoon' | 'night';
  shiftName?: string;
  dateString?: string;
  resolutionImageUrl?: string;
  resolutionNote?: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

export interface StaffVehicle {
  plateNumber: string;
  province: string;
  ownerName: string;
  department: string;
  phone: string;
  zone: string;
  brand?: string;
  model?: string;
  color?: string;
  vehicleType?: 'รถยนต์' | 'รถจักรยานยนต์' | string;
}

export interface ParkingScan {
  id: string;
  plateNumber: string;
  province?: string;
  round?: string;
  roundName?: string;
  timestamp: string;
  isStaff: boolean;
  ownerName?: string;
  department?: string;
  zone?: string;
  guardName: string;
  synced: boolean;
  expireAt?: string;
  imageUrl?: string;
}

export interface DailyAISummary {
  id: string; // e.g. "ai-2026-09-29"
  dateString: string; // "2026-09-29"
  timestamp: string; // ISO
  reportDateThai: string; // "วันอังคารที่ 29 กันยายน 2569"
  totalVehiclesScanned: number;
  staffVehiclesCount: number;
  outsideVehiclesCount: number;
  overnightVehiclesCount: number;
  abandonedCount?: number;
  zoneViolationsCount?: number;
  patrolTotalScans: number;
  patrolComplianceRate: number;
  patrolOnTimeRate: number;
  patrolIssuesCount: number;
  aiSummaryMarkdown: string;
  lineMessage?: string;
  actionItems?: string[];
  generatedBy?: string;
}



export interface ArchiveAuditLog {
  id: string;
  timestamp: string;
  fiscalYear: string;
  operator: string;
  cutoffDays: number;
  patrolLogsCount: number;
  parkingScansCount: number;
  incidentsCount: number;
  totalRecords: number;
  driveFolderId?: string;
  driveFolderLink?: string;
  filesUploaded: Array<{ name: string; link?: string }>;
  purgedFromFirestore: boolean;
  status: 'success' | 'failed' | 'partial';
  notes?: string;
}

interface AppState {
  // Authentication
  currentUser: Guard | null;
  supervisorUser: Guard | null;
  loginGuard: (pin: string) => boolean;
  loginSupervisor: (pin: string) => boolean;
  logoutGuard: () => void;
  logoutSupervisor: () => void;

  // Checkpoints & Checklist Management
  checkpoints: Checkpoint[];
  addCheckpoint: (cp: Omit<Checkpoint, 'id'>) => void;
  updateCheckpoint: (id: string, cp: Partial<Checkpoint>) => void;
  deleteCheckpoint: (id: string) => void;
  reorderCheckpoints: (newCheckpoints: Checkpoint[]) => void;
  autoRenumberCheckpoints: () => void;
  updateCheckpointItems: (checkpointId: string, items: string[]) => void;
  copyCheckpointItems: (targetCheckpointId: string, sourceCheckpointId: string) => void;

  // Buildings Management (อาคารที่สามารถเพิ่ม/ลดได้)
  buildings: string[];
  addBuilding: (name: string) => void;
  deleteBuilding: (name: string) => void;

  // Checklist Templates (บันทึกรายการเช็คไว้ดึงใช้ง่ายๆ)
  checklistTemplates: ChecklistTemplate[];
  addChecklistTemplate: (tmpl: Omit<ChecklistTemplate, 'id'>) => void;
  deleteChecklistTemplate: (id: string) => void;

  // Patrols & Rounds
  patrolLogs: PatrolLog[];
  addPatrolLog: (log: Omit<PatrolLog, 'id' | 'synced' | 'guardId' | 'guardName'>) => void;
  patrolRounds: PatrolRound[];
  updatePatrolRounds: (rounds: PatrolRound[]) => void;
  resetPatrolRoundsToDefault: () => void;

  // Shift Reports (ส่งรายงานประจำกะช่วงต่อกะ)
  shiftReports: ShiftReportLog[];
  addShiftReportLog: (report: ShiftReportLog) => void;

  // Incidents
  incidents: Incident[];
  addIncident: (incident: Omit<Incident, 'id' | 'status' | 'reporterName' | 'timestamp'> & { shift?: 'morning' | 'afternoon' | 'night'; shiftName?: string; dateString?: string }) => Promise<Incident> | void;
  updateIncidentStatus: (
    id: string, 
    status: Incident['status'], 
    resolution?: {
      resolutionImageUrl?: string;
      resolutionNote?: string;
      resolvedAt?: string;
      resolvedBy?: string;
    }
  ) => Promise<void> | void;

  // Vehicles
  staffVehicles: StaffVehicle[];
  parkingScans: ParkingScan[];
  addParkingScan: (scan: Omit<ParkingScan, 'id' | 'synced' | 'guardName'> & { guardName?: string }) => void;
  addStaffVehicle: (vehicle: StaffVehicle) => void;
  syncVehiclesFromSheet: (vehicles: StaffVehicle[]) => void;
  bulkImportVehicles: (vehicles: StaffVehicle[]) => void;
  deleteStaffVehicle: (plateNumber: string, province: string) => void;
  purgeExpiredScans: (days?: number) => number;

  // Guards List
  guards: Guard[];
  addGuard: (guard: Omit<Guard, 'id'>) => void;
  updateGuard: (id: string, guard: Partial<Guard>) => void;
  deleteGuard: (id: string) => void;



  // 365-Day Archival & Data Retention
  archiveAuditLogs: ArchiveAuditLog[];
  addArchiveAuditLog: (log: ArchiveAuditLog) => void;
  purgeArchivedRecords: (type: 'patrolLogs' | 'parkingScans' | 'incidents', ids: string[]) => void;

  // Daily AI Summaries (ประวัติข้อความวิเคราะห์รายวัน)
  dailyAISummaries: DailyAISummary[];
  addDailyAISummary: (summary: DailyAISummary) => void;

  // Google Drive Upload Webhook URL
  googleDriveWebhookUrl: string;
  setGoogleDriveWebhookUrl: (url: string) => void;

  // Google Gemini Vision API Key (for License Plate OCR)
  geminiApiKey: string;
  setGeminiApiKey: (key: string) => void;
}

export const initialGuards: Guard[] = [
  { id: 'g0510', name: 'นายบุญธรรม เชียงเทียะ', pin: '0510', shift: 'morning', phone: '0821063839', role: 'guard' },
  { id: 'g0514', name: 'นายภูธีป ทองผา', pin: '0514', shift: 'morning', phone: '0910657049', role: 'guard' },
  { id: 'g0515', name: 'นายกฤษฎา หัตถพนม', pin: '0515', shift: 'morning', phone: '0657471882', role: 'guard' },
  { id: 'g0511', name: 'นายวีระชาติ พานนนท์', pin: '0511', shift: 'morning', phone: '0636109011', role: 'guard' },
  { id: 'g0513', name: 'นายทรงชัย ทุมพัง', pin: '0513', shift: 'morning', phone: '0637738979', role: 'guard' },
  { id: 'g0516', name: 'นายสุพัฒน์พงศ์ เอมวัฒน์', pin: '0516', shift: 'morning', phone: '0986572089', role: 'guard' },
  { id: 'g0512', name: 'นายประสิทธิ์ อูปแก้ว', pin: '0512', shift: 'morning', phone: '0872154255', role: 'guard' },
  { id: 'g0001', name: 'นายศักดิ์สิทธิ์ นาเม็ง', pin: '0001', shift: 'morning', phone: '0912130432', role: 'guard' },
  { id: 'g0002', name: 'นายศุภชัย โสภา', pin: '0002', shift: 'morning', phone: '0966307969', role: 'guard' },
  { id: 'g0003', name: 'นายสนธยา อะวะตา', pin: '0003', shift: 'morning', phone: '0981264839', role: 'guard' },
  { id: 'g0004', name: 'นายพิสันชัย ศรีกุดเรือ', pin: '0004', shift: 'morning', phone: '0943734429', role: 'guard' },
  { id: 'g0005', name: 'นายรักไทย ตระวงษ์', pin: '0005', shift: 'morning', phone: '0653252169,0807611976', role: 'guard' },
  { id: 'g0006', name: 'นายกฤษฎ์ ป้อมสุวรรณ', pin: '0006', shift: 'morning', phone: '0943918410', role: 'guard' },
];

export const initialCheckpoints: Checkpoint[] = [
  {
    id: "cp-1790652118104",
    code: "01",
    order: 1,
    name: "หน้าห้องงานสุขาภิบาล",
    building: "OPD เก่า",
    floor: "ชั้น 1",
    coords: {
      lat: 15.816506,
      lng: 102.6082934,
      accuracy: 8.8,
      setAt: "30/9/2569 10:33:45"
    },
    items: [
      "ความสะอาดและความเป็นระเบียบเรียบร้อยบริเวณหน้าห้อง",
      "ระบบไฟส่องสว่างและกล้องวงจรปิดทำงานปกติ",
      "ประตูทางเข้า-ออก และหน้าต่างล็อกแน่นหนา",
      "ทางหนีไฟและอุปกรณ์ดับเพลิงไม่ถูกปิดกั้น"
    ]
  },
  {
    id: "cp-1790653782444",
    code: "02",
    order: 2,
    name: "หน้า ER",
    building: "อาคารอุบัติเหตุและฉุกเฉิน",
    floor: "เวรเปล",
    coords: {
      lat: 15.8158327,
      lng: 102.6084876,
      accuracy: 9.2,
      setAt: "30/9/2569 10:43:21"
    },
    items: [
      "ทางลาดรับส่งผู้ป่วยฉุกเฉินโล่ง 100% ไม่มีรถจอดขวาง",
      "ปุ่มสัญญาณเตือนภัยฉุกเฉิน (Red Alert) พร้อมใช้งาน",
      "เฝ้าระวังกลุ่มเสี่ยง/ญาติผู้ป่วยไม่ก่อเหตุทะเลาะวิวาท",
      "ประตูห้องฉุกเฉินและระบบควบคุมการเข้า-ออกทำงานปกติ"
    ]
  },
  {
    id: "cp-1790656235678",
    code: "03",
    order: 3,
    name: "ตึกชาย",
    building: "ตึกชาย",
    floor: "ชั้น 1",
    coords: {
      lat: 15.8164286,
      lng: 102.6086471,
      accuracy: 9.1,
      setAt: "30/9/2569 10:40:36"
    },
    items: [
      "ประตูทางเข้า-ออก และหน้าต่างหอผู้ป่วยล็อกเรียบร้อย",
      "เฝ้าระวังบุคคลภายนอกแอบแฝงบนหอผู้ป่วย",
      "ทางหนีไฟและบันไดฉุกเฉินไม่ถูกวางของกีดขวาง",
      "ถังดับเพลิงอยู่ในสภาพพร้อมใช้งาน"
    ]
  },
  {
    id: "cp-1790656268537",
    code: "04",
    order: 4,
    name: "ตึกหญิง",
    building: "ตึกหญิง",
    floor: "ชั้น 1",
    coords: {
      lat: 15.8166671,
      lng: 102.608697,
      accuracy: 9.0,
      setAt: "30/9/2569 10:38:22"
    },
    items: [
      "ประตูทางเข้า-ออก หอผู้ป่วยล็อกเรียบร้อย",
      "เฝ้าระวังความปลอดภัยผู้ป่วยหญิงและป้องกันบุคคลต้องสงสัย",
      "ทางหนีไฟและป้ายไฟทางออกฉุกเฉินติดสว่างชัดเจน",
      "ถังดับเพลิงและสายฉีดน้ำพร้อมใช้งาน"
    ]
  },
  {
    id: "cp-1790658838803",
    code: "05",
    order: 5,
    name: "หน้าห้องเครื่องสำรองไฟฟ้า",
    building: "อาคาร OPD ใหม่",
    floor: "ชั้น 1",
    coords: {
      lat: 15.8163985,
      lng: 102.6097491,
      accuracy: 17.0,
      setAt: "30/9/2569 10:55:14"
    },
    items: [
      "ประตูห้องเครื่องกำเนิดไฟฟ้าฉุกเฉินล็อกแน่นหนา",
      "ไม่มีวัตถุไวไฟ กองขยะ หรือสิ่งกีดขวางหน้าห้องเครื่อง",
      "ไม่มีกลิ่นไหม้ เสียงผิดปกติ หรือน้ำมันรั่วซึม",
      "อุปกรณ์ดับเพลิงประจำห้องเครื่องพร้อมใช้งาน"
    ]
  },
  {
    id: "cp-1790658926767",
    code: "06",
    order: 6,
    name: "หน้าห้อง งานยานพาหนะ",
    building: "อาคารงานยานพาหนะ",
    floor: "ชั้น 1",
    coords: {
      lat: 15.8170281,
      lng: 102.6098412,
      accuracy: 10.6,
      setAt: "30/9/2569 10:49:29"
    },
    items: [
      "รถพยาบาลฉุกเฉินและรถส่วนกลางจอดเป็นระเบียบ ไม่กีดขวาง",
      "พื้นที่จอดรถและแนวรั้วไม่มีบุคคลต้องสงสัย",
      "ตรวจสอบความปลอดภัยระบบไฟส่องสว่างลานจอด",
      "ประตูห้องงานยานพาหนะล็อกเรียบร้อย"
    ]
  },
  {
    id: "cp-1790659015863",
    code: "07",
    order: 7,
    name: "หน้าอาคารโอสถศาลา",
    building: "หน้าอาคารโอสถศาลา",
    floor: "ชั้น 1",
    coords: {
      lat: 15.8166813,
      lng: 102.6091408,
      accuracy: 13.7,
      setAt: "30/9/2569 10:47:04"
    },
    items: [
      "ประตูอาคารโอสถศาลาและหน้าต่างล็อกแน่นหนา",
      "ตรวจสอบไม่มีสัมภาระตกค้างหรือวัตถุต้องสงสัย",
      "ระบบไฟส่องสว่างรอบอาคารเปิดสว่างปกติ",
      "ถังดับเพลิงและอุปกรณ์ความปลอดภัยพร้อมใช้"
    ]
  }
];

export const initialChecklistTemplates: ChecklistTemplate[] = [
  {
    id: 'tmpl-general',
    name: 'โถงทั่วไป & ประตูเข้า-ออกอาคาร',
    category: 'อาคารทั่วไป',
    description: 'เหมาะสำหรับจุดตรวจทางเดิน, โถงผู้ป่วยนอก, ประตูอาคาร',
    items: [
      'ประตูและหน้าต่างล็อกแน่นหนาเรียบร้อย',
      'ทางหนีไฟและอุปกรณ์ดับเพลิงไม่ถูกปิดกั้น',
      'ระบบไฟส่องสว่างและกล้องวงจรปิดทำงานปกติ',
      'ตรวจสอบไม่มีบุคคลต้องสงสัยหรือสิ่งของตกค้าง',
    ]
  },
  {
    id: 'tmpl-er',
    name: 'ห้องฉุกเฉิน (ER) & ทางลาดผู้ป่วย',
    category: 'วิกฤต/ฉุกเฉิน',
    description: 'เหมาะสำหรับพื้นที่วิกฤต, จุดรับส่งผู้ป่วย, หน้าห้องผ่าตัด',
    items: [
      'ทางลาดรับส่งผู้ป่วยฉุกเฉินโล่ง ไม่มีรถจอดขวาง',
      'ถังดับเพลิงและสายฉีดน้ำอยู่ในสภาพพร้อมใช้',
      'ประตูกระจกอัตโนมัติเปิด-ปิดปกติ',
      'เฝ้าระวังกลุ่มเสี่ยง/ญาติผู้ป่วยไม่ก่อเหตุวุ่นวาย',
    ]
  },
  {
    id: 'tmpl-pharmacy',
    name: 'ห้องคลังยา & วัตถุเสพติดทางการแพทย์',
    category: 'ความปลอดภัยสูง',
    description: 'เหมาะสำหรับคลังยา, ห้องการเงิน, จุดเก็บทรัพย์สินมีค่า',
    items: [
      'ประตูห้องคลังยาและตู้เซฟล็อก 2 ชั้นแน่นหนา',
      'อุณหภูมิตู้เย็นเก็บยาและระบบทำความเย็นปกติ',
      'กล้อง CCTV ส่องตรงหน้าตู้ยาทำงานตลอด 24 ชม.',
      'สัญญาณเตือนภัยกันขโมยเปิดใช้งานปกติ',
    ]
  },
  {
    id: 'tmpl-gas-power',
    name: 'ห้องควบคุมระบบไฟ & ถังออกซิเจนเหลว',
    category: 'วิศวกรรม/ระบบสนับสนุน',
    description: 'เหมาะสำหรับห้องเครื่อง, สถานีก๊าซการแพทย์, ห้องหม้อแปลง',
    items: [
      'วาล์วแรงดันก๊าซออกซิเจนการแพทย์อยู่ในเกณฑ์ปกติ',
      'ประตูห้องหม้อแปลงไฟฟ้าล็อกสนิท ไม่อนุญาตภายนอก',
      'ไม่มีสารไวไฟหรือขยะติดไฟในบริเวณเสี่ยง',
      'ระบบไฟฉุกเฉินและเครื่องกำเนิดไฟฟ้าสำรองพร้อมทำงาน',
    ]
  },
  {
    id: 'tmpl-parking',
    name: 'ลานจอดรถ & ชั้นใต้ดิน',
    category: 'ลานจอดรถ/ภายนอก',
    description: 'เหมาะสำหรับลานจอดรถแพทย์, ลานจอดญาติ, ชั้นใต้ดิน B1-B2',
    items: [
      'ตรวจสอบรถยนต์จอดขวางช่องทางฉุกเฉิน',
      'ไฟส่องสว่างตามเสาและมุมอับติดสว่างครบ',
      'ไม่มีผู้แอบแฝงหรือนอนค้างคืนในยานพาหนะ',
      'ประตูหนีไฟขึ้นตึกชั้นใต้ดินล็อกฝั่งทางเข้า',
    ]
  }
];

export const mockStaffVehicles: StaffVehicle[] = [];

const initialParkingScans: ParkingScan[] = [];

export const initialIncidents: Incident[] = [];
export const initialBuildings: string[] = [
  'OPD เก่า',
  'อาคารอุบัติเหตุและฉุกเฉิน',
  'ตึกชาย',
  'ตึกหญิง',
  'อาคาร OPD ใหม่',
  'อาคารงานยานพาหนะ',
  'หน้าอาคารโอสถศาลา'
];

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      supervisorUser: {
        id: 'sup-1',
        name: 'หัวหน้างานความปลอดภัย',
        pin: '9999',
        shift: 'morning',
        phone: '089-999-8877',
        role: 'supervisor'
      },
      googleDriveWebhookUrl: '',
      setGoogleDriveWebhookUrl: (url: string) => {
        saveGoogleDriveWebhookToCloud(url);
        set({ googleDriveWebhookUrl: url });
      },
      geminiApiKey: '',
      setGeminiApiKey: (key: string) => {
        saveGeminiApiKeyToCloud(key);
        set({ geminiApiKey: key });
      },

      loginGuard: (pin: string) => {
        const guard = get().guards.find(g => g.pin === pin && g.role === 'guard');
        if (guard) {
          set({ currentUser: guard });
          return true;
        }
        return false;
      },

      loginSupervisor: (pin: string) => {
        if (pin === '9999') {
          const sup = get().guards.find(g => g.role === 'supervisor') || {
            id: 'sup-1',
            name: 'หัวหน้างานความปลอดภัย',
            pin: '9999',
            shift: 'morning' as const,
            phone: '089-999-8877',
            role: 'supervisor' as const
          };
          set({ supervisorUser: sup });
          return true;
        }
        return false;
      },

      logoutGuard: () => set({ currentUser: null }),
      logoutSupervisor: () => set({ supervisorUser: null }),

      // Checkpoints & Checklist Management
      checkpoints: initialCheckpoints,
      addCheckpoint: (cp) => {
        const nextOrder = cp.order || (get().checkpoints.length + 1);
        const nextCode = cp.code && cp.code.trim() ? cp.code.trim() : String(nextOrder).padStart(2, '0');
        const newCp: Checkpoint = {
          ...cp,
          order: nextOrder,
          code: nextCode,
          id: 'cp-' + Date.now(),
          items: cp.items && cp.items.length > 0 ? cp.items : [
            'ประตูทางเข้า-ออก และหน้าต่างล็อกแน่นหนา',
            'ทางหนีไฟและอุปกรณ์ดับเพลิงไม่ถูกปิดกั้น',
            'ระบบไฟส่องสว่างและกล้องวงจรปิดทำงานปกติ'
          ]
        };
        saveCheckpointToCloud(newCp);
        set((state) => ({
          checkpoints: [...state.checkpoints, newCp]
        }));
      },
      autoRenumberCheckpoints: () => {
        set((state) => {
          const sorted = [...state.checkpoints].sort((a, b) => (a.order || 0) - (b.order || 0));
          const renumbered = sorted.map((cp, idx) => {
            const newOrder = idx + 1;
            const newCode = String(newOrder).padStart(2, '0');
            const updated = { ...cp, order: newOrder, code: newCode };
            saveCheckpointToCloud(updated);
            return updated;
          });
          return { checkpoints: renumbered };
        });
      },
      updateCheckpoint: (id, updated) => {
        set((state) => {
          const newCheckpoints = state.checkpoints.map(cp => cp.id === id ? { ...cp, ...updated } : cp);
          const target = newCheckpoints.find(c => c.id === id);
          if (target) saveCheckpointToCloud(target);
          return { checkpoints: newCheckpoints };
        });
      },
      deleteCheckpoint: (id) => {
        deleteCheckpointFromCloud(id);
        set((state) => ({
          checkpoints: state.checkpoints.filter(cp => cp.id !== id)
        }));
      },
      reorderCheckpoints: (newCheckpoints) => {
        newCheckpoints.forEach(cp => saveCheckpointToCloud(cp));
        set({ checkpoints: newCheckpoints });
      },
      updateCheckpointItems: (checkpointId, items) => {
        set((state) => {
          const newCheckpoints = state.checkpoints.map(cp => cp.id === checkpointId ? { ...cp, items } : cp);
          const target = newCheckpoints.find(c => c.id === checkpointId);
          if (target) saveCheckpointToCloud(target);
          return { checkpoints: newCheckpoints };
        });
      },
      copyCheckpointItems: (targetCheckpointId, sourceCheckpointId) => {
        const source = get().checkpoints.find(cp => cp.id === sourceCheckpointId);
        if (source && source.items) {
          const copiedItems = [...source.items];
          set((state) => {
            const newCheckpoints = state.checkpoints.map(cp => cp.id === targetCheckpointId ? { ...cp, items: copiedItems } : cp);
            const target = newCheckpoints.find(c => c.id === targetCheckpointId);
            if (target) saveCheckpointToCloud(target);
            return { checkpoints: newCheckpoints };
          });
        }
      },

      // Checklist Templates (บันทึกรายการเช็คไว้ดึงใช้ง่ายๆ)
      checklistTemplates: initialChecklistTemplates,
      addChecklistTemplate: (tmpl) => set((state) => ({
        checklistTemplates: [
          ...state.checklistTemplates,
          {
            ...tmpl,
            id: 'tmpl-' + Date.now()
          }
        ]
      })),
      deleteChecklistTemplate: (id) => set((state) => ({
        checklistTemplates: state.checklistTemplates.filter(t => t.id !== id)
      })),

      // Buildings Management (อาคารที่สามารถเพิ่ม/ลดได้)
      buildings: initialBuildings,
      addBuilding: (name: string) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        set((state) => {
          if (state.buildings.includes(trimmed)) return state;
          return { buildings: [...state.buildings, trimmed] };
        });
      },
      deleteBuilding: (name: string) => {
        set((state) => ({
          buildings: state.buildings.filter((b) => b !== name)
        }));
      },

      // Patrols & Rounds
      patrolRounds: defaultPatrolRounds,
      updatePatrolRounds: (rounds) => set({ patrolRounds: rounds }),
      resetPatrolRoundsToDefault: () => set({ patrolRounds: defaultPatrolRounds }),

      patrolLogs: [],
      addPatrolLog: (log) => {
        const user = get().currentUser;
        const currentRounds = get().patrolRounds || defaultPatrolRounds;
        const now = log.timestamp ? new Date(log.timestamp) : new Date();
        const activeRound = getCurrentRound(currentRounds, now);
        const activeShift = getCurrentShift(now);
        const onTime = isScanOnTime(now.toISOString(), activeRound);

        const newLog: PatrolLog = {
          ...log,
          id: 'patrol-' + Date.now(),
          guardId: user?.id || 'unknown',
          guardName: user?.name || 'รปภ. เวร',
          roundId: log.roundId || activeRound.id,
          roundName: log.roundName || activeRound.name,
          shift: log.shift || activeShift.id,
          isOnTime: log.isOnTime !== undefined ? log.isOnTime : onTime,
          synced: true
        };
        savePatrolLogToCloud(newLog);
        set((state) => ({
          patrolLogs: [newLog, ...state.patrolLogs]
        }));
      },

      // Shift Reports
      shiftReports: [],
      addShiftReportLog: (report) => {
        saveShiftReportToCloud(report);
        set((state) => ({
          shiftReports: [report, ...state.shiftReports.filter((r) => r.id !== report.id)]
        }));
      },

      // Incidents
      incidents: initialIncidents,
      addIncident: async (incident) => {
        const user = get().currentUser;
        const now = new Date();
        const activeShift = getCurrentShift(now);
        const newIncident: Incident = {
          ...incident,
          id: 'inc-' + Date.now(),
          reporterName: user?.name || 'รปภ. เวร',
          timestamp: new Date().toLocaleString('th-TH', { hour12: false }),
          status: 'pending',
          shift: incident.shift || activeShift.id,
          shiftName: incident.shiftName || activeShift.name,
          dateString: incident.dateString || now.toISOString().split('T')[0]
        };
        set((state) => ({
          incidents: [newIncident, ...state.incidents]
        }));
        await saveIncidentToCloud(newIncident);
        return newIncident;
      },
      updateIncidentStatus: async (id, status, resolution) => {
        let target: Incident | undefined;
        set((state) => {
          const newIncidents = state.incidents.map((inc) => {
            if (inc.id === id) {
              const updated: Incident = {
                ...inc,
                status,
                ...(resolution || {}),
                ...(status === 'resolved' && !resolution?.resolvedAt ? { resolvedAt: new Date().toLocaleString('th-TH', { hour12: false }) } : {})
              };
              target = updated;
              return updated;
            }
            return inc;
          });
          return { incidents: newIncidents };
        });
        if (target) {
          await saveIncidentToCloud(target);
        }
      },

      // Vehicles
      staffVehicles: mockStaffVehicles,
      parkingScans: initialParkingScans,
      addParkingScan: (scan) => {
        const user = get().currentUser;
        const now = new Date();
        const expireDate = new Date(now);
        expireDate.setDate(expireDate.getDate() + 90);

        const newScan: ParkingScan = {
          ...scan,
          id: 'scan-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
          guardName: scan.guardName || user?.name || 'รปภ. เวร',
          timestamp: scan.timestamp || now.toISOString(),
          expireAt: scan.expireAt || expireDate.toISOString(),
          synced: true
        };
        saveParkingScanToCloud(newScan);

        try {
          if (typeof window !== "undefined" && "BroadcastChannel" in window) {
            const bc = new BroadcastChannel("hospital_security_parking_sync");
            bc.postMessage({ type: "NEW_PARKING_SCAN", scan: newScan });
            bc.close();
          }
        } catch {}

        set((state) => ({
          parkingScans: [newScan, ...state.parkingScans]
        }));
      },
      addStaffVehicle: (vehicle) => {
        saveStaffVehiclesToCloud([vehicle]);
        set((state) => ({
          staffVehicles: [...state.staffVehicles, vehicle]
        }));
      },
      syncVehiclesFromSheet: (vehicles) => {
        saveStaffVehiclesToCloud(vehicles);
        set({ staffVehicles: vehicles });
      },
      bulkImportVehicles: (incomingVehicles) => {
        set((state) => {
          const map = new Map<string, StaffVehicle>();
          state.staffVehicles.forEach((v) => {
            const key = `${v.plateNumber.replace(/\s+/g, "").toUpperCase()}_${v.province || "ขอนแก่น"}`;
            map.set(key, v);
          });
          incomingVehicles.forEach((v) => {
            const key = `${v.plateNumber.replace(/\s+/g, "").toUpperCase()}_${v.province || "ขอนแก่น"}`;
            map.set(key, v);
          });
          const updated = Array.from(map.values());
          saveStaffVehiclesToCloud(updated);
          return { staffVehicles: updated };
        });
      },
      deleteStaffVehicle: (plateNumber, province) => {
        deleteStaffVehicleFromCloud(plateNumber, province);
        set((state) => ({
          staffVehicles: state.staffVehicles.filter(
            (v) => !(v.plateNumber === plateNumber && v.province === province)
          ),
        }));
      },
      purgeExpiredScans: (days = 90) => {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        const cutoffTime = cutoff.getTime();

        const before = get().parkingScans.length;
        const kept = get().parkingScans.filter((scan) => {
          const scanTime = new Date(scan.timestamp).getTime();
          return scanTime >= cutoffTime;
        });
        const purged = before - kept.length;
        set({ parkingScans: kept });
        return purged;
      },

      // Guards List & Shift Management
      guards: initialGuards,
      addGuard: (guard) => {
        const newGuard: Guard = {
          ...guard,
          id: 'g-' + Date.now(),
        };
        saveGuardToCloud(newGuard);
        set((state) => ({
          guards: [...state.guards, newGuard]
        }));
      },
      updateGuard: (id, updated) => {
        set((state) => {
          const newGuards = state.guards.map((g) => (g.id === id ? { ...g, ...updated } : g));
          const target = newGuards.find((g) => g.id === id);
          if (target) saveGuardToCloud(target);
          return { guards: newGuards };
        });
      },
      deleteGuard: (id) => {
        deleteGuardFromCloud(id);
        set((state) => ({
          guards: state.guards.filter((g) => g.id !== id)
        }));
      },



      // 365-Day Archival & Data Retention
      archiveAuditLogs: [],
      addArchiveAuditLog: (log) =>
        set((state) => ({
          archiveAuditLogs: [log, ...state.archiveAuditLogs],
        })),
      purgeArchivedRecords: (type, ids) => {
        const idSet = new Set(ids);
        if (type === "patrolLogs") {
          set((state) => ({
            patrolLogs: state.patrolLogs.filter((l) => !idSet.has(l.id)),
          }));
        } else if (type === "parkingScans") {
          set((state) => ({
            parkingScans: state.parkingScans.filter((s) => !idSet.has(s.id)),
          }));
        } else if (type === "incidents") {
          set((state) => ({
            incidents: state.incidents.filter((i) => !idSet.has(i.id)),
          }));
        }
      },

      // Daily AI Summaries (ประวัติข้อความวิเคราะห์รายวัน)
      dailyAISummaries: [],
      addDailyAISummary: (summary) => {
        saveDailyAISummaryToCloud(summary);
        set((state) => {
          const idx = state.dailyAISummaries.findIndex((s) => s.dateString === summary.dateString);
          if (idx >= 0) {
            const updated = [...state.dailyAISummaries];
            updated[idx] = summary;
            return { dailyAISummaries: updated };
          }
          return { dailyAISummaries: [summary, ...state.dailyAISummaries] };
        });
      },
    }),
    {
      name: 'smart-hospital-security-v5',
      onRehydrateStorage: () => (state) => {
        if (state) {
          if (Array.isArray(state.checkpoints)) {
            // Remove legacy mock checkpoints (cp01 - cp07)
            const cleanCheckpoints = state.checkpoints.filter(cp => !cp.id.match(/^cp0[1-7]$/));
            
            // Deduplicate by code and id
            const seenCodes = new Set<string>();
            const seenIds = new Set<string>();
            const uniqueCps: Checkpoint[] = [];
            
            for (const cp of cleanCheckpoints) {
              const code = cp.code?.trim();
              if (code && !seenCodes.has(code) && !seenIds.has(cp.id)) {
                seenCodes.add(code);
                seenIds.add(cp.id);
                uniqueCps.push(cp);
              }
            }

            if (uniqueCps.length >= 7) {
              useStore.setState({ checkpoints: uniqueCps });
            } else {
              useStore.setState({ checkpoints: initialCheckpoints });
            }
          }
          if (!Array.isArray(state.buildings) || state.buildings.length === 0) {
            const cpBuildings = Array.isArray(state.checkpoints)
              ? state.checkpoints.map((cp) => cp.building?.trim()).filter(Boolean)
              : [];
            const merged = Array.from(new Set([...initialBuildings, ...cpBuildings]));
            useStore.setState({ buildings: merged });
          }
          if (Array.isArray(state.incidents)) {
            const cleanIncidents = state.incidents.filter((i) => i.id !== 'inc-1');
            if (cleanIncidents.length !== state.incidents.length) {
              useStore.setState({ incidents: cleanIncidents });
            }
          }
        }
      },
    }
  )
);
