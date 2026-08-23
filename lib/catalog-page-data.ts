import { resolvePrimaryImageUrl } from "./media-data";
import { prisma } from "./prisma";
import { displayUnitNumber } from "./unit-number";

const CATALOG_UNIT_INCLUDE = {
  qcHarian: {
    orderBy: { tanggal: "desc" as const },
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
  },
  unitPhotos: { orderBy: { order: "asc" as const }, take: 1, include: { asset: { select: { fileName: true } } } }
};

export async function getCatalogPageData() {
  try {
    const [wiradesaCandidates, kajenCandidates] = await Promise.all([
      prisma.unit.findMany({
        where: {
          soldAt: null,
          statusObservasi: { in: ["VERIFIED", "VERIFIED_WITH_NOTES"] },
          stockLocation: "WIRADESA"
        },
        include: CATALOG_UNIT_INCLUDE,
        orderBy: { createdAt: "desc" },
        take: 120
      }),
      prisma.unit.findMany({
        where: {
          soldAt: null,
          statusObservasi: { in: ["VERIFIED", "VERIFIED_WITH_NOTES"] },
          stockLocation: "KAJEN"
        },
        include: CATALOG_UNIT_INCLUDE,
        orderBy: { createdAt: "desc" },
        take: 120
      })
    ]);
    const candidates = [...wiradesaCandidates, ...kajenCandidates];

    const units = candidates
      .filter((unit) => {
        const latestDaily = unit.qcHarian[0];
        return Boolean(latestDaily && latestDaily.masihLolos !== "TIDAK_LOLOS");
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
          catalogImageUrl: resolvePrimaryImageUrl(unit.unitPhotos, unit.catalogImageUrl, true),
          stockLocation: unit.stockLocation === "WIRADESA" ? "Wiradesa" : "Kajen",
          latestQcAt: latestDaily?.tanggal.toLocaleDateString("id-ID", {
            timeZone: "Asia/Jakarta",
            day: "2-digit",
            month: "short",
            year: "numeric"
          }) ?? "-",
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

export async function getRelatedCatalogUnits(unitId: string) {
  try {
    const current = await prisma.unit.findUnique({
      where: { id: unitId },
      select: {
        id: true,
        model: true,
        processor: true,
        ram: true,
        stockLocation: true,
        hargaJualRekomendasi: true
      }
    });

    if (!current) return [];

    const candidates = await prisma.unit.findMany({
      where: {
        id: { not: unitId },
        soldAt: null,
        statusObservasi: { in: ["VERIFIED", "VERIFIED_WITH_NOTES"] }
      },
      include: {
        qcHarian: {
          orderBy: { tanggal: "desc" },
          take: 1,
          select: { masihLolos: true, tanggal: true }
        },
        unitPhotos: { orderBy: { order: "asc" }, take: 1, include: { asset: { select: { fileName: true } } } }
      },
      orderBy: { updatedAt: "desc" },
      take: 24
    });

    const currentBrand = current.model.trim().split(/\s+/)[0]?.toUpperCase() ?? "";

    return candidates
      .filter((unit) => Boolean(unit.qcHarian[0] && unit.qcHarian[0].masihLolos !== "TIDAK_LOLOS"))
      .map((unit) => {
        const brand = unit.model.trim().split(/\s+/)[0]?.toUpperCase() ?? "";
        const score =
          (brand === currentBrand ? 4 : 0) +
          (unit.processor === current.processor ? 3 : 0) +
          (unit.ram === current.ram ? 1 : 0) +
          (unit.stockLocation === current.stockLocation ? 1 : 0);

        return {
          id: unit.id,
          nomorUnit: displayUnitNumber(unit.nomorUnit),
          model: unit.model,
          processor: unit.processor,
          ram: unit.ram,
          ssd: unit.ssd,
          catalogImageUrl: resolvePrimaryImageUrl(unit.unitPhotos, unit.catalogImageUrl, true),
          stockLocation: unit.stockLocation === "WIRADESA" ? "Wiradesa" : "Kajen",
          hargaJualRekomendasi: unit.hargaJualRekomendasi,
          score,
          priceDistance: Math.abs(unit.hargaJualRekomendasi - current.hargaJualRekomendasi)
        };
      })
      .sort((a, b) => b.score - a.score || a.priceDistance - b.priceDistance)
      .slice(0, 3)
      .map((unit) => ({
        id: unit.id,
        nomorUnit: unit.nomorUnit,
        model: unit.model,
        processor: unit.processor,
        ram: unit.ram,
        ssd: unit.ssd,
        catalogImageUrl: unit.catalogImageUrl,
        stockLocation: unit.stockLocation,
        hargaJualRekomendasi: unit.hargaJualRekomendasi
      }));
  } catch {
    return [];
  }
}
