import { jakartaDateKey } from "./inventory";
import { prisma } from "./prisma";
import { saleProfitSplit } from "./profit-split";
import { displayUnitNumber } from "./unit-number";

// Aturan bagi hasil (60% Wiradesa / 40% Kajen untuk penjualan di Kajen) ada di lib/profit-split.ts.
export { saleProfitSplit };

type FinanceFilters = {
  from?: string;
  to?: string;
  // "laptop" = penjualan unit laptop, "nonlaptop" = PC, monitor, aksesoris, lisensi, dst. Kosong = keduanya.
  jenis?: string;
};

type SaleStats = {
  totalOmzet: number;
  totalModal: number;
  totalProfit: number;
  totalWiradesaShare: number;
  totalKajenShare: number;
  totalTransaksi: number;
};

const EMPTY_STATS: SaleStats = { totalOmzet: 0, totalModal: 0, totalProfit: 0, totalWiradesaShare: 0, totalKajenShare: 0, totalTransaksi: 0 };

function statsOf(sales: { soldPrice: number; costPrice: number; grossProfit: number; location: "WIRADESA" | "KAJEN" }[]): SaleStats {
  return {
    totalOmzet: sales.reduce((sum, sale) => sum + sale.soldPrice, 0),
    totalModal: sales.reduce((sum, sale) => sum + sale.costPrice, 0),
    totalProfit: sales.reduce((sum, sale) => sum + sale.grossProfit, 0),
    totalWiradesaShare: sales.reduce((sum, sale) => sum + saleProfitSplit(sale.location, sale.grossProfit).wiradesaShare, 0),
    totalKajenShare: sales.reduce((sum, sale) => sum + saleProfitSplit(sale.location, sale.grossProfit).kajenShare, 0),
    totalTransaksi: sales.length
  };
}

function dateFilter(filters: FinanceFilters) {
  const soldAt: { gte?: Date; lte?: Date } = {};
  if (filters.from) soldAt.gte = new Date(`${filters.from}T00:00:00+07:00`);
  if (filters.to) soldAt.lte = new Date(`${filters.to}T23:59:59.999+07:00`);
  return Object.keys(soldAt).length > 0 ? { soldAt } : {};
}

export async function getFinancePageData(filters: FinanceFilters = {}) {
  try {
    const sales = await prisma.sale.findMany({
      where: { voidedAt: null, ...dateFilter(filters) },
      include: { unit: true, items: true },
      orderBy: { soldAt: "desc" },
      take: 120
    });

    const laptopSales = sales.filter((sale) => sale.unitId !== null);
    const nonLaptopSales = sales.filter((sale) => sale.unitId === null);
    const shown = filters.jenis === "laptop" ? laptopSales : filters.jenis === "nonlaptop" ? nonLaptopSales : sales;

    return {
      stats: statsOf(shown),
      laptopStats: statsOf(laptopSales),
      nonLaptopStats: statsOf(nonLaptopSales),
      sales: shown.map((sale) => {
        const split = saleProfitSplit(sale.location, sale.grossProfit);
        return {
          id: sale.id,
          kind: sale.unitId ? "Laptop" : "Non-laptop",
          invoiceNumber: sale.invoiceNumber,
          soldAt: jakartaDateKey(sale.soldAt),
          location: sale.location === "WIRADESA" ? "Wiradesa" : "Kajen",
          unitNomor: sale.unit ? displayUnitNumber(sale.unit.nomorUnit) : "-",
          model: sale.unit?.model ?? (sale.items[0]?.name ? `${sale.items[0].name}${sale.items.length > 1 ? ` +${sale.items.length - 1} lainnya` : ""}` : "Non-laptop"),
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
      stats: EMPTY_STATS,
      laptopStats: EMPTY_STATS,
      nonLaptopStats: EMPTY_STATS,
      sales: []
    };
  }
}
