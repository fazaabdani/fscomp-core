# Status koreksi audit Core

## Selesai di PR keamanan

- Password hardcoded dihapus dan password database dimigrasikan ke bcrypt saat login.
- Cookie sesi ditandatangani dan role tidak lagi dipercaya dari JSON browser.
- Endpoint integrasi, export batch, dan backup dilindungi sesi atau token.
- Password dihapus dari export user dan backup JSON.
- Placeholder login tidak membocorkan username staf.

## Selesai di PR operasional

- Harga kasir mengikuti unit yang dipilih.
- Checker QC mengikuti akun login.
- Perubahan lokasi stok dibatasi ke admin, dikonfirmasi, dan masuk `UnitAuditLog`.
- Dropdown navigasi mendukung tap dan klik di luar.
- Finance menggunakan istilah estimasi profit kotor.
- Pesan batch, sales, inventaris, dan lisensi memakai flash notice serta membersihkan query status.
- Inter, breakpoint HP kecil, focus-visible, danger button, loading, error boundary, robots, dan sitemap ditambahkan.
- AI log dikelompokkan per unit dan halaman label memiliki shortcut unit berikutnya.
- Dashboard dan QC refresh otomatis setiap lima menit saat tab aktif.
- Sort unit batch berjalan client-side tanpa reload halaman.
- Input server utama divalidasi dengan Zod.
- Partikel latar dikurangi pada perangkat mobile.
- CSS operasional dipecah menjadi file base, panel, dan responsive/print.

## Tidak memerlukan perubahan

- Foto katalog memakai elemen `img` dengan fallback kandidat URL, bukan `next/image`; konfigurasi image domain Next.js tidak diperlukan.
- Schema database tidak berubah sehingga tidak ada migration baru untuk PR operasional.

## Sebelum deployment

1. Siapkan environment variable keamanan sesuai `SECURITY_DEPLOYMENT.md`.
2. Pastikan workflow n8n mengirim header token yang sesuai.
3. Merge PR operasional dan keamanan setelah backup database.
4. Jalankan build Coolify dan smoke test login, kasir, QC, batch, katalog, serta Rakit PC.
