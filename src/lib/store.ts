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
  saveShiftReportToCloud,
  saveDailyAISummaryToCloud
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
  addParkingScan: (scan: Omit<ParkingScan, 'id' | 'synced' | 'guardName'>) => void;
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
}

export const initialGuards: Guard[] = [
  { id: 'g1', name: 'นายสมชาย รักษา', pin: '1234', shift: 'morning', phone: '089-111-2233', role: 'guard' },
  { id: 'g2', name: 'นายประสิทธิ์ คุ้มกัน', pin: '1111', shift: 'morning', phone: '089-222-3344', role: 'guard' },
  { id: 'g3', name: 'นายวิชัย ระวังภัย', pin: '2222', shift: 'morning', phone: '089-333-4455', role: 'guard' },
  { id: 'g4', name: 'นายสมศักดิ์ ปลอดภัย', pin: '5678', shift: 'night', phone: '089-444-5566', role: 'guard' },
  { id: 'g5', name: 'นายสุรชัย มั่นคง', pin: '3333', shift: 'night', phone: '089-555-6677', role: 'guard' },
];

export const initialCheckpoints: Checkpoint[] = [
  { 
    id: 'cp01', 
    code: '01', 
    name: 'โถงทางเข้าหลัก & จุดคัดกรอง', 
    building: 'อาคารเฉลิมพระเกียรติ A', 
    floor: 'ชั้น 1', 
    order: 1,
    coords: { lat: 15.81462, lng: 102.60124, accuracy: 5.0, setAt: '2026-09-11 08:00' },
    items: [
      'ประตูทางเข้า-ออก และหน้าต่างล็อกแน่นหนา',
      'ทางหนีไฟและอุปกรณ์ดับเพลิงไม่ถูกปิดกั้น',
      'ระบบไฟส่องสว่างและกล้อง CCTV ทำงานปกติ',
      'ตรวจสอบไม่มีบุคคลต้องสงสัยหรือสิ่งของตกค้าง',
    ]
  },
  { 
    id: 'cp02', 
    code: '02', 
    name: 'ห้องฉุกเฉิน (ER) & ทางลาดรับส่งผู้ป่วย', 
    building: 'อาคารเฉลิมพระเกียรติ A', 
    floor: 'ชั้น 1', 
    order: 2,
    coords: { lat: 15.81480, lng: 102.60150, accuracy: 4.2, setAt: '2026-09-11 08:05' },
    items: [
      'ทางลาดรับส่งผู้ป่วยฉุกเฉินโล่ง ไม่มีรถจอดขวาง',
      'ถังดับเพลิงและสายฉีดน้ำอยู่ในสภาพพร้อมใช้',
      'ประตูกระจกอัตโนมัติเปิด-ปิดปกติ',
      'เฝ้าระวังกลุ่มเสี่ยง/ญาติผู้ป่วยไม่ก่อเหตุวุ่นวาย',
    ]
  },
  { 
    id: 'cp03', 
    code: '03', 
    name: 'ห้องคลังยาหลัก & สารเสพติดทางการแพทย์', 
    building: 'อาคารเฉลิมพระเกียรติ A', 
    floor: 'ชั้น 2', 
    order: 3,
    coords: { lat: 15.81470, lng: 102.60130, accuracy: 6.0, setAt: '2026-09-11 08:10' },
    items: [
      'ประตูห้องคลังยาและตู้เซฟล็อก 2 ชั้นแน่นหนา',
      'อุณหภูมิตู้เย็นเก็บยาและระบบทำความเย็นปกติ',
      'กล้อง CCTV ส่องตรงหน้าตู้ยาทำงานตลอด 24 ชม.',
      'สัญญาณเตือนภัยกันขโมยเปิดใช้งานปกติ',
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
  'อาคารเฉลิมพระเกียรติ A',
  'อาคารบริการผู้ป่วย B',
  'อาคารสนับสนุนเทคนิค C',
  'พื้นที่ภายนอก & บริเวณรอบ รพ.'
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
      setGoogleDriveWebhookUrl: (url: string) => set({ googleDriveWebhookUrl: url }),

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
          id: 'scan-' + Date.now(),
          guardName: user?.name || 'รปภ. เวร',
          timestamp: scan.timestamp || now.toISOString(),
          expireAt: scan.expireAt || expireDate.toISOString(),
          synced: true
        };
        saveParkingScanToCloud(newScan);

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
      addGuard: (guard) => set((state) => ({
        guards: [
          ...state.guards,
          {
            ...guard,
            id: 'g-' + Date.now(),
          }
        ]
      })),
      updateGuard: (id, updated) => set((state) => ({
        guards: state.guards.map(g => g.id === id ? { ...g, ...updated } : g)
      })),
      deleteGuard: (id) => set((state) => ({
        guards: state.guards.filter(g => g.id !== id)
      })),



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
            const hasLegacyCodes = state.checkpoints.some(
              (cp) => !/^\d{2,}$/.test(cp.code?.trim() || "")
            );
            if (hasLegacyCodes) {
              state.autoRenumberCheckpoints();
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
