import type { Metadata } from "next";
import Link from "next/link";
import { Cpu, MessageCircle, Monitor, PackageCheck } from "lucide-react";
import { displayCatalogImageUrl } from "@/lib/catalog-image";
import { getPcCatalogData, type PcCatalogItem } from "@/lib/katalog-pc";
import "./pc-catalog.css";

export const dynamic = "force-dynamic";

const TITLE = "Katalog PC, Monitor & Komponen Pekalongan — FS Comp";
const DESCRIPTION =
  "PC set lengkap dengan monitor, PC rakitan, monitor, komponen, dan aksesoris dari FS Comp. Bisa beli satu set atau satuan, kondisi second maupun baru tertera jelas di tiap barang.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/katalog/pc" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "/katalog/pc",
    images: [{ url: "/branding/og-katalog-pc.jpg", width: 1200, height: 630, alt: "Katalog PC dan monitor FS Comp" }],
    type: "website"
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION, images: ["/branding/og-katalog-pc.jpg"] }
};

const WA = "https://wa.me/62816660056";
const rupiah = (value: number) => `Rp${new Intl.NumberFormat("id-ID").format(Math.round(value))}`;

function Card({ item, big = false }: { item: PcCatalogItem; big?: boolean }) {
  const image = item.image ? displayCatalogImageUrl(item.image) : "";
  return (
    <article className={`pcCatCard ${image ? "" : "noPhoto"} ${big ? "isSet" : ""}`}>
      <div className="pcCatPhoto">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt={item.name} loading="lazy" />
        ) : (
          <span aria-hidden="true">
            <Monitor size={34} />
          </span>
        )}
      </div>
      <div className="pcCatBody">
        <div className="pcCatBadges">
          <span className="pcCatBadge">{item.kindLabel}</span>
          {item.condition ? <span className={`pcCatBadge ${item.condition === "NEW" ? "isNew" : "isSecond"}`}>{item.condition === "NEW" ? "Baru" : "Second"}</span> : null}
          <span className={`pcCatBadge ${item.availability === "READY" ? "isReady" : "isPre"}`}>{item.availability === "READY" ? "Ready" : "Pre-order"}</span>
        </div>
        <h3>{item.name}</h3>
        {item.subtitle ? <p className="pcCatSpec">{item.subtitle}</p> : null}
        {item.includes ? <p className="pcCatIncludes">Termasuk: {item.includes}</p> : null}
        {item.warrantyNote ? <p className="pcCatWarranty">Garansi: {item.warrantyNote}</p> : null}
        <div className="pcCatFoot">
          <strong>
            {item.priceFrom ? <small>mulai </small> : null}
            {rupiah(item.price)}
          </strong>
          <a className="pcCatWa" href={`${WA}?text=${encodeURIComponent(item.waText)}`} target="_blank" rel="noreferrer">
            <MessageCircle size={15} /> Tanya via WA
          </a>
        </div>
      </div>
    </article>
  );
}

function Section({ id, title, hint, items }: { id: string; title: string; hint: string; items: PcCatalogItem[] }) {
  if (items.length === 0) return null;
  return (
    <section className="pcCatSection" id={id}>
      <div className="pcCatSectionHead">
        <h2>{title}</h2>
        <span>{items.length} barang</span>
      </div>
      <p className="pcCatHint">{hint}</p>
      <div className="pcCatGrid">
        {items.map((item) => (
          <Card item={item} key={item.key} big={id === "pc-set"} />
        ))}
      </div>
    </section>
  );
}

const BUDGETS = [
  { label: "Sampai Rp3 juta", note: "Ketik, internet, administrasi", wa: "sampai Rp3 juta" },
  { label: "Rp3 – 6 juta", note: "Kantor, sekolah, usaha kecil", wa: "Rp3 sampai 6 juta" },
  { label: "Di atas Rp6 juta", note: "Desain, editing, game", wa: "di atas Rp6 juta" }
];

function budgetLink(wa: string) {
  const text = [`Halo FS Comp, saya cari PC dengan budget ${wa}.`, "Untuk keperluan: ", "Mohon rekomendasi yang sesuai dan apakah ada yang ready."].join("\n");
  return `${WA}?text=${encodeURIComponent(text)}`;
}

