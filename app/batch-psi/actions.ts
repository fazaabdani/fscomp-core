"use server";

import { PaymentStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";

const paymentStatusMap: Record<string, PaymentStatus> = {
  "Belum jatuh tempo": "BELUM_JATUH_TEMPO",
  "Mendekati tempo": "MENDEKATI_TEMPO",
  "Butuh follow up": "BUTUH_FOLLOW_UP",
  Lunas: "LUNAS"
};

export async function createBatchAction(formData: FormData) {
  requireRole(["admin", "teknisi"]);

  const nomorBatch = String(formData.get("nomorBatch") ?? "").trim();
  const supplier = String(formData.get("supplier") ?? "").trim();
  const tanggalMasuk = String(formData.get("tanggalMasuk") ?? "");
  const tanggalTempo = String(formData.get("tanggalTempo") ?? "");
  const statusPembayaran = String(formData.get("statusPembayaran") ?? "Belum jatuh tempo");
  const catatan = String(formData.get("catatan") ?? "").trim();

  if (!nomorBatch || !supplier || !tanggalMasuk || !tanggalTempo) {
    redirect("/batch-psi/new?error=required");
  }

  await prisma.batchPSI.create({
    data: {
      nomorBatch,
      supplier,
      tanggalMasuk: new Date(tanggalMasuk),
      tanggalTempo: new Date(tanggalTempo),
      statusPembayaran: paymentStatusMap[statusPembayaran] ?? "BELUM_JATUH_TEMPO",
      catatan
    }
  });

  revalidatePath("/batch-psi");
  redirect("/batch-psi");
}

export async function updateBatchAction(batchId: string, formData: FormData) {
  requireRole(["admin", "teknisi"]);

  const nomorBatch = String(formData.get("nomorBatch") ?? "").trim();
  const supplier = String(formData.get("supplier") ?? "").trim();
  const tanggalMasuk = String(formData.get("tanggalMasuk") ?? "");
  const tanggalTempo = String(formData.get("tanggalTempo") ?? "");
  const statusPembayaran = String(formData.get("statusPembayaran") ?? "Belum jatuh tempo");
  const catatan = String(formData.get("catatan") ?? "").trim();

  await prisma.batchPSI.update({
    where: { id: batchId },
    data: {
      nomorBatch,
      supplier,
      tanggalMasuk: new Date(tanggalMasuk),
      tanggalTempo: new Date(tanggalTempo),
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
