import { prisma } from "./prisma";

const storeByLocation = {
  WIRADESA: {
    name: "FS Comp",
    tagline: "Laptop second berkualitas, QC jelas, garansi tertulis.",
    branch: "FS Comp / FS Media Comp Wiradesa",
    address: "Jl. Wiradesa No.1 RT 22 RW 05, Desa Wiradesa, Kecamatan Wiradesa, Kabupaten Pekalongan, Jawa Tengah 51152",
    phone: "0816660056"
  },
  KAJEN: {
    name: "FS.ID",
    tagline: "Laptop second berkualitas, QC jelas, garansi tertulis.",
    branch: "FS.ID Kajen",
    address: "Jalan Diponegoro No. 204B (Utara Rumah Dinas Wakil Bupati), Kec. Kajen, Kab. Pekalongan Jawa Tengah",
    phone: "0851-8266-1773"
  }
} as const;

export async function getSaleReceipt(id: string) {
  try {
    const sale = await prisma.sale.findUnique({
      where: { id },
      include: {
        unit: true,
        items: { orderBy: { createdAt: "asc" } }
      }
    });

    if (!sale) return null;

    return {
      id: sale.id,
      invoiceNumber: sale.invoiceNumber,
      soldAt: sale.soldAt.toISOString().slice(0, 10),
      location: sale.location === "WIRADESA" ? "Wiradesa" : "Kajen",
      store: storeByLocation[sale.location],
      paymentMethod: sale.paymentMethod,
      buyerName: sale.buyerName ?? "-",
      buyerPhone: sale.buyerPhone ?? "-",
      buyerAddress: sale.buyerAddress ?? "-",
      warrantySoftware: sale.warrantySoftware,
      warrantyHardware: sale.warrantyHardware,
      subtotal: sale.subtotal,
      dpAmount: sale.dpAmount,
      remainingPayment: Math.max(0, sale.subtotal - sale.dpAmount),
      costPrice: sale.costPrice,
      grossProfit: sale.grossProfit,
      voidedAt: sale.voidedAt?.toISOString().slice(0, 10) ?? "",
      voidReason: sale.voidReason ?? "",
      notes: sale.notes ?? "-",
      unit: sale.unit ? {
        nomorUnit: sale.unit.nomorUnit,
        model: sale.unit.model,
        processor: sale.unit.processor,
        ram: sale.unit.ram,
        ssd: sale.unit.ssd
      } : null,
      items: sale.items.map((item) => ({
        id: item.id,
        name: item.name,
        category: item.category,
        qty: item.qty,
        unitPrice: item.unitPrice,
        lineTotal: item.lineTotal
      }))
    };
  } catch {
    return null;
  }
}
