"use client";

import { useEffect, useState } from "react";
import { db } from "./firebase";
import { collection, onSnapshot, doc } from "firebase/firestore";
import { useStore, PatrolLog, ParkingScan, Incident, Checkpoint, StaffVehicle, Guard, initialGuards } from "./store";
import { 
  seedFirestoreIfEmpty, 
  saveCheckpointToCloud, 
  deleteCheckpointFromCloud,
  saveIncidentToCloud, 
  saveGoogleDriveWebhookToCloud, 
  saveGeminiApiKeyToCloud,
  saveGuardToCloud,
  deleteGuardFromCloud,
  saveAllGuardsToCloud
} from "./firebaseService";

export function useFirebaseSync() {
  const [isConnected, setIsConnected] = useState(false);
  const { 
    checkpoints,
    patrolLogs,
    parkingScans,
    incidents
  } = useStore();

  useEffect(() => {
    // 1. Initial Seed if empty
    seedFirestoreIfEmpty().catch(console.warn);

    // 2. Real-time Listener: Patrol Logs
    const unsubPatrol = onSnapshot(collection(db, "patrolLogs"), (snapshot) => {
      setIsConnected(true);
      const cloudLogs = snapshot.docs.map(doc => doc.data() as PatrolLog);
      const cloudIds = new Set(cloudLogs.map(l => l.id));
      useStore.setState((state) => {
        // Retain unsynced local logs, adopt cloud as ground truth for synced ones
        const unsyncedLocals = state.patrolLogs.filter(l => !l.synced && !cloudIds.has(l.id));
        return { patrolLogs: [...cloudLogs, ...unsyncedLocals] };
      });
    }, (err) => {
      console.warn("Patrol sync notice:", err.message);
    });

    // 3. Real-time Listener: Parking Scans (รองรับ รปภ. หลายคนสแกนพร้อมกัน ข้อมูลซิงค์สดเรียงลำดับใหม่สุดลงมา)
    const unsubParking = onSnapshot(collection(db, "parkingScans"), (snapshot) => {
      setIsConnected(true);
      const cloudScans = snapshot.docs.map(doc => doc.data() as ParkingScan);
      // เรียงลำดับเวลาใหม่สุดอยู่บนสุด
      cloudScans.sort((a, b) => {
        const timeA = new Date(a.timestamp || 0).getTime();
        const timeB = new Date(b.timestamp || 0).getTime();
        if (timeA && timeB && !isNaN(timeA) && !isNaN(timeB)) return timeB - timeA;
        return (b.id || "").localeCompare(a.id || "");
      });
      const cloudIds = new Set(cloudScans.map(s => s.id));
      useStore.setState((state) => {
        const unsyncedLocals = state.parkingScans.filter(s => !s.synced && !cloudIds.has(s.id));
        const merged = [...cloudScans, ...unsyncedLocals].sort((a, b) => {
          const timeA = new Date(a.timestamp || 0).getTime();
          const timeB = new Date(b.timestamp || 0).getTime();
          return timeB - timeA;
        });
        return { parkingScans: merged };
      });
    }, (err) => {
      console.warn("Parking sync notice:", err.message);
    });

    // 3.1 Instant Cross-Tab Broadcast Channel (ซิงค์ข้ามแท็บ/อุปกรณ์ภายในเครื่องทันที 0ms)
    let broadcast: BroadcastChannel | null = null;
    try {
      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        broadcast = new BroadcastChannel("hospital_security_parking_sync");
        broadcast.onmessage = (event) => {
          if (event.data?.type === "NEW_PARKING_SCAN" && event.data?.scan) {
            const incomingScan = event.data.scan as ParkingScan;
            useStore.setState((state) => {
              if (state.parkingScans.some((s) => s.id === incomingScan.id)) return state;
              const updated = [incomingScan, ...state.parkingScans].sort((a, b) => {
                const timeA = new Date(a.timestamp || 0).getTime();
                const timeB = new Date(b.timestamp || 0).getTime();
                return timeB - timeA;
              });
              return { parkingScans: updated };
            });
          }
        };
      }
    } catch (e) {
      console.warn("BroadcastChannel init notice:", e);
    }

    // 4. Real-time Listener: Incidents
    const unsubIncidents = onSnapshot(collection(db, "incidents"), (snapshot) => {
      setIsConnected(true);
      const cloudIncidents = snapshot.docs.map(doc => doc.data() as Incident);
      // Sort incidents by timestamp or ID descending (newest first)
      cloudIncidents.sort((a, b) => {
        const timeA = new Date(a.dateString || a.timestamp || 0).getTime();
        const timeB = new Date(b.dateString || b.timestamp || 0).getTime();
        if (timeA && timeB && !isNaN(timeA) && !isNaN(timeB)) return timeB - timeA;
        return (b.id || "").localeCompare(a.id || "");
      });
      useStore.setState((state) => {
        const cloudIds = new Set(cloudIncidents.map(i => i.id));
        const unsyncedLocals = state.incidents.filter(i => !cloudIds.has(i.id) && i.id !== 'inc-1');
        // If there are unsynced locals, persist them to Firestore so all guards see them
        unsyncedLocals.forEach(i => saveIncidentToCloud(i));
        return { incidents: [...cloudIncidents, ...unsyncedLocals] };
      });
    }, (err) => {
      console.warn("Incidents sync notice:", err.message);
    });

    // 5. Real-time Listener: Checkpoints (If Supervisor updates checkpoints)
    const unsubCheckpoints = onSnapshot(collection(db, "checkpoints"), (snapshot) => {
      setIsConnected(true);
      if (!snapshot.empty) {
        // Automatically purge any dummy checkpoints (cp01 - cp07) from Firestore
        snapshot.docs.forEach(docSnap => {
          if (docSnap.id.match(/^cp0[1-7]$/)) {
            deleteCheckpointFromCloud(docSnap.id);
          }
        });

        const rawCps = snapshot.docs
          .map(doc => doc.data() as Checkpoint)
          .filter(cp => !cp.id.match(/^cp0[1-7]$/));

        // Deduplicate checkpoints by code
        const seenCodes = new Set<string>();
        const seenIds = new Set<string>();
        let cloudCps: Checkpoint[] = [];

        for (const cp of rawCps) {
          const code = cp.code?.trim() || "";
          if (code && !seenCodes.has(code) && !seenIds.has(cp.id)) {
            seenCodes.add(code);
            seenIds.add(cp.id);
            cloudCps.push(cp);
          } else if (seenCodes.has(code)) {
            // Duplicate code found in Firestore -> purge duplicate doc
            deleteCheckpointFromCloud(cp.id);
          }
        }

        cloudCps.sort((a, b) => {
          const numA = parseInt(a.code || "0", 10) || a.order || 0;
          const numB = parseInt(b.code || "0", 10) || b.order || 0;
          return numA - numB;
        });

        // Ensure orders and codes are sequential 01, 02, 03...
        cloudCps = cloudCps.map((cp, idx) => {
          const expectedCode = String(idx + 1).padStart(2, '0');
          const expectedOrder = idx + 1;
          if (cp.code !== expectedCode || cp.order !== expectedOrder) {
            const updated = { ...cp, code: expectedCode, order: expectedOrder };
            saveCheckpointToCloud(updated);
            return updated;
          }
          return cp;
        });

        const currentBuildings = useStore.getState().buildings || [];
        const cpBuildings = cloudCps.map((cp) => cp.building?.trim()).filter((b): b is string => Boolean(b));
        const combinedBuildings = Array.from(new Set([...currentBuildings, ...cpBuildings]));
        if (combinedBuildings.length > currentBuildings.length) {
          useStore.setState({ checkpoints: cloudCps, buildings: combinedBuildings });
        } else {
          useStore.setState({ checkpoints: cloudCps });
        }
      }
    }, (err) => {
      console.warn("Checkpoints sync notice:", err.message);
    });

    // 6. Real-time Listener: Archive Audit Logs
    const unsubArchive = onSnapshot(collection(db, "archiveAuditLogs"), (snapshot) => {
      if (!snapshot.empty) {
        const logs = snapshot.docs.map(doc => doc.data() as any);
        logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        useStore.setState({ archiveAuditLogs: logs });
      }
    }, (err) => {
      console.warn("Archive sync notice:", err.message);
    });

    // 7. Real-time Listener: Staff Vehicles
    const unsubVehicles = onSnapshot(collection(db, "staffVehicles"), (snapshot) => {
      if (!snapshot.empty) {
        const cloudVehicles = snapshot.docs.map(doc => doc.data() as StaffVehicle);
        useStore.setState({ staffVehicles: cloudVehicles });
      }
    }, (err) => {
      console.warn("Staff vehicles sync notice:", err.message);
    });

    // 8. Real-time Listener: Shift Handover Reports
    const unsubShiftReports = onSnapshot(collection(db, "shiftReports"), (snapshot) => {
      if (!snapshot.empty) {
        const cloudReports = snapshot.docs.map(doc => doc.data() as any);
        cloudReports.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        useStore.setState({ shiftReports: cloudReports });
      }
    }, (err) => {
      console.warn("Shift reports sync notice:", err.message);
    });

    // 9. Real-time Listener: Daily AI Summaries
    const unsubDailyAI = onSnapshot(collection(db, "dailyAISummaries"), (snapshot) => {
      if (!snapshot.empty) {
        const cloudAI = snapshot.docs.map(doc => doc.data() as any);
        cloudAI.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        useStore.setState({ dailyAISummaries: cloudAI });
      }
    }, (err) => {
      console.warn("Daily AI summaries sync notice:", err.message);
    });

    // 10. Real-time Listener: Google Drive Webhook Config
    const unsubDriveConfig = onSnapshot(doc(db, "systemSettings", "googleDrive"), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data && typeof data.webhookUrl === "string" && data.webhookUrl.trim()) {
          useStore.setState({ googleDriveWebhookUrl: data.webhookUrl.trim() });
        } else {
          // If cloud has no webhookUrl but this device has one from testing, sync it to cloud!
          const localUrl = useStore.getState().googleDriveWebhookUrl;
          if (localUrl && localUrl.trim().startsWith("http")) {
            saveGoogleDriveWebhookToCloud(localUrl.trim());
          }
        }
      } else {
        const localUrl = useStore.getState().googleDriveWebhookUrl;
        if (localUrl && localUrl.trim().startsWith("http")) {
          saveGoogleDriveWebhookToCloud(localUrl.trim());
        }
      }
    }, (err) => {
      console.warn("Drive config sync notice:", err.message);
    });

    // 11. Real-time Listener: Google Gemini 1.5 Flash Vision Config
    const unsubGeminiConfig = onSnapshot(doc(db, "systemSettings", "gemini"), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data && typeof data.apiKey === "string" && data.apiKey.trim()) {
          useStore.setState({ geminiApiKey: data.apiKey.trim() });
        } else {
          const localKey = useStore.getState().geminiApiKey;
          if (localKey && localKey.trim()) {
            saveGeminiApiKeyToCloud(localKey.trim());
          }
        }
      } else {
        const localKey = useStore.getState().geminiApiKey;
        if (localKey && localKey.trim()) {
          saveGeminiApiKeyToCloud(localKey.trim());
        }
      }
    }, (err) => {
      console.warn("Gemini config sync notice:", err.message);
    });

    // 12. Real-time Listener: Guards (ซิงค์รายชื่อและรหัส PIN ของ รปภ. ทุกเครื่องสดทันที)
    const unsubGuards = onSnapshot(collection(db, "guards"), (snapshot) => {
      setIsConnected(true);
      if (!snapshot.empty) {
        const cloudGuards = snapshot.docs.map(doc => doc.data() as Guard);
        const hasLegacyMockOnly = cloudGuards.some(g => g.id === "g1" && g.name === "นายสมชาย รักษา");
        if (hasLegacyMockOnly || cloudGuards.length < 5) {
          // หากบน Cloud ยังมีเฉพาะข้อมูลจำลองเก่า ให้อัปโหลดรายชื่อ 13 นายจริงของ รพ.พล ขึ้น Cloud ทันที
          saveAllGuardsToCloud(initialGuards).then(() => {
            if (hasLegacyMockOnly) {
              ["g1", "g2", "g3", "g4", "g5"].forEach(id => deleteGuardFromCloud(id));
            }
          });
        } else {
          useStore.setState({ guards: cloudGuards });
        }
      } else {
        // หากบน Cloud ยังว่างเปล่า ให้อัปโหลดรายชื่อ 13 นายจริงของ รพ.พล ขึ้น Cloud ทันที
        const currentLocal = useStore.getState().guards || [];
        const toSave = currentLocal.length >= 10 ? currentLocal : initialGuards;
        saveAllGuardsToCloud(toSave);
      }
    }, (err) => {
      console.warn("Guards sync notice:", err.message);
    });

    return () => {
      broadcast?.close();
      unsubPatrol();
      unsubParking();
      unsubIncidents();
      unsubCheckpoints();
      unsubArchive();
      unsubVehicles();
      unsubShiftReports();
      unsubDailyAI();
      unsubDriveConfig();
      unsubGeminiConfig();
      unsubGuards();
    };
  }, []);

  return { isConnected };
}
