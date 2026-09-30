"use client";

import { useEffect } from "react";
import { useFirebaseSync } from "@/lib/useFirebaseSync";

export default function FirebaseSyncProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // Global Real-time Firestore synchronization for all Guards and Supervisor
  useFirebaseSync();

  return <>{children}</>;
}
