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

function numberArray(formData: FormData, key: string) {
  return formData.getAll(key).map((value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  });
}

function textArray(formData: FormData, key: string) {
  return formData.getAll(key).map((value) => String(value ?? "").trim());
}

function mapLocation(value: string): SaleLocation {
  return value === "KAJEN" ? "KAJEN" : "WIRADESA";
}

function processorGeneration(processor: string) {
  const normalized = processor.toLowerCase();
  const genMatch = normalized.match(/gen\s*(\d+)/);
  if (genMatch) return Number(genMatch[1]);
  const intelCodeMatch = normalized.match(/\b[ui][3579][- ]?(\d{4,5})/);
  if (intelCodeMatch) {
    const code = intelCodeMatch[1];
    return code.length === 5 ? Number(code.slice(0, 2)) : Number(code.slice(0, 1));
  }
  return 0;
}

function hasWindows11Daily(qcHarian: { windowsVersion?: string | null }[]) {
  const latestDaily = qcHarian[0];
  return Boolean(latestDaily?.windowsVersion?.toLowerCase().includes("windows 11"));
}

function invoiceNumber() {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replaceAll("-", "");
  const time = `${now.getHours()}${now.getMinutes()}${now.getSeconds()}`.padStart(6, "0");
  const suffix = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `FS-${date}-${time}-${suffix}`;
}

export async function createSaleAction(formData: FormData) {
  requireRole(["admin"]);

  const unitId = text(formData, "unitId");
  const soldPrice = numberValue(formData, "soldPrice");
  const paymentMethod = text(formData, "paymentMethod") || "Cash";
  const buyerName = text(formData, "buyerName");
  const buyerPhone = text(formData, "buyerPhone");
  const notes = text(formData, "notes");
  const location = mapLocation(text(formData, "location"));
  const itemNames = textArray(formData, "itemName");
  const itemCategories = textArray(formData, "itemCategory");
  const itemQty = numberArray(formData, "itemQty");
  const itemPrices = numberArray(formData, "itemPrice");
  const itemCosts = numberArray(formData, "itemCost");

  if (!unitId || soldPrice <= 0) {
    redirect("/sales?error=data-kurang");
  }

  const unit = await prisma.unit.findUnique({
    where: { id: unitId },
    include: {
      qcHarian: {
        orderBy: { tanggal: "desc" },
        take: 1,
        select: { masihLolos: true, windowsVersion: true }
      }
    }
  });
  if (!unit) {
    redirect("/sales?error=unit-tidak-ditemukan");
  }

  const latestDailyQc = unit.qcHarian[0];
  if (latestDailyQc && latestDailyQc.masihLolos !== "LOLOS") {
    redirect("/sales?error=qc-harian-belum-lolos");
  }

  if (processorGeneration(unit.processor) >= 8 && !hasWindows11Daily(unit.qcHarian)) {
    redirect("/sales?error=windows-11-wajib-gen-8-keatas");
  }

  const items = [
    {
      name: `Laptop ${unit.model}`,
      category: "LAPTOP",
      qty: 1,
      unitPrice: soldPrice,
      unitCost: unit.hargaModal
    },
    ...itemNames.map((name, index) => ({
      name,
      category: itemCategories[index] || "BONUS",
      qty: Math.max(0, itemQty[index] || 0),
      unitPrice: Math.max(0, itemPrices[index] || 0),
      unitCost: Math.max(0, itemCosts[index] || 0)
    }))
  ].filter((item) => item.name && item.qty > 0);

  const subtotal = items.reduce((sum, item) => sum + item.qty * item.unitPrice, 0);
  const totalCost = items.reduce((sum, item) => sum + item.qty * item.unitCost, 0);
  const grossProfit = subtotal - totalCost;
  let saleId = "";

  try {
    await prisma.$transaction(async (tx) => {
      const sale = await tx.sale.create({
        data: {
          unitId,
          invoiceNumber: invoiceNumber(),
          location,
          soldPrice: subtotal,
          costPrice: totalCost,
          subtotal,
          grossProfit,
          paymentMethod,
          buyerName: buyerName || null,
          buyerPhone: buyerPhone || null,
          warrantySoftware: "3 bulan",
          warrantyHardware: "3 minggu",
          notes: notes || null
        }
      });
      saleId = sale.id;

      await tx.saleItem.createMany({
        data: items.map((item) => ({
          saleId: sale.id,
          name: item.name,
          category: item.category,
          qty: item.qty,
          unitPrice: item.unitPrice,
          unitCost: item.unitCost,
          lineTotal: item.qty * item.unitPrice,
          lineCost: item.qty * item.unitCost
        }))
      });

      await tx.unit.update({
        where: { id: unitId },
        data: { soldAt: new Date() }
      });
    });
  } catch {
    redirect("/sales?error=tabel-penjualan-belum-migrasi");
  }

  revalidatePath("/sales");
  revalidatePath("/");
  revalidatePath(`/unit/${unitId}`);
  redirect(`/sales/${saleId}/receipt`);
}

export async function voidSaleAction(saleId: string, formData: FormData) {
  requireRole(["admin"]);
  const reason = text(formData, "voidReason") || "Transaksi dibatalkan";

  const sale = await prisma.sale.findUnique({ where: { id: saleId } });
  if (!sale) {
    redirect("/sales?error=transaksi-tidak-ditemukan");
  }

  await prisma.$transaction(async (tx) => {
    await tx.sale.update({
      where: { id: saleId },
      data: {
        voidedAt: new Date(),
        voidReason: reason
      }
    });

    await tx.unit.update({
      where: { id: sale.unitId },
      data: { soldAt: null }
    });
  });

  revalidatePath("/sales");
  revalidatePath("/");
  revalidatePath(`/unit/${sale.unitId}`);
  revalidatePath(`/sales/${saleId}/receipt`);
  redirect("/sales?voided=1");
}
