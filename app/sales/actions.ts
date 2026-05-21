"use server";

import type { SaleLocation } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function numberValue(formData: FormData, key: string) {
  const value = Number(formData.get(key));
  return Number.isFinite(value) ? value : 0;
}

function mapLocation(value: string): SaleLocation {
  return value === "KAJEN" ? "KAJEN" : "WIRADESA";
}

export async function createSaleAction(formData: FormData) {
  requireRole(["admin"]);

  const unitId = text(formData, "unitId");
  const soldPrice = numberValue(formData, "soldPrice");
  const paymentMethod = text(formData, "paymentMethod") || "Cash";
  const buyerName = text(formData, "buyerName");
  const notes = text(formData, "notes");
  const location = mapLocation(text(formData, "location"));

  if (!unitId || soldPrice <= 0) {
    redirect("/sales?error=data-kurang");
  }

  const unit = await prisma.unit.findUnique({ where: { id: unitId } });
  if (!unit) {
    redirect("/sales?error=unit-tidak-ditemukan");
  }

  await prisma.$transaction(async (tx) => {
    await tx.sale.create({
      data: {
        unitId,
        location,
        soldPrice,
        costPrice: unit.hargaModal,
        grossProfit: soldPrice - unit.hargaModal,
        paymentMethod,
        buyerName: buyerName || null,
        notes: notes || null
      }
    });

    await tx.unit.update({
      where: { id: unitId },
      data: { soldAt: new Date() }
    });
  });

  revalidatePath("/sales");
  revalidatePath("/");
  revalidatePath(`/unit/${unitId}`);
  redirect("/sales?saved=1");
}
