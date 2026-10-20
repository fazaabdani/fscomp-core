import { jakartaDateKey } from "./inventory";
import { prisma } from "./prisma";
import { paymentStatus } from "./sale-payments";

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
        items: { orderBy: { createdAt: "asc" } },
        payments: { orderBy: [{ paidAt: "asc" }, { createdAt: "asc" }], include: { createdBy: { select: { name: true } } } },
        lastEditedBy: { select: { name: true } }
      }
    });

    if (!sale) return null;

    return {
      id: sale.id,
      invoiceNumber: sale.invoiceNumber,
      soldAt: jakartaDateKey(sale.soldAt),
      soldAtDisplay: new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta" }).format(sale.soldAt),
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
      remainingPayment: paymentStatus({ paymentMethod: sale.paymentMethod, subtotal: sale.subtotal, dpAmount: sale.dpAmount, paymentCount: sale.payments.length }).remaining,
      costPrice: sale.costPrice,
      grossProfit: sale.grossProfit,
      packageMode: sale.packageMode,
      marketplaceName: sale.marketplaceName ?? "",
      marketplaceFee: sale.marketplaceFee,
      payments: sale.payments.map((payment) => ({
        id: payment.id,
        amount: payment.amount,
        method: payment.method,
        paidAt: jakartaDateKey(payment.paidAt),
        note: payment.note ?? "",
        byName: payment.createdBy?.name ?? ""
      })),
      voidedAt: sale.voidedAt ? jakartaDateKey(sale.voidedAt) : "",
      voidReason: sale.voidReason ?? "",
      notes: sale.notes ?? "-",
      lastEditedByName: sale.lastEditedBy?.name ?? "",
      lastEditedAt: sale.lastEditedAt ? jakartaDateKey(sale.lastEditedAt) : "",
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
        lineTotal: item.lineTotal,
        serialNumber: item.serialNumber ?? "",
        warrantyNote: item.warrantyNote ?? ""
      }))
    };
  } catch {
    return null;
  }
}
