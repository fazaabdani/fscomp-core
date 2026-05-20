# Database dan AI FS Comp Core

## Database Disimpan Di Mana

Untuk production, simpan database di PostgreSQL yang dibuat sebagai service terpisah di Coolify.

Alurnya:

```text
core.fscomp.id
  -> Next.js FS Comp Core
  -> Prisma
  -> PostgreSQL Coolify
```

Isi environment variable app:

```env
DATABASE_URL="postgresql://user:password@host:5432/fscomp_core"
CORE_PUBLIC_URL="https://core.fscomp.id"
OPENAI_API_KEY=""
OPENAI_MODEL=""
```

## Cara Nyambung Database

1. Buat service PostgreSQL di Coolify.
2. Copy connection string ke `DATABASE_URL`.
3. Install dependency:

```bash
npm install
npx prisma generate
npx prisma migrate deploy
```

4. Setelah itu data dummy di `lib/api.ts` diganti bertahap menjadi query Prisma dari database.

Di versi ini, halaman Batch PSI sudah mulai membaca PostgreSQL jika database tersedia. Kalau database kosong atau belum tersambung, halaman masih fallback ke data demo supaya website tidak blank.

Jika `npm run db:migrate` menampilkan `No migration found in prisma/migrations`, berarti versi project yang ter-deploy belum membawa folder migration. Upload versi terbaru yang memiliki folder `prisma/migrations`, redeploy, lalu jalankan lagi:

```bash
npm run db:migrate
```

## Total Tabel Utama

Total ada **7 tabel utama**:

1. `User` untuk admin, teknisi, dan anak magang.
2. `BatchPSI` untuk batch masuk, supplier, tempo, dan pembayaran.
3. `Unit` untuk data laptop, spek, harga jual, status, dan identitas unit.
4. `QcAwal` untuk QC lengkap saat unit pertama kali dicek.
5. `QcHarian` untuk pengecekan harian termasuk SSD health dan battery health angka.
6. `AiLog` untuk rekomendasi AI dan histori keputusan.
7. `CatalogSync` untuk status kirim/tampil ke katalog.fscomp.id.

## Input Data Laptop Kapan

Data laptop masuk dalam dua tahap:

1. Saat batch PSI dibuat atau di-import dari spreadsheet:
   - Admin atau teknisi input/import merk, seri, processor, RAM, SSD, layar, qty, dan problem awal dari PSI.
   - Tahap ini hanya memastikan unit yang datang sesuai list PSI.
   - Unit hasil import otomatis masuk status `RECHECK`, belum siap katalog.

2. Saat QC awal:
   - Teknisi melengkapi data teknis: seri SSD, ukuran LCD, resolusi layar, touchscreen, USB, kamera, touchpad, trackpoint, speaker, mic, body broken, karet bawah, repaint, battery health, SSD health, OS, driver, update, dan catatan.

QC harian tidak membuat unit baru. QC harian hanya update kondisi hari itu.

3. Saat unit sudah lengkap:
   - Status diubah menjadi `VERIFIED` atau `VERIFIED WITH NOTES`.
   - Baru boleh masuk katalog dan spreadsheet katalog.

## User dan Hak Akses

Ada 3 role:

| Role | Siapa | Hak Akses |
| --- | --- | --- |
| Admin | Faza, Zume | Semua data, harga modal, harga jual, batch, user, AI log, katalog |
| Teknisi | Ludfy, Rosyadi | Input/edit unit, QC awal, QC harian, batch PSI, tidak kelola user |
| Magang | Anak magang | QC harian dan lihat detail unit seperlunya, tidak edit harga modal/batch |

## QR dan Label

QR code hanya mengarah ke detail unit di `core.fscomp.id/unit/[id]`.

Di detail publik hasil scan:

- Tidak tampil harga modal.
- Harga jual boleh tampil.
- Label QR menampilkan harga jual, model, spek, status QC, tanggal QC, dan checker.

## Cara Nyambung ke AI

AI sebaiknya tidak langsung akses database dari luar. Pola yang aman:

```text
PostgreSQL
  -> API internal FS Comp Core
  -> AI membaca ringkasan unit
  -> AI menulis rekomendasi ke AiLog
  -> Dashboard menampilkan AiLog
```

Endpoint awal yang sudah disiapkan:

```text
GET /api/ai/daily-report
```

Nanti endpoint ini bisa ditingkatkan menjadi:

- Deteksi unit problem harian.
- Deteksi unit mendekati tempo PSI.
- Rekomendasi retur atau potongan.
- Ringkasan unit siap katalog.
- Data produk untuk WhatsApp AI.

Untuk WhatsApp AI, flow-nya:

```text
Customer WhatsApp
  -> WhatsApp AI
  -> API core.fscomp.id
  -> ambil unit VERIFIED dari database
  -> balas dengan link katalog/detail unit
```
