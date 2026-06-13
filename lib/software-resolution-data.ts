import { prisma } from "./prisma";
import { displayUnitNumber } from "./unit-number";
import { windowsVersionReminder } from "./windows-recommendation";

function formatDateTimeWib(date?: Date | null) {
  if (!date) return "Belum pernah QC harian";
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    dateStyle: "short",
    timeStyle: "short"
  }).format(date);
}

function softwareResolutionItems(qc?: {
  processor: string;
  windowsVersion: string;
  driverStatus: string;
  clockStatus: string;
  appStatus: string;
  officeStatus: string;
  partitionCount: number;
} | null) {
  if (!qc) return ["Belum pernah QC harian"];

  return [
    windowsVersionReminder(qc.processor, qc.windowsVersion),
    qc.driverStatus !== "OK" ? `Driver ${qc.driverStatus}` : "",
    qc.clockStatus !== "Sesuai" ? `Jam ${qc.clockStatus}` : "",
    qc.appStatus !== "Lengkap" ? `Aplikasi ${qc.appStatus}` : "",
    qc.partitionCount !== 2 ? "Partisi masih 1" : "",
    qc.officeStatus === "Belum install" ? `Office ${qc.officeStatus}` : ""
  ].filter(Boolean);
}

export async function getSoftwareResolutionUnits() {
  try {
    const units = await prisma.unit.findMany({
      where: {
        soldAt: null,
        statusObservasi: { not: "RETUR_DISTRIBUTOR" }
      },
      select: {
        id: true,
        nomorUnit: true,
        model: true,
        processor: true,
        ram: true,
        ssd: true,
        stockLocation: true,
        statusObservasi: true,
        qcHarian: {
          orderBy: { tanggal: "desc" },
          take: 1,
          select: {
            tanggal: true,
            windowsVersion: true,
            driverStatus: true,
            clockStatus: true,
            appStatus: true,
            officeStatus: true,
            partitionCount: true
          }
        }
      },
      orderBy: [{ stockLocation: "asc" }, { nomorUnit: "asc" }]
    });

    const rows = units
      .map((unit) => {
        const latest = unit.qcHarian[0];
        return {
          id: unit.id,
          nomorUnit: displayUnitNumber(unit.nomorUnit),
          model: unit.model,
          processor: unit.processor,
          ram: unit.ram,
          ssd: unit.ssd,
          stockLocation: unit.stockLocation === "WIRADESA" ? "Wiradesa" : "Kajen",
          statusObservasi: unit.statusObservasi.replaceAll("_", " "),
          lastQcAt: formatDateTimeWib(latest?.tanggal),
          items: softwareResolutionItems(latest ? { ...latest, processor: unit.processor } : null)
        };
      })
      .filter((unit) => unit.items.length > 0);

    return {
      count: rows.length,
      units: rows.slice(0, 12)
    };
  } catch {
    return {
      count: 0,
      units: []
    };
  }
}
