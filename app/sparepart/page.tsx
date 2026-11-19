import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { SPAREPART_CATEGORIES, sparepartCategoryLabel, stockState } from "@/lib/sparepart";
import "../kelola-sparepart/sparepart.css";
import { SparepartBrowser, type PublicSparepart } from "./SparepartBrowser";

// Selalu membaca database langsung, jadi link ini otomatis mengikuti stok terbaru.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Stok Sparepart Laptop — FS Comp",
  description: "Daftar sparepart laptop FS Comp (LED, baterai, keyboard, charger) yang selalu diperbarui.",
  robots: { index: false, follow: false }
};

export default async function SparepartPublicPage() {
  const rows = await prisma.sparepartItem.findMany({
    where: { shared: true },
    orderBy: [{ category: "asc" }, { name: "asc" }]
  });

  const items: PublicSparepart[] = rows.map((r) => ({
    id: r.id,
    category: r.category,
    categoryLabel: sparepartCategoryLabel(r.category),
    name: r.name,
    tags: [r.sizeInch ? `${r.sizeInch}"` : null, r.pins, r.resolution, r.thickness, r.brand, r.spec].filter(Boolean) as string[],
    compat: r.compat,
    qty: r.qty,
    state: stockState(r.qty, r.minQty),
    salePrice: r.salePrice
  }));

  const categories = SPAREPART_CATEGORIES.map((c) => ({ id: c.id as string, label: c.label as string, count: items.filter((i) => i.category === c.id).length })).filter((c) => c.count > 0);
  const stamp = new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(new Date());

  return (
    <section className="pageStack spPage" style={{ maxWidth: 1100, margin: "0 auto", padding: "16px" }}>
      <div className="spPubHero">
        <h1>Stok Sparepart Laptop</h1>
        <p>LED, baterai, keyboard, charger, dan lainnya. Daftar ini selalu terbaru. Cari dengan ketik ukuran, pin, atau tipe laptop.</p>
      </div>
      <SparepartBrowser items={items} categories={categories} />
      <p className="spStamp">Diperbarui {stamp} WIB. Harga dan ketersediaan dapat berubah, konfirmasi ke admin sebelum membeli.</p>
    </section>
  );
}
