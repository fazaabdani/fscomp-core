// Helper SEO untuk halaman publik katalog (core.fscomp.id): judul/deskripsi ramah pencarian lokal
// dan penyusun JSON-LD. Data di database TIDAK diubah -- nama model internal hanya dirapikan saat render.
import { brandOf } from "./catalog-image";

export const SITE_URL = "https://core.fscomp.id";
export const SEO_CITY = "Pekalongan";
export const WARRANTY_SUMMARY = "garansi software 3 bulan, hardware 3 minggu";

const STORE_NAME = "FS Comp";
const STORE_URL = "https://fscomp.id";
// Google memotong judul sekitar 60 karakter; nama model + spek ditaruh di depan, merek toko di belakang.
const TITLE_MAX = 90;

export type SeoUnit = {
  id: string;
  model: string;
  processor: string;
  ram: string;
  ssd: string;
  stockLocation: string;
  hargaJualRekomendasi: number;
};

export function absoluteUrl(path: string) {
  if (/^https?:\/\//i.test(path)) return path;
  return `${SITE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}

function rupiah(value: number) {
  return `Rp ${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(value)}`;
}

// Catatan internal teknisi yang kadang ikut tertulis di nama model ("ADA WS DILAYAR", "WS di Layar").
const INTERNAL_NOTE = /\s*\b(?:ada\s+)?ws\s*(?:di\s*)?layar\b/gi;
const KEEP_UPPER = new Set(["hp", "nec", "amd", "vga", "pc", "aio", "lcd", "ssd", "hdd", "ram", "msi", "lg", "ibm", "gpu", "cpu"]);
const BRAND_CASE: Record<string, string> = {
  thinkpad: "ThinkPad",
  thinkbook: "ThinkBook",
  ideapad: "IdeaPad",
  zbook: "ZBook",
  elitebook: "EliteBook",
  probook: "ProBook",
  macbook: "MacBook",
  firepro: "FirePro",
  vivobook: "VivoBook",
  zenbook: "ZenBook"
};

// Salah ketik yang sudah ada di inventori; dibenarkan saat render supaya kata kunci merek tidak meleset.
const TYPO_FIX: Record<string, string> = {
  thosiba: "Toshiba",
  toshiba: "Toshiba"
};

function recase(word: string) {
  const lower = word.toLowerCase();
  if (TYPO_FIX[lower]) return TYPO_FIX[lower];
  if (/^i[3579]$/.test(lower)) return lower;
  if (BRAND_CASE[lower]) return BRAND_CASE[lower];
  if (KEEP_UPPER.has(lower) || /\d/.test(word)) return word.toUpperCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

// Nama model di inventori biasanya KAPITAL semua. Kalau operator sudah menulis campuran huruf
// besar-kecil, tulisannya dihormati dan hanya spasi/catatan internal yang dibersihkan.
export function cleanModelName(model: string) {
  const stripped = model
    .replace(INTERNAL_NOTE, " ")
    .replace(/\s+/g, " ")
    .replace(/^[\s,;:+–-]+|[\s,;:+–-]+$/g, "");
  const name = stripped || model.trim();
  if (/[a-z]/.test(name)) return name;
  return name.replace(/[A-Za-z0-9][A-Za-z0-9-]*/g, recase);
}

export function unitKind(model: string): "laptop" | "pc" {
  return /^\s*(?:pc\s+(?:set|desktop|rakitan)|mini\s*pc|aio\b|all[\s-]*in[\s-]*one)/i.test(model) ? "pc" : "laptop";
}

function kindTitle(model: string) {
  return unitKind(model) === "pc" ? "PC Second" : "Laptop Second";
}

function kindPhrase(model: string) {
  return unitKind(model) === "pc" ? "PC second" : "laptop second";
}

export function compactProcessor(raw: string) {
  const value = raw.replace(/\s+/g, " ").trim();
  const gen = value.match(/\bi([3579])\s*[- ]?\s*gen(?:erasi)?\s*(\d{1,2})\b/i);
  if (gen) return `i${gen[1]} Gen ${gen[2]}`;
  const model = value.match(/\bi([3579])[-\s]?(\d{4,5}[a-z]{0,2}\d?)\b/i);
  if (model) return `i${model[1]}-${model[2].toUpperCase()}`;
  return value
    .replace(/\(\s*(?:R|TM)\s*\)/gi, "")
    .replace(/\s+with\s+radeon\s+graphics/i, "")
    .replace(/\s+(?:cpu|processor)\b.*$/i, "")
    .replace(/^intel\s+core\s+/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Operator kadang menulis "8", "128G" atau "256 gb"; disamakan jadi "8GB" / "128GB".
function sizeLabel(value: string) {
  const bare = value.match(/^(\d+)\s*g?b?$/i);
  return bare ? `${bare[1]}GB` : value;
}

function compactMemory(raw: string) {
  return sizeLabel(raw.replace(/\s+/g, " ").trim());
}

function compactStorage(raw: string) {
  const value = sizeLabel(raw.replace(/\bnvme\b/gi, "").replace(/\s+/g, " ").trim());
  if (value.length <= 14) return value;
  const first = value.match(/\d+\s*(?:GB|TB)/i);
  return first ? first[0].replace(/\s+/g, "").toUpperCase() : value.slice(0, 14).trim();
}

function storageLabel(raw: string) {
  const value = sizeLabel(raw.replace(/\s+/g, " ").trim());
  return /ssd|hdd|nvme/i.test(value) ? value : `SSD ${value}`;
}

// Contoh: "Jual Dell Latitude 7410 i7 Gen 10 16GB 256GB — Laptop Second Pekalongan | FS Comp".
// Kalau terlalu panjang, spek dikurangi dari belakang (storage dulu, lalu RAM, lalu prosesor).
export function unitSeoTitle(unit: SeoUnit) {
  const name = cleanModelName(unit.model);
  const suffix = ` — ${kindTitle(unit.model)} ${SEO_CITY} | ${STORE_NAME}`;
  const cpu = compactProcessor(unit.processor);
  const ram = compactMemory(unit.ram);
  const storage = compactStorage(unit.ssd);
  const variants = [[cpu, ram, storage], [cpu, ram], [cpu], []];
  for (const specs of variants) {
    const title = ["Jual", name, ...specs.filter(Boolean)].join(" ") + suffix;
    if (title.length <= TITLE_MAX) return title;
  }
  return `Jual ${name}${suffix}`;
}

function specSummary(unit: SeoUnit) {
  return [compactProcessor(unit.processor), compactMemory(unit.ram), storageLabel(unit.ssd)].filter(Boolean).join(", ");
}

// Dijaga sekitar 160 karakter (batas potong Google); kata kunci lokal dan harga ditaruh di depan.
export function unitSeoDescription(unit: SeoUnit) {
  const name = cleanModelName(unit.model);
  return `Jual ${kindPhrase(unit.model)} ${SEO_CITY}: ${name} ${specSummary(unit)} — ${rupiah(unit.hargaJualRekomendasi)}. Stok ${unit.stockLocation}. QC ketat, ${WARRANTY_SUMMARY}.`;
}

export const CATALOG_SEO_TITLE = `Katalog Laptop Second ${SEO_CITY}, Harga & Spek Ready — ${STORE_NAME}`;
export const CATALOG_SEO_DESCRIPTION = `Daftar laptop second ready di ${SEO_CITY} (toko Wiradesa & Kajen): lengkap spek, harga, dan foto. Setiap unit lolos QC ketat, ${WARRANTY_SUMMARY}.`;

export const PC_BUILDER_SEO_TITLE = `Rakit PC Custom ${SEO_CITY} — Paket Rekomendasi & Cek Kompatibilitas | ${STORE_NAME}`;
export const PC_BUILDER_SEO_DESCRIPTION = `Rakit PC sesuai kebutuhan di ${STORE_NAME} ${SEO_CITY}: pilih paket rekomendasi atau susun komponen sendiri, cek kompatibilitas dan total harga otomatis. Garansi rakitan 1 tahun, pengerjaan 5–7 hari.`;

export type UnitAvailability = "InStock" | "OutOfStock" | "SoldOut";

export function productJsonLd(
  unit: SeoUnit & { lcdSize: string },
  options: { photos: string[]; highlight: string; availability: UnitAvailability }
) {
  const url = absoluteUrl(`/unit/${unit.id}`);
  const name = cleanModelName(unit.model);
  const pc = unitKind(unit.model) === "pc";
  const description = [
    `${name} — ${specSummary(unit)}.`,
    options.highlight,
    `${pc ? "PC" : "Laptop"} second sudah QC ketat FS Comp, stok ${unit.stockLocation}, ${WARRANTY_SUMMARY}.`
  ].filter(Boolean).join(" ");
  const properties: [string, string][] = [
    ["Prosesor", compactProcessor(unit.processor)],
    ["RAM", compactMemory(unit.ram)],
    ["Penyimpanan", storageLabel(unit.ssd)],
    ["Ukuran layar", unit.lcdSize === "-" ? "" : unit.lcdSize]
  ];

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${url}#product`,
    name,
    description,
    url,
    // nomorUnit hanya unik per batch (banyak unit bernomor "001"), jadi ID unit yang dipakai sebagai SKU.
    sku: unit.id,
    category: kindTitle(unit.model),
    brand: pc ? undefined : { "@type": "Brand", name: brandOf(name) },
    image: options.photos.length ? options.photos : undefined,
    additionalProperty: properties
      .filter(([, value]) => value)
      .map(([propertyName, value]) => ({ "@type": "PropertyValue", name: propertyName, value })),
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: "IDR",
      price: unit.hargaJualRekomendasi,
      itemCondition: "https://schema.org/UsedCondition",
      availability: `https://schema.org/${options.availability}`,
      seller: { "@type": "Organization", name: STORE_NAME, url: STORE_URL }
    }
  };
}

const ITEM_LIST_LIMIT = 100;

export function catalogJsonLd(units: { id: string; model: string }[]) {
  const listed = units.slice(0, ITEM_LIST_LIMIT);
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: CATALOG_SEO_TITLE,
    description: CATALOG_SEO_DESCRIPTION,
    url: absoluteUrl("/katalog"),
    inLanguage: "id-ID",
    mainEntity: listed.length
      ? {
          "@type": "ItemList",
          numberOfItems: listed.length,
          itemListOrder: "https://schema.org/ItemListUnordered",
          itemListElement: listed.map((unit, index) => ({
            "@type": "ListItem",
            position: index + 1,
            url: absoluteUrl(`/unit/${unit.id}`),
            name: cleanModelName(unit.model)
          }))
        }
      : undefined
  };
}
