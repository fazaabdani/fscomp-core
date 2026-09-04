"use server";

import { SaleLocation, UnitStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { resolveUnitPhotos } from "@/lib/media-data";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { unitNumberWithBatchDate } from "@/lib/unit-number";
import { entityId, formValues, requiredText, rupiahInput, z } from "@/lib/form-validation";

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function rupiahValue(formData: FormData, key: string, fallback = 0) {
  const raw = text(formData, key);
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return fallback;
  const value = Number(digits);
  return Number.isFinite(value) ? value : fallback;
}

function qcStatusFromFlow(value: string): UnitStatus {
  if (value === "CANDIDATE_RETUR") return "CANDIDATE_RETUR";
  return "RECHECK";
}

export async function createUnitWithInitialQcAction(formData: FormData) {
  await requireRole(["admin", "teknisi"]);
  const validation = z.object({
    batchId: entityId,
    nomorUnit: requiredText(100),
    processor: requiredText(200),
    ram: requiredText(100),
    hargaModal: rupiahInput,
    hargaJualRekomendasi: rupiahInput
  }).safeParse(formValues(formData));
  if (!validation.success) redirect(`/unit/new?batch=${text(formData, "batchId")}&error=invalid-input`);
  const batchId = text(formData, "batchId");
  const rawNomorUnit = text(formData, "nomorUnit");
  const merk = text(formData, "merk");
  const seri = text(formData, "seri");
  const model = text(formData, "model") || [merk, seri].filter(Boolean).join(" ");
  const processor = text(formData, "processor");
  const ram = text(formData, "ram");
  const ssd = text(formData, "storage") || text(formData, "ssd");
  const display = text(formData, "display");
  const chargerType = text(formData, "chargerType");
  const fiturTambahan = text(formData, "fiturTambahan");
  const minus = text(formData, "minus") || text(formData, "catatan");

  if (!batchId || !rawNomorUnit || !model || !processor || !ram || !ssd) {
    redirect(`/unit/new?batch=${batchId}&error=required`);
  }

  const batch = await prisma.batchPSI.findUnique({ where: { id: batchId } });
  if (!batch) {
    redirect("/batch-psi?error=batch-not-found");
  }

  const nomorUnit = unitNumberWithBatchDate(rawNomorUnit, batch.tanggalMasuk);

  const existingUnit = await prisma.unit.findFirst({
    where: {
      batchId,
      nomorUnit
    },
    select: { id: true }
  });

  if (existingUnit) {
    redirect(`/unit/new?batch=${batchId}&error=duplicate-unit`);
  }

  const status = (text(formData, "statusObservasi") as UnitStatus) || qcStatusFromFlow(text(formData, "qcFlowStatus"));
  const featureLower = fiturTambahan.toLowerCase();
  const displayLower = display.toLowerCase();
  const catatan = [
    merk ? `Merk: ${merk}` : "",
    seri ? `Seri: ${seri}` : "",
    chargerType ? `Charger: ${chargerType}` : "",
    fiturTambahan ? `Fitur tambahan: ${fiturTambahan}` : "",
    minus ? `Minus: ${minus}` : "",
    text(formData, "windowsVersion") ? `Windows masuk: ${text(formData, "windowsVersion")}` : "",
    text(formData, "qcFlowStatus") ? `Status alur: ${text(formData, "qcFlowStatus").replaceAll("_", " ")}` : ""
  ].filter(Boolean).join("\n");

  const photoAssetIds = await resolveUnitPhotos(formData.getAll("unitPhotoAssetIds").map(String));

  const unit = await prisma.unit.create({
    data: {
      nomorUnit,
      batchId,
      supplier: batch.supplier,
      model,
      processor,
      ram,
      ssd,
      ssdSerial: text(formData, "ssdSerial"),
      chargerType: chargerType || null,
      lcdSize: display || text(formData, "lcdSize"),
      lcdResolution: display || text(formData, "lcdResolution"),
      isTouchscreen: text(formData, "isTouchscreen") === "Ya" || displayLower.includes("touch") || featureLower.includes("touch"),
      hasKeyboardBacklight: featureLower.includes("backlit") || featureLower.includes("backlight"),
      hasFingerprint: featureLower.includes("fingerprint") || featureLower.includes("sidik jari"),
      hasFaceRecognition: featureLower.includes("face recognition") || featureLower.includes("face id") || featureLower.includes("windows hello"),
      hasStylus: featureLower.includes("stylus"),
      entryNotes: catatan || null,
      hargaModal: rupiahValue(formData, "hargaModal"),
      hargaJualRekomendasi: rupiahValue(formData, "hargaJualRekomendasi"),
      stockLocation: "WIRADESA" as SaleLocation,
      catalogImageUrl: text(formData, "catalogImageUrl") || null,
      batteryHealth: null,
      ssdHealth: null,
      statusObservasi: status || "RECHECK",
      tanggalMasuk: batch.tanggalMasuk,
      tempo: batch.tanggalTempo,
      unitPhotos: {
        create: photoAssetIds.map((assetId, order) => ({ assetId, order }))
      }
    }
  });

  revalidatePath("/batch-psi");
  revalidatePath("/qc-harian");
  revalidatePath("/katalog");
  revalidatePath("/");
  if (text(formData, "qcFlowStatus") === "LANJUT_QC_HARIAN") {
    redirect(`/qc-harian?unit=${unit.id}`);
  }
  redirect(`/unit/${unit.id}`);
}
