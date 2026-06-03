import { batches as demoBatches, units as demoUnits, type BatchPSI } from "./api";
import { chargerTypes } from "./charger-options";
import { prisma } from "./prisma";
import { displayUnitNumber } from "./unit-number";

const paymentStatusLabel: Record<string, BatchPSI["statusPembayaran"]> = {
  BELUM_JATUH_TEMPO: "Belum jatuh tempo",
  MENDEKATI_TEMPO: "Mendekati tempo",
  BUTUH_FOLLOW_UP: "Butuh follow up",
  LUNAS: "Lunas"
};

function chargerCounts(value: unknown) {
  const raw = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
  return Object.fromEntries(chargerTypes.map((type) => [type, Number(raw[type] ?? 0) || 0]));
}

export async function getBatchesForManagementPage() {
  try {
    const dbBatches = await prisma.batchPSI.findMany({
      include: { units: true },
      orderBy: { tanggalMasuk: "desc" }
    });

    if (dbBatches.length === 0) {
      return demoBatches.map((batch) => ({
        ...batch,
        jumlahLaptopDatang: demoUnits.filter((unit) => unit.batchId === batch.id).length,
        jumlahChargerDatang: 0,
        chargerCounts: chargerCounts(null),
        units: demoUnits.filter((unit) => unit.batchId === batch.id).map((unit) => ({ ...unit, chargerType: "", catalogImageUrl: "", soldAt: "" }))
      }));
    }

    return dbBatches.map((batch) => ({
      id: batch.id,
      nomorBatch: batch.nomorBatch,
      supplier: batch.supplier,
      tanggalMasuk: batch.tanggalMasuk.toISOString().slice(0, 10),
      tanggalTempo: batch.tanggalTempo.toISOString().slice(0, 10),
      jumlahLaptopDatang: batch.jumlahLaptopDatang ?? batch.units.length,
      jumlahChargerDatang: batch.jumlahChargerDatang ?? 0,
      chargerCounts: chargerCounts(batch.chargerCounts),
      statusPembayaran: paymentStatusLabel[batch.statusPembayaran],
      catatan: batch.catatan ?? "",
      units: batch.units.map((unit) => ({
        id: unit.id,
        nomorUnit: displayUnitNumber(unit.nomorUnit),
        model: unit.model,
        processor: unit.processor,
        ram: unit.ram,
        ssd: unit.ssd,
        chargerType: unit.chargerType ?? "",
        hargaModal: unit.hargaModal,
        statusObservasi: unit.statusObservasi.replaceAll("_", " "),
        catalogImageUrl: unit.catalogImageUrl ?? "",
        soldAt: unit.soldAt?.toISOString().slice(0, 10) ?? ""
      }))
    }));
  } catch {
    return demoBatches.map((batch) => ({
      ...batch,
      jumlahLaptopDatang: demoUnits.filter((unit) => unit.batchId === batch.id).length,
      jumlahChargerDatang: 0,
      chargerCounts: chargerCounts(null),
      units: demoUnits.filter((unit) => unit.batchId === batch.id).map((unit) => ({ ...unit, chargerType: "", catalogImageUrl: "", soldAt: "" }))
    }));
  }
}
