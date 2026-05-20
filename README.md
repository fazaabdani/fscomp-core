# FS Comp Core

Sistem internal untuk mengelola unit laptop FS Comp dari list PSI sampai terjual. Fokus awal v6:

- Dashboard status unit, batch PSI, QC awal, QC harian, dan problem terbaru.
- Role dasar untuk Faza, Zume, Ludfy, Rosyadi, dan anak magang.
- Detail unit lengkap dengan riwayat QC.
- Label QR ukuran 7x5cm bertema biru FS Comp.
- Data dummy realistis agar siap dipakai sebagai dasar integrasi database, katalog.fscomp.id, dan WhatsApp AI.

## Jalankan Lokal

```bash
npm install
npm run dev
```

Buka `http://localhost:3000`.

## Database

Database production disarankan memakai PostgreSQL di Coolify dan Prisma sebagai penghubung dari Next.js.

Lihat detailnya di `docs/DATABASE_AI_PLAN.md`.
Panduan klik Coolify, n8n WhatsApp, dan sync spreadsheet ada di `docs/COOLIFY_N8N_CATALOG.md`.

Total tabel utama: `User`, `BatchPSI`, `Unit`, `QcAwal`, `QcHarian`, `AiLog`, dan `CatalogSync`.

## Deploy Coolify / Nixpacks

- Build command: `npm run build`
- Start command: `npm run start`
- Port: `3000`
- Domain target: `core.fscomp.id`

## Struktur

```text
app/
  page.tsx
  layout.tsx
  unit/[id]/page.tsx
  batch-psi/page.tsx
  qc-harian/page.tsx
  label/page.tsx
lib/
  api.ts
  auth.ts
  constants.ts
```
