import { NextResponse } from "next/server";
import { forbidden, hasIntegrationAccess, hasStaffAccess } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!(await hasStaffAccess(["admin", "teknisi"])) && !hasIntegrationAccess(request, "CORE_INTEGRATION_TOKEN")) return forbidden();

  const [totalUnits, problemUnits, nearDueBatches, recentOpenLogs, activeUnits] = await Promise.all([
    prisma.unit.count({ where: { soldAt: null } }),
    prisma.unit.count({
      where: {
        soldAt: null,
        statusObservasi: { in: ["RECHECK", "CANDIDATE_RETUR", "RETUR_DISTRIBUTOR"] }
      }
    }),
    prisma.batchPSI.count({ where: { statusPembayaran: { in: ["MENDEKATI_TEMPO", "BUTUH_FOLLOW_UP"] } } }),
    prisma.aiLog.findMany({
      where: { status: "OPEN" },
      include: { unit: { select: { nomorUnit: true, model: true } } },
      orderBy: { createdAt: "desc" },
      take: 40
    }),
    prisma.unit.findMany({
      where: { soldAt: null },
      include: { qcHarian: { orderBy: { tanggal: "desc" }, take: 1, select: { masihLolos: true } } }
    })
  ]);

  const failedDailyQc = activeUnits.filter((unit) => unit.qcHarian[0] && unit.qcHarian[0].masihLolos !== "LOLOS").length;

  return NextResponse.json({
    source: "fscomp-core",
    summary: {
      totalUnits,
      problemUnits,
      failedDailyQc,
      nearDueBatches
    },
    recommendations: recentOpenLogs.map((log) => ({
      unit: log.unit.nomorUnit,
      model: log.unit.model,
      recommendation: log.rekomendasi,
      status: log.status
    }))
  });
}
