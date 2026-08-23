import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Grid2X2, LayoutGrid, List, MapPin, MessageCircle, PackageCheck, Search, ShieldCheck, SlidersHorizontal } from "lucide-react";
import { CopyWaButton } from "@/app/CopyWaButton";
import { CatalogPhoto } from "@/app/components/CatalogPhoto";
import { formatRupiah } from "@/lib/api";
import { brandOf } from "@/lib/catalog-image";
import { getCatalogPageData } from "@/lib/catalog-page-data";
import { CatalogFilterShell } from "./CatalogFilterShell";
import { KatalogDynamics } from "./KatalogDynamics";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Jual Beli Laptop Second Pekalongan Bergaransi | FS Comp",
  description:
    "Katalog laptop second ready stock FS Comp Wiradesa & FS.ID Kajen, Pekalongan. QC ketat, garansi toko, harga update tiap hari. Chat admin via WhatsApp untuk cek unit.",
  keywords: [
    "laptop second pekalongan",
    "jual beli laptop pekalongan",
    "laptop bekas wiradesa",
    "laptop bekas kajen",
    "FS Comp",
    "FS Media Comp",
    "toko komputer bekas pekalongan"
  ],
  alternates: { canonical: "/katalog" },
  openGraph: {
    title: "Jual Beli Laptop Second Pekalongan Bergaransi | FS Comp",
    description: "Katalog laptop second ready stock FS Comp Wiradesa & FS.ID Kajen, Pekalongan. QC ketat, garansi toko, harga update tiap hari.",
    url: "/katalog",
    siteName: "FS Comp",
    locale: "id_ID",
    type: "website"
  }
};

const STORE_LOCATIONS = [
  {
    "@type": "ElectronicsStore",
    name: "FS Comp Wiradesa",
    alternateName: "FS Media Comp Wiradesa",
    telephone: "+62816660056",
    priceRange: "Rp",
    url: "https://fscomp.id",
    address: {
      "@type": "PostalAddress",
      streetAddress: "Jl. Wiradesa No.1 RT 22 RW 05, Desa Wiradesa",
      addressLocality: "Wiradesa, Kabupaten Pekalongan",
      addressRegion: "Jawa Tengah",
      postalCode: "51152",
      addressCountry: "ID"
    }
  },
  {
    "@type": "ElectronicsStore",
    name: "FS.ID Kajen",
    alternateName: "FS Comp Kajen",
    telephone: "+6285182661773",
    priceRange: "Rp",
    url: "https://fscomp.id",
    address: {
      "@type": "PostalAddress",
      streetAddress: "Jalan Diponegoro No. 204B (Utara Rumah Dinas Wakil Bupati)",
      addressLocality: "Kajen, Kabupaten Pekalongan",
      addressRegion: "Jawa Tengah",
      addressCountry: "ID"
    }
  }
];

function CatalogStructuredData() {
  const json = STORE_LOCATIONS.map((store) => ({ "@context": "https://schema.org", ...store }));
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }} />;
}

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
  latestQcAt: string;
};

type CatalogFilters = {
  q: string;
  sort: string;
  lokasi: string;
  merek: string;
  ram: string;
  storage: string;
  windows: string;
  harga: string;
  view: string;
};

function singleParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function capacityNumber(value: string) {
  const match = value.match(/(\d+)\s*(GB|TB)/i);
  if (!match) return 0;
  const number = Number(match[1]);
  return match[2].toUpperCase() === "TB" ? number * 1024 : number;
}

function ramLabel(value: string) {
  const size = capacityNumber(value);
  return size ? `${size}GB` : value;
}

function storageLabel(value: string) {
  const size = capacityNumber(value);
  return size ? `${size}GB` : value;
}

function uniqueSorted(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) => a.localeCompare(b, "id", { numeric: true }));
}

function filterUnits(units: CatalogUnit[], filters: CatalogFilters) {
  const q = filters.q.toLowerCase();
  return units.filter((unit) => {
    const searchText = [
      unit.nomorUnit,
      unit.model,
      unit.processor,
      unit.ram,
      unit.ssd,
      unit.lcdSize,
      unit.lcdResolution,
      unit.stockLocation,
      unit.windowsVersion
    ].join(" ").toLowerCase();

    if (q && !searchText.includes(q)) return false;
    if (filters.lokasi !== "semua" && unit.stockLocation.toLowerCase() !== filters.lokasi) return false;
    if (filters.merek && brandOf(unit.model).toLowerCase() !== filters.merek.toLowerCase()) return false;
    if (filters.ram && ramLabel(unit.ram) !== filters.ram) return false;
    if (filters.storage && storageLabel(unit.ssd) !== filters.storage) return false;
    if (filters.windows && unit.windowsVersion !== filters.windows) return false;
    if (filters.harga === "maks-3" && unit.hargaJualRekomendasi > 3_000_000) return false;
    if (filters.harga === "3-5" && (unit.hargaJualRekomendasi <= 3_000_000 || unit.hargaJualRekomendasi > 5_000_000)) return false;
    if (filters.harga === "diatas-5" && unit.hargaJualRekomendasi <= 5_000_000) return false;
    return true;
  });
}

