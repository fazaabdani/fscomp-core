import { prisma } from "./prisma";
import { displayUnitNumber } from "./unit-number";

export async function getUnitsMissingPhotos() {
  try {
    const units = await prisma.unit.findMany({
      where: {
        soldAt: null,
        statusObservasi: { not: "RETUR_DISTRIBUTOR" },
        OR: [{ catalogImageUrl: null }, { catalogImageUrl: "" }],
        unitPhotos: { none: {} }
      },
      select: {
        id: true,
        nomorUnit: true,
        model: true,
        processor: true,
        ram: true,
        ssd: true,
        stockLocation: true,
        statusObservasi: true
      },
      orderBy: [{ stockLocation: "asc" }, { nomorUnit: "asc" }]
    });

    return {
      count: units.length,
      units: units.slice(0, 20).map((unit) => ({
        id: unit.id,
        nomorUnit: displayUnitNumber(unit.nomorUnit),
        model: unit.model,
        processor: unit.processor,
        ram: unit.ram,
        ssd: unit.ssd,
        stockLocation: unit.stockLocation === "WIRADESA" ? "Wiradesa" : "Kajen",
        statusObservasi: unit.statusObservasi.replaceAll("_", " ")
      }))
    };
  } catch {
    return {
      count: 0,
      units: []
    };
  }
}
