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

function buildCustomerThanksMessage(receiptUrl: string) {
  return [
    "Assalamu'alaikum kak.",
    "",
    "Terima kasih sudah membeli laptop di FS Comp.",
    "Semoga laptopnya bermanfaat, awet, dan bisa membantu kebutuhan kerja, sekolah, kuliah, usaha, maupun aktivitas sehari-hari.",
    "",
    `Nota digital: ${receiptUrl}`,
    "",
    "Supaya laptop second-nya lebih awet, berikut beberapa tips perawatan dari kami:",
    "",
    "1. Wajib rutin dipakai / dinyalakan minimal 3 kali seminggu selama 15-30 menit.",
    "2. Simpan di tempat kering, hindari tempat lembap atau rawan terkena air.",
    "3. Gunakan charger yang sesuai.",
    "4. Jangan dipakai di atas kasur, lebih aman di meja atau alas keras.",
    "5. Jaga agar tidak overheat, beri jeda jika terasa panas.",
    "6. Matikan laptop dengan benar lewat shutdown Windows.",
    "7. Jangan biarkan baterai sering habis total, charger saat sekitar 20-30%.",
    "8. Jauhkan dari cairan seperti air, kopi, teh, dan hujan.",
    "9. Jangan install aplikasi sembarangan agar aman dari virus atau Windows error.",
    "10. Segera konsultasi kalau ada gejala aneh seperti panas, keyboard error, layar kedip, baterai boros, atau sering restart.",
    "",
    "Kalau ada kendala atau ingin konsultasi, silakan langsung hubungi kami nggih.",
    "Terima kasih sudah percaya belanja di FS Comp."
  ].join("\n");
}

async function notifySaleToN8n(payload: {
  saleId: string;
  invoiceNumber: string;
  unit: string;
  location: SaleLocation;
  subtotal: number;
  grossProfit: number;
  paymentMethod: string;
  buyerName: string;
  buyerPhone: string;
  buyerAddress: string;
}) {
  const webhookUrl = process.env.N8N_SALES_WEBHOOK_URL;
  const publicUrl = process.env.CORE_PUBLIC_URL ?? "https://core.fscomp.id";
  if (!webhookUrl) return;

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        notifyTo: process.env.WA_OWNER_NUMBER ?? "0816660056",
        notifyGroup: process.env.WA_REPORT_GROUP_ID ?? "",
        sourceLocation: payload.location === "WIRADESA" ? "Wiradesa utama" : "Kajen secondary",
        receiptUrl: `${publicUrl}/sales/${payload.saleId}/receipt`,
        customerReceiptUrl: `${publicUrl}/nota/${payload.saleId}`,
        message: [
          "*FS Comp Core - Penjualan Baru*",
          `Invoice: ${payload.invoiceNumber}`,
          `Unit: ${payload.unit}`,
          `Lokasi: ${payload.location === "WIRADESA" ? "Wiradesa" : "Kajen"}`,
          `Total: Rp ${payload.subtotal.toLocaleString("id-ID")}`,
          `Profit kotor: Rp ${payload.grossProfit.toLocaleString("id-ID")}`,
          `Pembayaran: ${payload.paymentMethod}`,
          `Pembeli: ${payload.buyerName || "-"}`,
          `WA pembeli: ${payload.buyerPhone || "-"}`,
          `Alamat: ${payload.buyerAddress || "-"}`
        ].join("\n"),
        customerPhone: payload.buyerPhone,
        customerMessage: buildCustomerThanksMessage(`${publicUrl}/nota/${payload.saleId}`)
      })
    });
  } catch {
    // Notifikasi n8n tidak boleh menggagalkan transaksi kasir.
  }
}

export async function createSaleAction(formData: FormData) {
  requireRole(["admin"]);

  const unitId = text(formData, "unitId");
  const soldPrice = numberValue(formData, "soldPrice");
  const paymentMethod = text(formData, "paymentMethod") || "Cash";
  const buyerName = text(formData, "buyerName");
  const buyerPhone = text(formData, "buyerPhone");
  const buyerAddress = text(formData, "buyerAddress");
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
  if (!latestDailyQc) {
    redirect("/sales?error=qc-harian-belum-diisi");
  }

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
  const invoice = invoiceNumber();

  try {
    await prisma.$transaction(async (tx) => {
      const sale = await tx.sale.create({
        data: {
          unitId,
          invoiceNumber: invoice,
          location,
          soldPrice: subtotal,
          costPrice: totalCost,
          subtotal,
          grossProfit,
          paymentMethod,
          buyerName: buyerName || null,
          buyerPhone: buyerPhone || null,
          buyerAddress: buyerAddress || null,
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

  await notifySaleToN8n({
    saleId,
    invoiceNumber: invoice,
    unit: `Unit ${unit.nomorUnit} - ${unit.model}`,
    location,
    subtotal,
    grossProfit,
    paymentMethod,
    buyerName,
    buyerPhone,
    buyerAddress
  });

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