function sortUnits(units: CatalogUnit[], sort: string) {
  return [...units].sort((a, b) => {
    if (sort === "harga-termurah") return a.hargaJualRekomendasi - b.hargaJualRekomendasi;
    if (sort === "harga-tertinggi") return b.hargaJualRekomendasi - a.hargaJualRekomendasi;
    if (sort === "nama") return a.model.localeCompare(b.model);
    if (sort === "ram-terbesar") return capacityNumber(b.ram) - capacityNumber(a.ram);
    if (sort === "ssd-terbesar") return capacityNumber(b.ssd) - capacityNumber(a.ssd);
    if (sort === "unit") return a.nomorUnit.localeCompare(b.nomorUnit, "id", { numeric: true });
    return 0;
  });
}

function sortLabel(sort: string) {
  const labels: Record<string, string> = {
    unit: "Nomor unit",
    "harga-termurah": "Harga termurah",
    "harga-tertinggi": "Harga tertinggi",
    nama: "Nama/model",
    "ram-terbesar": "RAM terbesar",
    "ssd-terbesar": "SSD terbesar"
  };
  return labels[sort] ?? "Nomor unit";
}

function activeFilterText(filters: CatalogFilters) {
  const priceLabels: Record<string, string> = {
    "maks-3": "harga sampai Rp3 juta",
    "3-5": "harga Rp3-5 juta",
    "diatas-5": "harga di atas Rp5 juta"
  };
  const parts = [
    filters.q ? `cari "${filters.q}"` : "",
    filters.lokasi !== "semua" ? `lokasi ${filters.lokasi}` : "",
    filters.merek ? `merek ${filters.merek}` : "",
    filters.ram ? `RAM ${filters.ram}` : "",
    filters.storage ? `SSD ${filters.storage}` : "",
    filters.windows ? filters.windows : "",
    priceLabels[filters.harga] ?? ""
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : "semua unit ready";
}

function activeFilterCount(filters: CatalogFilters) {
  return [
    filters.q,
    filters.lokasi !== "semua" ? filters.lokasi : "",
    filters.merek,
    filters.ram,
    filters.storage,
    filters.windows,
    filters.harga !== "semua" ? filters.harga : ""
  ].filter(Boolean).length;
}

function catalogHref(filters: CatalogFilters, overrides: Partial<CatalogFilters> = {}) {
  const next = { ...filters, ...overrides };
  const query = new URLSearchParams();
  if (next.q) query.set("q", next.q);
  if (next.sort !== "unit") query.set("sort", next.sort);
  if (next.lokasi !== "semua") query.set("lokasi", next.lokasi);
  if (next.merek) query.set("merek", next.merek);
  if (next.ram) query.set("ram", next.ram);
  if (next.storage) query.set("storage", next.storage);
  if (next.windows) query.set("windows", next.windows);
  if (next.harga !== "semua") query.set("harga", next.harga);
  if (next.view !== "grid") query.set("view", next.view);
  const text = query.toString();
  return `/katalog${text ? `?${text}` : ""}#produk-ready`;
}

function catalogShareText(units: CatalogUnit[], filters: CatalogFilters, catalogPath: string) {
  const shownUnits = units.slice(0, 30);
  const lines = [
    "*Katalog Laptop Ready FS Comp*",
    `Filter: ${activeFilterText(filters)}`,
    `Urutan: ${sortLabel(filters.sort)}`,
    `Total: ${units.length} unit`,
    `Link katalog: https://core.fscomp.id${catalogPath}`,
    "",
    ...shownUnits.map((unit, index) => [
      `${index + 1}. ${unit.nomorUnit} - ${unit.model}`,
      `   ${unit.processor} / ${unit.ram} / ${unit.ssd} / ${unit.windowsVersion}`,
      `   ${formatRupiah(unit.hargaJualRekomendasi)} | ${unit.stockLocation}`
    ].join("\n")),
    units.length > shownUnits.length ? `\nMasih ada ${units.length - shownUnits.length} unit lain. Buka katalog untuk lihat lengkapnya.` : "",
    "",
    "Chat admin: 0816660056"
  ].filter(Boolean);
  return lines.join("\n");
}

function CatalogSection({
  title,
  subtitle,
  units,
  returnTo,
  view
}: {
  title: string;
  subtitle: string;
  units: CatalogUnit[];
  returnTo: string;
  view: string;
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
      <div className={`catalogPublicGrid catalogView-${view}`}>
        {units.map((unit, index) => (
          <article className="catalogPublicCard catalogReveal" key={unit.id}>
            <span className="catalogCardShine" aria-hidden="true" />
            <CatalogPhoto url={unit.catalogImageUrl} className="catalogImage" alt={`Foto ${unit.model}`} priority={index < 3} imageWidth={720} />
            <div className="catalogCardTop">
              <span className="unitNumber">{unit.nomorUnit}</span>
              <span className="statusPill green">{unit.stockLocation}</span>
            </div>
            <div>
              <span className="catalogBrand">{brandOf(unit.model)}</span>
              <h3>{unit.model}</h3>
            </div>
            <p>{unit.processor}</p>
            <div className="miniMetrics">
              <span>{unit.ram}</span>
              <span>{unit.ssd}</span>
              <span>{unit.isTouchscreen ? "Touchscreen" : "Non-touchscreen"}</span>
            </div>
            <div className="catalogSpecList">
              <span>{unit.windowsVersion}</span>
              <span>LCD {unit.lcdSize} {unit.lcdResolution}</span>
            </div>
            <div className="catalogTrustRow">
              <span><CheckCircle2 size={14} /> QC {unit.latestQcAt}</span>
              <span><ShieldCheck size={14} /> Garansi toko</span>
              <span><PackageCheck size={14} /> Stok aktual</span>
            </div>
            <strong className="catalogPrice">{formatRupiah(unit.hargaJualRekomendasi)}</strong>
            <div className="buttonRow catalogCardActions">
              <Link className="secondaryButton" href={{ pathname: `/unit/${unit.id}`, query: { from: returnTo } }}>Lihat Detail</Link>
              <a className="primaryButton" href={waLink(unit)} target="_blank" rel="noreferrer"><MessageCircle size={17} /> Tanya Unit</a>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function CatalogPageStyles() {
  return (
    <style dangerouslySetInnerHTML={{ __html: `
      .catalogFilterMobileButton,
      .catalogFilterBackdrop,
      .catalogFilterDrawerHeader,
      .catalogMobileSearchBar {
        display: none;
      }

      #produk-ready {
        scroll-margin-top: 110px;
      }

      .catalogFilterDrawer {
        display: block;
      }

      .catalogFilterPanel {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 12px;
        align-items: end;
        padding: 16px;
        border: 1px solid rgba(55, 163, 255, 0.34);
        border-radius: 10px;
        background:
          linear-gradient(135deg, rgba(8, 20, 36, 0.96), rgba(5, 17, 29, 0.94)),
          linear-gradient(90deg, rgba(34, 211, 238, 0.1), transparent);
      }

      .catalogFilterPanel label {
        display: grid;
        gap: 7px;
        color: #9ec1df;
        font-size: 12px;
        font-weight: 800;
      }

      .catalogFilterPanel input,
      .catalogFilterPanel select {
        width: 100%;
        min-height: 42px;
        border: 1px solid rgba(123, 175, 226, 0.34);
        border-radius: 8px;
        background: rgba(3, 13, 26, 0.86);
        color: #eaf6ff;
        padding: 0 12px;
        outline: none;
      }

      .catalogFilterPanel input:focus,
      .catalogFilterPanel select:focus {
        border-color: rgba(34, 211, 238, 0.82);
        box-shadow: 0 0 0 3px rgba(34, 211, 238, 0.12);
      }

      .catalogSearchField {
        grid-column: span 2;
      }

      .catalogSearchField span {
        display: inline-flex;
        align-items: center;
        gap: 7px;
      }

      .catalogFilterActions {
        display: flex;
        grid-column: span 2;
        gap: 8px;
        align-items: center;
        justify-content: flex-end;
      }

      .catalogResultBar {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
        align-items: center;
        justify-content: space-between;
        padding: 14px;
        border: 1px solid rgba(55, 163, 255, 0.34);
        border-radius: 10px;
        background: rgba(8, 20, 36, 0.88);
      }

      .catalogResultCount {
        display: grid;
        gap: 2px;
      }

      .catalogResultCount strong {
        color: #f8fbff;
        font-size: 28px;
        line-height: 1;
      }

      .catalogResultCount span {
        color: #9ec1df;
        font-size: 13px;
      }

      .catalogFilterActions .primaryButton,
      .catalogFilterActions .secondaryButton {
        min-height: 42px;
        white-space: nowrap;
      }

      .catalogShareBox {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        align-items: center;
        padding: 8px;
        border: 1px solid rgba(34, 211, 238, 0.28);
        border-radius: 8px;
        background: rgba(8, 22, 39, 0.72);
      }

      .catalogShareBox small {
        color: #9ec1df;
        font-weight: 700;
      }

      .catalogBrand {
        color: #38bdf8;
        font-size: 11px;
        font-weight: 900;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      .catalogPublicGrid {
        grid-template-columns: repeat(auto-fit, minmax(285px, 1fr));
      }

      .catalogView-compact {
        grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
      }

      .catalogView-compact .catalogPublicCard {
        gap: 8px;
        padding: 12px;
      }

      .catalogView-compact .catalogImage {
        aspect-ratio: 4 / 3;
      }

      .catalogView-compact .catalogTrustRow {
        display: none;
      }

      .catalogView-list {
        grid-template-columns: 1fr;
      }

      .catalogView-list .catalogPublicCard {
        grid-template-columns: minmax(190px, 250px) minmax(0, 1fr) auto;
        grid-template-rows: repeat(6, auto);
        column-gap: 18px;
        align-items: start;
      }

      .catalogView-list .catalogCardShine {
        display: none;
      }

      .catalogView-list .catalogImage {
        grid-column: 1;
        grid-row: 1 / -1;
        height: 100%;
        min-height: 210px;
      }

      .catalogView-list .catalogCardTop,
      .catalogView-list .catalogPublicCard > div:not(.catalogCardActions):not(.catalogCardTop),
      .catalogView-list .catalogPublicCard > p,
      .catalogView-list .catalogPrice {
        grid-column: 2;
      }

      .catalogView-list .catalogCardActions {
        grid-column: 3;
        grid-row: 1 / -1;
        width: 155px;
        flex-direction: column;
        align-self: center;
      }

      .catalogViewSwitch {
        display: inline-flex;
        gap: 4px;
        padding: 4px;
        border: 1px solid rgba(55, 163, 255, 0.28);
        border-radius: 8px;
        background: rgba(3, 13, 26, 0.72);
      }

      .catalogViewSwitch a {
        display: inline-flex;
        min-height: 38px;
        align-items: center;
        gap: 6px;
        padding: 0 10px;
        border-radius: 6px;
        color: #9ec1df;
        font-size: 12px;
        font-weight: 800;
      }

      .catalogViewSwitch a.active {
        background: rgba(34, 211, 238, 0.15);
        color: #67e8f9;
      }

      .catalogPublicCard {
        align-content: start;
        gap: 11px;
      }

      .catalogPublicCard:hover {
        border-color: rgba(34, 211, 238, 0.48);
        background: rgba(9, 26, 45, 0.94);
      }

      .catalogPublicCard h3 {
        margin: 3px 0 0;
        min-height: 2.5em;
        font-size: 18px;
        line-height: 1.25;
        display: -webkit-box;
        overflow: hidden;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 2;
      }

      .catalogTrustRow {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }

      .catalogTrustRow span {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        min-height: 28px;
        padding: 5px 8px;
        border: 1px solid rgba(34, 211, 238, 0.24);
        border-radius: 999px;
        background: rgba(34, 211, 238, 0.06);
        color: #a9cce5;
        font-size: 10px;
        font-weight: 700;
      }

      .catalogCardActions {
        align-self: end;
        margin-top: auto;
      }

      .catalogCardActions > * {
        flex: 1;
        white-space: nowrap;
      }

      .catalogEmptyState {
        display: grid;
        justify-items: center;
        gap: 10px;
        padding: 34px 20px;
        text-align: center;
      }

      .catalogEmptyState h3,
      .catalogEmptyState p {
        margin: 0;
      }

      .catalogEmptyState p {
        max-width: 620px;
        color: #9ec1df;
        line-height: 1.55;
      }

      @media (max-width: 820px) {
        html,
        body {
          overflow-x: clip;
        }

        .catalogFilterShell {
          display: grid;
          gap: 8px;
          position: sticky;
          z-index: 8;
          top: 8px;
        }

        .catalogMobileSearchBar {
          display: flex;
          align-items: center;
          gap: 9px;
          min-height: 48px;
          padding: 0 14px;
          border: 1px solid rgba(34, 211, 238, 0.44);
          border-radius: 9px;
          background: rgba(5, 14, 27, 0.96);
          color: #9ec1df;
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.28);
        }

        .catalogMobileSearchBar input {
          flex: 1;
          min-width: 0;
          height: 40px;
          border: 0;
          background: transparent;
          color: #eef8ff;
          font-size: 15px;
          outline: none;
        }

        .catalogMobileSearchBar button {
          display: grid;
          width: 40px;
          height: 40px;
          flex-shrink: 0;
          place-items: center;
          border: 0;
          border-radius: 8px;
          background: rgba(34, 211, 238, 0.16);
          color: #67e8f9;
        }

        .catalogFilterPanel .catalogSearchField {
          display: none;
        }

        .catalogFilterMobileButton {
          display: flex;
          width: 100%;
          min-height: 48px;
          align-items: center;
          gap: 9px;
          padding: 0 14px;
          border: 1px solid rgba(34, 211, 238, 0.44);
          border-radius: 9px;
          background: rgba(5, 14, 27, 0.96);
          color: #eef8ff;
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.28);
        }

        .catalogFilterMobileButton span {
          flex: 1;
          text-align: left;
          font-weight: 800;
        }

        .catalogFilterMobileButton strong {
          padding: 5px 8px;
          border-radius: 999px;
          background: rgba(34, 211, 238, 0.14);
          color: #67e8f9;
          font-size: 10px;
        }

        .catalogFilterBackdrop {
          position: fixed;
          z-index: 39;
          inset: 0;
          display: block;
          border: 0;
          background: rgba(1, 6, 15, 0.72);
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.2s ease;
        }

        .catalogFilterDrawer {
          position: fixed;
          z-index: 40;
          top: 0;
          right: 0;
          bottom: 0;
          width: min(92vw, 430px);
          overflow-y: auto;
          background: #071426;
          box-shadow: -20px 0 60px rgba(0, 0, 0, 0.46);
          transform: translateX(105%);
          transition: transform 0.24s ease;
          overscroll-behavior: contain;
        }

        .catalogFilterShell.isOpen .catalogFilterBackdrop {
          opacity: 1;
          pointer-events: auto;
        }

        .catalogFilterShell.isOpen .catalogFilterDrawer {
          transform: translateX(0);
        }

        .catalogFilterDrawerHeader {
          position: sticky;
          z-index: 2;
          top: 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 15px 16px;
          border-bottom: 1px solid rgba(55, 163, 255, 0.24);
          background: rgba(7, 20, 38, 0.96);
          backdrop-filter: blur(16px);
        }

        .catalogFilterDrawerHeader > div {
          display: grid;
          gap: 3px;
        }

        .catalogFilterDrawerHeader span {
          color: #8eabc3;
          font-size: 11px;
        }

        .catalogFilterDrawerHeader button {
          display: grid;
          width: 40px;
          height: 40px;
          place-items: center;
          border: 1px solid rgba(55, 163, 255, 0.28);
          border-radius: 8px;
          background: rgba(8, 22, 39, 0.8);
          color: #eef8ff;
        }

        .catalogFilterPanel {
          grid-template-columns: 1fr;
          padding: 16px;
          border: 0;
          border-radius: 0;
          background: transparent;
          box-shadow: none;
        }

        .catalogSearchField {
          grid-column: auto;
        }

        .catalogFilterActions {
          position: sticky;
          z-index: 2;
          bottom: 0;
          grid-column: auto;
          justify-content: stretch;
          margin: 6px -16px -16px;
          padding: 12px 16px calc(12px + env(safe-area-inset-bottom));
          border-top: 1px solid rgba(55, 163, 255, 0.24);
          background: rgba(7, 20, 38, 0.97);
        }

        .catalogFilterActions .primaryButton,
        .catalogFilterActions .secondaryButton {
          flex: 1;
          min-height: 46px;
        }

        .catalogPublicGrid {
          grid-template-columns: 1fr;
          gap: 14px;
        }

        .catalogView-list .catalogPublicCard {
          display: grid;
          grid-template-columns: 104px minmax(0, 1fr);
          grid-template-rows: auto;
          column-gap: 11px;
        }

        .catalogView-list .catalogImage {
          grid-column: 1;
          grid-row: 1 / span 3;
          min-height: 0;
          height: 104px;
        }

        .catalogView-list .catalogCardTop,
        .catalogView-list .catalogPublicCard > div:not(.catalogCardActions):not(.catalogCardTop),
        .catalogView-list .catalogPublicCard > p,
        .catalogView-list .catalogPrice,
        .catalogView-list .catalogCardActions {
          grid-column: 2;
        }

        .catalogView-list .catalogSpecList,
        .catalogView-list .catalogTrustRow {
          display: none;
        }

        .catalogView-list .catalogCardActions {
          grid-row: auto;
          width: 100%;
          flex-direction: row;
        }

        .catalogViewSwitch {
          width: 100%;
        }

        .catalogViewSwitch a {
          flex: 1;
          justify-content: center;
        }

        .catalogPublicCard {
          padding: 14px;
          gap: 10px;
        }

        .catalogPublicCard h3 {
          min-height: 0;
          font-size: 17px;
        }

        .catalogPublicCard p {
          font-size: 14px;
        }

        .miniMetrics span,
        .catalogSpecList span {
          font-size: 13px;
        }

        .catalogTrustRow span {
          min-height: 30px;
          font-size: 11px;
        }

        .catalogCardActions .primaryButton,
        .catalogCardActions .secondaryButton {
          min-height: 46px;
        }

        .catalogFilterMobileButton {
          min-height: 50px;
        }

        .catalogPublicCard.catalogReveal {
          transition: none;
          opacity: 1;
          transform: none;
        }

        .catalogPublicCard .catalogCardShine {
          display: none;
        }

        .catalogPublicCard:hover {
          transform: none;
        }

        .catalogPublicCard:hover .catalogImage,
        .catalogPublicCard:hover .catalogImagePlaceholder {
          transform: none;
        }
      }

      @media (min-width: 821px) and (max-width: 1280px) {
        .catalogFilterPanel {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }

        .catalogSearchField {
          grid-column: 1 / -1;
        }

        .catalogFilterActions {
          grid-column: 1 / -1;
          justify-content: flex-start;
        }
      }
    ` }} />
  );
}

export default async function KatalogPage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
  const { wiradesaUnits, kajenUnits, connected } = await getCatalogPageData();
  const filters: CatalogFilters = {
    q: singleParam(searchParams?.q),
    sort: singleParam(searchParams?.sort) || "unit",
    lokasi: singleParam(searchParams?.lokasi) || "semua",
    merek: singleParam(searchParams?.merek),
    ram: singleParam(searchParams?.ram),
    storage: singleParam(searchParams?.storage),
    windows: singleParam(searchParams?.windows),
    harga: ["maks-3", "3-5", "diatas-5"].includes(singleParam(searchParams?.harga)) ? singleParam(searchParams?.harga) : "semua",
    view: ["compact", "list"].includes(singleParam(searchParams?.view)) ? singleParam(searchParams?.view) : "grid"
  };
  const allRawUnits = [...wiradesaUnits, ...kajenUnits];
  const visibleUnits = sortUnits(filterUnits(allRawUnits, filters), filters.sort);
  const visibleWiradesa = filters.lokasi === "kajen" ? [] : visibleUnits.filter((unit) => unit.stockLocation === "Wiradesa");
  const visibleKajen = filters.lokasi === "wiradesa" ? [] : visibleUnits.filter((unit) => unit.stockLocation === "Kajen");
  const returnTo = catalogHref(filters);
  const filterCount = activeFilterCount(filters);
  const total = wiradesaUnits.length + kajenUnits.length;
  const brandOptions = uniqueSorted(allRawUnits.map((unit) => brandOf(unit.model)));
  const ramOptions = uniqueSorted(allRawUnits.map((unit) => ramLabel(unit.ram)));
  const storageOptions = uniqueSorted(allRawUnits.map((unit) => storageLabel(unit.ssd)));
  const windowsOptions = uniqueSorted(allRawUnits.map((unit) => unit.windowsVersion));
  const features = [
    ["1", "QC ketat", "Unit dicek sebelum dijual"],
    ["2", "Garansi toko", "Belanja lebih tenang"],
    ["3", "Servis profesional", "Teknisi berpengalaman"],
    ["4", "Stok update", "Data dari Core FS Comp"]
  ];

  return (
    <section className="pageStack katalogPage dynamicCatalogPage">
      <CatalogStructuredData />
      <KatalogDynamics navigationKey={returnTo} />
      <CatalogPageStyles />
      <div className="catalogLandingHero catalogReveal">
        <div className="catalogHeroCopyPanel dynamicHeroPanel">
          <span className="catalogHeroPill"><CheckCircle2 size={16} /> Katalog Laptop Second FS Comp</span>
          <h1><span>Laptop Second</span> <span>Berkualitas</span> <span>Siap Dipilih</span></h1>
          <p>Cari laptop ready sesuai kebutuhan panjenengan. Data stok mengikuti sistem Core, lengkap dengan spesifikasi, harga, lokasi stok, foto, dan tombol chat admin.</p>
          <div className="buttonRow">
            <a className="primaryButton" href="#produk-ready">Lihat Katalog</a>
            <Link className="secondaryButton" href="/katalog/rakit-pc">Rakit PC</Link>
            <a className="greenButton" href="https://wa.me/62816660056" target="_blank" rel="noreferrer">Chat Admin</a>
            <a className="secondaryButton" href="https://fscomp.id" target="_blank" rel="noreferrer">fscomp.id</a>
          </div>
        </div>
        <div className="catalogHeroStatsPanel dynamicStatsPanel">
          <div className="catalogHeroStatsGrid">
            <div className="catalogStatBox">
              <strong data-count-target={total}>{total}</strong>
              <span>Total unit tampil</span>
            </div>
            <div className="catalogStatBox">
              <strong data-count-target={total}>{total}</strong>
              <span>Ready stock</span>
            </div>
            <div className="catalogStatBox">
              <strong data-count-target={wiradesaUnits.length}>{wiradesaUnits.length}</strong>
              <span>Wiradesa</span>
            </div>
            <div className="catalogStatBox">
              <strong data-count-target={kajenUnits.length}>{kajenUnits.length}</strong>
              <span>Kajen</span>
            </div>
          </div>
          <p>Harga dan stok mengikuti update dari Core FS Comp. Klik detail unit untuk melihat ringkasan, atau chat admin untuk cek ketersediaan.</p>
        </div>
      </div>

      <div className="catalogTicker" aria-hidden="true">
        <div className="catalogTickerTrack">
          {["Laptop second bergaransi", "QC ketat sebelum jual", "Stok Wiradesa dan Kajen", "Chat admin cepat", "Harga update dari Core", "Siap dipakai kerja"].concat(["Laptop second bergaransi", "QC ketat sebelum jual", "Stok Wiradesa dan Kajen", "Chat admin cepat", "Harga update dari Core", "Siap dipakai kerja"]).map((item, index) => (
            <span key={`${item}-${index}`}>{item}</span>
          ))}
        </div>
      </div>

      <div className="catalogFeatureStrip catalogReveal revealDelay1">
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

      <div className="catalogSectionTitle catalogReveal" id="produk-ready">
        <p className="eyebrow">Produk Ready</p>
        <h2>Pilih laptop sesuai kebutuhan panjenengan</h2>
      </div>

      <CatalogFilterShell
        activeCount={filterCount}
        mobileSearch={
          <form className="catalogMobileSearchBar" action="/katalog#produk-ready" role="search">
            <Search size={17} />
            <input type="search" name="q" defaultValue={filters.q} placeholder="Cari unit, model, processor, spek" aria-label="Cari produk" />
            {filters.sort !== "unit" ? <input type="hidden" name="sort" value={filters.sort} /> : null}
            {filters.lokasi !== "semua" ? <input type="hidden" name="lokasi" value={filters.lokasi} /> : null}
            {filters.merek ? <input type="hidden" name="merek" value={filters.merek} /> : null}
            {filters.ram ? <input type="hidden" name="ram" value={filters.ram} /> : null}
            {filters.storage ? <input type="hidden" name="storage" value={filters.storage} /> : null}
            {filters.windows ? <input type="hidden" name="windows" value={filters.windows} /> : null}
            {filters.harga !== "semua" ? <input type="hidden" name="harga" value={filters.harga} /> : null}
            {filters.view !== "grid" ? <input type="hidden" name="view" value={filters.view} /> : null}
            <button type="submit" aria-label="Cari produk"><Search size={16} /></button>
          </form>
        }
      >
        <form className="catalogFilterPanel catalogReveal revealDelay1" action="/katalog#produk-ready">
        <label className="catalogSearchField">
          <span><Search size={17} /> Cari unit, model, processor, spek</span>
          <input name="q" defaultValue={filters.q} placeholder="Contoh: T480, i5 gen 8, 16GB, Dell, Kajen" />
        </label>
        <label>
          Lokasi
          <select name="lokasi" defaultValue={filters.lokasi}>
            <option value="semua">Semua lokasi</option>
            <option value="wiradesa">Wiradesa</option>
            <option value="kajen">Kajen</option>
          </select>
        </label>
        <label>
          Merek
          <select name="merek" defaultValue={filters.merek}>
            <option value="">Semua merek</option>
            {brandOptions.map((brand) => <option value={brand} key={brand}>{brand}</option>)}
          </select>
        </label>
        <label>
          RAM
          <select name="ram" defaultValue={filters.ram}>
            <option value="">Semua RAM</option>
            {ramOptions.map((ram) => <option value={ram} key={ram}>{ram}</option>)}
          </select>
        </label>
        <label>
          SSD
          <select name="storage" defaultValue={filters.storage}>
            <option value="">Semua SSD</option>
            {storageOptions.map((storage) => <option value={storage} key={storage}>{storage}</option>)}
          </select>
        </label>
        <label>
          Windows
          <select name="windows" defaultValue={filters.windows}>
            <option value="">Semua Windows</option>
            {windowsOptions.map((windows) => <option value={windows} key={windows}>{windows}</option>)}
          </select>
        </label>
        <label>
          Harga
          <select name="harga" defaultValue={filters.harga}>
            <option value="semua">Semua harga</option>
            <option value="maks-3">Sampai Rp3 juta</option>
            <option value="3-5">Rp3-5 juta</option>
            <option value="diatas-5">Di atas Rp5 juta</option>
          </select>
        </label>
        <label>
          Urutkan
          <select name="sort" defaultValue={filters.sort}>
            <option value="unit">Nomor unit</option>
            <option value="harga-termurah">Harga termurah</option>
            <option value="harga-tertinggi">Harga tertinggi</option>
            <option value="ram-terbesar">RAM terbesar</option>
            <option value="ssd-terbesar">SSD terbesar</option>
            <option value="nama">Nama/model</option>
          </select>
        </label>
        <label>
          Tampilan
          <select name="view" defaultValue={filters.view}>
            <option value="grid">Grid nyaman</option>
            <option value="compact">Grid ringkas</option>
            <option value="list">Daftar</option>
          </select>
        </label>
        <div className="catalogFilterActions">
          <button className="primaryButton" type="submit"><SlidersHorizontal size={16} /> Terapkan</button>
          <Link className="secondaryButton" href="/katalog#produk-ready">Reset</Link>
        </div>
        </form>
      </CatalogFilterShell>

      <div className="catalogResultBar catalogReveal revealDelay1">
        <div className="catalogResultCount">
          <strong>{visibleUnits.length}</strong>
          <span>dari {total} unit ready ditampilkan dalam satu halaman</span>
        </div>
        <div className="catalogShareBox">
          <CopyWaButton text={catalogShareText(visibleUnits, filters, returnTo)} disabled={visibleUnits.length === 0} label="Copy list WA" />
          <small>Filter: {activeFilterText(filters)} | Urutan: {sortLabel(filters.sort)}</small>
        </div>
        <nav className="catalogViewSwitch" aria-label="Pilihan tampilan katalog">
          <Link className={filters.view === "grid" ? "active" : ""} href={catalogHref(filters, { view: "grid" })} title="Grid nyaman"><LayoutGrid size={16} /> Grid</Link>
          <Link className={filters.view === "compact" ? "active" : ""} href={catalogHref(filters, { view: "compact" })} title="Grid ringkas"><Grid2X2 size={16} /> Ringkas</Link>
          <Link className={filters.view === "list" ? "active" : ""} href={catalogHref(filters, { view: "list" })} title="Daftar"><List size={16} /> Daftar</Link>
        </nav>
      </div>

      {visibleUnits.length === 0 ? (
        <div className="panel catalogEmptyState">
          <Search size={28} />
          <h3>Belum menemukan laptop yang cocok</h3>
          <p>Coba hapus beberapa filter, lihat semua unit ready, atau tanyakan kebutuhan langsung ke admin.</p>
          <div className="buttonRow">
            <Link className="primaryButton" href="/katalog#produk-ready">Lihat Semua Laptop</Link>
            <a className="secondaryButton" href="https://wa.me/62816660056?text=Assalamu%27alaikum%20FS%20Comp.%20Saya%20belum%20menemukan%20laptop%20yang%20sesuai%20di%20katalog." target="_blank" rel="noreferrer"><MessageCircle size={17} /> Tanya Admin</a>
          </div>
        </div>
      ) : null}
      {visibleWiradesa.length > 0 ? <CatalogSection title="Stok Wiradesa" subtitle="Lokasi utama" units={visibleWiradesa} returnTo={returnTo} view={filters.view} /> : null}
      {visibleKajen.length > 0 ? <CatalogSection title="Stok Kajen" subtitle="Lokasi secondary" units={visibleKajen} returnTo={returnTo} view={filters.view} /> : null}
    </section>
  );
}
