// Stok sparepart: satu baris = satu jenis barang dengan jumlah. Dipakai halaman kelola dan halaman berbagi publik.

export const SPAREPART_CATEGORIES = [
  { id: "LED", label: "LED / LCD laptop" },
  { id: "BATERAI", label: "Baterai" },
  { id: "KEYBOARD", label: "Keyboard" },
  { id: "CHARGER", label: "Charger" },
  { id: "SSD", label: "SSD / HDD" },
  { id: "RAM", label: "RAM" },
  { id: "ENGSEL", label: "Engsel & casing" },
  { id: "KIPAS", label: "Kipas & pendingin" },
  { id: "KABEL", label: "Kabel & konektor" },
  { id: "LAINNYA", label: "Lainnya" }
] as const;

export type SparepartCategoryId = (typeof SPAREPART_CATEGORIES)[number]["id"];

const CATEGORY_IDS = new Set<string>(SPAREPART_CATEGORIES.map((c) => c.id));

export function isSparepartCategory(value: string): value is SparepartCategoryId {
  return CATEGORY_IDS.has(value);
}

export function sparepartCategoryLabel(id: string) {
  return SPAREPART_CATEGORIES.find((c) => c.id === id)?.label ?? id;
}

export type StockState = "habis" | "menipis" | "ada";

export function stockState(qty: number, minQty: number): StockState {
  if (qty <= 0) return "habis";
  if (qty <= minQty) return "menipis";
  return "ada";
}

export const STOCK_LABEL: Record<StockState, string> = { habis: "Habis", menipis: "Menipis", ada: "Ready" };

// Menebak ukuran, jumlah pin, resolusi, dan ketebalan panel dari teks bebas ("LED 14.0 slim 30 pin FHD").
export function extractLedSpec(text: string) {
  const t = text.replace(/\s+/g, " ");
  const size = t.match(/(\d{2}(?:[.,]\d)?)\s*(?:"|''|inch|inci|in\b)/i) ?? t.match(/\b(1[0-9](?:[.,]\d)?|2[0-9](?:[.,]\d)?)\b(?!\s*pin)/);
  const pins = t.match(/(\d{2})\s*[- ]?pin/i);
  const resolution = t.match(/\b(FHD|WUXGA|QHD|4K|UHD|HD\+?|1920\s*[x*]\s*1080|1366\s*[x*]\s*768)\b/i);
  const thickness = t.match(/\b(slim|tipis|standar|standard|tebal|thick)\b/i);
  const normalizedThickness = thickness ? (/slim|tipis/i.test(thickness[1]) ? "Slim" : "Standar") : null;
  let res: string | null = null;
  if (resolution) {
    const r = resolution[1].toUpperCase().replace(/\s+/g, "");
    res = r.startsWith("1920") ? "FHD" : r.startsWith("1366") ? "HD" : r;
  }
  return {
    sizeInch: size ? size[1].replace(",", ".") : null,
    pins: pins ? `${pins[1]} pin` : null,
    resolution: res,
    thickness: normalizedThickness
  };
}

export type BulkRow = { name: string; spec: string | null; qty: number; costPrice: number; salePrice: number | null; compat: string | null };

function toInt(value: string | undefined) {
  if (!value) return 0;
  const digits = value.replace(/[^\d]/g, "");
  return digits ? Math.min(Number(digits), 1_000_000_000) : 0;
}

// Satu baris = satu barang. Kolom dipisah tab (tempel dari Excel) atau tanda |:
// nama | spek | jumlah | modal | harga jual | cocok untuk
export function parseBulk(text: string): { rows: BulkRow[]; skipped: number } {
  const rows: BulkRow[] = [];
  let skipped = 0;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const cols = line.split(/\t|\|/).map((c) => c.trim());
    const name = cols[0]?.slice(0, 200);
    if (!name) {
      skipped += 1;
      continue;
    }
    if (/^nama\b/i.test(name)) continue; // baris judul kolom dari Excel
    const qty = cols[2] ? toInt(cols[2]) : 1;
    rows.push({
      name,
      spec: cols[1] ? cols[1].slice(0, 300) : null,
      qty,
      costPrice: toInt(cols[3]),
      salePrice: cols[4] ? toInt(cols[4]) || null : null,
      compat: cols[5] ? cols[5].slice(0, 500) : null
    });
  }
  return { rows: rows.slice(0, 500), skipped };
}
