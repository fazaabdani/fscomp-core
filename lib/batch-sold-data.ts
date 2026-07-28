import { prisma } from "./prisma";
import { displayUnitNumber } from "./unit-number";

export async function getBatchSoldUnits(batchId: string) {
  try {
    const batch = await prisma.batchPSI.findUnique({
      where: { id: batchId },
      include: {
        units: {
          where: { soldAt: { not: null } },
          orderBy: { soldAt: "desc" },
          include: {
            sales: { orderBy: { soldAt: "desc" } }
          }
        }
      }
    });

    if (!batch) return null;

    const soldUnits = batch.units.map((unit) => {
      const sale = unit.sales.find((item) => !item.voidedAt) ?? unit.sales[0] ?? null;

      return {
        id: unit.id,
        nomorUnit: displayUnitNumber(unit.nomorUnit),
        model: unit.model,
        processor: unit.processor,
        ram: unit.ram,
        ssd: unit.ssd,
        hargaModal: unit.hargaModal,
        soldAt: unit.soldAt?.toISOString().slice(0, 10) ?? "-",
        saleId: sale?.id ?? null,
        invoiceNumber: sale?.invoiceNumber ?? "-",
        soldPrice: sale?.soldPrice ?? unit.hargaJualRekomendasi,
        grossProfit: sale ? sale.grossProfit : unit.hargaJualRekomendasi - unit.hargaModal,
        location: sale?.location ?? unit.stockLocation,
        buyerName: sale?.buyerName ?? "-",
        buyerPhone: sale?.buyerPhone ?? "-",
        voided: Boolean(sale?.voidedAt)
      };
    });

    const totalOmzet = soldUnits.reduce((sum, unit) => sum + (unit.voided ? 0 : unit.soldPrice), 0);
    const totalProfit = soldUnits.reduce((sum, unit) => sum + (unit.voided ? 0 : unit.grossProfit), 0);

    return {
      id: batch.id,
      nomorBatch: batch.nomorBatch,
      supplier: batch.supplier,
      totalUnitMasuk: batch.jumlahLaptopDatang ?? null,
      totalTerjual: soldUnits.filter((unit) => !unit.voided).length,
      totalOmzet,
      totalProfit,
      units: soldUnits
    };
  } catch {
    return null;
  }
}
