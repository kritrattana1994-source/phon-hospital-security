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
      if (!snapshot.empty) {
        const cloudLogs = snapshot.docs.map(doc => doc.data() as PatrolLog);
        useStore.setState((state) => {
          // Merge unique logs
          const existingIds = new Set(state.patrolLogs.map(l => l.id));
          const newFromCloud = cloudLogs.filter(l => !existingIds.has(l.id));
          if (newFromCloud.length > 0) {
            return { patrolLogs: [...newFromCloud, ...state.patrolLogs] };
          }
          return state;
        });
      }
    }, (err) => {
      console.warn("Patrol sync notice:", err.message);
    });

    // 3. Real-time Listener: Parking Scans
    const unsubParking = onSnapshot(collection(db, "parkingScans"), (snapshot) => {
      setIsConnected(true);
      if (!snapshot.empty) {
        const cloudScans = snapshot.docs.map(doc => doc.data() as ParkingScan);
        useStore.setState((state) => {
          const existingIds = new Set(state.parkingScans.map(s => s.id));
          const newFromCloud = cloudScans.filter(s => !existingIds.has(s.id));
          if (newFromCloud.length > 0) {
            return { parkingScans: [...newFromCloud, ...state.parkingScans] };
          }
          return state;
        });
      }
    }, (err) => {
      console.warn("Parking sync notice:", err.message);
    });

    // 4. Real-time Listener: Incidents
    const unsubIncidents = onSnapshot(collection(db, "incidents"), (snapshot) => {
      setIsConnected(true);
      if (!snapshot.empty) {
        const cloudIncidents = snapshot.docs.map(doc => doc.data() as Incident);
        useStore.setState((state) => {
          const existingIds = new Set(state.incidents.map(i => i.id));
          const newFromCloud = cloudIncidents.filter(i => !existingIds.has(i.id));
          if (newFromCloud.length > 0) {
            return { incidents: [...newFromCloud, ...state.incidents] };
          }
          return state;
        });
      }
    }, (err) => {
      console.warn("Incidents sync notice:", err.message);
    });

    // 5. Real-time Listener: Checkpoints (If Supervisor updates checkpoints)
    const unsubCheckpoints = onSnapshot(collection(db, "checkpoints"), (snapshot) => {
      setIsConnected(true);
      if (!snapshot.empty) {
        const cloudCps = snapshot.docs.map(doc => doc.data() as Checkpoint);
        // Sort by order
        cloudCps.sort((a, b) => (a.order || 0) - (b.order || 0));
        useStore.setState({ checkpoints: cloudCps });
      }
    }, (err) => {
      console.warn("Checkpoints sync notice:", err.message);
    });

    return () => {
      unsubPatrol();
      unsubParking();
      unsubIncidents();
      unsubCheckpoints();
    };
  }, []);

  return { isConnected };
}
