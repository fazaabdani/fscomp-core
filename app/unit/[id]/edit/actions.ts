"use server";

import { SaleLocation, UnitStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { entityId, formValues, percentage, requiredText, rupiahInput, z } from "@/lib/form-validation";

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function numberValue(formData: FormData, key: string, fallback = 0) {
  const value = Number(formData.get(key));
  return Number.isFinite(value) ? value : fallback;
}

function rupiahValue(formData: FormData, key: string, fallback = 0) {
  const raw = text(formData, key);
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return fallback;
  const value = Number(digits);
  return Number.isFinite(value) ? value : fallback;
}

export async function updateUnitAction(unitId: string, formData: FormData) {
  const currentUser = requireRole(["admin"]);
  const validation = z.object({
    nomorUnit: requiredText(100),
    model: requiredText(200),
    processor: requiredText(200),
    ram: requiredText(100),
    ssd: requiredText(100),
    hargaModal: rupiahInput,
    hargaJualRekomendasi: rupiahInput,
    stockLocation: z.enum(["WIRADESA", "KAJEN"]),
    ssdHealth: percentage,
    batteryHealth: percentage,
    statusObservasi: z.enum(["RECHECK", "CANDIDATE_RETUR", "RETUR_DISTRIBUTOR", "VERIFIED", "VERIFIED_WITH_NOTES"])
  }).safeParse(formValues(formData));
  if (!entityId.safeParse(unitId).success || !validation.success) redirect(`/unit/${unitId}/edit?error=invalid-input`);
  const nomorUnit = text(formData, "nomorUnit");
  const currentUnit = await prisma.unit.findUnique({
    where: { id: unitId },
    select: {
      batchId: true,
      nomorUnit: true,
      model: true,
      processor: true,
      ram: true,
      ssd: true,
      ssdSerial: true,
      chargerType: true,
      lcdSize: true,
      lcdResolution: true,
      isTouchscreen: true,
      hargaModal: true,
      hargaJualRekomendasi: true,
      stockLocation: true,
      catalogImageUrl: true,
      entryNotes: true,
      ssdHealth: true,
      batteryHealth: true,
      statusObservasi: true
    }
  });

  if (!currentUnit) {
    redirect("/batch-psi?error=unit-not-found");
  }

  const duplicateUnit = await prisma.unit.findFirst({
    where: {
      batchId: currentUnit.batchId,
      nomorUnit,
      NOT: { id: unitId }
    },
    select: { id: true }
  });

  if (duplicateUnit) {
    redirect(`/unit/${unitId}/edit?error=duplicate-unit`);
  }

  const updateData = {
    nomorUnit,
    model: text(formData, "model"),
    processor: text(formData, "processor"),
    ram: text(formData, "ram"),
    ssd: text(formData, "ssd"),
    ssdSerial: text(formData, "ssdSerial") || null,
    chargerType: text(formData, "chargerType") || null,
    lcdSize: text(formData, "lcdSize") || null,
    lcdResolution: text(formData, "lcdResolution") || null,
    isTouchscreen: text(formData, "isTouchscreen") === "Ya",
    hargaModal: rupiahValue(formData, "hargaModal"),
    hargaJualRekomendasi: rupiahValue(formData, "hargaJualRekomendasi"),
    stockLocation: (text(formData, "stockLocation") || "WIRADESA") as SaleLocation,
    catalogImageUrl: text(formData, "catalogImageUrl") || null,
    entryNotes: text(formData, "entryNotes") || null,
    ssdHealth: numberValue(formData, "ssdHealth"),
    batteryHealth: numberValue(formData, "batteryHealth"),
    statusObservasi: text(formData, "statusObservasi") as UnitStatus
  };

  const changes = Object.entries(updateData)
    .map(([field, nextValue]) => ({
      field,
      before: currentUnit[field as keyof typeof currentUnit] ?? null,
      after: nextValue ?? null
    }))
    .filter((change) => String(change.before ?? "") !== String(change.after ?? ""));

  await prisma.$transaction([
    prisma.unit.update({
      where: { id: unitId },
      data: updateData
    }),
    ...(changes.length > 0
      ? [
          prisma.unitAuditLog.create({
            data: {
              unitId,
              action: "UPDATE_UNIT",
              actorName: currentUser.name,
              actorUsername: currentUser.username,
              actorRole: currentUser.role,
              changes
            }
          })
        ]
      : [])
  ]);

  revalidatePath("/batch-psi");
  revalidatePath(`/unit/${unitId}`);
  revalidatePath("/katalog");
  revalidatePath("/");
  redirect(`/unit/${unitId}`);
}
