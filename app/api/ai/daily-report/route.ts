import { NextResponse } from "next/server";
import { aiLogs, batches, dailyQcs, getProblemUnits, units } from "@/lib/api";

export async function GET() {
  const problemUnits = getProblemUnits();
  const nearDueBatches = batches.filter((batch) => batch.statusPembayaran !== "Lunas");
  const failedDailyQc = dailyQcs.filter((qc) => qc.masihLolos === "Tidak Lolos");

  return NextResponse.json({
    source: "fscomp-core-demo",
    summary: {
      totalUnits: units.length,
      problemUnits: problemUnits.length,
      failedDailyQc: failedDailyQc.length,
      nearDueBatches: nearDueBatches.length
    },
    recommendations: aiLogs.map((log) => {
      const unit = units.find((item) => item.id === log.unitId);
      return {
        unit: unit?.nomorUnit,
        model: unit?.model,
        recommendation: log.rekomendasi,
        status: log.status
      };
    })
  });
}
