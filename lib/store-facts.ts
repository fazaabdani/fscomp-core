// Klaim publik tentang riwayat toko. BUKAN angka hitungan sistem: ini pernyataan pemilik (Faza, 27 Okt 2026)
// bahwa toko berdiri pertengahan Agustus 2020 dan sudah menjual ribuan laptop (catatan sistem Core baru
// ada sejak 21 Mei 2026). Kalau nanti ada total pasti dari catatan lama/marketplace, ganti teks di sini
// (mis. "2.500+ laptop terjual sejak Agustus 2020") -- jangan dinaikkan tanpa dasar yang bisa dibuktikan.
export const STORE_SINCE_LABEL = "Agustus 2020";
export const STORE_SOLD_CLAIM = `Ribuan laptop terjual sejak ${STORE_SINCE_LABEL}`;

// Jendela hitungan penjualan dari sistem yang ditampilkan di katalog (hari). 90 hari lebih stabil daripada 30 hari
// dan tidak anjlok saat bulan sepi / Ramadan.
export const RECENT_SOLD_WINDOW_DAYS = 90;
export const RECENT_SOLD_WINDOW_LABEL = "3 bulan terakhir";
