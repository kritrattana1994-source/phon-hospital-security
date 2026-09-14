import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { isOlderThanDays, getThaiFiscalYear } from "@/lib/fiscalYear";
import { 
  exportPatrolLogsToCSV, 
  exportParkingScansToCSV, 
  exportIncidentsToCSV, 
  createArchiveManifest 
} from "@/lib/archiveService";
import { PatrolLog, ParkingScan, Incident } from "@/lib/store";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const format = body.format || "json"; // "csv" | "json"
    const type = body.type || "all"; // "patrol" | "parking" | "incident" | "all"
    const cutoffDays = typeof body.cutoffDays === "number" ? body.cutoffDays : 365;
    const targetFiscalYear = body.targetFiscalYear || "ALL";

    // 1. Get records from payload or Firestore
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

    // Filter
    const filterFn = (item: { timestamp: string }) => {
      if (!item.timestamp) return false;
      if (!isOlderThanDays(item.timestamp, cutoffDays)) return false;
      if (targetFiscalYear !== "ALL") {
        const fy = getThaiFiscalYear(item.timestamp);
        if (fy.code !== targetFiscalYear) return false;
      }
      return true;
    };

    const eligiblePatrol = patrolLogs.filter(filterFn);
    const eligibleParking = parkingScans.filter(filterFn);
    const eligibleIncidents = incidents.filter(filterFn);

    const todayStr = new Date().toISOString().split("T")[0].replace(/-/g, "");

    // Return as CSV
    if (format === "csv") {
      let csvContent = "";
      let filename = `PHON_Archive_${targetFiscalYear}_${todayStr}.csv`;

      if (type === "patrol") {
        csvContent = exportPatrolLogsToCSV(eligiblePatrol);
        filename = `PHON_PatrolLogs_${targetFiscalYear}_${todayStr}.csv`;
      } else if (type === "parking") {
        csvContent = exportParkingScansToCSV(eligibleParking);
        filename = `PHON_ParkingScans_${targetFiscalYear}_${todayStr}.csv`;
      } else if (type === "incident") {
        csvContent = exportIncidentsToCSV(eligibleIncidents);
        filename = `PHON_Incidents_${targetFiscalYear}_${todayStr}.csv`;
      } else {
        // Combined CSV sections
        csvContent =
          `=== บันทึกการเดินตรวจจุด (Patrol Logs) ===\r\n` +
          exportPatrolLogsToCSV(eligiblePatrol) +
          `\r\n\r\n=== บันทึกสแกนรถ (Parking Scans) ===\r\n` +
          exportParkingScansToCSV(eligibleParking) +
          `\r\n\r\n=== บันทึกเหตุการณ์ฉุกเฉิน (Incidents) ===\r\n` +
          exportIncidentsToCSV(eligibleIncidents);
      }

      return new NextResponse(csvContent, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
        },
      });
    }

    // Return as JSON Backup Package
    const manifest = createArchiveManifest({
      fiscalYear: targetFiscalYear,
      patrolLogsCount: eligiblePatrol.length,
      parkingScansCount: eligibleParking.length,
      incidentsCount: eligibleIncidents.length,
      archivedAt: new Date().toISOString(),
      operator: body.operator || "Supervisor",
      source: "PHON Hospital Security Archive Export",
    });

    const fullBackup = {
      manifest,
      patrolLogs: eligiblePatrol,
      parkingScans: eligibleParking,
      incidents: eligibleIncidents,
    };

    const filename = `PHON_SecurityArchive_${targetFiscalYear}_${todayStr}.json`;

    return new NextResponse(JSON.stringify(fullBackup, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(filename)}"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: `ไม่สามารถดาวน์โหลดไฟล์ได้: ${error.message}` },
      { status: 500 }
    );
  }
}
