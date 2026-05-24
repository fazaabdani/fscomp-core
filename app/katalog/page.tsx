import Link from "next/link";
import { CheckCircle2, MapPin, MessageCircle, ShieldCheck } from "lucide-react";
import { CatalogPhoto } from "@/app/components/CatalogPhoto";
import { formatRupiah } from "@/lib/api";
import { getCatalogPageData } from "@/lib/db-data";

export const dynamic = "force-dynamic";

function waLink(unit: { nomorUnit: string; model: string; hargaJualRekomendasi: number }) {
  const text = [
    "Assalamu'alaikum FS Comp.",
    `Saya tertarik dengan Unit ${unit.nomorUnit} - ${unit.model}.`,
    `Harga di katalog: ${formatRupiah(unit.hargaJualRekomendasi)}.`,
    "Apakah unitnya masih ready?"
  ].join("\n");
  return `https://wa.me/62816660056?text=${encodeURIComponent(text)}`;
}

type CatalogUnit = {
  id: string;
  nomorUnit: string;
  model: string;
  processor: string;
  ram: string;
  ssd: string;
  lcdSize: string;
  lcdResolution: string;
  isTouchscreen: boolean;
  hargaJualRekomendasi: number;
  catalogImageUrl: string;
  stockLocation: string;
  windowsVersion: string;
};

function sortUnits(units: CatalogUnit[], sort: string) {
  return [...units].sort((a, b) => {
    if (sort === "harga-termurah") return a.hargaJualRekomendasi - b.hargaJualRekomendasi;
    if (sort === "harga-tertinggi") return b.hargaJualRekomendasi - a.hargaJualRekomendasi;
    if (sort === "nama") return a.model.localeCompare(b.model);
    if (sort === "unit") return a.nomorUnit.localeCompare(b.nomorUnit, "id", { numeric: true });
    return 0;
  });
}

