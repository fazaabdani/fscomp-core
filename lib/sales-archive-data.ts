import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { displayUnitNumber } from "./unit-number";

const PAGE_SIZE = 40;

export type SalesArchiveFilters = {
  q?: string;
  from?: string;
  to?: string;
  location?: string;
  status?: string;
  page?: string;
};

function validDate(value?: string) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "";
}

export async function getSalesArchiveData(filters: SalesArchiveFilters) {
  const q = (filters.q ?? "").trim();
  const from = validDate(filters.from);
  const to = validDate(filters.to);
  const page = Math.max(1, Number.parseInt(filters.page ?? "1", 10) || 1);
  const where: Prisma.SaleWhereInput = {};

  if (q) {
    where.OR = [
      { invoiceNumber: { contains: q, mode: "insensitive" } },
      { buyerName: { contains: q, mode: "insensitive" } },
      { buyerPhone: { contains: q, mode: "insensitive" } },
      { unit: { nomorUnit: { contains: q, mode: "insensitive" } } },
      { unit: { model: { contains: q, mode: "insensitive" } } }
    ];
  }

  if (filters.location === "WIRADESA" || filters.location === "KAJEN") {
    where.location = filters.location;
  }

  if (filters.status === "active") where.voidedAt = null;
  if (filters.status === "voided") where.voidedAt = { not: null };

  if (from || to) {
    where.soldAt = {
      ...(from ? { gte: new Date(`${from}T00:00:00+07:00`) } : {}),
      ...(to ? { lte: new Date(`${to}T23:59:59.999+07:00`) } : {})
    };
  }

  const activeWhere: Prisma.SaleWhereInput = filters.status === "voided"
    ? { id: "__no_active_sales__" }
    : { ...where, voidedAt: null };
  const [total, activeSummary] = await prisma.$transaction([
    prisma.sale.count({ where }),
    prisma.sale.aggregate({
      where: activeWhere,
      _count: { _all: true },
      _sum: { soldPrice: true, costPrice: true, grossProfit: true }
    })
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const sales = await prisma.sale.findMany({
    where,
    include: {
      unit: {
        select: {
          nomorUnit: true,
          model: true,
          processor: true,
          ram: true,
          ssd: true
        }
      },
      items: {
        select: {
          category: true,
          qty: true,
          unitCost: true
        }
      }
    },
    orderBy: [{ soldAt: "desc" }, { createdAt: "desc" }],
    skip: (safePage - 1) * PAGE_SIZE,
    take: PAGE_SIZE
  });

  return {
    rows: sales.map((sale) => {
      const laptopItem = sale.items.find((item) => item.category === "LAPTOP");
      return {
        id: sale.id,
        invoiceNumber: sale.invoiceNumber,
        soldAt: sale.soldAt.toLocaleString("id-ID", {
          timeZone: "Asia/Jakarta",
          day: "2-digit",
          month: "short",
          year: "numeric"
        }),
        nomorUnit: displayUnitNumber(sale.unit.nomorUnit),
        model: sale.unit.model,
        specification: `${sale.unit.processor} / ${sale.unit.ram} / ${sale.unit.ssd}`,
        buyerName: sale.buyerName ?? "-",
        location: sale.location === "WIRADESA" ? "Wiradesa" : "Kajen",
        paymentMethod: sale.paymentMethod,
        laptopCost: laptopItem ? laptopItem.unitCost * laptopItem.qty : sale.costPrice,
        laptopCostSource: laptopItem ? "Snapshot item laptop" : "Fallback total modal lama",
        totalCost: sale.costPrice,
        soldPrice: sale.soldPrice,
        grossProfit: sale.grossProfit,
        voidedAt: sale.voidedAt
          ? sale.voidedAt.toLocaleString("id-ID", { timeZone: "Asia/Jakarta", day: "2-digit", month: "short", year: "numeric" })
          : ""
      };
    }),
    summary: {
      activeCount: activeSummary._count._all,
      totalCost: activeSummary._sum.costPrice ?? 0,
      soldPrice: activeSummary._sum.soldPrice ?? 0,
      grossProfit: activeSummary._sum.grossProfit ?? 0
    },
    pagination: {
      page: safePage,
      pageSize: PAGE_SIZE,
      total,
      totalPages
    }
  };
}
