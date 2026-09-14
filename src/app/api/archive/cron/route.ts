import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, setDoc, writeBatch } from "firebase/firestore";
import { getThaiFiscalYear, isOlderThanDays, groupByFiscalYear } from "@/lib/fiscalYear";
import { 
  exportPatrolLogsToCSV, 
  exportParkingScansToCSV, 
  exportIncidentsToCSV, 
  createArchiveManifest 
} from "@/lib/archiveService";
import { 
  getGoogleDriveConfig, 
  getGoogleAccessToken, 
  findOrCreateSubfolder, 
  uploadFileToGoogleDrive 
} from "@/lib/googleDrive";
import { PatrolLog, ParkingScan, Incident, ArchiveAuditLog } from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * Vercel Cron Endpoint: รันอัตโนมัติทุกวันรอบ 07:00 น. (00:00 UTC)
 * Vercel จะส่งคำขอแบบ HTTP GET มายัง path นี้
 */
export async function GET(req: NextRequest) {
  return handleCronArchival(req);
}

export async function POST(req: NextRequest) {
  return handleCronArchival(req);
}

async function handleCronArchival(req: NextRequest) {
  try {
    // 1. Security verification for Vercel Cron
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    
    // ถ้ามีการตั้งค่า CRON_SECRET ใน Vercel ให้ตรวจสอบ Token
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      // ตรวจสอบ fallback header จาก vercel
      const isVercelCron = req.headers.get("x-vercel-cron") === "1";
      if (!isVercelCron) {
        return NextResponse.json(
          { error: "Unauthorized: Invalid CRON_SECRET" },
          { status: 401 }
        );
      }
    }

    const cutoffDays = 365;
    const operator = "ระบบอัตโนมัติ (Vercel Daily Cron 07:00 น.)";

    // 2. ดึงข้อมูลจาก Cloud Firestore
    const patrolSnap = await getDocs(collection(db, "patrolLogs"));
    const parkingSnap = await getDocs(collection(db, "parkingScans"));
    const incidentSnap = await getDocs(collection(db, "incidents"));

    const patrolLogs = patrolSnap.docs.map((d) => d.data() as PatrolLog);
    const parkingScans = parkingSnap.docs.map((d) => d.data() as ParkingScan);
    const incidents = incidentSnap.docs.map((d) => d.data() as Incident);

    // 3. กรองเฉพาะข้อมูลที่อายุเกิน 365 วัน
    const eligiblePatrol = patrolLogs.filter((p) => isOlderThanDays(p.timestamp, cutoffDays));
    const eligibleParking = parkingScans.filter((s) => isOlderThanDays(s.timestamp, cutoffDays));
    const eligibleIncidents = incidents.filter((i) => isOlderThanDays(i.timestamp, cutoffDays));

    const totalToArchive =
      eligiblePatrol.length + eligibleParking.length + eligibleIncidents.length;

    // ถ้าไม่มีข้อมูลที่อายุเกิน 365 วัน ให้จบงานอย่างปลอดภัย
    if (totalToArchive === 0) {
      return NextResponse.json({
        success: true,
        cronRunAt: new Date().toISOString(),
        message: "ตรวจสอบเรียบร้อย: ไม่พบข้อมูลที่อายุเกิน 365 วัน (ไม่ต้องจัดเก็บ)",
        archivedCount: 0,
        totalChecked: {
          patrolLogs: patrolLogs.length,
          parkingScans: parkingScans.length,
          incidents: incidents.length,
        },
      });
    }

    // 4. จัดกลุ่มตามปีงบประมาณไทย
    const fyPatrol = groupByFiscalYear(eligiblePatrol);
    const fyParking = groupByFiscalYear(eligibleParking);
    const fyIncidents = groupByFiscalYear(eligibleIncidents);

    const allFiscalYears = Array.from(
      new Set([
        ...Object.keys(fyPatrol),
        ...Object.keys(fyParking),
        ...Object.keys(fyIncidents),
      ])
    ).sort();

    // 5. เตรียมการเชื่อมต่อ Google Drive
    const driveConfig = getGoogleDriveConfig();
    let accessToken = "";
    let driveRootFolderId = "1ED0LnFxfSwHVU60fI8LShWiXBDmxFFXT";
    let isDriveConnected = false;
    const uploadedFiles: Array<{ name: string; link?: string; id?: string; fiscalYear: string }> = [];

    if (driveConfig) {
      try {
        accessToken = await getGoogleAccessToken(driveConfig);
        driveRootFolderId = driveConfig.rootFolderId || driveRootFolderId;
        isDriveConnected = true;
      } catch (err: any) {
        console.warn("Cron Google Drive token notice:", err.message);
      }
    }

    const todayStr = new Date().toISOString().split("T")[0].replace(/-/g, "");

    // 6. อัปโหลดเข้าสู่ Google Drive ในโฟลเดอร์ประจำปีงบประมาณ
    for (const fyCode of allFiscalYears) {
      const pLogs = fyPatrol[fyCode] || [];
      const pScans = fyParking[fyCode] || [];
      const incs = fyIncidents[fyCode] || [];

      const fyInfo = getThaiFiscalYear(
        (pLogs[0] || pScans[0] || incs[0])?.timestamp || new Date()
      );
      const subfolderName = `ปีงบประมาณ_${fyInfo.yearBE}_${fyCode}`;

      let targetFolderId = driveRootFolderId;
      if (isDriveConnected && accessToken) {
        try {
          const subfolder = await findOrCreateSubfolder(
            subfolderName,
            driveRootFolderId,
            accessToken
          );
          targetFolderId = subfolder.id;
        } catch (fErr) {
          console.error("Cron Subfolder create notice:", fErr);
        }
      }

      // อัปโหลดไฟล์ CSV
      if (pLogs.length > 0 && isDriveConnected && accessToken) {
        const csv = exportPatrolLogsToCSV(pLogs);
        const filename = `PHON_PatrolLogs_${fyCode}_${todayStr}.csv`;
        const up = await uploadFileToGoogleDrive({
          filename,
          mimeType: "text/csv; charset=utf-8",
          content: csv,
          parentFolderId: targetFolderId,
          accessToken,
        });
        uploadedFiles.push({ name: filename, link: up.webViewLink, id: up.id, fiscalYear: fyCode });
      }

      if (pScans.length > 0 && isDriveConnected && accessToken) {
        const csv = exportParkingScansToCSV(pScans);
        const filename = `PHON_ParkingScans_${fyCode}_${todayStr}.csv`;
        const up = await uploadFileToGoogleDrive({
          filename,
          mimeType: "text/csv; charset=utf-8",
          content: csv,
          parentFolderId: targetFolderId,
          accessToken,
        });
        uploadedFiles.push({ name: filename, link: up.webViewLink, id: up.id, fiscalYear: fyCode });
      }

      if (incs.length > 0 && isDriveConnected && accessToken) {
        const csv = exportIncidentsToCSV(incs);
        const filename = `PHON_Incidents_${fyCode}_${todayStr}.csv`;
        const up = await uploadFileToGoogleDrive({
          filename,
          mimeType: "text/csv; charset=utf-8",
          content: csv,
          parentFolderId: targetFolderId,
          accessToken,
        });
        uploadedFiles.push({ name: filename, link: up.webViewLink, id: up.id, fiscalYear: fyCode });
      }

      // อัปโหลด Manifest JSON
      const manifest = createArchiveManifest({
        fiscalYear: fyCode,
        patrolLogsCount: pLogs.length,
        parkingScansCount: pScans.length,
        incidentsCount: incs.length,
        archivedAt: new Date().toISOString(),
        operator,
        source: "PHON Daily Cron Job (07:00 น.)",
      });

      const jsonBackup = JSON.stringify(
        {
          manifest,
          patrolLogs: pLogs,
          parkingScans: pScans,
          incidents: incs,
        },
        null,
        2
      );

      const jsonFilename = `PHON_Archive_${fyCode}_${todayStr}.json`;
      if (isDriveConnected && accessToken) {
        const up = await uploadFileToGoogleDrive({
          filename: jsonFilename,
          mimeType: "application/json",
          content: jsonBackup,
          parentFolderId: targetFolderId,
          accessToken,
        });
        uploadedFiles.push({ name: jsonFilename, link: up.webViewLink, id: up.id, fiscalYear: fyCode });
      }
    }

    // 7. ล้างข้อมูลเก่าออกจาก Cloud Firestore (Chunked Batch 450)
    // ลบเฉพาะเมื่อยืนยันว่าต่อ Google Drive สำเร็จแล้ว หรือเป็นนโยบาย Retention
    const deleteChunks = async (col: string, ids: string[]) => {
      for (let i = 0; i < ids.length; i += 450) {
        const chunk = ids.slice(i, i + 450);
        const batch = writeBatch(db);
        chunk.forEach((id) => batch.delete(doc(db, col, id)));
        await batch.commit();
      }
    };

    if (isDriveConnected) {
      if (eligiblePatrol.length > 0) {
        await deleteChunks("patrolLogs", eligiblePatrol.map((p) => p.id));
      }
      if (eligibleParking.length > 0) {
        await deleteChunks("parkingScans", eligibleParking.map((s) => s.id));
      }
      if (eligibleIncidents.length > 0) {
        await deleteChunks("incidents", eligibleIncidents.map((i) => i.id));
      }
    }

    // 8. บันทึก Audit Log ลง Firestore
    const auditLog: ArchiveAuditLog = {
      id: `arc-cron-${Date.now()}`,
      timestamp: new Date().toISOString(),
      fiscalYear: allFiscalYears.join(", "),
      operator,
      cutoffDays,
      patrolLogsCount: eligiblePatrol.length,
      parkingScansCount: eligibleParking.length,
      incidentsCount: eligibleIncidents.length,
      totalRecords: totalToArchive,
      driveFolderId: driveRootFolderId,
      driveFolderLink: `https://drive.google.com/drive/folders/${driveRootFolderId}`,
      filesUploaded: uploadedFiles.map((f) => ({ name: f.name, link: f.link })),
      purgedFromFirestore: isDriveConnected,
      status: isDriveConnected ? "success" : "partial",
      notes: isDriveConnected
        ? `รันอัตโนมัติสำเร็จ: อัปโหลดเข้า Google Drive ${uploadedFiles.length} ไฟล์ และล้างข้อมูล Firestore แล้ว`
        : "รันอัตโนมัติ: ตรวจพบข้อมูลเกิน 365 วัน แต่ยังไม่ได้ต่อ Google Drive จึงยังไม่ล้างข้อมูลจาก Cloud",
    };

    await setDoc(doc(db, "archiveAuditLogs", auditLog.id), auditLog);

    return NextResponse.json({
      success: true,
      cronRunAt: new Date().toISOString(),
      archivedCounts: {
        patrolLogs: eligiblePatrol.length,
        parkingScans: eligibleParking.length,
        incidents: eligibleIncidents.length,
        total: totalToArchive,
      },
      isDriveConnected,
      filesUploadedCount: uploadedFiles.length,
      purgedFromFirestore: isDriveConnected,
      auditLogId: auditLog.id,
    });
  } catch (error: any) {
    console.error("Daily Cron Archival Error:", error);
    return NextResponse.json(
      { error: `ข้อผิดพลาดในการรัน Cron สำรองข้อมูล: ${error.message}` },
      { status: 500 }
    );
  }
}
