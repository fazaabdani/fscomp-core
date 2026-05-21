import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";

function csvCell(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

export async function GET() {
  requireRole(["admin"]);
  const sales = await prisma.sale.findMany({
    where: { voidedAt: null },
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
    "Profit Kotor"
  ];

  const rows = sales.map((sale) => [
    sale.soldAt.toISOString().slice(0, 10),
    sale.invoiceNumber,
    sale.location,
    sale.unit.nomorUnit,
    sale.unit.model,
    sale.paymentMethod,
    sale.buyerName ?? "",
    sale.buyerPhone ?? "",
    sale.buyerAddress ?? "",
    sale.items.reduce((sum, item) => sum + item.qty, 0),
    sale.soldPrice,
    sale.costPrice,
    sale.grossProfit
  ]);

  const csv = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="fscomp-laporan-keuangan.csv"`
    }
  });
}
