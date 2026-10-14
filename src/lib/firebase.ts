import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "",
};

// Initialize Firebase only once
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// ฝั่งเบราว์เซอร์: เปิด offline persistence (IndexedDB) เพื่อให้ข้อมูลสแกนที่บันทึกตอนไม่มีสัญญาณ
// คงอยู่แม้ปิด/รีโหลดแอป และส่งขึ้น cloud อัตโนมัติเมื่อกลับมาออนไลน์
// ฝั่งเซิร์ฟเวอร์ (API routes) ไม่มี IndexedDB จึงใช้ค่าเริ่มต้น
function createDb(): Firestore {
  if (typeof window !== "undefined") {
    try {
      return initializeFirestore(app, {
        localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
      });
    } catch {
      // initializeFirestore ถูกเรียกไปแล้ว (เช่น hot reload) หรือเบราว์เซอร์ไม่รองรับ
    }
  }
  return getFirestore(app);
}
const db = createDb();
const storage = getStorage(app);
const auth = getAuth(app);

export { app, db, storage, auth };
