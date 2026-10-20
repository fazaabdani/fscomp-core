// Aturan murni (tanpa database) untuk kasir: pembayaran bertahap, potongan marketplace, dan
// pengecekan modal. Dipisah supaya gampang diuji dan dipakai ulang di server action maupun halaman.

export const MARKETPLACES = ["Shopee", "Tokopedia", "TikTok Shop", "Lazada", "Lainnya"] as const;
export const PAYMENT_METHODS = ["Cash", "Transfer"] as const;

// Kategori yang memang boleh bermodal Rp 0 saat dijual (jasa & barang gratis).
const ZERO_COST_ALLOWED = new Set(["JASA", "BONUS", "LAPTOP"]);

export type CostCheckItem = { name: string; category: string; qty: number; unitPrice: number; unitCost: number };

/** Item berharga jual > 0 tapi modal 0, selain kategori yang memang boleh (jasa/bonus/laptop). */
export function itemsMissingCost(items: CostCheckItem[]) {
  return items.filter((item) => item.qty > 0 && item.unitPrice > 0 && item.unitCost <= 0 && !ZERO_COST_ALLOWED.has(item.category.toUpperCase()));
}

export function marketplaceNameValue(raw: string) {
  const clean = raw.trim();
  return (MARKETPLACES as readonly string[]).includes(clean) ? clean : "";
}

/** Potongan admin tidak boleh negatif dan tidak boleh melebihi total transaksi. */
export function clampMarketplaceFee(rawFee: number, subtotal: number) {
  if (!Number.isFinite(rawFee) || rawFee <= 0) return 0;
  return Math.min(Math.round(rawFee), Math.max(0, subtotal));
}

export type PaymentFacts = { paymentMethod: string; subtotal: number; dpAmount: number; paymentCount: number };

/**
 * Apakah transaksi ini benar-benar punya tagihan yang belum lunas?
 * Sistem lama tidak mengisi dpAmount untuk Cash/Transfer (dianggap lunas seketika), jadi ratusan
 * transaksi lama tampak "dpAmount 0 < total" padahal sudah lunas. Maka belum lunas hanya kalau:
 * metode DP, atau sudah memakai riwayat pembayaran, atau (data lama) tercatat sebagian (dpAmount > 0).
 */
export function isReceivable(facts: PaymentFacts) {
  if (facts.dpAmount >= facts.subtotal) return false;
  if (facts.paymentMethod === "DP") return true;
  if (facts.paymentCount > 0) return true;
  return facts.dpAmount > 0;
}

/** Transaksi lama non-DP yang tercatat dibayar sebagian: tidak jelas lunas atau belum, perlu dicek admin. */
export function isLegacyPartial(facts: PaymentFacts) {
  return isReceivable(facts) && facts.paymentMethod !== "DP" && facts.paymentCount === 0;
}

export function paymentStatus(facts: PaymentFacts) {
  const receivable = isReceivable(facts);
  const paid = receivable ? facts.dpAmount : Math.max(facts.dpAmount, facts.subtotal);
  const remaining = receivable ? facts.subtotal - facts.dpAmount : 0;
  return { paid, remaining, settled: !receivable };
}

/** Uang yang benar-benar diterima setelah potongan marketplace. */
export function netReceived(subtotal: number, marketplaceFee: number) {
  return Math.max(0, subtotal - marketplaceFee);
}

/** Umur piutang dalam hari penuh (kalender Jakarta, UTC+7). */
export function receivableAgeDays(soldAt: Date, now = new Date()) {
  const day = (date: Date) => Math.floor((date.getTime() + 7 * 3600 * 1000) / 86_400_000);
  return Math.max(0, day(now) - day(soldAt));
}
