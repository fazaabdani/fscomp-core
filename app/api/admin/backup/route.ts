import { NextResponse } from "next/server";
import { hasIntegrationAccess } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";

export const dynamic = "force-dynamic";

async function requireBackupAccess(request: Request) {
  if (hasIntegrationAccess(request, "BACKUP_EXPORT_TOKEN")) return;
  await requireRole(["admin"]);
}

export async function GET(request: Request) {
  await requireBackupAccess(request);

  const [
    users,
    attendance,
    batches,
    units,
    mediaFolders,
    mediaAssets,
    unitPhotos,
    inventoryItems,
    pcComponents,
    pcBuildPresets,
    pcBuildPresetItems,
    pcBuildDrafts,
    pcBuildDraftItems,
    waCustomers,
    waConversations,
    waMessages,
    waAiSettings,
    waAiEventLogs,
    waTelegramNotificationLogs,
    unitAuditLogs,
    qcAwal,
    qcHarian,
    sales,
    licenseRecords,
    saleItems,
    aiLogs,
    catalogSync
  ] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, username: true, email: true, role: true, active: true, createdAt: true, updatedAt: true }
    }),
    prisma.attendance.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.batchPSI.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.unit.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.mediaFolder.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.mediaAsset.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.unitPhoto.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.inventoryItem.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.pcComponent.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.pcBuildPreset.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.pcBuildPresetItem.findMany(),
    prisma.pcBuildDraft.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.pcBuildDraftItem.findMany(),
    prisma.waCustomer.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.waConversation.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.waMessage.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.waAiSetting.findMany(),
    prisma.waAiEventLog.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.waTelegramNotificationLog.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.unitAuditLog.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.qcAwal.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.qcHarian.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.sale.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.licenseRecord.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.saleItem.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.aiLog.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.catalogSync.findMany({ orderBy: { createdAt: "asc" } })
  ]);

  const generatedAt = new Date().toISOString();
  const payload = {
    app: "fscomp-core",
    type: "database-json-backup",
    generatedAt,
    // Cadangan ini cuma isi baris database (metadata), BUKAN file fisik. File foto media
    // (public/uploads/media) dan foto absensi tetap harus dicadangkan terpisah di level disk/volume.
    tables: {
      users,
      attendance,
      batches,
      units,
      mediaFolders,
      mediaAssets,
      unitPhotos,
      inventoryItems,
      pcComponents,
      pcBuildPresets,
      pcBuildPresetItems,
      pcBuildDrafts,
      pcBuildDraftItems,
      waCustomers,
      waConversations,
      waMessages,
      waAiSettings,
      waAiEventLogs,
      waTelegramNotificationLogs,
      unitAuditLogs,
      qcAwal,
      qcHarian,
      sales,
      licenseRecords,
      saleItems,
      aiLogs,
      catalogSync
    }
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="fscomp-core-backup-${generatedAt.slice(0, 10)}.json"`
    }
  });
}
