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
  testGoogleDriveConnection, 
  findOrCreateSubfolder, 
  uploadFileToGoogleDrive 
} from "@/lib/googleDrive";
import { PatrolLog, ParkingScan, Incident, ArchiveAuditLog } from "@/lib/store";

export async function GET(req: NextRequest) {
  try {
    // 1. Fetch records from Firestore
    const patrolSnap = await getDocs(collection(db, "patrolLogs"));
    const parkingSnap = await getDocs(collection(db, "parkingScans"));
    const incidentSnap = await getDocs(collection(db, "incidents"));

    const patrolLogs = patrolSnap.docs.map((d) => d.data() as PatrolLog);
    const parkingScans = parkingSnap.docs.map((d) => d.data() as ParkingScan);
    const incidents = incidentSnap.docs.map((d) => d.data() as Incident);

    // 2. Calculate Cutoff Stats
    const expiredPatrol365 = patrolLogs.filter((p) => isOlderThanDays(p.timestamp, 365));
    const expiredParking365 = parkingScans.filter((s) => isOlderThanDays(s.timestamp, 365));
    const expiredIncidents365 = incidents.filter((i) => isOlderThanDays(i.timestamp, 365));

    const expiredPatrol180 = patrolLogs.filter((p) => isOlderThanDays(p.timestamp, 180));
    const expiredParking180 = parkingScans.filter((s) => isOlderThanDays(s.timestamp, 180));
    const expiredIncidents180 = incidents.filter((i) => isOlderThanDays(i.timestamp, 180));

    // 3. Group by Fiscal Year
    const fyMap: Record<string, { label: string; patrolCount: number; parkingCount: number; incidentCount: number }> = {};

    const addToFyMap = (items: any[], type: "patrol" | "parking" | "incident") => {
      items.forEach((item) => {
        if (!item.timestamp) return;
        const fy = getThaiFiscalYear(item.timestamp);
        if (!fyMap[fy.code]) {
          fyMap[fy.code] = {
            label: fy.label,
            patrolCount: 0,
            parkingCount: 0,
            incidentCount: 0,
          };
        }
        if (type === "patrol") fyMap[fy.code].patrolCount++;
        if (type === "parking") fyMap[fy.code].parkingCount++;
        if (type === "incident") fyMap[fy.code].incidentCount++;
      });
    };

    addToFyMap(patrolLogs, "patrol");
    addToFyMap(parkingScans, "parking");
    addToFyMap(incidents, "incident");

    // 4. Test Google Drive Connection
    const driveStatus = await testGoogleDriveConnection();

    return NextResponse.json({
      success: true,
      stats: {
        total: {
          patrolLogs: patrolLogs.length,
          parkingScans: parkingScans.length,
          incidents: incidents.length,
          sum: patrolLogs.length + parkingScans.length + incidents.length,
        },
        olderThan365Days: {
          patrolLogs: expiredPatrol365.length,
          parkingScans: expiredParking365.length,
          incidents: expiredIncidents365.length,
          sum: expiredPatrol365.length + expiredParking365.length + expiredIncidents365.length,
        },
        olderThan180Days: {
          patrolLogs: expiredPatrol180.length,
          parkingScans: expiredParking180.length,
          incidents: expiredIncidents180.length,
          sum: expiredPatrol180.length + expiredParking180.length + expiredIncidents180.length,
        },
        byFiscalYear: fyMap,
      },
      driveStatus,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: `เกิดข้อผิดพลาดในการดึงสถานะ Archive: ${error.message}` },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const cutoffDays = typeof body.cutoffDays === "number" ? body.cutoffDays : 365;
    const targetFiscalYear = body.targetFiscalYear || "ALL"; // "ALL" or "FY2567"
    const purgeFromFirestore = Boolean(body.purgeFromFirestore);
    const dryRun = Boolean(body.dryRun);
    const operator = body.operator || "พ.ต.ท. ประพันธ์ (หัวหน้าความปลอดภัย)";

    // 1. Load data: either from client payload or read directly from Firestore
    let patrolLogs: PatrolLog[] = body.clientPatrolLogs;
    let parkingScans: ParkingScan[] = body.clientParkingScans;
    let incidents: Incident[] = body.clientIncidents;

    if (!patrolLogs || !parkingScans || !incidents) {
      const patrolSnap = await getDocs(collection(db, "patrolLogs"));
      const parkingSnap = await getDocs(collection(db, "parkingScans"));
      const incidentSnap = await getDocs(collection(db, "incidents"));

      patrolLogs = patrolSnap.docs.map((d) => d.data() as PatrolLog);
      parkingScans = parkingSnap.docs.map((d) => d.data() as ParkingScan);
      incidents = incidentSnap.docs.map((d) => d.data() as Incident);
    }

    // 2. Filter records older than cutoffDays and matching targetFiscalYear
    const filterRecord = (item: { timestamp: string }) => {
      if (!item.timestamp) return false;
      const isOld = isOlderThanDays(item.timestamp, cutoffDays);
      if (!isOld) return false;

      if (targetFiscalYear !== "ALL") {
        const fy = getThaiFiscalYear(item.timestamp);
        if (fy.code !== targetFiscalYear) return false;
      }
      return true;
    };

    const eligiblePatrol = patrolLogs.filter(filterRecord);
    const eligibleParking = parkingScans.filter(filterRecord);
    const eligibleIncidents = incidents.filter(filterRecord);

    const totalToArchive =
      eligiblePatrol.length + eligibleParking.length + eligibleIncidents.length;

    // Dry Run mode: Just return summary
    if (dryRun) {
      return NextResponse.json({
        success: true,
        dryRun: true,
        summary: {
          cutoffDays,
          targetFiscalYear,
          eligiblePatrolLogs: eligiblePatrol.length,
          eligibleParkingScans: eligibleParking.length,
          eligibleIncidents: eligibleIncidents.length,
          totalToArchive,
        },
      });
    }

    if (totalToArchive === 0) {
      return NextResponse.json({
        success: true,
        message: "ไม่พบข้อมูลที่เข้าเงื่อนไขอายุเกินกำหนดสำหรับจัดเก็บ",
        archivedCount: 0,
      });
    }

    // 3. Group by Fiscal Year for organized subfolders
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

    // 4. Connect to Google Drive if credentials exist
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
        console.warn("Google Drive token generation notice:", err.message);
      }
    }

    const todayStr = new Date().toISOString().split("T")[0].replace(/-/g, "");

    // 5. Generate and Upload per Fiscal Year
    for (const fyCode of allFiscalYears) {
      const pLogs = fyPatrol[fyCode] || [];
      const pScans = fyParking[fyCode] || [];
      const incs = fyIncidents[fyCode] || [];

      // Determine folder name in Google Drive
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
          console.error("Subfolder create notice:", fErr);
        }
      }

      // Generate CSVs
      if (pLogs.length > 0) {
        const csv = exportPatrolLogsToCSV(pLogs);
        const filename = `PHON_PatrolLogs_${fyCode}_${todayStr}.csv`;
        if (isDriveConnected && accessToken) {
          const up = await uploadFileToGoogleDrive({
            filename,
            mimeType: "text/csv; charset=utf-8",
            content: csv,
            parentFolderId: targetFolderId,
            accessToken,
          });
          uploadedFiles.push({ name: filename, link: up.webViewLink, id: up.id, fiscalYear: fyCode });
        }
      }

      if (pScans.length > 0) {
        const csv = exportParkingScansToCSV(pScans);
        const filename = `PHON_ParkingScans_${fyCode}_${todayStr}.csv`;
        if (isDriveConnected && accessToken) {
          const up = await uploadFileToGoogleDrive({
            filename,
            mimeType: "text/csv; charset=utf-8",
            content: csv,
            parentFolderId: targetFolderId,
            accessToken,
          });
          uploadedFiles.push({ name: filename, link: up.webViewLink, id: up.id, fiscalYear: fyCode });
        }
      }

      if (incs.length > 0) {
        const csv = exportIncidentsToCSV(incs);
        const filename = `PHON_Incidents_${fyCode}_${todayStr}.csv`;
        if (isDriveConnected && accessToken) {
          const up = await uploadFileToGoogleDrive({
            filename,
            mimeType: "text/csv; charset=utf-8",
            content: csv,
            parentFolderId: targetFolderId,
            accessToken,
          });
          uploadedFiles.push({ name: filename, link: up.webViewLink, id: up.id, fiscalYear: fyCode });
        }
      }

      // Generate Manifest JSON
      const manifest = createArchiveManifest({
        fiscalYear: fyCode,
        patrolLogsCount: pLogs.length,
        parkingScansCount: pScans.length,
        incidentsCount: incs.length,
        archivedAt: new Date().toISOString(),
        operator,
        source: "PHON Hospital Security Portal",
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

    // 6. Purge from Firestore if confirmed
    const purgedIds = {
      patrolLogs: [] as string[],
      parkingScans: [] as string[],
      incidents: [] as string[],
    };

    if (purgeFromFirestore) {
      // Chunked Batch Delete (max 450 per batch)
      const deleteChunks = async (col: string, ids: string[]) => {
        for (let i = 0; i < ids.length; i += 450) {
          const chunk = ids.slice(i, i + 450);
          const batch = writeBatch(db);
          chunk.forEach((id) => batch.delete(doc(db, col, id)));
          await batch.commit();
        }
      };

      if (eligiblePatrol.length > 0) {
        purgedIds.patrolLogs = eligiblePatrol.map((p) => p.id);
        await deleteChunks("patrolLogs", purgedIds.patrolLogs);
      }
      if (eligibleParking.length > 0) {
        purgedIds.parkingScans = eligibleParking.map((s) => s.id);
        await deleteChunks("parkingScans", purgedIds.parkingScans);
      }
      if (eligibleIncidents.length > 0) {
        purgedIds.incidents = eligibleIncidents.map((i) => i.id);
        await deleteChunks("incidents", purgedIds.incidents);
      }
    }

    // 7. Save Audit Log into Firestore
    const auditLog: ArchiveAuditLog = {
      id: `arc-${Date.now()}`,
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
      purgedFromFirestore: purgeFromFirestore,
      status: isDriveConnected ? "success" : "partial",
      notes: isDriveConnected
        ? `สำรองข้อมูลเข้า Google Drive สำเร็จ ${uploadedFiles.length} ไฟล์`
        : "จัดกลุ่มข้อมูลสำเร็จ (ยังไม่ได้เชื่อมต่อ Service Account หรือดาวน์โหลดลงเครื่อง)",
    };

    try {
      await setDoc(doc(db, "archiveAuditLogs", auditLog.id), auditLog);
    } catch (auditErr) {
      console.warn("Save audit log notice:", auditErr);
    }

    return NextResponse.json({
      success: true,
      auditLog,
      isDriveConnected,
      driveRootFolderId,
      driveFolderUrl: `https://drive.google.com/drive/folders/${driveRootFolderId}`,
      uploadedFiles,
      archivedCounts: {
        patrolLogs: eligiblePatrol.length,
        parkingScans: eligibleParking.length,
        incidents: eligibleIncidents.length,
        total: totalToArchive,
      },
      purgedIds,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: `เกิดข้อผิดพลาดในการประมวลผล Archive: ${error.message}` },
      { status: 500 }
    );
  }
}
