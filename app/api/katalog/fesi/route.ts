import { NextResponse } from "next/server";
import { getCatalogPageData } from "@/lib/catalog-page-data";

export const dynamic = "force-dynamic";

// Endpoint PUBLIK untuk asisten Fesi di katalog. Hanya mengirim data yang memang sudah tampil di katalog
// (unit lolos QC, belum terjual) dalam bentuk ringkas: tanpa harga modal, nomor batch, atau data internal.
export async function GET() {
  const { wiradesaUnits, kajenUnits, connected } = await getCatalogPageData();
  const units = [...wiradesaUnits, ...kajenUnits].map((unit) => ({
    id: unit.id,
    nomorUnit: unit.nomorUnit,
    model: unit.model,
    processor: unit.processor,
    ram: unit.ram,
    ssd: unit.ssd,
    price: unit.hargaJualRekomendasi,
    lokasi: unit.stockLocation,
    image: unit.catalogImageUrl ?? null
  }));
  return NextResponse.json(
    { connected, units },
    { headers: { "cache-control": "public, s-maxage=60, stale-while-revalidate=120" } }
  );
}
