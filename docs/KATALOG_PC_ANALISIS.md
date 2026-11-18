# Analisis: Katalog PC (fscomp.id/pc) — 18 Nov 2026

Status: ANALISIS, belum ada yang dibangun. Arahan owner: laptop tetap memakai tautan sekarang (`fscomp.id/katalog`); PC punya tautan utama berbeda; di katalog laptop cukup ada penanda kecil bahwa PC juga ada, tanpa mengganggu pembeli laptop; katalog PC memuat PC beserta monitor dan sejenisnya; ada status second dan baru.

## 1. Data yang ada (database produksi, 18 Nov 2026)

- **Skala minat PC kecil.** Halaman Rakit PC hanya 28 kejadian dalam 30 hari, dibanding 1.447 tampilan halaman katalog (sekitar 2%). Draft Rakit PC yang tersimpan: 0. Penjualan: 348 baris laptop; PC hanya beberapa (set PC i5 gen 6 + monitor 24 inci Rp6,2 juta second; paket rakitan Ryzen 5 7500F + RTX 4060 Rp34,5 juta baru; monitor Samsung/LG 22 inci Rp1,2 juta). Konsekuensi: penanda di katalog laptop harus sangat halus.
- **Stok PC siap jual sekarang:** 1 unit (PC set + monitor 22 inci, Ryzen 5 PRO 4650G, 16 GB, SSD NVMe 128 GB + 500 GB, Rp5,7 juta, Wiradesa). 1 all-in-one Acer sudah terjual.
- **Rakit PC (builder) hidup:** 1 paket rekomendasi ("Standart Office", mulai Rp2,4 juta), komponen aktif: CPU 3, motherboard 3, RAM 2, storage 3, PSU 1, casing 1, cooler 1, **monitor 3**, aksesoris 1. Pre-order 5–7 hari, garansi rakitan 1 tahun (teks halaman).
- **Inventori non-laptop** (aksesoris 71, charger 12, SSD 10, RAM 4, dll.) belum punya harga jual di data (hanya harga modal), jadi belum bisa langsung jadi etalase.
- **Tidak ada kolom jenis produk maupun kondisi (second/baru)** di tabel `Unit`; PC set hanya bisa dikenali dari nama model ("PC SET ...", "ACER ALL-IN-ONE ...").

## 2. PC set atau PC only

