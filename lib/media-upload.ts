import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { MEDIA_THUMB_DIR, MEDIA_UPLOAD_DIR, mediaAssetUrl, mediaThumbUrl } from "./media-data";
import { prisma } from "./prisma";

const MAX_IMAGE_SIDE = 1600;
const THUMB_SIDE = 320;

async function saveImageBuffer(buffer: Buffer) {
  const id = randomUUID();
  const fileName = `${id}.webp`;
  const image = sharp(buffer).rotate();

  const main = await image.clone().resize({ width: MAX_IMAGE_SIDE, height: MAX_IMAGE_SIDE, fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toBuffer({ resolveWithObject: true });
  const thumb = await image.clone().resize({ width: THUMB_SIDE, height: THUMB_SIDE, fit: "inside", withoutEnlargement: true }).webp({ quality: 75 }).toBuffer();

  const mainDir = path.join(process.cwd(), MEDIA_UPLOAD_DIR);
  const thumbDir = path.join(process.cwd(), MEDIA_THUMB_DIR);
  await mkdir(mainDir, { recursive: true });
  await mkdir(thumbDir, { recursive: true });
  await writeFile(path.join(mainDir, fileName), main.data);
  await writeFile(path.join(thumbDir, fileName), thumb);

  return { id, fileName, width: main.info.width, height: main.info.height };
}

export async function createMediaAsset(buffer: Buffer, folderId: string | null, originalName: string) {
  const saved = await saveImageBuffer(buffer);
  const asset = await prisma.mediaAsset.create({
    data: {
      id: saved.id,
      folderId,
      fileName: saved.fileName,
      originalName,
      mimeType: "image/webp",
      size: buffer.byteLength,
      width: saved.width,
      height: saved.height
    }
  });

  return {
    id: asset.id,
    url: mediaAssetUrl(asset.fileName),
    thumbUrl: mediaThumbUrl(asset.fileName),
    originalName: asset.originalName
  };
}

export async function findOrCreateFolder(name: string, parentId: string | null) {
  const trimmed = name.trim();
  const existing = await prisma.mediaFolder.findFirst({ where: { name: trimmed, parentId } });
  if (existing) return existing;
  return prisma.mediaFolder.create({ data: { name: trimmed, parentId } });
}
