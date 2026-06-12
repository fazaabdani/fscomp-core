import Link from "next/link";
import { CheckCircle2, MapPin, MessageCircle, Search, SlidersHorizontal } from "lucide-react";
import { CopyWaButton } from "@/app/CopyWaButton";
import { CatalogPhoto } from "@/app/components/CatalogPhoto";
import { formatRupiah } from "@/lib/api";
import { getCatalogPageData } from "@/lib/catalog-page-data";

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

type CatalogFilters = {
  q: string;
  sort: string;
  lokasi: string;
  merek: string;
  ram: string;
  storage: string;
  windows: string;
};

function singleParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function brandOf(model: string) {
  const normalized = model.trim().toUpperCase();
  if (normalized.startsWith("LENOVO")) return "Lenovo";
  if (normalized.startsWith("HP")) return "HP";
  if (normalized.startsWith("DELL")) return "Dell";
  if (normalized.startsWith("ASUS")) return "Asus";
  if (normalized.startsWith("ACER")) return "Acer";
  if (normalized.startsWith("TOSHIBA")) return "Toshiba";
  if (normalized.startsWith("ADVAN")) return "Advan";
  return model.trim().split(/\s+/)[0] || "Lainnya";
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

function queryUrl(filters: CatalogFilters, overrides: Partial<CatalogFilters>) {
  const next = { ...filters, ...overrides };
  const params = new URLSearchParams();
  Object.entries(next).forEach(([key, value]) => {
    if (value && !(key === "sort" && value === "unit") && !(key === "lokasi" && value === "semua")) {
      params.set(key, value);
    }
  });
  const query = params.toString();
  return query ? `/katalog?${query}#produk-ready` : "/katalog#produk-ready";
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

function activeFilterText(filters: CatalogFilters) {
  const parts = [
    filters.q ? `cari "${filters.q}"` : "",
    filters.lokasi !== "semua" ? `lokasi ${filters.lokasi}` : "",
    filters.merek ? `merek ${filters.merek}` : "",
    filters.ram ? `RAM ${filters.ram}` : "",
    filters.storage ? `SSD ${filters.storage}` : "",
    filters.windows ? filters.windows : ""
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : "semua unit ready";
}

function catalogShareText(units: CatalogUnit[], filters: CatalogFilters) {
  const lines = [
    "Katalog Laptop Ready FS Comp",
    `Filter: ${activeFilterText(filters)}`,
    `Total: ${units.length} unit`,
    "",
    ...units.map((unit, index) => [
      `${index + 1}. Unit ${unit.nomorUnit} - ${unit.model}`,
      `   ${unit.processor} / ${unit.ram} / ${unit.ssd}`,
      `   ${formatRupiah(unit.hargaJualRekomendasi)} - ${unit.stockLocation}`,
      `   Detail: https://core.fscomp.id/unit/${unit.id}`
    ].join("\n")),
    "",
    "Chat admin: 0816660056"
  ];
  return lines.join("\n");
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

function CatalogPageStyles() {
  return (
    <style dangerouslySetInnerHTML={{ __html: `
      .catalogFilterPanel {
        display: grid;
        grid-template-columns: repeat(7, minmax(0, 1fr));
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
        grid-column: 1 / -1;
        gap: 8px;
        align-items: center;
        justify-content: flex-end;
      }

      .catalogFilterActions .primaryButton,
      .catalogFilterActions .secondaryButton {
        min-height: 42px;
        white-space: nowrap;
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
        font-size: 18px;
        line-height: 1.25;
      }

      @media (max-width: 820px) {
        .catalogFilterPanel {
          grid-template-columns: 1fr;
        }

        .catalogSearchField {
          grid-column: auto;
        }

        .catalogFilterActions {
          justify-content: stretch;
        }

        .catalogFilterActions .primaryButton,
        .catalogFilterActions .secondaryButton {
          flex: 1;
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
    windows: singleParam(searchParams?.windows)
  };
  const allRawUnits = [...wiradesaUnits, ...kajenUnits];
  const visibleUnits = sortUnits(filterUnits(allRawUnits, filters), filters.sort);
  const visibleWiradesa = filters.lokasi === "kajen" ? [] : visibleUnits.filter((unit) => unit.stockLocation === "Wiradesa");
  const visibleKajen = filters.lokasi === "wiradesa" ? [] : visibleUnits.filter((unit) => unit.stockLocation === "Kajen");
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
    <section className="pageStack katalogPage">
      <CatalogPageStyles />
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

      <form className="catalogFilterPanel" action="/katalog#produk-ready">
        <input type="hidden" name="sort" value={filters.sort} />
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
        <div className="catalogFilterActions">
          <button className="primaryButton" type="submit"><SlidersHorizontal size={16} /> Terapkan</button>
          <Link className="secondaryButton" href="/katalog#produk-ready">Reset</Link>
        </div>
      </form>

      <div className="catalogSortBar">
        <div>
          <strong>{visibleUnits.length}</strong>
          <span>dari {total} unit ready</span>
        </div>
        <CopyWaButton text={catalogShareText(visibleUnits, filters)} disabled={visibleUnits.length === 0} />
        <Link className={`sortPill ${filters.lokasi === "semua" ? "active" : ""}`} href={queryUrl(filters, { lokasi: "semua" })}>Semua ({total})</Link>
        <Link className={`sortPill ${filters.lokasi === "wiradesa" ? "active" : ""}`} href={queryUrl(filters, { lokasi: "wiradesa" })}>Wiradesa ({wiradesaUnits.length})</Link>
        <Link className={`sortPill ${filters.lokasi === "kajen" ? "active" : ""}`} href={queryUrl(filters, { lokasi: "kajen" })}>Kajen ({kajenUnits.length})</Link>
        <Link className={`sortPill ${filters.sort === "unit" ? "active" : ""}`} href={queryUrl(filters, { sort: "unit" })}>Urut unit</Link>
        <Link className={`sortPill ${filters.sort === "harga-termurah" ? "active" : ""}`} href={queryUrl(filters, { sort: "harga-termurah" })}>Termurah</Link>
        <Link className={`sortPill ${filters.sort === "harga-tertinggi" ? "active" : ""}`} href={queryUrl(filters, { sort: "harga-tertinggi" })}>Tertinggi</Link>
        <Link className={`sortPill ${filters.sort === "ram-terbesar" ? "active" : ""}`} href={queryUrl(filters, { sort: "ram-terbesar" })}>RAM besar</Link>
        <Link className={`sortPill ${filters.sort === "ssd-terbesar" ? "active" : ""}`} href={queryUrl(filters, { sort: "ssd-terbesar" })}>SSD besar</Link>
        <Link className={`sortPill ${filters.sort === "nama" ? "active" : ""}`} href={queryUrl(filters, { sort: "nama" })}>Nama</Link>
      </div>

      {visibleUnits.length === 0 ? <div className="panel emptyState">Tidak ada unit yang cocok dengan filter ini.</div> : null}
      <CatalogSection title="Stok Wiradesa" subtitle="Lokasi utama" units={visibleWiradesa} />
      <CatalogSection title="Stok Kajen" subtitle="Lokasi secondary" units={visibleKajen} />
    </section>
  );
}
