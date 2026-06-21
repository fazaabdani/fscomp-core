# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Tentang Aplikasi Ini

FS Comp Core adalah sistem operasional internal untuk bisnis laptop bekas FS Comp. Aplikasi ini mengelola seluruh siklus hidup laptop refurbished: dari penerimaan batch PSI → QC awal → QC harian → penjualan → pelaporan. Ada juga halaman publik PC builder untuk konfigurasi rakit PC. Seluruh kode, string UI, nama field database, dan komentar menggunakan **Bahasa Indonesia**.

## Perintah

```bash
npm run dev          # Jalankan dev server di localhost:3000
npm run build        # prisma generate + next build
npm run lint         # ESLint

npm run db:generate  # Generate ulang Prisma client setelah schema berubah
npm run db:migrate   # Deploy migration yang belum dijalankan (prisma migrate deploy)
npm run db:studio    # Buka Prisma Studio
```

Tidak ada test suite — tidak ada Jest, Vitest, atau sejenisnya yang terpasang.

## Environment Variables

```env
DATABASE_URL="postgresql://user:password@host:5432/fscomp_core"
CORE_PUBLIC_URL="https://core.fscomp.id"          # default ke nilai ini jika tidak diset
N8N_SALES_WEBHOOK_URL=""                           # opsional, memicu WhatsApp setiap ada penjualan
WA_OWNER_NUMBER="0816660056"                       # opsional, untuk alert WhatsApp via n8n
WA_REPORT_GROUP_ID=""                              # opsional
OPENAI_API_KEY=""                                  # opsional, untuk fitur AI
OPENAI_MODEL=""                                    # opsional
```

## Arsitektur

### Layer data: dua sumber

Sebagian besar halaman mengambil data langsung dari **Prisma** di server component atau server action. `lib/api.ts` berisi array data demo statis (`batches`, `units`, `dailyQcs`, `aiLogs`) sebagai **data fallback** untuk halaman yang belum dimigrasikan ke database, dan masih dipakai oleh `/api/ai/daily-report`. Untuk fitur baru, gunakan Prisma.

`lib/prisma.ts` mengekspor singleton `prisma` client (pola standar Next.js agar tidak ada koneksi duplikat saat dev).

### Auth & sesi

Autentikasi sepenuhnya berbasis cookie — tidak ada NextAuth atau library JWT.

- `lib/auth.ts` — mendefinisikan tipe `User`, `demoUsers` (kredensial fallback hardcoded), dan helper permission berdasarkan role (`canViewPrice`, `canEditBatch`, dll.).
- `lib/session.ts` — membaca/menulis cookie HTTP-only `fscomp_user` (masa berlaku 12 jam, isi JSON `{ name, username, password, role }`). Mengekspor `getCurrentUser()`, `requireUser()`, `requireRole([...])`.
- `lib/user-store.ts` — saat login pertama ke DB, `demoUsers` disinkronkan otomatis ke tabel `User`. Password disimpan apa adanya di database.
- `middleware.ts` — melindungi semua route non-publik; redirect role `magang` ke `/qc-harian` jika mengakses halaman di luar path yang diizinkan.

**Path publik** (tanpa login): `/login`, `/katalog`, `/katalog/*`, `/unit/[id]`, `/nota/*`.

**Hierarki role**: `admin` > `teknisi` > `sales` > `magang`.

### Pola mutasi (Server Actions)

Setiap direktori halaman yang memiliki form berisi file `actions.ts` bertanda `"use server"`. Polanya konsisten:

1. Panggil `requireRole([...])` di baris pertama untuk memeriksa otorisasi.
2. Ambil field dari `FormData` menggunakan helper lokal (`text()`, `numberValue()`, `numberOrNull()`).
3. Tulis ke Prisma, gunakan `prisma.$transaction()` untuk penulisan multi-tabel.
4. Panggil `revalidatePath()` untuk semua route yang terpengaruh, lalu `redirect()`.
5. Jika validasi gagal, `redirect("...?error=<key>")` — halaman membaca query param tersebut untuk menampilkan pesan error inline.

### API routes (app/api/)

Route ini hanya untuk **integrasi eksternal**, bukan untuk data halaman internal:

