import { NextResponse } from "next/server";
import { csvCell } from "@/lib/csv";
import { jakartaDateKey } from "@/lib/inventory";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";

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

function dateFilter(from: string | null, to: string | null) {
  const soldAt: { gte?: Date; lte?: Date } = {};
  if (from) soldAt.gte = new Date(`${from}T00:00:00+07:00`);
  if (to) soldAt.lte = new Date(`${to}T23:59:59.999+07:00`);
  return Object.keys(soldAt).length > 0 ? { soldAt } : {};
}

export async function GET(request: Request) {
  await requireRole(["admin"]);
  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const sales = await prisma.sale.findMany({
    where: { voidedAt: null, ...dateFilter(from, to) },
    include: { unit: true, items: true },
    orderBy: { soldAt: "desc" }
  });

  const headers = [
    "Tanggal",
    "Invoice",
    "Lokasi",
    "Unit",
    "Model",
    "Metode",
    "Nama Pembeli",
    "WA Pembeli",
    "Alamat Pembeli",
    "Jumlah Item",
    "Omzet",
    "Modal",
    "Profit Kotor",
    "Bagian Wiradesa",
    "Bagian Kajen"
  ];

  const rows = sales.map((sale) => {
    const split = saleProfitSplit(sale.location, sale.grossProfit);
    return [
      jakartaDateKey(sale.soldAt),
      sale.invoiceNumber,
      sale.location,
      sale.unit?.nomorUnit ?? "-",
      sale.unit?.model ?? "Non-laptop",
      sale.paymentMethod,
      sale.buyerName ?? "",
      sale.buyerPhone ?? "",
      sale.buyerAddress ?? "",
      sale.items.reduce((sum, item) => sum + item.qty, 0),
      sale.soldPrice,
      sale.costPrice,
      sale.grossProfit,
      split.wiradesaShare,
      split.kajenShare
    ];
  });

  const csv = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="fscomp-laporan-keuangan.csv"`
    }
  });
}
