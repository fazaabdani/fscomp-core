"use server";

import { PaymentStatus, Prisma } from "@prisma/client";
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

export async function deleteBatchAction(batchId: string, formData: FormData) {
  const currentUser = requireRole(["admin"]);
  const confirmUsername = text(formData, "confirmUsername");

  if (confirmUsername !== currentUser.username) {
    redirect("/batch-psi?error=batch-confirm");
  }

  const batch = await prisma.batchPSI.findUnique({
    where: { id: batchId },
    select: {
      id: true,
      nomorBatch: true,
      units: {
        select: {
          id: true,
          soldAt: true,
          _count: { select: { sales: true } }
        }
      }
    }
  });

  if (!batch) {
    redirect("/batch-psi?error=batch-not-found");
  }

  if (batch.units.some((unit) => unit.soldAt || unit._count.sales > 0)) {
    redirect("/batch-psi?error=batch-has-sales");
  }

  const unitIds = batch.units.map((unit) => unit.id);

  try {
    await prisma.$transaction(async (tx) => {
      if (unitIds.length > 0) {
        await tx.catalogSync.deleteMany({ where: { unitId: { in: unitIds } } });
        await tx.aiLog.deleteMany({ where: { unitId: { in: unitIds } } });
        await tx.qcHarian.deleteMany({ where: { unitId: { in: unitIds } } });
        await tx.qcAwal.deleteMany({ where: { unitId: { in: unitIds } } });
        await tx.unit.deleteMany({ where: { id: { in: unitIds } } });
      }
      await tx.batchPSI.delete({ where: { id: batchId } });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      redirect("/batch-psi?error=batch-related-data");
    }
    throw error;
  }

  revalidatePath("/batch-psi");
  redirect("/batch-psi?deleted=batch");
}

export async function deleteUnitFromBatchAction(unitId: string) {
  requireRole(["admin", "teknisi"]);

  const unit = await prisma.unit.findUnique({
    where: { id: unitId },
    select: { id: true, batchId: true, soldAt: true, _count: { select: { sales: true } } }
  });

  if (!unit) {
    redirect("/batch-psi?error=unit-not-found");
  }

  if (unit.soldAt) {
    redirect("/batch-psi?error=unit-sold");
  }

  if (unit._count.sales > 0) {
    redirect("/batch-psi?error=unit-sale-history");
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.catalogSync.deleteMany({ where: { unitId } });
      await tx.aiLog.deleteMany({ where: { unitId } });
      await tx.qcHarian.deleteMany({ where: { unitId } });
      await tx.qcAwal.deleteMany({ where: { unitId } });
      await tx.unit.delete({ where: { id: unitId } });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      redirect("/batch-psi?error=unit-related-data");
    }
    throw error;
  }

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
