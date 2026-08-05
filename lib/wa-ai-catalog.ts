import { prisma } from "./prisma";
import { displayUnitNumber } from "./unit-number";
import { formatWaLocation } from "./wa-ai-responses";

export type WaAiCatalogUnit = {
  id: string;
  nomorUnit: string;
  model: string;
  processor: string;
  ram: string;
  ssd: string;
  price: number;
  location: string;
  detailUrl: string;
  batteryHealth: number | null;
  ssdHealth: number | null;
};

export type WaAiCatalogResult =
  | { ok: true; units: WaAiCatalogUnit[] }
  | { ok: false; reason: "CATALOG_ERROR" };

function normalizeSearch(value: string) {
  return value.trim().toLowerCase();
}

export async function getSafeWaCatalogUnits(input: {
  query?: string;
  limit?: number;
  publicUrl?: string;
} = {}): Promise<WaAiCatalogResult> {
  try {
    const publicUrl = input.publicUrl ?? process.env.CORE_PUBLIC_URL ?? "https://core.fscomp.id";
    const limit = Math.min(Math.max(input.limit ?? 8, 1), 20);
    const query = normalizeSearch(input.query ?? "");

    const candidates = await prisma.unit.findMany({
      where: {
        soldAt: null,
        statusObservasi: { in: ["VERIFIED", "VERIFIED_WITH_NOTES"] }
      },
      include: {
        qcHarian: {
          orderBy: { tanggal: "desc" },
          take: 1,
          select: { masihLolos: true }
        }
      },
      orderBy: [{ stockLocation: "desc" }, { createdAt: "desc" }],
      take: 120
    });

    const units = candidates
      .filter((unit) => {
        const latestDaily = unit.qcHarian[0];
        if (!latestDaily || latestDaily.masihLolos === "TIDAK_LOLOS") return false;
        if (!query) return true;
        const haystack = [
          unit.nomorUnit,
          unit.model,
          unit.processor,
          unit.ram,
          unit.ssd,
          unit.stockLocation
        ].join(" ").toLowerCase();
        return haystack.includes(query);
      })
      .slice(0, limit)
      .map((unit) => ({
        id: unit.id,
        nomorUnit: displayUnitNumber(unit.nomorUnit),
        model: unit.model,
        processor: unit.processor,
        ram: unit.ram,
        ssd: unit.ssd,
        price: unit.hargaJualRekomendasi,
        location: formatWaLocation(unit.stockLocation),
        detailUrl: `${publicUrl}/unit/${unit.id}`,
        batteryHealth: unit.batteryHealth,
        ssdHealth: unit.ssdHealth
      }));

    return { ok: true, units };
  } catch {
    return { ok: false, reason: "CATALOG_ERROR" };
  }
}
