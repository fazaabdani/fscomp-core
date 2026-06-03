"use server";

import { PaymentStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { chargerFieldName, chargerTypes } from "@/lib/charger-options";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";

const paymentStatusMap: Record<string, PaymentStatus> = {
  "Belum jatuh tempo": "BELUM_JATUH_TEMPO",
  "Mendekati tempo": "MENDEKATI_TEMPO",
  "Butuh follow up": "BUTUH_FOLLOW_UP",
  Lunas: "LUNAS"
};

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function numberOrNull(formData: FormData, key: string) {
  const raw = text(formData, key).replace(/[^\d]/g, "");
  if (!raw) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function chargerCountsFromForm(formData: FormData) {
  return Object.fromEntries(
    chargerTypes.map((chargerType) => [chargerType, numberOrNull(formData, chargerFieldName(chargerType)) ?? 0])
  );
}

export async function createBatchAction(formData: FormData) {
  requireRole(["admin", "teknisi"]);

  const nomorBatch = text(formData, "nomorBatch");
  const supplier = text(formData, "supplier");
  const tanggalMasuk = text(formData, "tanggalMasuk");
  const tanggalTempo = text(formData, "tanggalTempo");
  const statusPembayaran = text(formData, "statusPembayaran") || "Belum jatuh tempo";
  const catatan = text(formData, "catatan");

  if (!nomorBatch || !supplier || !tanggalMasuk || !tanggalTempo) {
    redirect("/batch-psi/new?error=required");
  }

  await prisma.batchPSI.create({
    data: {
      nomorBatch,
      supplier,
      tanggalMasuk: new Date(tanggalMasuk),
      tanggalTempo: new Date(tanggalTempo),
      jumlahLaptopDatang: numberOrNull(formData, "jumlahLaptopDatang"),
      jumlahChargerDatang: numberOrNull(formData, "jumlahChargerDatang"),
      chargerCounts: chargerCountsFromForm(formData),
      statusPembayaran: paymentStatusMap[statusPembayaran] ?? "BELUM_JATUH_TEMPO",
      catatan
    }
  });

  revalidatePath("/batch-psi");
  redirect("/batch-psi");
}

export async function updateBatchAction(batchId: string, formData: FormData) {
  requireRole(["admin", "teknisi"]);

  const nomorBatch = text(formData, "nomorBatch");
  const supplier = text(formData, "supplier");
  const tanggalMasuk = text(formData, "tanggalMasuk");
  const tanggalTempo = text(formData, "tanggalTempo");
  const statusPembayaran = text(formData, "statusPembayaran") || "Belum jatuh tempo";
  const catatan = text(formData, "catatan");
  const hasChargerFields =
    formData.has("jumlahLaptopDatang") ||
    formData.has("jumlahChargerDatang") ||
    chargerTypes.some((chargerType) => formData.has(chargerFieldName(chargerType)));

  await prisma.batchPSI.update({
    where: { id: batchId },
    data: {
      nomorBatch,
      supplier,
      tanggalMasuk: new Date(tanggalMasuk),
      tanggalTempo: new Date(tanggalTempo),
      ...(hasChargerFields
        ? {
            jumlahLaptopDatang: numberOrNull(formData, "jumlahLaptopDatang"),
            jumlahChargerDatang: numberOrNull(formData, "jumlahChargerDatang"),
            chargerCounts: chargerCountsFromForm(formData)
          }
        : {}),
      statusPembayaran: paymentStatusMap[statusPembayaran] ?? "BELUM_JATUH_TEMPO",
      catatan
    }
  });

  revalidatePath("/batch-psi");
  redirect("/batch-psi");
}

export async function deleteUnitFromBatchAction(unitId: string) {
  requireRole(["admin", "teknisi"]);

  const unit = await prisma.unit.findUnique({
    where: { id: unitId },
    select: { id: true, batchId: true, soldAt: true }
  });

  if (!unit) {
    redirect("/batch-psi?error=unit-not-found");
  }

  if (unit.soldAt) {
    redirect("/batch-psi?error=unit-sold");
  }

  await prisma.$transaction(async (tx) => {
    await tx.catalogSync.deleteMany({ where: { unitId } });
    await tx.aiLog.deleteMany({ where: { unitId } });
    await tx.qcHarian.deleteMany({ where: { unitId } });
    await tx.qcAwal.deleteMany({ where: { unitId } });
    await tx.unit.delete({ where: { id: unitId } });
  });

  revalidatePath("/batch-psi");
  revalidatePath(`/batch-psi/${unit.batchId}/history`);
  revalidatePath(`/batch-psi/${unit.batchId}/payment`);
  redirect("/batch-psi?deleted=unit");
}

export async function markUnitReturnedAction(unitId: string) {
  requireRole(["admin", "teknisi"]);

  const unit = await prisma.unit.findUnique({
    where: { id: unitId },
    select: { id: true, batchId: true, soldAt: true, entryNotes: true }
  });

  if (!unit) {
    redirect("/batch-psi?error=unit-not-found");
  }

  if (unit.soldAt) {
    redirect("/batch-psi?error=unit-sold-retur");
  }

  const returNote = `Retur distributor ${new Date().toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta" })}`;

  await prisma.unit.update({
    where: { id: unitId },
    data: {
      statusObservasi: "RETUR_DISTRIBUTOR",
      entryNotes: [unit.entryNotes, returNote].filter(Boolean).join("\n")
    }
  });

  revalidatePath("/batch-psi");
  revalidatePath(`/batch-psi/${unit.batchId}/history`);
  revalidatePath(`/batch-psi/${unit.batchId}/payment`);
  redirect("/batch-psi?returned=unit");
}