| | PC set (CPU + monitor + keyboard/mouse) | PC only (tanpa monitor) |
|---|---|---|
| Pembeli | kantor kecil, sekolah, UMKM, rumahan | gamer, yang sudah punya monitor |
| Bukti di data | satu-satunya PC second yang laku (set + monitor 24") | muncul sebagai rakitan baru (RTX 4060) |
| Perbandingan harga | mudah, satu angka lengkap | pembeli membandingkan dengan harga komponen |

Rekomendasi: **PC set sebagai tampilan utama** (kartu "PC set, termasuk monitor"), **PC only sebagai opsi** ("tanpa monitor"), dan monitor ditawarkan terpisah. PC only paling sering lewat Rakit PC (baru).

## 3. Second dan baru

Perlu, dan wajib tampil jelas di tiap kartu ("Second" atau "Baru"), karena garansi dan kepercayaannya beda: monitor Samsung terjual dengan garansi resmi; laptop second memakai garansi toko (hardware 3 minggu, software 3 bulan). **Garansi PC dan monitor second belum dikonfirmasi owner**, jadi tiap kartu harus punya catatan garansi sendiri, bukan menyalin garansi laptop.

## 4. Struktur data yang disarankan

Tambah ke `Unit` (default tidak mengubah laptop yang ada): `productType` (LAPTOP, PC_SET, PC_ONLY, AIO, MONITOR), `condition` (SECOND, NEW), dan teks `includes` (isi paket). Monitor tunggal bisa memakai komponen monitor di Rakit PC (sudah punya harga jual dan status aktif) supaya tidak perlu fitur baru. Alternatif tanpa migrasi: mengenali lewat nama model, tapi rapuh.

## 5. Tampilan

- **Katalog laptop:** satu baris kecil di bawah kolom pencarian ("Cari PC lengkap dengan monitor? Lihat katalog PC"), tanpa banner, tidak masuk menu utama.
- **Katalog PC:** `fscomp.id/pc` → halaman di core; filter Semua, PC set, Monitor, Aksesoris; badge Second/Baru; tautan balik "Cari laptop? Katalog laptop"; tetap memuat tombol Rakit PC custom dan Chat admin supaya halaman tidak sepi saat stok tipis.
- **Pratinjau WhatsApp:** gambar khusus PC, pola yang sama seperti `fscomp.id/katalog` (middleware + halaman Open Graph).

## 6. Pertanyaan untuk owner

1. Garansi PC set second dan monitor second/baru: berapa lama, apa yang ditanggung.
2. Isi "PC set": monitor, keyboard, mouse, kabel? Berbeda per unit?
3. Stok PC second rutin atau sesekali? Kalau sesekali, halaman cukup "pesan lewat admin" plus Rakit PC.
4. PC baru: hanya rakitan sendiri, atau juga merek jadi?
5. Monitor: dijual second juga, atau baru saja?

## 7. Batch tersendiri untuk PC (usul owner, 18 Nov 2026)

Temuan: `BatchPSI` = satu pengiriman dari satu supplier (66 batch, penamaan `SUPPLIER-TANGGAL`), membawa tempo dan status pembayaran; rekap pembayaran (`lib/batch-payment-data.ts`), rekap terjual, retur, dan dashboard dihitung per batch. Dua PC yang ada saat ini sudah masing-masing di batch sendiri (`USER-2026-08-01` dari Ahmad Sahowi, `NISA-2026-10-06` dari Nisa Isol), terpisah dari batch laptop.

Rekomendasi: **ya, PC dibuat batch tersendiri**, bukan dicampur ke batch laptop.
- Alasan: batch laptop membawa angka khas laptop (`jumlahLaptopDatang`, jumlah charger, rasio retur, lama terjual). PC di dalamnya mengacaukan angka itu dan rekap pembayarannya.
- Tidak perlu sistem batch baru: pakai `BatchPSI` yang sama, tambah penanda `jenis` (LAPTOP bawaan, PC) supaya rekap, retur, dan dashboard bisa disaring per jenis. Tanpa penanda itu, pemisahan hanya lewat nama batch (rapuh).
- Pengecualian: kalau satu nota supplier memuat laptop dan PC sekaligus (satu transfer), tetap satu batch; rekap menampilkan subtotal per `productType` (kolom yang diusulkan di bagian 4).
- Monitor dan aksesoris: tidak lewat batch. Mereka sudah punya rekap sendiri di Inventori (supplier, nomor nota, tanggal beli, harga modal).
- PC tidak punya checklist QC laptop (baterai, dll.); status `VERIFIED` perlu diisi manual agar ikut terhitung di rekap pembayaran. Checklist QC khusus PC bisa menyusul bila stoknya mulai rutin.

## 8. KEPUTUSAN OWNER (18 Nov 2026): laptop dan PC dipisah; PC boleh campur dengan non-laptop lain

Alasan owner: pemasukan terbesar dari laptop, jadi laptop tidak boleh tercampur.

Dampak pada rancangan (menggantikan bagian 4 dan 7 yang mengusulkan kolom `productType` di `Unit` dan penanda jenis di batch):
- **Laptop tidak diubah sama sekali.** `BatchPSI` dan `Unit` tetap khusus laptop; rekap pembayaran, retur, terjual, dan dashboard laptop tidak tersentuh.
- **Semua non-laptop (PC set, PC only, all-in-one, monitor, aksesoris, printer, dll.) di satu sisi: Inventori.** `InventoryItem` sudah punya supplier, nomor nota, tanggal beli, garansi, status, dan harga modal. Yang perlu ditambah supaya bisa tampil di katalog: harga jual, kondisi (second/baru), isi paket (mis. "termasuk monitor 22 inci, keyboard, mouse"), foto, dan penanda "tampil di katalog PC".
- **Rekap non-laptop** dibaca per supplier dan nomor nota di Inventori, terpisah dari rekap batch laptop.
- **Katalog PC (`fscomp.id/pc`)** membaca dari item Inventori non-laptop yang ditandai tampil, bukan dari `Unit`. Katalog laptop tidak bersinggungan.
- **Yang perlu diputuskan:** nasib 1 PC set yang masih tercatat sebagai `Unit` (1-A6, batch `NISA-2026-10-06`, belum terjual) dan 1 all-in-one yang sudah terjual (batch `USER-2026-08-01`). Usul: PC set 1-A6 dipindah menjadi item Inventori non-laptop saat fitur ini jadi; all-in-one terjual dibiarkan sebagai riwayat.

## 9. STATUS IMPLEMENTASI (18 Nov 2026) — LIVE

- **Core** (`e07c099e`): halaman `core.fscomp.id/katalog/pc` (PC set dan rakitan, monitor, komponen satuan, aksesoris; badge Second/Baru dan Ready/Pre-order; tombol Tanya via WA per barang). Sumber data: `InventoryItem` yang dicentang "Tampilkan di katalog PC" (status Stok, harga jual > 0) + komponen dan paket Rakit PC yang sudah ada (19 barang saat peluncuran). Form Edit Inventori punya panel "Katalog PC" (jenis, kondisi, harga jual, isi paket, garansi, link foto, urutan). Kategori baru di Inventori: PC set, PC only, All-in-one, Monitor. Penanda satu baris "Butuh PC atau monitor juga? Lihat katalog PC" di bawah judul katalog laptop. Fesi tidak tampil di halaman PC.
- **Landing** (`7885bea`): `fscomp.id/pc` → katalog PC, pratinjau WhatsApp sendiri (`og-pc.jpg`). `fscomp.id/katalog` tetap laptop.
- **Migrasi** `202611180001_katalog_pc_inventori` (aditif, idempoten) dijalankan manual di produksi lebih dulu; cadangan database penuh: `~/db-pra-katalog-pc-20261118.sql.gz` di server toko.
- **PC set 1-A6 dipindah ke Inventori** sebagai item `cpcset6dc34f8cf9c76e8bc5` (PC set, Second, Rp5.700.000, isi paket "monitor 22 inci", foto dari unit). **Tidak dihapus dari sisi keuangan:** Unit 1-A6 dan batch `NISA-2026-10-06` (modal Rp4.400.000, status pembayaran belum jatuh tempo) tetap utuh agar tagihan supplier dan riwayat QC tidak hilang. Unit itu disembunyikan dari katalog laptop publik dan sitemap lewat aturan nama model "PC SET". Konsekuensi: di dalam sistem PC set tercatat dua kali (Unit dan Inventori); jangan dihitung ganda. Saat PC set terjual, tandai item Inventori sebagai Terjual dan selesaikan Unit 1-A6 (usul: setelah supplier NISA ISOL dibayar, Unit/batch itu diarsipkan).
- **Belum diisi owner:** garansi per barang (kolom kosong, tidak ditampilkan), isi paket lain (foto PC set menunjukkan keyboard, mouse, mousepad; belum dikonfirmasi ikut dijual), kondisi second/baru untuk komponen Rakit PC (nama "HARDDISK 2ND", "SSD 2ND" mengindikasikan second, tapi komponen Rakit PC belum punya kolom kondisi), foto barang lain.
