"use server";

import { unlink } from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { brandOf, catalogImageCandidates } from "@/lib/catalog-image";
import { entityId, requiredText } from "@/lib/form-validation";
import { MEDIA_THUMB_DIR, MEDIA_UPLOAD_DIR } from "@/lib/media-data";
import { createMediaAsset, findOrCreateFolder } from "@/lib/media-upload";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";

const MEDIA_ROLES = ["admin", "teknisi"] as const;
const MAX_IMAGE_SIDE = 1600;
const MIGRATE_BATCH_SIZE = 15;

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function mediaRedirect(folderId: string | null, params: Record<string, string>): never {
  const query = new URLSearchParams(params);
  if (folderId) query.set("folder", folderId);
  const search = query.toString();
  redirect(search ? `/media?${search}` : "/media");
}

export async function createFolderAction(formData: FormData) {
  requireRole([...MEDIA_ROLES]);
  const parentId = text(formData, "parentId") || null;
  const name = text(formData, "name");
  if (!requiredText(120).safeParse(name).success) {
    mediaRedirect(parentId, { error: "invalid-input" });
  }

  await findOrCreateFolder(name, parentId);
  revalidatePath("/media");
  mediaRedirect(parentId, { success: "folder-created" });
}

export async function renameFolderAction(folderId: string, formData: FormData) {
  requireRole([...MEDIA_ROLES]);
  const name = text(formData, "name");
  if (!entityId.safeParse(folderId).success || !requiredText(120).safeParse(name).success) {
    mediaRedirect(folderId, { error: "invalid-input" });
  }

  const folder = await prisma.mediaFolder.update({ where: { id: folderId }, data: { name } });
  revalidatePath("/media");
  mediaRedirect(folder.parentId, { success: "folder-renamed" });
}

export async function deleteFolderAction(folderId: string) {
  requireRole([...MEDIA_ROLES]);
  if (!entityId.safeParse(folderId).success) mediaRedirect(null, { error: "invalid-input" });

  const folder = await prisma.mediaFolder.findUnique({
    where: { id: folderId },
    select: { parentId: true, _count: { select: { children: true, assets: true } } }
  });

  if (!folder) mediaRedirect(null, { error: "folder-not-found" });

  if (folder._count.children > 0 || folder._count.assets > 0) {
    mediaRedirect(folder.parentId, { error: "folder-not-empty" });
  }

  await prisma.mediaFolder.delete({ where: { id: folderId } });
  revalidatePath("/media");
  mediaRedirect(folder.parentId, { success: "folder-deleted" });
}

export async function uploadMediaAction(formData: FormData) {
  requireRole([...MEDIA_ROLES]);
  const folderId = text(formData, "folderId") || null;
  const files = formData.getAll("files").filter((item): item is File => item instanceof File && item.size > 0);

  if (files.length === 0) {
    mediaRedirect(folderId, { error: "no-files" });
  }

  let uploaded = 0;
  for (const file of files) {
    if (!file.type.startsWith("image/")) continue;
    const buffer = Buffer.from(await file.arrayBuffer());
    await createMediaAsset(buffer, folderId, file.name || "foto.webp");
    uploaded += 1;
  }

  revalidatePath("/media");
  mediaRedirect(folderId, { success: "uploaded", count: String(uploaded) });
}

export async function deleteAssetAction(assetId: string, formData: FormData) {
  requireRole([...MEDIA_ROLES]);
  const folderId = text(formData, "folderId") || null;
  if (!entityId.safeParse(assetId).success) mediaRedirect(folderId, { error: "invalid-input" });

  const asset = await prisma.mediaAsset.findUnique({ where: { id: assetId }, select: { fileName: true } });
  if (asset) {
    await prisma.mediaAsset.delete({ where: { id: assetId } });
    await Promise.all([
      unlink(path.join(process.cwd(), MEDIA_UPLOAD_DIR, asset.fileName)).catch(() => {}),
      unlink(path.join(process.cwd(), MEDIA_THUMB_DIR, asset.fileName)).catch(() => {})
    ]);
  }

  revalidatePath("/media");
  revalidatePath("/katalog");
  mediaRedirect(folderId, { success: "asset-deleted" });
}

export async function migrateGoogleDrivePhotosAction() {
  requireRole([...MEDIA_ROLES]);

  const units = await prisma.unit.findMany({
    where: {
      catalogImageUrl: { not: null },
      NOT: { catalogImageUrl: "" },
      unitPhotos: { none: {} }
    },
    orderBy: { createdAt: "asc" },
    take: MIGRATE_BATCH_SIZE,
    select: { id: true, nomorUnit: true, model: true, catalogImageUrl: true }
  });

  let migrated = 0;
  const failedUnits: string[] = [];

  for (const unit of units) {
    try {
      const candidates = catalogImageCandidates(unit.catalogImageUrl, MAX_IMAGE_SIDE);
      let buffer: Buffer | null = null;

      for (const candidateUrl of candidates) {
        try {
          const response = await fetch(candidateUrl, { signal: AbortSignal.timeout(15000) });
          const contentType = response.headers.get("content-type") ?? "";
          if (response.ok && contentType.startsWith("image/")) {
            buffer = Buffer.from(await response.arrayBuffer());
            break;
          }
        } catch {
          continue;
        }
      }

      if (!buffer) {
        failedUnits.push(unit.nomorUnit);
        continue;
      }

      const brandFolder = await findOrCreateFolder(brandOf(unit.model), null);
      const modelFolder = await findOrCreateFolder(unit.model, brandFolder.id);
      const asset = await createMediaAsset(buffer, modelFolder.id, `${unit.nomorUnit}.webp`);
      await prisma.unitPhoto.create({ data: { unitId: unit.id, assetId: asset.id, order: 0 } });

      migrated += 1;
    } catch {
      failedUnits.push(unit.nomorUnit);
    }
  }

  revalidatePath("/media");
  revalidatePath("/katalog");
  mediaRedirect(null, {
    success: "migrated",
    migrated: String(migrated),
    remaining: units.length === MIGRATE_BATCH_SIZE ? "more" : "done",
    ...(failedUnits.length > 0 ? { failedUnits: failedUnits.join(",") } : {})
  });
}
