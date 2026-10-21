/**
 * Aturan bagi hasil FS Comp -- SATU-SATUNYA tempat aturan ini ditulis. Dipakai halaman Finance, laporan
 * Finance, statistik halaman Penjualan, dan notifikasi WA transaksi baru. Jangan menyalin rumus ini ke
 * tempat lain; impor fungsi ini.
 *
 * Unit yang TERJUAL DI KAJEN (lokasi pada nota, bukan lokasi stok): laba kotor dibagi 60% ke Wiradesa dan
 * 40% ke Kajen. Penjualan di Wiradesa 100% masuk Wiradesa. Bagian Wiradesa dibulatkan, sisa selisih ke Kajen.
 */
export const KAJEN_SALE_WIRADESA_SHARE = 0.6;

export function saleProfitSplit(location: string, grossProfit: number) {
  if (location !== "KAJEN") {
    return {
      wiradesaShare: grossProfit,
      kajenShare: 0
    };
  }

  const wiradesaShare = Math.round(grossProfit * KAJEN_SALE_WIRADESA_SHARE);
  return {
    wiradesaShare,
    kajenShare: grossProfit - wiradesaShare
  };
}
