import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function csvCell(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const batch = await prisma.batchPSI.findUnique({
    where: { id: params.id },
    include: { units: { orderBy: { nomorUnit: "asc" } } }
  });

  if (!batch) {
    return NextResponse.json({ error: "Batch tidak ditemukan" }, { status: 404 });
  }

  const headers = [
    "Nomor Unit",
    "Merk/Supplier",
    "Model",
    "Processor",
    "RAM",
    "SSD",
    "Seri SSD",
    "Ukuran LCD",
    "Resolusi",
    "Touchscreen",
    "Battery Health",
    "SSD Health",
    "Status QC",
    "Harga Jual"
  ];

  const rows = batch.units.map((unit) => [
    unit.nomorUnit,
    unit.supplier,
    unit.model,
    unit.processor,
    unit.ram,
    unit.ssd,
    unit.ssdSerial ?? "",
    unit.lcdSize ?? "",
    unit.lcdResolution ?? "",
    unit.isTouchscreen ? "Ya" : "Tidak",
    unit.batteryHealth ?? "",
    unit.ssdHealth ?? "",
    unit.statusObservasi.replaceAll("_", " "),
    unit.hargaJualRekomendasi
  ]);

  const csv = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
  const fileName = `${batch.nomorBatch.replaceAll(" ", "-")}-export-katalog.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`
    }
  });
}
