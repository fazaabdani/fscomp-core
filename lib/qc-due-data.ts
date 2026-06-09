import { prisma } from "./prisma";
import { QC_DUE_HOURS, isQcFresh, qcAgeHours } from "./qc-due";
import { displayUnitNumber } from "./unit-number";

function formatDateTimeWib(date?: Date | null) {
  if (!date) return "Belum pernah QC harian";
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    dateStyle: "short",
    timeStyle: "short"
  }).format(date);
}

export async function getDueDailyQcUnits() {
  try {
    const now = new Date();
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
        aiLogs: {
          where: { status: "OPEN", source: "qc-harian-reminder" },
          orderBy: { tanggal: "desc" },
          take: 2,
          select: { rekomendasi: true }
        },
        qcHarian: {
          orderBy: { tanggal: "desc" },
          take: 1,
          select: {
            tanggal: true,
            masihLolos: true,
            ssdHealth: true,
            batteryHealth: true,
            catatan: true
          }
        }
      },
      orderBy: [{ stockLocation: "asc" }, { nomorUnit: "asc" }]
    });

    const dueUnits = units.filter((unit) => !isQcFresh(unit.qcHarian[0]?.tanggal, now));

    return {
      dueHours: QC_DUE_HOURS,
      count: dueUnits.length,
      units: dueUnits.slice(0, 12).map((unit) => {
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
          qcAgeHours: qcAgeHours(latest?.tanggal, now),
          ssdHealth: latest?.ssdHealth ?? null,
          batteryHealth: latest?.batteryHealth ?? null,
          catatan: latest?.catatan ?? "",
          penyelesaian: unit.aiLogs.map((log) => log.rekomendasi)
        };
      })
    };
  } catch {
    return {
      dueHours: QC_DUE_HOURS,
      count: 0,
      units: []
    };
  }
}
