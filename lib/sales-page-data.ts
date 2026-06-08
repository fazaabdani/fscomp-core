import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { isQcFresh } from "./qc-due";
import { displayUnitNumber } from "./unit-number";

export async function getSalesPageData() {
  try {
    const readyCandidates = await prisma.unit.findMany({
      where: {
        soldAt: null,
        statusObservasi: { in: ["VERIFIED", "VERIFIED_WITH_NOTES"] }
      },
      include: {
        qcHarian: {
          orderBy: { tanggal: "desc" },
          take: 1,
          select: { masihLolos: true, tanggal: true }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 80
    });

    const readyUnits = readyCandidates.filter((unit) => {
      const latestDaily = unit.qcHarian[0];
      return Boolean(latestDaily && latestDaily.masihLolos !== "TIDAK_LOLOS" && isQcFresh(latestDaily.tanggal));
    });

    let sales: Array<Prisma.SaleGetPayload<{ include: { unit: true; items: true } }>> = [];
    let salesReady = true;

    try {
      sales = await prisma.sale.findMany({
        include: { unit: true, items: true },
        orderBy: { soldAt: "desc" },
        take: 200
      });
    } catch {
      salesReady = false;
    }

    const blockedByDailyQc = readyCandidates.length - readyUnits.length;
    const activeSales = sales.filter((sale) => !sale.voidedAt);
    const totalOmzet = activeSales.reduce((sum, sale) => sum + sale.soldPrice, 0);
    const totalProfit = activeSales.reduce((sum, sale) => sum + sale.grossProfit, 0);

    return {
      readyUnits: readyUnits.map((unit) => ({
        id: unit.id,
        nomorUnit: displayUnitNumber(unit.nomorUnit),
        model: unit.model,
        processor: unit.processor,
        ram: unit.ram,
        ssd: unit.ssd,
        hargaModal: unit.hargaModal,
        hargaJualRekomendasi: unit.hargaJualRekomendasi,
        stockLocation: unit.stockLocation === "WIRADESA" ? "Wiradesa" : "Kajen",
        statusObservasi: unit.statusObservasi.replaceAll("_", " ")
      })),
      sales: sales.map((sale) => ({
        id: sale.id,
        unitId: sale.unitId,
        nomorUnit: displayUnitNumber(sale.unit.nomorUnit),
        model: sale.unit.model,
        invoiceNumber: sale.invoiceNumber,
        location: sale.location === "WIRADESA" ? "Wiradesa" : "Kajen",
        soldPrice: sale.soldPrice,
        costPrice: sale.costPrice,
        grossProfit: sale.grossProfit,
        paymentMethod: sale.paymentMethod,
        buyerName: sale.buyerName ?? "-",
        itemCount: sale.items.reduce((sum, item) => sum + item.qty, 0),
        soldAt: sale.soldAt.toISOString().slice(0, 10),
        voidedAt: sale.voidedAt?.toISOString().slice(0, 10) ?? "",
        voidReason: sale.voidReason ?? "",
        notes: sale.notes ?? ""
      })),
      stats: {
        totalOmzet,
        totalProfit,
        readyCount: readyUnits.length,
        soldCount: activeSales.length
      },
      salesReady,
      blockedByDailyQc
    };
  } catch {
    return {
      readyUnits: [],
      sales: [],
      stats: {
        totalOmzet: 0,
        totalProfit: 0,
        readyCount: 0,
        soldCount: 0
      },
      salesReady: false,
      blockedByDailyQc: 0
    };
  }
}
