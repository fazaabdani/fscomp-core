import { prisma } from "./prisma";
import { displayUnitNumber } from "./unit-number";

export async function getCatalogPageData() {
  try {
    const candidates = await prisma.unit.findMany({
      where: {
        soldAt: null,
        statusObservasi: { in: ["VERIFIED", "VERIFIED_WITH_NOTES"] }
      },
      include: {
        qcHarian: {
          orderBy: { tanggal: "desc" },
          take: 1,
          select: {
            tanggal: true,
            masihLolos: true,
            windowsVersion: true,
            ssdHealth: true,
            batteryHealth: true,
            screenCondition: true,
            officeStatus: true
          }
        }
      },
      orderBy: [
        { stockLocation: "desc" },
        { createdAt: "desc" }
      ],
      take: 120
    });

    const units = candidates
      .filter((unit) => {
        const latestDaily = unit.qcHarian[0];
        return Boolean(
          latestDaily &&
          latestDaily.masihLolos !== "TIDAK_LOLOS"
        );
      })
      .map((unit) => {
        const latestDaily = unit.qcHarian[0];
        return {
          id: unit.id,
          nomorUnit: displayUnitNumber(unit.nomorUnit),
          model: unit.model,
          processor: unit.processor,
          ram: unit.ram,
          ssd: unit.ssd,
          lcdSize: unit.lcdSize ?? "-",
          lcdResolution: unit.lcdResolution ?? "-",
          isTouchscreen: unit.isTouchscreen,
          hargaJualRekomendasi: unit.hargaJualRekomendasi,
          catalogImageUrl: unit.catalogImageUrl ?? "",
          stockLocation: unit.stockLocation === "WIRADESA" ? "Wiradesa" : "Kajen",
          ssdHealth: latestDaily?.ssdHealth ?? unit.ssdHealth ?? 0,
          batteryHealth: latestDaily?.batteryHealth ?? unit.batteryHealth ?? 0,
          windowsVersion: latestDaily?.windowsVersion ?? "-",
          screenCondition: latestDaily?.screenCondition ?? "-",
          officeStatus: latestDaily?.officeStatus ?? "-"
        };
      });

    return {
      connected: true,
      wiradesaUnits: units.filter((unit) => unit.stockLocation === "Wiradesa"),
      kajenUnits: units.filter((unit) => unit.stockLocation === "Kajen")
    };
  } catch {
    return {
      connected: false,
      wiradesaUnits: [],
      kajenUnits: []
    };
  }
}
