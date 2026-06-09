import { prisma } from "./prisma";
import { displayUnitNumber } from "./unit-number";

function saleProfitSplit(location: string, grossProfit: number) {
  if (location !== "KAJEN") {
    return {
      wiradesaShare: grossProfit,
      kajenShare: 0
    };
  }

  const wiradesaShare = Math.round(grossProfit * 0.6);
  return {
    wiradesaShare,
    kajenShare: grossProfit - wiradesaShare
  };
}

export async function getFinancePageData() {
  try {
    const sales = await prisma.sale.findMany({
      where: { voidedAt: null },
      include: { unit: true, items: true },
      orderBy: { soldAt: "desc" },
      take: 120
    });

    const totalOmzet = sales.reduce((sum, sale) => sum + sale.soldPrice, 0);
    const totalModal = sales.reduce((sum, sale) => sum + sale.costPrice, 0);
    const totalProfit = sales.reduce((sum, sale) => sum + sale.grossProfit, 0);
    const totalWiradesaShare = sales.reduce((sum, sale) => sum + saleProfitSplit(sale.location, sale.grossProfit).wiradesaShare, 0);
    const totalKajenShare = sales.reduce((sum, sale) => sum + saleProfitSplit(sale.location, sale.grossProfit).kajenShare, 0);

    return {
      stats: {
        totalOmzet,
        totalModal,
        totalProfit,
        totalWiradesaShare,
        totalKajenShare,
        totalTransaksi: sales.length
      },
      sales: sales.map((sale) => {
        const split = saleProfitSplit(sale.location, sale.grossProfit);
        return {
          id: sale.id,
          invoiceNumber: sale.invoiceNumber,
          soldAt: sale.soldAt.toISOString().slice(0, 10),
          location: sale.location === "WIRADESA" ? "Wiradesa" : "Kajen",
          unitNomor: displayUnitNumber(sale.unit.nomorUnit),
          model: sale.unit.model,
          soldPrice: sale.soldPrice,
          costPrice: sale.costPrice,
          grossProfit: sale.grossProfit,
          wiradesaShare: split.wiradesaShare,
          kajenShare: split.kajenShare,
          itemCount: sale.items.reduce((sum, item) => sum + item.qty, 0),
          paymentMethod: sale.paymentMethod
        };
      })
    };
  } catch {
    return {
      stats: {
        totalOmzet: 0,
        totalModal: 0,
        totalProfit: 0,
        totalWiradesaShare: 0,
        totalKajenShare: 0,
        totalTransaksi: 0
      },
      sales: []
    };
  }
}
