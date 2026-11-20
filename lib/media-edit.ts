import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { MEDIA_UPLOAD_DIR } from "./media-data";
import { createMediaAsset } from "./media-upload";
import { prisma } from "./prisma";

/** Nilai dalam persen, 100 = tidak diubah. Sama persis dengan skala filter CSS di pratinjau. */
export type PhotoAdjust = { brightness: number; contrast: number; saturation: number };

export const PHOTO_ADJUST_LIMITS = {
  brightness: { min: 50, max: 160 },
  contrast: { min: 50, max: 160 },
  saturation: { min: 0, max: 200 }
} as const;

export function parsePhotoAdjust(input: unknown): PhotoAdjust | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Record<string, unknown>;
  const result = {} as PhotoAdjust;
  for (const key of ["brightness", "contrast", "saturation"] as const) {
    const value = Number(raw[key]);
    const { min, max } = PHOTO_ADJUST_LIMITS[key];
    if (!Number.isFinite(value) || value < min || value > max) return null;
    result[key] = Math.round(value);
  }
  return result;
}

export function isNeutralAdjust(adjust: PhotoAdjust) {
  return adjust.brightness === 100 && adjust.contrast === 100 && adjust.saturation === 100;
}

function editedName(originalName: string) {
  const ext = path.extname(originalName);
  const base = ext ? originalName.slice(0, -ext.length) : originalName;
  return `${base.replace(/ \(edit\)$/, "")} (edit)${ext || ".webp"}`;
}

/**
 * Menerapkan brightness -> contrast -> saturation (urutan sama dengan filter CSS di pratinjau),
 * lalu menyimpannya sebagai foto BARU di folder yang sama. Foto asli tidak diubah.
 */
export async function createEditedMediaAsset(assetId: string, adjust: PhotoAdjust) {
  const source = await prisma.mediaAsset.findUnique({
    where: { id: assetId },
    select: { fileName: true, folderId: true, originalName: true }
  });
  if (!source) return null;

  const original = await readFile(path.join(process.cwd(), MEDIA_UPLOAD_DIR, source.fileName));
  const brightness = adjust.brightness / 100;
  const contrast = adjust.contrast / 100;
  const s = adjust.saturation / 100;

  // Langkah 1: brightness (x * b) lalu contrast ((x - 127.5) * c + 127.5), nilai dipotong 0-255.
  const toned = await sharp(original)
    .rotate()
    .removeAlpha()
    .linear(brightness, 0)
    .toColourspace("srgb")
    .png({ compressionLevel: 1 })
    .toBuffer();
  const contrasted = await sharp(toned)
    .linear(contrast, 127.5 * (1 - contrast))
    .png({ compressionLevel: 1 })
    .toBuffer();

  // Langkah 2: saturasi dengan matriks yang sama seperti filter CSS saturate().
  const result = await sharp(contrasted)
    .recomb([
      [0.213 + 0.787 * s, 0.715 - 0.715 * s, 0.072 - 0.072 * s],
      [0.213 - 0.213 * s, 0.715 + 0.285 * s, 0.072 - 0.072 * s],
      [0.213 - 0.213 * s, 0.715 - 0.715 * s, 0.072 + 0.928 * s]
    ])
    .png({ compressionLevel: 1 })
    .toBuffer();

  return createMediaAsset(result, source.folderId, editedName(source.originalName));
}
