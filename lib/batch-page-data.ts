import { batches as demoBatches, units as demoUnits, type BatchPSI } from "./api";
import { prisma } from "./prisma";

const paymentStatusLabel: Record<string, BatchPSI["statusPembayaran"]> = {
  BELUM_JATUH_TEMPO: "Belum jatuh tempo",
  MENDEKATI_TEMPO: "Mendekati tempo",
  BUTUH_FOLLOW_UP: "Butuh follow up",
  LUNAS: "Lunas"
};

export async function getBatchesForManagementPage() {
  try {
    const dbBatches = await prisma.batchPSI.findMany({
      include: { units: true },
      orderBy: { tanggalMasuk: "desc" }
    });

    if (dbBatches.length === 0) {
      return demoBatches.map((batch) => ({
        ...batch,
        units: demoUnits.filter((unit) => unit.batchId === batch.id).map((unit) => ({ ...unit, soldAt: "" }))
      }));
    }

    return dbBatches.map((batch) => ({
      id: batch.id,
      nomorBatch: batch.nomorBatch,
      supplier: batch.supplier,
      tanggalMasuk: batch.tanggalMasuk.toISOString().slice(0, 10),
      tanggalTempo: batch.tanggalTempo.toISOString().slice(0, 10),
      statusPembayaran: paymentStatusLabel[batch.statusPembayaran],
      catatan: batch.catatan ?? "",
      units: batch.units.map((unit) => ({
        id: unit.id,
        nomorUnit: unit.nomorUnit,
        model: unit.model,
        processor: unit.processor,
        ram: unit.ram,
        ssd: unit.ssd,
        hargaModal: unit.hargaModal,
        statusObservasi: unit.statusObservasi.replaceAll("_", " "),
        soldAt: unit.soldAt?.toISOString().slice(0, 10) ?? ""
      }))
    }));
  } catch {
    return demoBatches.map((batch) => ({
      ...batch,
      units: demoUnits.filter((unit) => unit.batchId === batch.id).map((unit) => ({ ...unit, soldAt: "" }))
    }));
  }
}
