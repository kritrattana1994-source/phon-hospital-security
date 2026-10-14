// สำรองข้อมูล Firestore ทุก collection ที่แอปใช้ ลงไฟล์ JSON ในเครื่อง
// วิธีใช้:  node scripts/backup-firestore.mjs [โฟลเดอร์ปลายทาง]
// ค่าเริ่มต้นปลายทาง: ../backups/firestore-YYYY-MM-DD (นอก repo)
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import fs from "node:fs";
import path from "node:path";

const COLLECTIONS = [
  "patrolLogs",
  "parkingScans",
  "incidents",
  "guards",
  "checkpoints",
  "checklistTemplates",
  "staffVehicles",
  "shiftReports",
  "dailyAISummaries",
  "archiveAuditLogs",
  "systemSettings",
];

function loadEnv(file) {
  const env = {};
  if (!fs.existsSync(file)) return env;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (m) env[m[1]] = m[2].replace(/^"|"$/g, "");
  }
  return env;
}

const env = { ...loadEnv(path.resolve(".env.local")), ...process.env };
const app = initializeApp({
  apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.NEXT_PUBLIC_FIREBASE_APP_ID,
});
const db = getFirestore(app);

const stamp = new Date().toISOString().slice(0, 10);
const outDir = path.resolve(process.argv[2] || path.join("..", "backups", `firestore-${stamp}`));
fs.mkdirSync(outDir, { recursive: true });

let total = 0;
for (const name of COLLECTIONS) {
  const snap = await getDocs(collection(db, name));
  const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  // ไม่เก็บค่า apiKey เก่าที่อาจค้างใน systemSettings/gemini
  const safe = name === "systemSettings" ? docs.map(({ apiKey, ...rest }) => rest) : docs;
  fs.writeFileSync(path.join(outDir, `${name}.json`), JSON.stringify(safe, null, 2));
  console.log(`${name}: ${docs.length}`);
  total += docs.length;
}
console.log(`รวม ${total} รายการ -> ${outDir}`);
process.exit(0);
