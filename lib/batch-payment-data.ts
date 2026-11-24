import { prisma } from "./prisma";

const paymentStatusLabel: Record<string, string> = {
  BELUM_JATUH_TEMPO: "Belum jatuh tempo",
  MENDEKATI_TEMPO: "Mendekati tempo",
  BUTUH_FOLLOW_UP: "Butuh follow up",
  LUNAS: "Lunas"
};

const payableStatuses = ["VERIFIED", "VERIFIED_WITH_NOTES"];
const heldStatuses = ["RECHECK", "CANDIDATE_RETUR", "RETUR_DISTRIBUTOR"];

/**
 * Problem unit untuk rekap supplier: hanya catatan saat unit masuk (tanpa QC harian).
 * Catatan form masuk kadang berformat "Merk: .. Seri: .. Charger: .. Minus: <problem> Windows masuk: .. Status alur: ..";
 * dalam kasus itu yang ditampilkan hanya bagian Minus, plus keterangan "Retur distributor <tanggal>" bila ada.
 */
export function problemText(entryNotes: string | null | undefined) {
  const text = (entryNotes ?? "").replace(/\s+/g, " ").trim();
  if (!text) return "Belum ada keterangan problem.";
  const minus = text.match(/Minus:\s*(.*?)(?=\s*(?:Windows masuk:|Status alur:)|$)/i)?.[1]?.trim();
  if (!minus) return text;
  const retur = text.match(/Retur distributor\s+\d{1,2}\/\d{1,2}\/\d{4}/i)?.[0];
  return retur && !minus.includes(retur) ? `${minus} — ${retur}` : minus;
}

export async function getBatchPaymentSummary(batchId: string) {
  try {
    const batch = await prisma.batchPSI.findUnique({
      where: { id: batchId },
      include: {
        inventoryItems: { orderBy: { createdAt: "asc" } },
        units: {
          orderBy: { nomorUnit: "asc" },
        }
      }
    });

    if (!batch) return null;

    const normalUnits = batch.units.filter((unit) => payableStatuses.includes(unit.statusObservasi));
    const problemUnits = batch.units.filter((unit) => heldStatuses.includes(unit.statusObservasi));
    const totalLaptopModal = batch.units.reduce((sum, unit) => sum + unit.hargaModal, 0);
    const totalNormal = normalUnits.reduce((sum, unit) => sum + unit.hargaModal, 0);
    const totalProblem = problemUnits.reduce((sum, unit) => sum + unit.hargaModal, 0);

    // Barang non-laptop (PC set, monitor, dst.) di batch yang sama: modalnya ikut ditagih supplier,
    // tapi dipisah dari angka laptop supaya metrik laptop tidak bergeser. Yang rusak/hilang tidak ikut dibayar.
    const nonLaptopPayable = batch.inventoryItems.filter((item) => item.status !== "DAMAGED" && item.status !== "LOST" && item.status !== "RETURNED");
    const totalNonLaptop = nonLaptopPayable.reduce((sum, item) => sum + item.costPrice, 0);

    return {
      id: batch.id,
      nomorBatch: batch.nomorBatch,
      supplier: batch.supplier,
      tanggalMasuk: batch.tanggalMasuk.toISOString().slice(0, 10),
      tanggalTempo: batch.tanggalTempo.toISOString().slice(0, 10),
      statusPembayaran: paymentStatusLabel[batch.statusPembayaran] ?? batch.statusPembayaran,
      catatan: batch.catatan ?? "",
      totalModal: totalLaptopModal + totalNonLaptop,
      totalLaptopModal,
      totalNormal,
      totalProblem,
      totalNonLaptop,
      netTransfer: totalNormal + totalNonLaptop,
      nonLaptopItems: nonLaptopPayable.map((item) => ({
        id: item.id,
        name: item.name,
        spec: item.specification ?? item.brandModel ?? "",
        condition: item.condition === "NEW" ? "Baru" : "Second",
        costPrice: item.costPrice
      })),
      normalUnits: normalUnits.map((unit) => ({
        id: unit.id,
        nomorUnit: unit.nomorUnit,
        model: unit.model,
        processor: unit.processor,
        ram: unit.ram,
        ssd: unit.ssd,
        hargaModal: unit.hargaModal,
        statusObservasi: unit.statusObservasi.replaceAll("_", " ")
      })),
      problemUnits: problemUnits.map((unit) => ({
        id: unit.id,
        nomorUnit: unit.nomorUnit,
        model: unit.model,
        processor: unit.processor,
        ram: unit.ram,
        ssd: unit.ssd,
        hargaModal: unit.hargaModal,
        statusObservasi: unit.statusObservasi.replaceAll("_", " "),
        problem: problemText(unit.entryNotes)
      }))
    };
  } catch {
    return null;
  }
}
