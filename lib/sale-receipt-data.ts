import { prisma } from "./prisma";

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
      unit: {
        nomorUnit: sale.unit.nomorUnit,
        model: sale.unit.model,
        processor: sale.unit.processor,
        ram: sale.unit.ram,
        ssd: sale.unit.ssd
      },
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
