import Link from "next/link";
import { Boxes, Edit3, ExternalLink } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { canViewPrice } from "@/lib/auth";
import { formatRupiah } from "@/lib/api";
import { requireRole } from "@/lib/session";
import { SPAREPART_CATEGORIES, isSparepartCategory, sparepartCategoryLabel, stockState } from "@/lib/sparepart";
import { FlashNotice } from "../FlashNotice";
import { adjustSparepartAction, bulkImportSparepartAction, createSparepartAction } from "./actions";
import { CopyLinkButton } from "./CopyLinkButton";
import { SparepartFields } from "./SparepartForm";
import "./sparepart.css";

export const dynamic = "force-dynamic";

type SearchParams = { q?: string; k?: string; s?: string; ok?: string; error?: string; baru?: string; gabung?: string };

function href(params: { q?: string; k?: string; s?: string }) {
  const sp = new URLSearchParams();
  if (params.q) sp.set("q", params.q);
  if (params.k) sp.set("k", params.k);
  if (params.s) sp.set("s", params.s);
  const qs = sp.toString();
  return qs ? `/kelola-sparepart?${qs}` : "/kelola-sparepart";
}

export default async function KelolaSparepartPage({ searchParams }: { searchParams?: SearchParams }) {
  const user = await requireRole(["admin", "teknisi", "sales"]);
  const showCost = canViewPrice(user);
  const q = (searchParams?.q ?? "").trim();
  const k = searchParams?.k && isSparepartCategory(searchParams.k) ? searchParams.k : "";
  const s = searchParams?.s === "menipis" || searchParams?.s === "habis" ? searchParams.s : "";

  const all = await prisma.sparepartItem.findMany({ orderBy: [{ category: "asc" }, { name: "asc" }] });

  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const matchesText = (item: (typeof all)[number]) => {
    if (words.length === 0) return true;
    const hay = [item.name, item.brand, item.spec, item.sizeInch, item.pins, item.resolution, item.thickness, item.compat, item.location]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return words.every((w) => hay.includes(w));
  };
  const textMatched = all.filter(matchesText);
  const items = textMatched.filter((i) => {
    if (k && i.category !== k) return false;
    const state = stockState(i.qty, i.minQty);
    if (s === "habis") return state === "habis";
    if (s === "menipis") return state === "menipis";
    return true;
  });

  const totalPcs = all.reduce((sum, i) => sum + i.qty, 0);
  const lowCount = all.filter((i) => stockState(i.qty, i.minQty) === "menipis").length;
  const outCount = all.filter((i) => stockState(i.qty, i.minQty) === "habis").length;
  const stockValue = all.reduce((sum, i) => sum + i.qty * i.costPrice, 0);
  const countByCat = new Map<string, number>();
  for (const i of textMatched) countByCat.set(i.category, (countByCat.get(i.category) ?? 0) + 1);

  const ok = searchParams?.ok;
  const message =
    ok === "tambah" ? "Barang ditambahkan."
    : ok === "simpan" ? "Perubahan disimpan."
    : ok === "hapus" ? "Barang dihapus."
    : ok === "impor" ? `Impor selesai: ${searchParams?.baru ?? 0} barang baru, ${searchParams?.gabung ?? 0} digabung ke barang yang sudah ada.`
    : searchParams?.error === "nama" ? "Nama barang wajib diisi."
    : searchParams?.error === "kosong" ? "Tidak ada baris yang bisa dibaca. Isi minimal satu baris."
    : "";

  return (
    <section className="pageStack spPage">
      <div className="sectionTitle">
        <div>
          <p className="eyebrow">Operasional</p>
          <h1>Stok Sparepart</h1>
          <p className="bodyText">Satu baris satu jenis barang. Tekan + atau − saat barang masuk atau terpakai, stok dan riwayatnya langsung tercatat.</p>
        </div>
        <Boxes size={30} />
      </div>

      <FlashNotice message={message} tone={searchParams?.error ? "error" : "success"} queryKeys={["ok", "error", "baru", "gabung"]} />

      <div className="spStats">
        <div className="spStat"><span>Jenis barang</span><strong>{all.length}</strong></div>
        <div className="spStat"><span>Total stok (pcs)</span><strong>{totalPcs}</strong></div>
        <Link className="spStat warn" href={href({ q, k, s: "menipis" })}><span>Stok menipis</span><strong>{lowCount}</strong></Link>
        <Link className="spStat bad" href={href({ q, k, s: "habis" })}><span>Stok habis</span><strong>{outCount}</strong></Link>
        {showCost ? <div className="spStat"><span>Nilai modal</span><strong style={{ fontSize: 18 }}>{formatRupiah(stockValue)}</strong></div> : null}
      </div>

      <div className="spShare">
        <div style={{ flex: "1 1 220px" }}>
          <strong>Link berbagi (selalu terbaru)</strong>
          <div><code>core.fscomp.id/sparepart</code></div>
          <small style={{ color: "var(--muted)" }}>Siapa pun yang punya link bisa melihat stok dan harga jual. Harga modal tidak tampil.</small>
        </div>
        <CopyLinkButton path="/sparepart" />
        <Link className="secondaryButton" href="/sparepart" target="_blank"><ExternalLink size={15} /> Buka</Link>
      </div>

      <form className="spSearch" action="/kelola-sparepart" role="search">
        <input type="search" name="q" defaultValue={q} placeholder="Cari: 14 slim 30 pin, acer aspire, baterai..." aria-label="Cari sparepart" />
        {k ? <input type="hidden" name="k" value={k} /> : null}
        {s ? <input type="hidden" name="s" value={s} /> : null}
        <button className="primaryButton" type="submit">Cari</button>
        {q || k || s ? <Link className="secondaryButton" href="/kelola-sparepart">Reset</Link> : null}
      </form>

      <div className="spChips">
        <Link className={`spChip ${!k ? "on" : ""}`} href={href({ q, s })}>Semua <small>{textMatched.length}</small></Link>
        {SPAREPART_CATEGORIES.filter((c) => (countByCat.get(c.id) ?? 0) > 0 || k === c.id).map((c) => (
          <Link key={c.id} className={`spChip ${k === c.id ? "on" : ""}`} href={href({ q, k: c.id, s })}>{c.label} <small>{countByCat.get(c.id) ?? 0}</small></Link>
        ))}
        {s ? <Link className="spChip on" href={href({ q, k })}>Filter: {s} ×</Link> : null}
      </div>

      <section className="panel">
        {items.length === 0 ? (
          <div className="spEmpty">{all.length === 0 ? "Belum ada sparepart. Tambah satu barang atau tempel banyak sekaligus di bawah." : "Tidak ada barang yang cocok dengan pencarian ini."}</div>
        ) : (
          <div className="tableScroll">
            <table className="spTable">
              <thead>
                <tr><th>Barang</th><th>Stok</th><th>Harga</th><th>Rak</th><th /></tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const state = stockState(item.qty, item.minQty);
                  const tags = [item.sizeInch ? `${item.sizeInch}"` : null, item.pins, item.resolution, item.thickness, item.brand].filter(Boolean) as string[];
                  return (
                    <tr key={item.id} className={state === "habis" ? "out" : state === "menipis" ? "low" : ""}>
                      <td>
                        <div className="spName">{item.name}</div>
                        <div className="spMeta">
                          <span className="spTag">{sparepartCategoryLabel(item.category)}</span>
                          {tags.map((t) => <span className="spTag" key={t}>{t}</span>)}
                          {item.spec ? <span className="spTag">{item.spec}</span> : null}
                          {!item.shared ? <span className="spTag">tidak dibagikan</span> : null}
                        </div>
                        {item.compat ? <div className="spCompat">Cocok: {item.compat}</div> : null}
                      </td>
                      <td>
                        <div className="spStepper">
                          <form action={adjustSparepartAction.bind(null, item.id, -1, "Terpakai / keluar")}><button type="submit" aria-label={`Kurangi ${item.name}`}>−</button></form>
                          <span className={`spQty ${state === "habis" ? "out" : state === "menipis" ? "low" : ""}`}>{item.qty}</span>
                          <form action={adjustSparepartAction.bind(null, item.id, 1, "Barang masuk")}><button type="submit" aria-label={`Tambah ${item.name}`}>+</button></form>
                          <form action={adjustSparepartAction.bind(null, item.id, 5, "Barang masuk")}><button type="submit" aria-label={`Tambah 5 ${item.name}`} style={{ fontSize: 13 }}>+5</button></form>
                        </div>
                      </td>
                      <td>
                        {item.salePrice ? <strong>{formatRupiah(item.salePrice)}</strong> : <small>belum diisi</small>}
                        {showCost && item.costPrice > 0 ? <div><small>modal {formatRupiah(item.costPrice)}</small></div> : null}
                      </td>
                      <td><small>{item.location || "-"}</small></td>
                      <td><Link className="secondaryButton" href={`/kelola-sparepart/${item.id}`}><Edit3 size={15} /> Ubah</Link></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <details className="spFold">
        <summary>Tambah satu barang</summary>
        <div className="spFoldBody">
          <form className="spForm" action={createSparepartAction}>
            <SparepartFields showCost={showCost} defaultCategory={k || undefined} />
            <div><button className="primaryButton" type="submit">Simpan barang</button></div>
          </form>
        </div>
      </details>

      <details className="spFold">
        <summary>Tempel banyak barang sekaligus (dari Excel atau WhatsApp)</summary>
        <div className="spFoldBody">
          <form className="spForm" action={bulkImportSparepartAction}>
            <label>Kategori untuk semua baris di bawah
              <select name="category" defaultValue={k || "LED"}>
                {SPAREPART_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </label>
            <label>Satu baris = satu barang
              <textarea
                name="bulk"
                required
                placeholder={"LED 14.0 slim 30 pin HD | IPS | 5 | 350000 | 475000 | Acer Aspire 3, Asus X441\nLED 15.6 standar 40 pin FHD | | 3 | 420000 | 550000"}
              />
              <span className="hint">Urutan kolom: nama | spek | jumlah | modal | harga jual | cocok untuk. Dipisah tanda | atau tab (langsung salin dari Excel). Hanya nama yang wajib. Barang yang sama digabung dan jumlahnya ditambahkan. Untuk LED, ukuran, pin, dan resolusi dibaca otomatis dari nama.</span>
            </label>
            <div><button className="primaryButton" type="submit">Impor</button></div>
          </form>
        </div>
      </details>
    </section>
  );
}
