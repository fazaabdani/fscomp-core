import { NextResponse } from "next/server";
import { getCatalogReadyUnits } from "@/lib/api";

export async function GET() {
  const rows = getCatalogReadyUnits().map((unit) => ({
    nomor_unit: unit.nomorUnit,
    model: unit.model,
    processor: unit.processor,
    ram: unit.ram,
    ssd: unit.ssd,
    harga_jual: unit.hargaJualRekomendasi,
    status_qc: unit.statusObservasi,
    battery_health: unit.batteryHealth,
    ssd_health: unit.ssdHealth,
    detail_url: `https://core.fscomp.id/unit/${unit.id}`
  }));

  return NextResponse.json({
    sheetName: "fscomp_core_catalog_ready",
    generatedAt: new Date().toISOString(),
    rows
  });
}
