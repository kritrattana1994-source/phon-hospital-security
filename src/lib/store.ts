import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { 
  savePatrolLogToCloud, 
  saveParkingScanToCloud, 
  saveIncidentToCloud, 
  saveCheckpointToCloud, 
  deleteCheckpointFromCloud,
  saveStaffVehiclesToCloud,
  deleteStaffVehicleFromCloud
} from './firebaseService';

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
  round?: '22:00' | '06:00';
  timestamp: string;
  isStaff: boolean;
  ownerName?: string;
  department?: string;
  zone?: string;
  guardName: string;
  synced: boolean;
  expireAt?: string;
}

export interface ShiftSwapRequest {
  id: string;
  requesterId: string;
  requesterName: string;
  requesterShift: 'morning' | 'night';
  targetGuardId: string;
  targetGuardName: string;
  targetShift: 'morning' | 'night';
  swapDate: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface LeaveRequest {
  id: string;
  guardId: string;
  guardName: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  type: 'vacation' | 'sick' | 'personal';
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface DailyRoster {
  date: string; // YYYY-MM-DD
  morningGuardIds: string[]; // 3 นาย
  nightGuardIds: string[];   // 2 นาย
  offGuardIds: string[];     // พัก/ลา/วันหยุด
}

export interface StaffDayOff {
  id: string;
  guardId: string;
  guardName: string;
  date: string; // YYYY-MM-DD
  reason?: string;
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

  // Checklist Templates (บันทึกรายการเช็คไว้ดึงใช้ง่ายๆ)
  checklistTemplates: ChecklistTemplate[];
  addChecklistTemplate: (tmpl: Omit<ChecklistTemplate, 'id'>) => void;
  deleteChecklistTemplate: (id: string) => void;

  // Patrols
  patrolLogs: PatrolLog[];
  addPatrolLog: (log: Omit<PatrolLog, 'id' | 'synced' | 'guardId' | 'guardName'>) => void;

  // Incidents
  incidents: Incident[];
  addIncident: (incident: Omit<Incident, 'id' | 'status' | 'reporterName' | 'timestamp'>) => void;
  updateIncidentStatus: (id: string, status: Incident['status']) => void;

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

  // Shift Swap Requests
  shiftSwapRequests: ShiftSwapRequest[];
  createShiftSwapRequest: (req: Omit<ShiftSwapRequest, 'id' | 'status' | 'createdAt'>) => void;
  approveShiftSwapRequest: (id: string) => void;
  rejectShiftSwapRequest: (id: string) => void;

  // Leave Management (การขอลา)
  leaveRequests: LeaveRequest[];
  addLeaveRequest: (req: Omit<LeaveRequest, 'id' | 'status' | 'createdAt'>) => void;
  approveLeaveRequest: (id: string) => void;
  rejectLeaveRequest: (id: string) => void;

  // Staff Days Off Management (เลือก/กำหนดวันหยุดให้พนักงาน)
  staffDaysOff: StaffDayOff[];
  setStaffDayOff: (guardId: string, date: string, isOff: boolean, reason?: string) => void;
  setGuardRecurringDayOff: (guardId: string, dayOfWeek: number, year: number, month: number) => void;
  clearStaffDaysOffForMonth: (year: number, month: number, guardId?: string) => void;

  // Shift Schedule (ตารางเวรรายเดือน & Auto / Manual Scheduler)
  rosterSchedule: Record<string, DailyRoster>;
  autoGenerateSchedule: (startDateStr: string, daysCount?: number) => void;
  autoGenerateMonthSchedule: (year: number, month: number) => void;
  manualUpdateRoster: (date: string, shift: 'morning' | 'night' | 'off', guardIds: string[]) => void;

  // 365-Day Archival & Data Retention
  archiveAuditLogs: ArchiveAuditLog[];
  addArchiveAuditLog: (log: ArchiveAuditLog) => void;
  purgeArchivedRecords: (type: 'patrolLogs' | 'parkingScans' | 'incidents', ids: string[]) => void;
}

export const initialGuards: Guard[] = [
  // กะเช้า 3 นาย
  { id: 'g1', name: 'นายสมชาย รักษา', pin: '1234', shift: 'morning', phone: '089-111-2233', role: 'guard' },
  { id: 'g2', name: 'นายประสิทธิ์ คุ้มกัน', pin: '1111', shift: 'morning', phone: '089-222-3344', role: 'guard' },
  { id: 'g3', name: 'นายวิชัย ระวังภัย', pin: '2222', shift: 'morning', phone: '089-333-4455', role: 'guard' },
  // กะดึก 2 นาย
  { id: 'g4', name: 'นายสมศักดิ์ ปลอดภัย', pin: '5678', shift: 'night', phone: '089-444-5566', role: 'guard' },
  { id: 'g5', name: 'นายสุรชัย มั่นคง', pin: '3333', shift: 'night', phone: '089-555-6677', role: 'guard' },
  // หัวหน้างาน
  { id: 's1', name: 'พ.ต.ท. ประพันธ์ (หัวหน้าความปลอดภัย)', pin: '9999', shift: 'morning', phone: '081-999-8888', role: 'supervisor' }
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

export const initialIncidents: Incident[] = [
  {
    id: 'inc-1',
    type: 'facility',
    severity: 'medium',
    title: 'ไฟทางหนีไฟดับบริเวณบันไดชั้น 2 ตึก A',
    reporterName: 'นายสมชาย รักษา',
    timestamp: '2026-09-11 05:30',
    status: 'investigating',
    imageUrl: 'https://images.unsplash.com/photo-1517646287270-a5a9ca602e5c?w=600&q=80',
  }
];

const initialShiftSwaps: ShiftSwapRequest[] = [
  {
    id: 'swap-1',
    requesterId: 'g1',
    requesterName: 'นายสมชาย รักษา',
    requesterShift: 'morning',
    targetGuardId: 'g4',
    targetGuardName: 'นายสมศักดิ์ ปลอดภัย',
    targetShift: 'night',
    swapDate: '2026-09-12',
    reason: 'มีธุระด่วนพาบิดาไปพบแพทย์ต่างอำเภอช่วงเช้า',
    status: 'pending',
    createdAt: '2026-09-11 10:15',
  }
];

const initialLeaves: LeaveRequest[] = [
  {
    id: 'leave-1',
    guardId: 'g2',
    guardName: 'นายประสิทธิ์ คุ้มกัน',
    startDate: '2026-09-13',
    endDate: '2026-09-14',
    type: 'personal',
    reason: 'ลากิจส่วนตัวไปงานบวชหลานชาย',
    status: 'approved',
    createdAt: '2026-09-11 09:00',
  }
];

const initialStaffDaysOff: StaffDayOff[] = [
  { id: 'off-g1-1', guardId: 'g1', guardName: 'นายสมชาย รักษา', date: '2026-09-07', reason: 'วันหยุดประจำสัปดาห์' },
  { id: 'off-g1-2', guardId: 'g1', guardName: 'นายสมชาย รักษา', date: '2026-09-14', reason: 'วันหยุดประจำสัปดาห์' },
  { id: 'off-g1-3', guardId: 'g1', guardName: 'นายสมชาย รักษา', date: '2026-09-21', reason: 'วันหยุดประจำสัปดาห์' },
  { id: 'off-g1-4', guardId: 'g1', guardName: 'นายสมชาย รักษา', date: '2026-09-28', reason: 'วันหยุดประจำสัปดาห์' },
  { id: 'off-g3-1', guardId: 'g3', guardName: 'นายวิชัย ระวังภัย', date: '2026-09-06', reason: 'วันหยุดพักผ่อน' },
  { id: 'off-g3-2', guardId: 'g3', guardName: 'นายวิชัย ระวังภัย', date: '2026-09-20', reason: 'วันหยุดพักผ่อน' },
  { id: 'off-g5-1', guardId: 'g5', guardName: 'นายสุรชัย มั่นคง', date: '2026-09-10', reason: 'วันหยุดประจำสัปดาห์' },
  { id: 'off-g5-2', guardId: 'g5', guardName: 'นายสุรชัย มั่นคง', date: '2026-09-24', reason: 'วันหยุดประจำสัปดาห์' },
];

// ฟังก์ชันสร้าง Roster ทั้งเดือนกันยายน 2569 (30 วัน)
const generateDefaultRosters = (): Record<string, DailyRoster> => {
  const map: Record<string, DailyRoster> = {};
  const daysInMonth = 30;
  const guards = ['g1', 'g2', 'g3', 'g4', 'g5'];

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `2026-09-${String(day).padStart(2, '0')}`;

    // 1. วันลาที่อนุมัติ (13-14 ก.ย. นายประสิทธิ์ g2)
    const leaves: string[] = (dateStr === "2026-09-13" || dateStr === "2026-09-14") ? ['g2'] : [];

    // 2. วันหยุดที่หัวหน้ากำหนดให้พนักงาน
    const offList = initialStaffDaysOff.filter(d => d.date === dateStr).map(d => d.guardId);

    // รวมคนที่ไม่ได้ขึ้นเวร (ลา + วันหยุด)
    const allOff = Array.from(new Set([...leaves, ...offList]));
    const available = guards.filter(g => !allOff.includes(g));

    // หมุนเวียนเวรตามวันที่เพื่อความยุติธรรม
    const offset = (day - 1) % Math.max(available.length, 1);
    const rotated = [...available.slice(offset), ...available.slice(0, offset)];

    const morning: string[] = [];
    const night: string[] = [];
    const off: string[] = [...allOff];

    for (let m = 0; m < Math.min(3, rotated.length); m++) {
      morning.push(rotated[m]);
    }
    for (let n = 3; n < Math.min(5, rotated.length); n++) {
      night.push(rotated[n]);
    }
    for (let o = 5; o < rotated.length; o++) {
      off.push(rotated[o]);
    }

    map[dateStr] = {
      date: dateStr,
      morningGuardIds: morning,
      nightGuardIds: night,
      offGuardIds: off
    };
  }
  return map;
};

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      supervisorUser: null,

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
          const sup = get().guards.find(g => g.role === 'supervisor') || initialGuards[5];
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

      // Patrols
      patrolLogs: [],
      addPatrolLog: (log) => {
        const user = get().currentUser;
        const newLog: PatrolLog = {
          ...log,
          id: 'patrol-' + Date.now(),
          guardId: user?.id || 'unknown',
          guardName: user?.name || 'รปภ. เวร',
          synced: true
        };
        savePatrolLogToCloud(newLog);
        set((state) => ({
          patrolLogs: [newLog, ...state.patrolLogs]
        }));
      },

      // Incidents
      incidents: initialIncidents,
      addIncident: (incident) => {
        const user = get().currentUser;
        const newIncident: Incident = {
          ...incident,
          id: 'inc-' + Date.now(),
          reporterName: user?.name || 'รปภ. เวร',
          timestamp: new Date().toLocaleString('th-TH', { hour12: false }),
          status: 'pending'
        };
        saveIncidentToCloud(newIncident);
        set((state) => ({
          incidents: [newIncident, ...state.incidents]
        }));
      },
      updateIncidentStatus: (id, status) => {
        set((state) => {
          const newIncidents = state.incidents.map(inc => inc.id === id ? { ...inc, status } : inc);
          const target = newIncidents.find(i => i.id === id);
          if (target) saveIncidentToCloud(target);
          return { incidents: newIncidents };
        });
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

      // Shift Swap Management
      shiftSwapRequests: initialShiftSwaps,
      createShiftSwapRequest: (req) => set((state) => ({
        shiftSwapRequests: [
          {
            ...req,
            id: 'swap-' + Date.now(),
            status: 'pending',
            createdAt: new Date().toLocaleString('th-TH', { hour12: false }),
          },
          ...state.shiftSwapRequests
        ]
      })),
      approveShiftSwapRequest: (id) => {
        const req = get().shiftSwapRequests.find(r => r.id === id);
        if (req) {
          set((state) => ({
            guards: state.guards.map(g => {
              if (g.id === req.requesterId) return { ...g, shift: req.targetShift };
              if (g.id === req.targetGuardId) return { ...g, shift: req.requesterShift };
              return g;
            }),
            shiftSwapRequests: state.shiftSwapRequests.map(r => 
              r.id === id ? { ...r, status: 'approved' as const } : r
            )
          }));
        }
      },
      rejectShiftSwapRequest: (id) => set((state) => ({
        shiftSwapRequests: state.shiftSwapRequests.map(r => 
          r.id === id ? { ...r, status: 'rejected' as const } : r
        )
      })),

      // Leave Requests Management (การขอลา)
      leaveRequests: initialLeaves,
      addLeaveRequest: (req) => set((state) => ({
        leaveRequests: [
          {
            ...req,
            id: 'leave-' + Date.now(),
            status: 'pending',
            createdAt: new Date().toLocaleString('th-TH', { hour12: false })
          },
          ...state.leaveRequests
        ]
      })),
      approveLeaveRequest: (id) => set((state) => ({
        leaveRequests: state.leaveRequests.map(l => l.id === id ? { ...l, status: 'approved' as const } : l)
      })),
      rejectLeaveRequest: (id) => set((state) => ({
        leaveRequests: state.leaveRequests.map(l => l.id === id ? { ...l, status: 'rejected' as const } : l)
      })),

      // Staff Days Off Management (เลือก/กำหนดวันหยุดให้พนักงาน)
      staffDaysOff: initialStaffDaysOff,
      setStaffDayOff: (guardId, date, isOff, reason = "กำหนดโดยหัวหน้างาน") => {
        const guard = get().guards.find(g => g.id === guardId);
        const guardName = guard?.name || "รปภ.";
        set((state) => {
          let updated: StaffDayOff[];
          if (isOff) {
            if (state.staffDaysOff.some(d => d.guardId === guardId && d.date === date)) {
              return state;
            }
            updated = [
              ...state.staffDaysOff,
              { id: `off-${guardId}-${date}`, guardId, guardName, date, reason }
            ];
          } else {
            updated = state.staffDaysOff.filter(d => !(d.guardId === guardId && d.date === date));
          }
          return { staffDaysOff: updated };
        });
      },
      setGuardRecurringDayOff: (guardId, dayOfWeek, year, month) => {
        const guard = get().guards.find(g => g.id === guardId);
        const guardName = guard?.name || "รปภ.";
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const newDaysOff: StaffDayOff[] = [];

        for (let d = 1; d <= daysInMonth; d++) {
          const dateObj = new Date(year, month, d);
          if (dateObj.getDay() === dayOfWeek) {
            const yearStr = dateObj.getFullYear();
            const monthStr = String(dateObj.getMonth() + 1).padStart(2, '0');
            const dayStr = String(dateObj.getDate()).padStart(2, '0');
            const dateStr = `${yearStr}-${monthStr}-${dayStr}`;
            newDaysOff.push({
              id: `off-${guardId}-${dateStr}`,
              guardId,
              guardName,
              date: dateStr,
              reason: "วันหยุดประจำสัปดาห์"
            });
          }
        }

        set((state) => {
          const filtered = state.staffDaysOff.filter(
            d => !(d.guardId === guardId && newDaysOff.some(nd => nd.date === d.date))
          );
          return { staffDaysOff: [...filtered, ...newDaysOff] };
        });
      },
      clearStaffDaysOffForMonth: (year, month, guardId) => {
        const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
        set((state) => ({
          staffDaysOff: state.staffDaysOff.filter(d => {
            if (guardId && d.guardId !== guardId) return true;
            return !d.date.startsWith(prefix);
          })
        }));
      },

      // Roster Schedule & Monthly Auto-Scheduling Algorithm (จัดเวรอัตโนมัติรายเดือน & แมนนวล)
      rosterSchedule: generateDefaultRosters(),
      autoGenerateSchedule: (startDateStr: string, daysCount: number = 7) => {
        const start = new Date(startDateStr);
        const activeGuards = get().guards.filter(g => g.role === 'guard');
        const approvedLeaves = get().leaveRequests.filter(l => l.status === 'approved');
        const daysOff = get().staffDaysOff;
        const newSchedule: Record<string, DailyRoster> = { ...get().rosterSchedule };

        for (let i = 0; i < daysCount; i++) {
          const current = new Date(start);
          current.setDate(start.getDate() + i);
          const dateStr = current.toISOString().split("T")[0];

          // 1. วันนี้มีใครลาที่ได้รับการอนุมัติบ้าง
          const guardsOnLeave = approvedLeaves.filter(leave => {
            return dateStr >= leave.startDate && dateStr <= leave.endDate;
          }).map(l => l.guardId);

          // 2. วันนี้มีใครเป็นวันหยุดที่หัวหน้ากำหนดบ้าง
          const guardsOffToday = daysOff.filter(dOff => dOff.date === dateStr).map(dOff => dOff.guardId);
          const allOffIds = Array.from(new Set([...guardsOnLeave, ...guardsOffToday]));

          // 3. รปภ. ที่พร้อมเข้าเวรในวันนี้
          const availableGuards = activeGuards.filter(g => !allOffIds.includes(g.id));

          // 4. จัดการกระจายกะ: กะเช้าต้องการ 3 คน, กะดึกต้องการ 2 คน
          const rotated = [...availableGuards];
          const shiftOffset = i % Math.max(availableGuards.length, 1);
          const rotatedGuards = [...rotated.slice(shiftOffset), ...rotated.slice(0, shiftOffset)];

          const morningGuardIds: string[] = [];
          const nightGuardIds: string[] = [];
          const offGuardIds: string[] = [...allOffIds];

          for (let m = 0; m < Math.min(3, rotatedGuards.length); m++) {
            morningGuardIds.push(rotatedGuards[m].id);
          }
          for (let n = 3; n < Math.min(5, rotatedGuards.length); n++) {
            nightGuardIds.push(rotatedGuards[n].id);
          }
          for (let o = 5; o < rotatedGuards.length; o++) {
            offGuardIds.push(rotatedGuards[o].id);
          }

          newSchedule[dateStr] = {
            date: dateStr,
            morningGuardIds,
            nightGuardIds,
            offGuardIds
          };
        }

        set({ rosterSchedule: newSchedule });
      },

      autoGenerateMonthSchedule: (year: number, month: number) => {
        const activeGuards = get().guards.filter(g => g.role === 'guard');
        const approvedLeaves = get().leaveRequests.filter(l => l.status === 'approved');
        const daysOff = get().staffDaysOff;
        const newSchedule: Record<string, DailyRoster> = { ...get().rosterSchedule };

        const daysInMonth = new Date(year, month + 1, 0).getDate();

        for (let day = 1; day <= daysInMonth; day++) {
          const d = new Date(year, month, day);
          const yearStr = d.getFullYear();
          const monthStr = String(d.getMonth() + 1).padStart(2, '0');
          const dayStr = String(d.getDate()).padStart(2, '0');
          const dateStr = `${yearStr}-${monthStr}-${dayStr}`;

          // 1. วันนี้ใครลา
          const guardsOnLeave = approvedLeaves.filter(leave => {
            return dateStr >= leave.startDate && dateStr <= leave.endDate;
          }).map(l => l.guardId);

          // 2. วันนี้ใครเป็นวันหยุดที่กำหนด
          const guardsOffToday = daysOff.filter(dOff => dOff.date === dateStr).map(dOff => dOff.guardId);
          const allOffIds = Array.from(new Set([...guardsOnLeave, ...guardsOffToday]));

          // 3. รปภ. พร้อมเข้าเวร
          const availableGuards = activeGuards.filter(g => !allOffIds.includes(g.id));

          // 4. สลับหมุนเวียนเวรตามวันเพื่อเกลี่ยภาระงานอย่างเท่าเทียม
          const rotated = [...availableGuards];
          const shiftOffset = (day - 1) % Math.max(availableGuards.length, 1);
          const rotatedGuards = [...rotated.slice(shiftOffset), ...rotated.slice(0, shiftOffset)];

          const morningGuardIds: string[] = [];
          const nightGuardIds: string[] = [];
          const offGuardIds: string[] = [...allOffIds];

          // กะเช้า 3 นาย
          for (let m = 0; m < Math.min(3, rotatedGuards.length); m++) {
            morningGuardIds.push(rotatedGuards[m].id);
          }
          // กะดึก 2 นาย
          for (let n = 3; n < Math.min(5, rotatedGuards.length); n++) {
            nightGuardIds.push(rotatedGuards[n].id);
          }
          // คนที่เหลือ -> เป็นวันพัก
          for (let o = 5; o < rotatedGuards.length; o++) {
            offGuardIds.push(rotatedGuards[o].id);
          }

          newSchedule[dateStr] = {
            date: dateStr,
            morningGuardIds,
            nightGuardIds,
            offGuardIds
          };
        }

        set({ rosterSchedule: newSchedule });
      },

      manualUpdateRoster: (date: string, shift: 'morning' | 'night' | 'off', guardIds: string[]) => {
        set((state) => {
          const currentDay = state.rosterSchedule[date] || {
            date,
            morningGuardIds: [],
            nightGuardIds: [],
            offGuardIds: []
          };

          return {
            rosterSchedule: {
              ...state.rosterSchedule,
              [date]: {
                ...currentDay,
                [shift === 'morning' ? 'morningGuardIds' : shift === 'night' ? 'nightGuardIds' : 'offGuardIds']: guardIds
              }
            }
          };
        });
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
    }),
    {
      name: 'smart-hospital-security-v5',
      onRehydrateStorage: () => (state) => {
        if (state && Array.isArray(state.checkpoints)) {
          const hasLegacyCodes = state.checkpoints.some(
            (cp) => !/^\d{2,}$/.test(cp.code?.trim() || "")
          );
          if (hasLegacyCodes) {
            state.autoRenumberCheckpoints();
          }
        }
      },
    }
  )
);