export default async function KatalogPcPage() {
  const data = await getPcCatalogData();
  // PC yang benar-benar siap diambil tampil paling atas. Paket rakitan dan komponen (pre-order) dipisah supaya
  // halaman tidak terlihat seperti daftar spare part ketika stok PC jadi sedang tipis.
  const readySets = data.sets.filter((item) => item.availability === "READY");
  const builtSets = data.sets.filter((item) => item.availability !== "READY");
  const buildItems = [...builtSets, ...data.parts];
  const nav = [
    { id: "pc-set", label: "PC siap pakai", count: readySets.length },
    { id: "monitor", label: "Monitor", count: data.monitors.length },
    { id: "aksesoris", label: "Aksesoris", count: data.accessories.length },
    { id: "rakit", label: "Rakit sendiri", count: buildItems.length }
  ].filter((entry) => entry.count > 0);
  const total = data.sets.length + data.monitors.length + data.parts.length + data.accessories.length;

  return (
    <section className="pageStack pcCatPage">
      <div className="pcCatHero">
        <span className="pcCatPill">
          <Cpu size={16} /> Katalog PC — FS Comp
        </span>
        <h1>
          PC set, monitor, dan komponen <span>dalam satu tempat</span>
        </h1>
        <p>Beli satu set lengkap atau satuan, sesuai kebutuhan. Kondisi second atau baru tertera di tiap barang.</p>
        <div className="buttonRow">
          <a className="greenButton" href={WA} target="_blank" rel="noreferrer">
            Chat admin
          </a>
          <Link className="secondaryButton" href="/katalog/rakit-pc">
            Rakit PC custom
          </Link>
          <Link className="secondaryButton" href="/katalog">
            Cari laptop?
          </Link>
        </div>
      </div>

      {nav.length > 0 ? (
        <nav className="pcCatNav" aria-label="Bagian katalog PC">
          {nav.map((entry) => (
            <a href={`#${entry.id}`} key={entry.id}>
              {entry.label} <b>{entry.count}</b>
            </a>
          ))}
        </nav>
      ) : null}

      {!data.connected ? <div className="infoBox dangerInfo">Data katalog PC belum tersedia untuk saat ini. Silakan chat admin.</div> : null}
      {data.connected && total > 0 && readySets.length === 0 ? (
        <div className="infoBox">
          <PackageCheck size={16} /> PC siap pakai sedang habis. Pilih budget di bawah, kami carikan yang sesuai, atau rakit sendiri.
        </div>
      ) : null}
      {data.connected && total === 0 ? (
        <div className="infoBox">
          <PackageCheck size={16} /> Stok PC sedang kosong. Pilih budget di bawah atau rakit sendiri lewat Rakit PC custom.
        </div>
      ) : null}

      <Section id="pc-set" title="PC siap pakai" hint="Ready di toko. Isi paket tertera di tiap kartu." items={readySets} />

      <section className="pcCatBudget" id="budget" aria-label="Cari PC sesuai budget">
        <div className="pcCatSectionHead">
          <h2>Cari PC sesuai budget</h2>
        </div>
        <p className="pcCatHint">Pilih kisaran budget, admin bantu pilihkan yang paling pas dan cek ketersediaannya.</p>
        <div className="pcCatBudgetGrid">
          {BUDGETS.map((budget) => (
            <a className="pcCatBudgetBtn" href={budgetLink(budget.wa)} target="_blank" rel="noreferrer" key={budget.label}>
              <strong>{budget.label}</strong>
              <small>{budget.note}</small>
              <span><MessageCircle size={14} /> Tanya admin</span>
            </a>
          ))}
        </div>
      </section>

      <Section id="monitor" title="Monitor" hint="Bisa dibeli terpisah atau ditambahkan ke PC." items={data.monitors} />
      <Section id="aksesoris" title="Aksesoris" hint="Pelengkap PC dan laptop." items={data.accessories} />
      <Section id="rakit" title="Rakit sendiri (pre-order)" hint="Paket rakitan dan komponen satuan untuk upgrade. Barang berlabel pre-order dipesan dulu, estimasi 5–7 hari." items={buildItems} />

      <p className="pcCatNote">Harga dapat berubah mengikuti stok. Tanya admin untuk memastikan ketersediaan sebelum datang ke toko.</p>
    </section>
  );
}
