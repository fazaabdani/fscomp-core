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
