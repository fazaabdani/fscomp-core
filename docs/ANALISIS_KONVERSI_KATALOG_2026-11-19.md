# Analisis konversi katalog laptop (19 Nov 2026)

Sumber: tabel `CatalogEvent` (27 Okt – 19 Nov 2026), `Unit`, `Sale` di database produksi. Contoh kecil (69 sesi klik WhatsApp), jadi angka = arah, bukan bukti pasti.

## Corong (funnel)
- 1.060 sesi, 483 pengunjung, 87% dari HP.
- 40% sesi membuka detail unit; 6,5% klik WhatsApp (HP 7,0%, desktop 3,8%).
- 60% sesi tidak membuka satu unit pun; 67% hanya satu halaman.
- Median 1,6 menit dari datang sampai klik WA (keputusan cepat).
- Klik WA: minimal 53% (41 dari 77) langsung dari kartu di daftar, bukan dari halaman detail.

## Temuan utama
1. **Penjualan mengikuti stok masuk, bukan hanya kunjungan.** Stok siap jual sekarang 26 unit; median terjual 7 hari. Unit masuk per bulan: Jun 65, Jul 52, Agu 57, Sep 85, Okt 57, Nov 30 (19 hari). Terjual: 36, 42, 48, 60, 38, 17.
2. **Kekurangan stok murah.** Per unit ready (30 hari): <=3jt = 4 unit, 127 lihat, 15 klik WA (3,75 WA/unit); 3-5jt = 14 unit, 6 WA (0,43/unit); >5jt = 8 unit, 8 WA (1,0/unit).
3. **Terlalu bergantung ke Lenovo.** 112 dari 138 terjual 90 hari = Lenovo (81%). Pencarian nol hasil: yoga (14x), t14, asus, vivobook, "laptop".
4. **Pencarian rusak untuk kalimat biasa** (cocok seluruh ketikan sebagai satu potongan). 16% pencarian nol hasil.
5. **Pengunjung kembali konversi 5x.** 165 pengunjung kembali: 43 klik WA (26%); 319 sekali datang: 16 (5%). Tidak ada mekanisme membawa orang kembali.
6. **Jam ramai bukan jam kerja.** Puncak 19-23 WIB dan 00-04 WIB; jam 08-17 sepi. 21 dari 77 klik WA jatuh jam 01-03 dini hari. Kecepatan membalas belum diketahui.
7. **Sumber:** langsung 730 sesi (5,9% WA), situs fscomp.id 135 (8,1%), Facebook 89 (5,6%), ChatGPT 38 (21,1%, terbaik), Linktree 24 (0%), Instagram 17 (11,8%), TikTok 16 (6,3%), Google 11 (0%).
8. **Fesi (asisten) muncul otomatis 131 kali, ditutup 82 kali, dibuka sengaja hanya 7 kali.** Kebutuhan terbanyak: kerja 13, kuliah 12, budget <3jt 12, 3-5jt 7. Tidak terbukti menaikkan klik WA (7,5% vs 6,5%).
9. **Atribusi (30 hari):** 28 unit terjual; 71% pernah dilihat di katalog, 43% ada klik WA sebelum terjual. Kanal penjualan 90 hari: 137 langsung (toko/WA), 1 Shopee.
10. **Halaman detail:** 0 dari 26 unit ready punya deskripsi katalog; 25 dari 26 punya >=3 foto. Unit >Rp5jt banyak dilihat tapi jarang diklik (T14 G2 Rp7,1jt: 30 lihat, 2 WA).
11. **Teknis baik:** TTFB 0,17-0,21 dtk; judul, deskripsi, schema Product, dan sitemap (25 unit) sudah ada. Trafik Google hanya 11 sesi.
12. **Tampilan:** 54 kali beralih ke Daftar, 48 ke Ringkas, hampir tak ada yang bertahan di Grid.

## Hal yang belum terukur
Klik WA -> chat nyata -> beli (belum tercatat). Kecepatan balas chat. Asal pembeli di kasir.

## Koreksi saya sendiri
Saya sempat menyembunyikan tombol "Tanya Unit" di kartu HP; data menunjukkan sebagian besar klik WA berasal dari kartu, maka tombol dikembalikan (commit ab61c9db).
