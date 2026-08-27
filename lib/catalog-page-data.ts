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

function capacityGb(value: string) {
  const match = value.match(/(\d+)\s*(GB|TB)/i);
  if (!match) return 0;
  const number = Number(match[1]);
  return match[2].toUpperCase() === "TB" ? number * 1024 : number;
}

function conditionScore(unit: { ssdHealth: number; batteryHealth: number; ram: string; ssd: string; windowsVersion: string }) {
  const healthScore = (unit.ssdHealth + unit.batteryHealth) / 2;
  const specScore = Math.min(100, capacityGb(unit.ram) * 3) * 0.5 + Math.min(100, (capacityGb(unit.ssd) / 1024) * 100) * 0.5;
  const windowsBonus = unit.windowsVersion.includes("11") ? 5 : 0;
  return healthScore * 0.6 + specScore * 0.35 + windowsBonus;
}

export function pickFeaturedUnits<
  T extends { id: string; isFeatured: boolean; ssdHealth: number; batteryHealth: number; ram: string; ssd: string; windowsVersion: string }
>(units: T[], limit = 4): T[] {
  const pinned = units.filter((unit) => unit.isFeatured);
  if (pinned.length >= limit) return pinned.slice(0, limit);

  const fallback = units
    .filter((unit) => !unit.isFeatured)
    .sort((a, b) => conditionScore(b) - conditionScore(a))
    .slice(0, limit - pinned.length);

  return [...pinned, ...fallback];
}

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
          isFeatured: unit.isFeatured,
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
