import { db, storage } from "./firebase";
import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  onSnapshot, 
  deleteDoc,
  writeBatch,
  query,
  orderBy,
  limit
} from "firebase/firestore";
import { ref, uploadString, getDownloadURL } from "firebase/storage";
import { 
  PatrolLog, 
  ParkingScan, 
  Incident, 
  Checkpoint, 
  Guard, 
  StaffVehicle,
  ChecklistTemplate,
  ArchiveAuditLog,
  initialCheckpoints,
  initialChecklistTemplates,
  initialGuards,
  mockStaffVehicles,
  initialIncidents
} from "./store";

// ==========================================
// 1. Firebase Storage: Image Upload
// ==========================================
export async function uploadIncidentImage(dataUrl: string, incidentId?: string): Promise<string> {
  try {
    if (!dataUrl || !dataUrl.startsWith("data:image")) {
      return dataUrl; // Return as-is if already a remote URL
    }
    const filename = `incident_${incidentId || Date.now()}_${Math.random().toString(36).substring(2, 7)}.jpg`;
    const storageRef = ref(storage, `incidents/${filename}`);
    
    // Upload base64 data url directly
    await uploadString(storageRef, dataUrl, "data_url");
    const downloadUrl = await getDownloadURL(storageRef);
    return downloadUrl;
  } catch (error) {
    console.warn("Firebase Storage upload fallback (offline/unavailable):", error);
    return dataUrl; // fallback to local dataUrl
  }
}

// ==========================================
// 2. Firestore: Real-time Sync & Persistence
// ==========================================

// Patrol Logs
export async function savePatrolLogToCloud(log: PatrolLog) {
  try {
    const docRef = doc(db, "patrolLogs", log.id);
    await setDoc(docRef, log);
  } catch (err) {
    console.warn("Cloud save patrolLog failed:", err);
  }
}

// Parking Scans
export async function saveParkingScanToCloud(scan: ParkingScan) {
  try {
    const docRef = doc(db, "parkingScans", scan.id);
    await setDoc(docRef, scan);
  } catch (err) {
    console.warn("Cloud save parkingScan failed:", err);
  }
}

// Incidents
export async function saveIncidentToCloud(incident: Incident) {
  try {
    const docRef = doc(db, "incidents", incident.id);
    await setDoc(docRef, incident);
  } catch (err) {
    console.warn("Cloud save incident failed:", err);
  }
}

// Checkpoints
export async function saveCheckpointToCloud(checkpoint: Checkpoint) {
  try {
    const docRef = doc(db, "checkpoints", checkpoint.id);
    await setDoc(docRef, checkpoint);
  } catch (err) {
    console.warn("Cloud save checkpoint failed:", err);
  }
}

export async function deleteCheckpointFromCloud(checkpointId: string) {
  try {
    await deleteDoc(doc(db, "checkpoints", checkpointId));
  } catch (err) {
    console.warn("Cloud delete checkpoint failed:", err);
  }
}

// Guards
export async function saveGuardToCloud(guard: Guard) {
  try {
    const docRef = doc(db, "guards", guard.id);
    await setDoc(docRef, guard);
  } catch (err) {
    console.warn("Cloud save guard failed:", err);
  }
}

// Staff Vehicles
export async function saveStaffVehiclesToCloud(vehicles: StaffVehicle[]) {
  try {
    for (const v of vehicles) {
      const docId = `${v.plateNumber}_${v.province}`.replace(/[\/\s]/g, "_");
      await setDoc(doc(db, "staffVehicles", docId), v);
    }
  } catch (err) {
    console.warn("Cloud save staffVehicles failed:", err);
  }
}

// Batch Delete for Archival Purge (Firestore limits 500 writes per batch, we chunk by 450)
export async function batchDeleteRecordsFromCloud(
  collectionName: "patrolLogs" | "parkingScans" | "incidents",
  docIds: string[]
): Promise<number> {
  if (!docIds || docIds.length === 0) return 0;

  let totalDeleted = 0;
  const chunkSize = 450;

  for (let i = 0; i < docIds.length; i += chunkSize) {
    const chunk = docIds.slice(i, i + chunkSize);
    const batch = writeBatch(db);

    for (const id of chunk) {
      const docRef = doc(db, collectionName, id);
      batch.delete(docRef);
    }

    try {
      await batch.commit();
      totalDeleted += chunk.length;
    } catch (err) {
      console.error(`Error deleting batch from ${collectionName}:`, err);
      break;
    }
  }

  return totalDeleted;
}

// Archive Audit Logs
export async function saveArchiveAuditLogToCloud(log: ArchiveAuditLog) {
  try {
    const docRef = doc(db, "archiveAuditLogs", log.id);
    await setDoc(docRef, log);
  } catch (err) {
    console.warn("Cloud save archiveAuditLog failed:", err);
  }
}

export async function fetchArchiveAuditLogsFromCloud(): Promise<ArchiveAuditLog[]> {
  try {
    const q = query(
      collection(db, "archiveAuditLogs"),
      orderBy("timestamp", "desc"),
      limit(50)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as ArchiveAuditLog);
  } catch (err) {
    console.warn("Fetch archiveAuditLogs notice:", err);
    return [];
  }
}

// ==========================================
// 3. Database Initial Seeder (If Firestore is Fresh)
// ==========================================
export async function seedFirestoreIfEmpty() {
  try {
    const cpSnap = await getDocs(collection(db, "checkpoints"));
    if (cpSnap.empty) {
      console.log("Seeding initial checkpoints to Firestore...");
      for (const cp of initialCheckpoints) {
        await setDoc(doc(db, "checkpoints", cp.id), cp);
      }
    }

    const guardSnap = await getDocs(collection(db, "guards"));
    if (guardSnap.empty) {
      console.log("Seeding initial guards to Firestore...");
      for (const g of initialGuards) {
        await setDoc(doc(db, "guards", g.id), g);
      }
    }

    const tmplSnap = await getDocs(collection(db, "checklistTemplates"));
    if (tmplSnap.empty) {
      console.log("Seeding initial checklist templates to Firestore...");
      for (const t of initialChecklistTemplates) {
        await setDoc(doc(db, "checklistTemplates", t.id), t);
      }
    }

    const vehSnap = await getDocs(collection(db, "staffVehicles"));
    if (vehSnap.empty) {
      console.log("Seeding staff vehicles to Firestore...");
      for (const v of mockStaffVehicles) {
        const docId = `${v.plateNumber}_${v.province}`.replace(/[\/\s]/g, "_");
        await setDoc(doc(db, "staffVehicles", docId), v);
      }
    }
  } catch (err) {
    console.warn("Firestore seed notice:", err);
  }
}
