import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const paymentStatusLabel: Record<string, string> = {
  BELUM_JATUH_TEMPO: "Belum jatuh tempo",
  MENDEKATI_TEMPO: "Mendekati tempo",
  BUTUH_FOLLOW_UP: "Butuh follow up",
  LUNAS: "Lunas"
};

export const dynamic = "force-dynamic";

export async function GET() {
  const publicUrl = process.env.CORE_PUBLIC_URL ?? "https://core.fscomp.id";
  const [units, batches] = await Promise.all([
    prisma.unit.findMany({
      where: { soldAt: null },
      include: {
        qcHarian: {
          orderBy: { tanggal: "desc" },
          take: 1
        }
      },
      orderBy: { createdAt: "desc" },
      take: 80
    }),
    prisma.batchPSI.findMany({
      where: { statusPembayaran: { in: ["MENDEKATI_TEMPO", "BUTUH_FOLLOW_UP"] } },
      orderBy: { tanggalTempo: "asc" },
      take: 20
    })
  ]);

  const problemUnits = units
    .filter((unit) => unit.statusObservasi === "RECHECK" || unit.statusObservasi === "CANDIDATE_RETUR")
    .map((unit) => ({
      nomorUnit: unit.nomorUnit,
      model: unit.model,
      status: unit.statusObservasi.replaceAll("_", " "),
      ssdHealth: unit.ssdHealth ?? 0,
      batteryHealth: unit.batteryHealth ?? 0,
      detailUrl: `${publicUrl}/unit/${unit.id}`
    }));

  const failedDailyQc = units
    .filter((unit) => unit.qcHarian[0] && unit.qcHarian[0].masihLolos !== "LOLOS")
    .map((unit) => {
      const qc = unit.qcHarian[0];
      return {
        nomorUnit: unit.nomorUnit,
        model: unit.model,
        statusHarian: qc.masihLolos.replaceAll("_", " "),
        ssdHealth: qc.ssdHealth,
        batteryHealth: qc.batteryHealth,
        windowsVersion: qc.windowsVersion,
        catatan: qc.catatan,
        detailUrl: `${publicUrl}/unit/${unit.id}`
      };
    });

  const nearDueBatches = batches.map((batch) => ({
    nomorBatch: batch.nomorBatch,
    supplier: batch.supplier,
    tanggalTempo: batch.tanggalTempo.toISOString().slice(0, 10),
    statusPembayaran: paymentStatusLabel[batch.statusPembayaran] ?? batch.statusPembayaran
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
      ...problemUnits.map((unit) => `- Unit ${unit.nomorUnit} ${unit.model}: ${unit.status}, SSD ${unit.ssdHealth}%, Battery ${unit.batteryHealth}%`),
      ...failedDailyQc.map((unit) => `- QC Unit ${unit.nomorUnit} ${unit.model}: ${unit.statusHarian}, ${unit.windowsVersion}`)
    ].join("\n")
  });
}