| Route | Tujuan |
|---|---|
| `GET /api/integrations/n8n/whatsapp-alert` | n8n polling untuk mengirim alert WhatsApp unit bermasalah |
| `GET /api/integrations/n8n/daily-qc-list` | Ringkasan QC harian untuk workflow n8n |
| `GET /api/integrations/catalog/spreadsheet-export` | Export data katalog ke Google Sheets |
| `GET /api/finance/report` | Export ringkasan keuangan |
| `GET /api/ai/daily-report` | Laporan harian AI (saat ini masih memakai data demo statis) |
| `POST /api/admin/backup` | Trigger backup database |
| `GET /api/attendance/export` | Export data absensi |
| `GET /api/batch-psi/[id]/export` | Export data batch |
| `GET /api/users/export` | Export data pengguna |

Route yang mengambil data live dari database mengekspor `dynamic = "force-dynamic"`.

### Siklus hidup unit

```
BatchPSI dibuat → Unit diimpor (status: RECHECK)
  → QcAwal dilakukan → status → VERIFIED / VERIFIED_WITH_NOTES / CANDIDATE_RETUR / RETUR_DISTRIBUTOR
  → QcHarian setiap hari (semua role termasuk magang)
  → Sale dibuat → unit.soldAt diset (menandai sudah terjual)
  → Sale bisa di-void (unit.soldAt dikosongkan) atau dipulihkan
```

Unit hanya bisa dijual jika sudah ada minimal satu entri `QcHarian` dan `masihLolos` terbaru bukan `TIDAK_LOLOS`.

### Model database utama

- **`BatchPSI`** — batch dari supplier dengan pelacakan tempo pembayaran
- **`Unit`** — unit laptop beserta spek, harga, dan status (enum `UnitStatus`)
- **`QcAwal`** — QC awal sekali pakai (1:1 dengan Unit), berisi checklist hardware + software sebagai `QcResult` (OK/NOTES/FAIL)
- **`QcHarian`** — catatan QC harian (1:banyak dengan Unit); field `masihLolos` menggunakan enum `DailyStatus`
- **`Sale`** + **`SaleItem`** — transaksi kasir; lokasi penjualan `WIRADESA` atau `KAJEN` (bagi hasil profit 60/40 untuk Kajen)
- **`LicenseRecord`** — lisensi software (Windows, Office, Antivirus) yang dibuat otomatis dari `SaleItem` ketika nama/kategori item mengindikasikan lisensi
- **`InventoryItem`** — stok aksesori/komponen; bisa ditautkan ke Unit atau dipakai di Rakit PC
- **`PcComponent`** / **`PcBuildPreset`** / **`PcBuildDraft`** — fitur Rakit PC (halaman publik di `/katalog/rakit-pc`, admin di `/rakit-pc`)
- **`UnitAuditLog`** — log perubahan field Unit yang tidak bisa diubah
- **`Attendance`** — check-in/check-out dengan opsional data geo dan foto

### Modul Rakit PC

`lib/pc-compatibility.ts` — pengecekan kompatibilitas murni; menerima array `PcCompatibilityComponent` yang dipilih dan mengembalikan `PcCompatibilityIssue[]` dengan tingkat keparahan `"bad"` atau `"warn"`. Pemeriksaan meliputi: socket CPU, tipe memori, form factor, interface storage, panjang GPU, tinggi cooler, ukuran radiator, dan kapasitas PSU.

`lib/pc-builder.ts` — `getPublicPcBuilderData()` mengambil komponen dan preset aktif; mengembalikan `{ connected: false }` jika DB error agar halaman publik tetap bisa tampil.

### Migrasi database

File migrasi ada di `prisma/migrations/` dengan nama `YYYYMMDDNNNN_deskripsi`. Deploy dengan `npm run db:migrate` (`prisma migrate deploy`). **Jangan pernah pakai `prisma db push` atau `prisma migrate reset` di production.**

### Integrasi n8n / WhatsApp

Alur notifikasi penjualan: `createSaleAction` (di `app/sales/actions.ts`) memanggil `notifySaleToN8n()` setelah transaksi selesai. Ini mengirim POST ke `N8N_SALES_WEBHOOK_URL` secara fire-and-forget. Jika gagal, transaksi penjualan tidak ikut dibatalkan.

Env var `CORE_PUBLIC_URL` dipakai di seluruh kodebase untuk membangun URL absolut nota, link detail unit, dan pesan WhatsApp.
