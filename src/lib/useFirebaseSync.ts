"use client";

import { useEffect, useState } from "react";
import { db } from "./firebase";
import { collection, onSnapshot } from "firebase/firestore";
import { useStore, PatrolLog, ParkingScan, Incident, Checkpoint } from "./store";
import { seedFirestoreIfEmpty } from "./firebaseService";

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
      useStore.setState({ incidents: cloudIncidents });
    }, (err) => {
      console.warn("Incidents sync notice:", err.message);
    });

    // 5. Real-time Listener: Checkpoints (If Supervisor updates checkpoints)
    const unsubCheckpoints = onSnapshot(collection(db, "checkpoints"), (snapshot) => {
      setIsConnected(true);
      if (!snapshot.empty) {
        const cloudCps = snapshot.docs.map(doc => doc.data() as Checkpoint);
        cloudCps.sort((a, b) => (a.order || 0) - (b.order || 0));
        useStore.setState({ checkpoints: cloudCps });
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

    return () => {
      unsubPatrol();
      unsubParking();
      unsubIncidents();
      unsubCheckpoints();
      unsubArchive();
    };
  }, []);

  return { isConnected };
}
