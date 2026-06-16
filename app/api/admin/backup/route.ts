import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";

export const dynamic = "force-dynamic";

function requireBackupAccess(request: Request) {
  const backupToken = process.env.BACKUP_EXPORT_TOKEN;
  const { searchParams } = new URL(request.url);
  const requestToken = request.headers.get("x-backup-token") ?? searchParams.get("token");

  if (backupToken && requestToken === backupToken) return;
  requireRole(["admin"]);
}

export async function GET(request: Request) {
  requireBackupAccess(request);

  const [
    users,
    attendance,
    batches,
    units,
    qcAwal,
    qcHarian,
    sales,
    saleItems,
    aiLogs,
    catalogSync,
    unitAuditLogs
  ] = await Promise.all([
    prisma.user.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.attendance.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.batchPSI.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.unit.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.qcAwal.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.qcHarian.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.sale.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.saleItem.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.aiLog.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.catalogSync.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.unitAuditLog.findMany({ orderBy: { createdAt: "asc" } })
  ]);

  const generatedAt = new Date().toISOString();
  const payload = {
    app: "fscomp-core",
    type: "database-json-backup",
    generatedAt,
    tables: {
      users,
      attendance,
      batches,
      units,
      qcAwal,
      qcHarian,
      sales,
      saleItems,
      aiLogs,
      catalogSync,
      unitAuditLogs
    }
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="fscomp-core-backup-${generatedAt.slice(0, 10)}.json"`
    }
  });
}
