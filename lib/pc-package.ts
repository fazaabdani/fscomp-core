// Aturan murni untuk penjualan paket (PC rakitan): satu harga paket, komponen dicatat per baris dengan
// modal, serial number, dan garansi sendiri. Dipisah dari server action supaya mudah diuji.

export const PACKAGE_CATEGORY = "PAKET";
export const DEFAULT_PACKAGE_NAME = "Paket PC rakitan";

const ZERO_COST_ALLOWED = new Set(["JASA", "BONUS"]);

export type PackageComponent = {
  name: string;
  category: string;
  qty: number;
  unitCost: number;
  serialNumber: string;
  warrantyNote: string;
  inventoryItemId: string | null;
};

export type SaleLineInput = PackageComponent & { unitPrice: number };

/** Komponen paket yang modalnya 0 (selain jasa/bonus): modal wajib diisi supaya laba paket benar. */
export function componentsMissingCost(components: PackageComponent[]) {
  return components.filter((item) => item.qty > 0 && item.unitCost <= 0 && !ZERO_COST_ALLOWED.has(item.category.toUpperCase()));
}

/**
 * Susun baris transaksi paket: satu baris "PAKET" yang membawa harga total (modal 0), lalu komponen
 * dengan harga 0 dan modal masing-masing. Subtotal = harga paket; total modal = jumlah modal komponen.
 */
export function buildPackageLines(packageName: string, packagePrice: number, components: PackageComponent[]): SaleLineInput[] {
  const name = packageName.trim() || DEFAULT_PACKAGE_NAME;
  return [
    { name, category: PACKAGE_CATEGORY, qty: 1, unitCost: 0, unitPrice: Math.max(0, Math.round(packagePrice)), serialNumber: "", warrantyNote: "", inventoryItemId: null },
    ...components.filter((item) => item.name && item.qty > 0).map((item) => ({ ...item, unitPrice: 0 }))
  ];
}

/** Label garansi dari data inventaris, mis. (3, "YEAR") -> "3 tahun". Durasi 0 -> kosong. */
export function warrantyLabel(duration: number, unit: string) {
  if (!Number.isFinite(duration) || duration <= 0) return "";
  const labels: Record<string, string> = { DAY: "hari", WEEK: "minggu", MONTH: "bulan", YEAR: "tahun" };
  return `${duration} ${labels[unit] ?? "bulan"}`;
}

export function cleanLineText(value: string, max: number) {
  return value.replace(/\s+/g, " ").trim().slice(0, max);
}
