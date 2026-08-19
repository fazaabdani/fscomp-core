import { prisma } from "./prisma";

export const MEDIA_UPLOAD_DIR = "public/uploads/media";
export const MEDIA_THUMB_DIR = "public/uploads/media/thumb";

export function mediaAssetUrl(fileName: string) {
  return `/api/media/file/${fileName}`;
}

export function mediaThumbUrl(fileName: string) {
  return `/api/media/file/thumb/${fileName}`;
}

export async function getFolderTree() {
  try {
    const folders = await prisma.mediaFolder.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, parentId: true }
    });
    return folders;
  } catch {
    return [];
  }
}

export async function getFolderContents(folderId: string | null) {
  try {
    const [folder, subfolders, assets] = await Promise.all([
      folderId ? prisma.mediaFolder.findUnique({ where: { id: folderId } }) : null,
      prisma.mediaFolder.findMany({
        where: { parentId: folderId },
        orderBy: { name: "asc" },
        select: { id: true, name: true, _count: { select: { children: true, assets: true } } }
      }),
      prisma.mediaAsset.findMany({
        where: { folderId },
        orderBy: { createdAt: "desc" },
        select: { id: true, fileName: true, originalName: true, width: true, height: true, createdAt: true }
      })
    ]);

    const breadcrumb: { id: string; name: string }[] = [];
    let current = folder;
    while (current) {
      breadcrumb.unshift({ id: current.id, name: current.name });
      current = current.parentId ? await prisma.mediaFolder.findUnique({ where: { id: current.parentId } }) : null;
    }

    return {
      folder: folder ? { id: folder.id, name: folder.name } : null,
      breadcrumb,
      subfolders: subfolders.map((item) => ({
        id: item.id,
        name: item.name,
        folderCount: item._count.children,
        assetCount: item._count.assets
      })),
      assets: assets.map((asset) => ({
        id: asset.id,
        url: mediaAssetUrl(asset.fileName),
        thumbUrl: mediaThumbUrl(asset.fileName),
        originalName: asset.originalName,
        width: asset.width,
        height: asset.height,
        createdAt: asset.createdAt.toISOString()
      }))
    };
  } catch {
    return { folder: null, breadcrumb: [], subfolders: [], assets: [] };
  }
}

export async function getUnitPhotoGallery(unitId: string) {
  try {
    const photos = await prisma.unitPhoto.findMany({
      where: { unitId },
      orderBy: { order: "asc" },
      include: { asset: { select: { fileName: true, originalName: true } } }
    });
    return photos.map((photo) => ({
      id: photo.id,
      assetId: photo.assetId,
      url: mediaAssetUrl(photo.asset.fileName),
      thumbUrl: mediaThumbUrl(photo.asset.fileName),
      alt: photo.asset.originalName
    }));
  } catch {
    return [];
  }
}

export function resolvePrimaryImageUrl(unitPhotos: { asset: { fileName: string } }[] | undefined, catalogImageUrl: string | null, preferThumb = false) {
  const first = unitPhotos?.[0];
  if (first) return preferThumb ? mediaThumbUrl(first.asset.fileName) : mediaAssetUrl(first.asset.fileName);
  return catalogImageUrl ?? "";
}

export async function resolveUnitPhotos(assetIds: string[]) {
  if (assetIds.length === 0) return [];
  const assets = await prisma.mediaAsset.findMany({
    where: { id: { in: assetIds } },
    select: { id: true, fileName: true }
  });
  const byId = new Map(assets.map((asset) => [asset.id, asset]));
  return assetIds.filter((id) => byId.has(id));
}
