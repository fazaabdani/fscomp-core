import { NextResponse } from "next/server";
import { batches, dailyQcs, getProblemUnits, units } from "@/lib/api";

export async function GET() {
  const problemUnits = getProblemUnits().map((unit) => ({
    nomorUnit: unit.nomorUnit,
    model: unit.model,
    status: unit.statusObservasi,
    ssdHealth: unit.ssdHealth,
    batteryHealth: unit.batteryHealth,
    catatan: unit.qcAwal.catatan,
    detailUrl: `https://core.fscomp.id/unit/${unit.id}`
  }));

  const failedDailyQc = dailyQcs
    .filter((qc) => qc.masihLolos !== "Lolos")
    .map((qc) => {
      const unit = units.find((item) => item.id === qc.unitId);
      return {
        nomorUnit: unit?.nomorUnit,
        model: unit?.model,
        statusHarian: qc.masihLolos,
        ssdHealth: qc.ssdHealth,
        batteryHealth: qc.batteryHealth,
        catatan: qc.catatan,
        detailUrl: `https://core.fscomp.id/unit/${qc.unitId}`
      };
    });

  const nearDueBatches = batches
    .filter((batch) => batch.statusPembayaran === "Mendekati tempo" || batch.statusPembayaran === "Butuh follow up")
    .map((batch) => ({
      nomorBatch: batch.nomorBatch,
      supplier: batch.supplier,
      tanggalTempo: batch.tanggalTempo,
      statusPembayaran: batch.statusPembayaran
    }));

  return NextResponse.json({
    title: "FS Comp Core - Alert Sebelum Unit Dijual",
    generatedAt: new Date().toISOString(),
    problemUnits,
    failedDailyQc,
    nearDueBatches,
    whatsappText: [
      "*FS Comp Core - Perlu Ditangani*",
      `Unit problem: ${problemUnits.length}`,
      `QC harian catatan/gagal: ${failedDailyQc.length}`,
      `Batch mendekati tempo: ${nearDueBatches.length}`,
      "",
      ...problemUnits.map((unit) => `- Unit ${unit.nomorUnit} ${unit.model}: ${unit.status}, SSD ${unit.ssdHealth}%, Battery ${unit.batteryHealth}%`)
    ].join("\n")
  });
}
