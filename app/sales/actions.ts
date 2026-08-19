"use server";

import { Prisma, type LicenseDurationType, type LicenseType, type SaleLocation } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { entityId, formValues, nonNegativeInteger, optionalText, requiredText, z } from "@/lib/form-validation";
import { inferLicenseType, inferLicenseVersion, licenseDisplayName } from "@/lib/licenses";
import { isQcFresh } from "@/lib/qc-due";

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
    if (!Number.isFinite(parsed)) return 0;
    return Math.min(Math.max(parsed, 0), 1_000_000_000);
  });
}

function textArray(formData: FormData, key: string) {
  return formData.getAll(key).map((value) => String(value ?? "").trim());
}

function warrantyText(formData: FormData, key: string, fallbackAmount: number, fallbackUnit: "minggu" | "bulan") {
  const amount = Math.max(1, numberValue(formData, `${key}Amount`) || fallbackAmount);
  const unitInput = text(formData, `${key}Unit`).toLowerCase();
  const unit = unitInput === "minggu" || unitInput === "bulan" ? unitInput : fallbackUnit;
  return `${amount} ${unit}`;
}

function licenseTypeValue(value: string): LicenseType | null {
  if (value === "WINDOWS" || value === "ANTIVIRUS" || value === "OTHER") return value;
  if (value === "OFFICE") return "OFFICE";
  return null;
}

function licenseDurationValue(value: string): LicenseDurationType {
  if (value === "YEARLY" || value === "CUSTOM") return value;
  return "LIFETIME";
}

