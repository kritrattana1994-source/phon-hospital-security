"use client";

import { useEffect, useState } from "react";
import { db } from "./firebase";
import { collection, onSnapshot, doc } from "firebase/firestore";
import { useStore, PatrolLog, ParkingScan, Incident, Checkpoint, StaffVehicle } from "./store";
import { seedFirestoreIfEmpty, saveCheckpointToCloud, saveIncidentToCloud, saveGoogleDriveWebhookToCloud } from "./firebaseService";

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

    // 3. Real-time Listener: Parking Scans
    const unsubParking = onSnapshot(collection(db, "parkingScans"), (snapshot) => {
      setIsConnected(true);
      const cloudScans = snapshot.docs.map(doc => doc.data() as ParkingScan);
      const cloudIds = new Set(cloudScans.map(s => s.id));
      useStore.setState((state) => {
        const unsyncedLocals = state.parkingScans.filter(s => !s.synced && !cloudIds.has(s.id));
        return { parkingScans: [...cloudScans, ...unsyncedLocals] };
      });
    }, (err) => {
      console.warn("Parking sync notice:", err.message);
    });

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
        let cloudCps = snapshot.docs.map(doc => doc.data() as Checkpoint);
        cloudCps.sort((a, b) => (a.order || 0) - (b.order || 0));

        // Auto-migrate legacy checkpoint codes (e.g. A1-01, A2-01) to simple sequential numbers (01, 02, 03...)
        const hasLegacyCodes = cloudCps.some(cp => !/^\d{2,}$/.test(cp.code?.trim() || ""));
        if (hasLegacyCodes) {
          cloudCps = cloudCps.map((cp, idx) => {
            const sequentialCode = String(cp.order || idx + 1).padStart(2, '0');
            const updatedCp = { ...cp, code: sequentialCode, order: cp.order || idx + 1 };
            saveCheckpointToCloud(updatedCp);
            return updatedCp;
          });
        }

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

    return () => {
      unsubPatrol();
      unsubParking();
      unsubIncidents();
      unsubCheckpoints();
      unsubArchive();
      unsubVehicles();
      unsubShiftReports();
      unsubDailyAI();
      unsubDriveConfig();
    };
  }, []);

  return { isConnected };
}