function CatalogSection({
  title,
  subtitle,
  units
}: {
  title: string;
  subtitle: string;
  units: CatalogUnit[];
}) {
  return (
    <section className="panel catalogPublicSection">
      <div className="panelHeader">
        <div>
          <p className="eyebrow">{subtitle}</p>
          <h2>{title}</h2>
        </div>
        <MapPin size={22} />
      </div>
      <div className="catalogPublicGrid">
        {units.length === 0 ? <div className="emptyState">Belum ada unit siap jual di lokasi ini.</div> : units.map((unit) => (
          <article className="catalogPublicCard" key={unit.id}>
            <CatalogPhoto url={unit.catalogImageUrl} className="catalogImage" alt={`Foto ${unit.model}`} />
            <div className="catalogCardTop">
              <span className="unitNumber">{unit.nomorUnit}</span>
              <span className="statusPill green">{unit.stockLocation}</span>
            </div>
            <h3>{unit.model}</h3>
            <p>{unit.processor} / {unit.ram} / {unit.ssd}</p>
            <div className="miniMetrics">
              <span>{unit.windowsVersion}</span>
              <span>{unit.isTouchscreen ? "Touchscreen" : "Non-touchscreen"}</span>
            </div>
            <div className="catalogSpecList">
              <span>LCD {unit.lcdSize} {unit.lcdResolution}</span>
              <span>Lokasi stok {unit.stockLocation}</span>
            </div>
            <strong className="catalogPrice">{formatRupiah(unit.hargaJualRekomendasi)}</strong>
            <div className="buttonRow">
              <Link className="secondaryButton" href={`/unit/${unit.id}`}>Lihat unit</Link>
              <a className="primaryButton" href={waLink(unit)} target="_blank" rel="noreferrer"><MessageCircle size={17} /> Tanya Unit</a>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default async function KatalogPage({ searchParams }: { searchParams?: { sort?: string; lokasi?: string } }) {
  const { wiradesaUnits, kajenUnits, connected } = await getCatalogPageData();
  const activeSort = searchParams?.sort ?? "unit";
  const activeLocation = searchParams?.lokasi ?? "semua";
  const allUnits = sortUnits([...wiradesaUnits, ...kajenUnits], activeSort);
  const visibleUnits = activeLocation === "wiradesa"
    ? sortUnits(wiradesaUnits, activeSort)
    : activeLocation === "kajen"
      ? sortUnits(kajenUnits, activeSort)
      : allUnits;
  const visibleWiradesa = activeLocation === "kajen" ? [] : visibleUnits.filter((unit) => unit.stockLocation === "Wiradesa");
  const visibleKajen = activeLocation === "wiradesa" ? [] : visibleUnits.filter((unit) => unit.stockLocation === "Kajen");
  const total = wiradesaUnits.length + kajenUnits.length;
  const features = [
    ["1", "QC ketat", "Unit dicek sebelum dijual"],
    ["2", "Garansi toko", "Belanja lebih tenang"],
    ["3", "Servis profesional", "Teknisi berpengalaman"],
    ["4", "Stok update", "Data dari Core FS Comp"]
  ];

  return (
    <section className="pageStack katalogPage">
      <div className="catalogLandingHero">
        <div className="catalogHeroCopyPanel">
          <span className="catalogHeroPill"><CheckCircle2 size={16} /> Katalog Laptop Second FS Comp</span>
          <h1>Laptop Second <span>Berkualitas</span> Siap Dipilih</h1>
          <p>Cari laptop ready sesuai kebutuhan panjenengan. Data stok mengikuti sistem Core, lengkap dengan spesifikasi, harga, lokasi stok, foto, dan tombol chat admin.</p>
          <div className="buttonRow">
            <a className="primaryButton" href="#produk-ready">Lihat Katalog</a>
            <a className="greenButton" href="https://wa.me/62816660056" target="_blank" rel="noreferrer">Chat Admin</a>
            <a className="secondaryButton" href="https://fscomp.id" target="_blank" rel="noreferrer">fscomp.id</a>
          </div>
        </div>
        <div className="catalogHeroStatsPanel">
          <div className="catalogHeroStatsGrid">
            <div className="catalogStatBox">
              <strong>{total}</strong>
              <span>Total unit tampil</span>
            </div>
            <div className="catalogStatBox">
              <strong>{total}</strong>
              <span>Ready stock</span>
            </div>
            <div className="catalogStatBox">
              <strong>{wiradesaUnits.length}</strong>
              <span>Wiradesa</span>
            </div>
            <div className="catalogStatBox">
              <strong>{kajenUnits.length}</strong>
              <span>Kajen</span>
            </div>
          </div>
          <p>Harga dan stok mengikuti update dari Core FS Comp. Klik detail unit untuk melihat ringkasan, atau chat admin untuk cek ketersediaan.</p>
        </div>
      </div>

      <div className="catalogFeatureStrip">
        {features.map(([number, title, desc]) => (
          <div className="catalogFeatureItem" key={number}>
            <span>{number}</span>
            <strong>{title}</strong>
            <small>{desc}</small>
          </div>
        ))}
      </div>

      {!connected ? (
        <div className="infoBox dangerInfo">Katalog belum tersambung ke database production.</div>
      ) : null}

      <div className="catalogSectionTitle" id="produk-ready">
        <p className="eyebrow">Produk Ready</p>
        <h2>Pilih laptop sesuai kebutuhan panjenengan</h2>
      </div>

      <div className="catalogSortBar">
        <div>
          <strong>{visibleUnits.length}</strong>
          <span>unit ready ditampilkan</span>
        </div>
        <Link className={`sortPill ${activeLocation === "semua" ? "active" : ""}`} href={`/katalog?lokasi=semua&sort=${activeSort}`}>Semua ({total})</Link>
        <Link className={`sortPill ${activeLocation === "wiradesa" ? "active" : ""}`} href={`/katalog?lokasi=wiradesa&sort=${activeSort}`}>Wiradesa ({wiradesaUnits.length})</Link>
        <Link className={`sortPill ${activeLocation === "kajen" ? "active" : ""}`} href={`/katalog?lokasi=kajen&sort=${activeSort}`}>Kajen ({kajenUnits.length})</Link>
        <Link className={`sortPill ${activeSort === "unit" ? "active" : ""}`} href={`/katalog?lokasi=${activeLocation}&sort=unit`}>Urut unit</Link>
        <Link className={`sortPill ${activeSort === "harga-termurah" ? "active" : ""}`} href={`/katalog?lokasi=${activeLocation}&sort=harga-termurah`}>Termurah</Link>
        <Link className={`sortPill ${activeSort === "harga-tertinggi" ? "active" : ""}`} href={`/katalog?lokasi=${activeLocation}&sort=harga-tertinggi`}>Tertinggi</Link>
        <Link className={`sortPill ${activeSort === "nama" ? "active" : ""}`} href={`/katalog?lokasi=${activeLocation}&sort=nama`}>Nama</Link>
      </div>

      <CatalogSection title="Stok Wiradesa" subtitle="Lokasi utama" units={visibleWiradesa} />
      <CatalogSection title="Stok Kajen" subtitle="Lokasi secondary" units={visibleKajen} />
    </section>
  );
}