function dateValue(rawDate: string) {
  if (!rawDate) return null;
  const date = new Date(`${rawDate}T00:00:00+07:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function hasBundledBagAndMouse(items: { name: string; qty: number }[]) {
  const normalizedItems = items.map((item) => ({ name: item.name.toLowerCase(), qty: item.qty }));
  const hasBag = normalizedItems.some((item) => item.qty > 0 && item.name.includes("tas"));
  const hasMouse = normalizedItems.some((item) => item.qty > 0 && item.name.includes("mouse"));
  return hasBag && hasMouse;
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

function profitSplit(location: SaleLocation, grossProfit: number) {
  if (location !== "KAJEN") {
    return {
      wiradesaShare: grossProfit,
      kajenShare: 0
    };
  }

  return {
    wiradesaShare: Math.round(grossProfit * 0.6),
    kajenShare: grossProfit - Math.round(grossProfit * 0.6)
  };
}

function buildCustomerThanksMessage(receiptUrl: string, location: SaleLocation, includesLaptop: boolean) {
  const storeName = location === "KAJEN" ? "FSID" : "FS Comp";
  if (!includesLaptop) {
    return [
      "Assalamu'alaikum kak.",
      "",
      `Terima kasih sudah membeli lisensi/software di ${storeName}.`,
      "Lisensi dan bukti transaksi sudah kami catat agar layanan purna jual lebih mudah.",
      "",
      `Nota digital: ${receiptUrl}`,
      "",
      "Simpan product key dan akun aktivasi dengan aman. Jika ada kendala aktivasi, silakan langsung hubungi kami.",
      `Terima kasih sudah percaya berbelanja di ${storeName}.`
    ].join("\n");
  }
  return [
    "Assalamu'alaikum kak.",
    "",
    `Terima kasih sudah membeli laptop di ${storeName}.`,
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
    `Terima kasih sudah percaya belanja di ${storeName}.`
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
  const split = profitSplit(payload.location, payload.grossProfit);

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        notifyTo: process.env.WA_OWNER_NUMBER ?? "0816660056",
        notifyGroup: process.env.WA_REPORT_GROUP_ID ?? "",
        sourceLocation: payload.location === "WIRADESA" ? "Wiradesa utama" : "Kajen secondary",
        wiradesaProfitShare: split.wiradesaShare,
        kajenProfitShare: split.kajenShare,
        receiptUrl: `${publicUrl}/sales/${payload.saleId}/receipt`,
        customerReceiptUrl: `${publicUrl}/nota/${payload.saleId}`,
        message: [
          "*FS Comp Core - Penjualan Baru*",
          `Invoice: ${payload.invoiceNumber}`,
          `Unit: ${payload.unit}`,
          `Lokasi: ${payload.location === "WIRADESA" ? "Wiradesa" : "Kajen"}`,
          `Total: Rp ${payload.subtotal.toLocaleString("id-ID")}`,
          `Profit kotor: Rp ${payload.grossProfit.toLocaleString("id-ID")}`,
          payload.location === "KAJEN" ? `Bagi hasil: Kajen Rp ${split.kajenShare.toLocaleString("id-ID")} / Wiradesa Rp ${split.wiradesaShare.toLocaleString("id-ID")}` : "",
          `Pembayaran: ${payload.paymentMethod}`,
          `Pembeli: ${payload.buyerName || "-"}`,
          `WA pembeli: ${payload.buyerPhone || "-"}`,
          `Alamat: ${payload.buyerAddress || "-"}`
        ].filter(Boolean).join("\n"),
        customerPhone: payload.buyerPhone,
        customerMessage: buildCustomerThanksMessage(`${publicUrl}/nota/${payload.saleId}`, payload.location, !payload.unit.includes("tanpa laptop"))
      })
    });
  } catch {
    // Notifikasi n8n tidak boleh menggagalkan transaksi kasir.
  }
}

export async function createSaleAction(formData: FormData) {
  const currentUser = requireRole(["admin", "teknisi", "sales"]);
  const standalone = text(formData, "saleMode") === "STANDALONE";
  const errorPath = standalone ? "/sales/non-laptop" : "/sales";

  const validation = z.object({
    unitId: entityId.optional().or(z.literal("")),
    soldPrice: nonNegativeInteger,
    dpAmount: nonNegativeInteger.optional().or(z.literal("")),
    paymentMethod: requiredText(40),
    buyerName: optionalText(120),
    buyerPhone: optionalText(30),
    buyerAddress: optionalText(500),
    notes: optionalText(1000)
  }).safeParse(formValues(formData));
  if (!validation.success) redirect(`${errorPath}?error=invalid-input`);

  const unitId = text(formData, "unitId");
  const soldPrice = numberValue(formData, "soldPrice");
  const dpAmountInput = numberValue(formData, "dpAmount");
  const paymentMethod = text(formData, "paymentMethod") || "Cash";
  const buyerName = text(formData, "buyerName");
  const buyerPhone = text(formData, "buyerPhone");
  const buyerAddress = text(formData, "buyerAddress");
  const notes = text(formData, "notes");
  const warrantySoftware = warrantyText(formData, "warrantySoftware", 3, "bulan");
  const warrantyHardware = standalone ? "Tidak ada" : warrantyText(formData, "warrantyHardware", 3, "minggu");
  const itemNames = textArray(formData, "itemName");
  const itemCategories = textArray(formData, "itemCategory");
  const itemQty = numberArray(formData, "itemQty");
  const itemPrices = numberArray(formData, "itemPrice");
  const itemCosts = numberArray(formData, "itemCost");
  const selectedLicenseType = licenseTypeValue(text(formData, "licenseType"));
  const licenseVersionInput = text(formData, "licenseVersion");
  const licenseDurationType = licenseDurationValue(text(formData, "licenseDurationType"));
  const licenseValidUntil = dateValue(text(formData, "licenseValidUntil"));
  const licenseProductKey = text(formData, "licenseProductKey");

  if ((!standalone && !unitId) || (!standalone && soldPrice <= 0)) {
    redirect(`${errorPath}?error=data-kurang`);
  }

  const unit = !standalone && unitId ? await prisma.unit.findUnique({
    where: { id: unitId },
    include: {
      qcHarian: {
        orderBy: { tanggal: "desc" },
        take: 1,
        select: { masihLolos: true, windowsVersion: true, tanggal: true }
      }
    }
  }) : null;
  if (!standalone && !unit) {
    redirect(`${errorPath}?error=unit-tidak-ditemukan`);
  }

  if (unit) {
    const existingActiveSale = await prisma.sale.findFirst({
      where: { unitId: unit.id, voidedAt: null },
      select: { id: true }
    });
    if (existingActiveSale) {
      redirect(`/sales/${existingActiveSale.id}/receipt?duplicate=1`);
    }
  }
  const requestedLocation = text(formData, "location");
  const location: SaleLocation = unit?.stockLocation ?? (requestedLocation === "KAJEN" ? "KAJEN" : "WIRADESA");

  const latestDailyQc = unit?.qcHarian[0];
  if (!standalone && !latestDailyQc) {
    redirect(`${errorPath}?error=qc-harian-belum-diisi`);
  }

  if (latestDailyQc && latestDailyQc.masihLolos === "TIDAK_LOLOS") {
    redirect(`${errorPath}?error=qc-harian-belum-lolos`);
  }

  if (latestDailyQc && !isQcFresh(latestDailyQc.tanggal)) {
    redirect(`${errorPath}?error=qc-harian-kadaluarsa`);
  }

  const items = [
    ...(unit ? [{
      name: `Laptop ${unit.model}`,
      category: "LAPTOP",
      qty: 1,
      unitPrice: soldPrice,
      unitCost: unit.hargaModal
    }] : []),
    ...itemNames.map((name, index) => ({
      name,
      category: itemCategories[index] || "BONUS",
      qty: Math.max(0, itemQty[index] || 0),
      unitPrice: Math.max(0, itemPrices[index] || 0),
      unitCost: Math.max(0, itemCosts[index] || 0)
    }))
  ].filter((item) => item.name && item.qty > 0);
  const licenseItems = items.filter((item) => item.category !== "LAPTOP" && inferLicenseType(item.name, item.category));

  const subtotal = items.reduce((sum, item) => sum + item.qty * item.unitPrice, 0);
  if (standalone && (items.length === 0 || subtotal <= 0)) {
    redirect(`${errorPath}?error=item-wajib`);
  }
  const dpAmount = Math.min(Math.max(0, dpAmountInput), subtotal);
  const totalCost = items.reduce((sum, item) => sum + item.qty * item.unitCost, 0);
  const bundleHandlingCost = hasBundledBagAndMouse(items) ? 50000 : 0;
  const grossProfit = subtotal - totalCost - bundleHandlingCost;
  let saleId = "";
  const invoice = invoiceNumber();

  try {
    await prisma.$transaction(async (tx) => {
      const sale = await tx.sale.create({
        data: {
          unitId: unit?.id ?? null,
          invoiceNumber: invoice,
          location,
          soldPrice: subtotal,
          costPrice: totalCost + bundleHandlingCost,
          subtotal,
          dpAmount,
          grossProfit,
          paymentMethod,
          buyerName: buyerName || null,
          buyerPhone: buyerPhone || null,
          buyerAddress: buyerAddress || null,
          warrantySoftware,
          warrantyHardware,
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

      if (licenseItems.length > 0) {
        const dbUser = await tx.user.findFirst({
          where: { username: currentUser.username },
          select: { id: true }
        });

        await tx.licenseRecord.createMany({
          data: licenseItems.flatMap((item) => {
            const inferredType = inferLicenseType(item.name, item.category) ?? "OTHER";
            const type = selectedLicenseType ?? inferredType;
            const version = licenseVersionInput || inferLicenseVersion(item.name, type);
            const name = licenseDisplayName(type, version);

            return Array.from({ length: item.qty }, () => ({
              name,
              licenseType: type,
              version,
              productKey: licenseProductKey || null,
              durationType: licenseDurationType,
              purchaseDate: new Date(),
              validUntil: licenseDurationType === "LIFETIME" ? null : licenseValidUntil,
              status: "ASSIGNED" as const,
              buyerName: buyerName || null,
              buyerPhone: buyerPhone || null,
              unitId: unit?.id ?? null,
              saleId: sale.id,
              laptopSeries: unit ? `${unit.nomorUnit} - ${unit.model}` : null,
              sourceItemName: item.name,
              sourceItemCategory: item.category,
              salePrice: item.unitPrice,
              costPrice: item.unitCost,
              notes: notes || null,
              createdById: dbUser?.id ?? null
            }));
          })
        });
      }

      if (unit) {
        await tx.unit.update({
          where: { id: unit.id },
          data: { soldAt: new Date() }
        });
      }
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002" && unit) {
      const activeSale = await prisma.sale.findFirst({
        where: { unitId: unit.id, voidedAt: null },
        select: { id: true }
      });
      if (activeSale) redirect(`/sales/${activeSale.id}/receipt?duplicate=1`);
    }
    redirect(`${errorPath}?error=tabel-penjualan-belum-migrasi`);
  }

  await notifySaleToN8n({
    saleId,
    invoiceNumber: invoice,
    unit: unit ? `Unit ${unit.nomorUnit} - ${unit.model}` : "Lisensi / software tanpa laptop",
    location,
    subtotal,
    grossProfit,
    paymentMethod,
    buyerName,
    buyerPhone,
    buyerAddress
  });

  revalidatePath("/sales");
  revalidatePath("/licenses");
  revalidatePath("/");
  if (unit) revalidatePath(`/unit/${unit.id}`);
  redirect(`/sales/${saleId}/receipt`);
}

export async function voidSaleAction(saleId: string, formData: FormData) {
  requireRole(["admin"]);
  if (!entityId.safeParse(saleId).success) redirect("/sales?error=invalid-input");
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

    if (sale.unitId) {
      const otherActiveSale = await tx.sale.findFirst({
        where: { unitId: sale.unitId, voidedAt: null, NOT: { id: saleId } },
        select: { id: true }
      });
      if (!otherActiveSale) {
        await tx.unit.update({ where: { id: sale.unitId }, data: { soldAt: null } });
      }
    }
  });

  revalidatePath("/sales");
  revalidatePath("/");
  if (sale.unitId) revalidatePath(`/unit/${sale.unitId}`);
  revalidatePath(`/sales/${saleId}/receipt`);
  redirect("/sales?voided=1");
}

export async function restoreSaleAction(saleId: string) {
  requireRole(["admin"]);
  if (!entityId.safeParse(saleId).success) redirect("/sales?error=invalid-input");

  const sale = await prisma.sale.findUnique({ where: { id: saleId } });
  if (!sale) {
    redirect("/sales?error=transaksi-tidak-ditemukan");
  }

  if (!sale.voidedAt) {
    redirect("/sales?error=transaksi-masih-aktif");
  }

  const activeSaleForUnit = sale.unitId ? await prisma.sale.findFirst({
    where: {
      unitId: sale.unitId,
      voidedAt: null,
      NOT: { id: saleId }
    },
    select: { id: true }
  }) : null;

  if (activeSaleForUnit) {
    redirect("/sales?error=unit-sudah-terjual-lagi");
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.sale.update({
        where: { id: saleId },
        data: {
          voidedAt: null,
          voidReason: null
        }
      });

      if (sale.unitId) {
        await tx.unit.update({ where: { id: sale.unitId }, data: { soldAt: sale.soldAt } });
      }
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      redirect("/sales?error=unit-sudah-terjual-lagi");
    }
    throw error;
  }

  revalidatePath("/sales");
  revalidatePath("/");
  if (sale.unitId) revalidatePath(`/unit/${sale.unitId}`);
  revalidatePath(`/sales/${saleId}/receipt`);
  redirect("/sales?restored=1");
}
