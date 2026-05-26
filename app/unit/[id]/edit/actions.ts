"use server";

import { SaleLocation, UnitStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";

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
  requireRole(["admin"]);
  const nomorUnit = text(formData, "nomorUnit");
  const currentUnit = await prisma.unit.findUnique({
    where: { id: unitId },
    select: { batchId: true }
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

  await prisma.unit.update({
    where: { id: unitId },
    data: {
      nomorUnit,
      model: text(formData, "model"),
      processor: text(formData, "processor"),
      ram: text(formData, "ram"),
      ssd: text(formData, "ssd"),
      ssdSerial: text(formData, "ssdSerial"),
      lcdSize: text(formData, "lcdSize"),
      lcdResolution: text(formData, "lcdResolution"),
      isTouchscreen: text(formData, "isTouchscreen") === "Ya",
      hargaModal: rupiahValue(formData, "hargaModal"),
      hargaJualRekomendasi: rupiahValue(formData, "hargaJualRekomendasi"),
      stockLocation: (text(formData, "stockLocation") || "WIRADESA") as SaleLocation,
      catalogImageUrl: text(formData, "catalogImageUrl") || null,
      ssdHealth: numberValue(formData, "ssdHealth"),
      batteryHealth: numberValue(formData, "batteryHealth"),
      statusObservasi: text(formData, "statusObservasi") as UnitStatus
    }
  });

  revalidatePath("/batch-psi");
  revalidatePath(`/unit/${unitId}`);
  revalidatePath("/katalog");
  revalidatePath("/");
  redirect(`/unit/${unitId}`);
}
