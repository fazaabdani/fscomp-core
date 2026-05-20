# Coolify, n8n, dan Katalog FS Comp

## Letak Database di Coolify

Di Coolify, database dibuat sebagai resource/service terpisah dari app Next.js.

Langkah umum:

1. Buka project Coolify yang berisi `core.fscomp.id`.
2. Klik **New Resource** atau **Add Resource**.
3. Pilih **Database**.
4. Pilih **PostgreSQL**.
5. Deploy database.
6. Buka database tersebut, cari bagian **Connection String** atau **Postgres URL**.
7. Copy URL itu.
8. Masuk ke app `fscomp-core`.
9. Buka menu **Environment Variables**.
10. Tambahkan:

```env
DATABASE_URL="postgresql://user:password@host:5432/fscomp_core"
```

11. Redeploy app.

Intinya: `DATABASE_URL` diisi di app Next.js, bukan di halaman markdown/dokumen.

## Perlu Login User?

Ya, untuk production perlu login.

Role yang dipakai:

- `admin`: Faza dan Zume. Bisa akses semua, termasuk harga modal, user, batch, AI log, dan sync katalog.
- `teknisi`: Ludfy dan Rosyadi. Bisa tambah/edit unit, QC awal, QC harian, batch PSI.
- `magang`: hanya QC harian dan lihat detail unit yang diperlukan.

Login bisa dibuat pakai email/password biasa dulu. Nanti kalau mau lebih kuat, bisa pakai NextAuth/Auth.js.

## Tombol Yang Tadinya Belum Jalan

Sekarang tombol sudah punya halaman:

- Tambah Batch: `/batch-psi/new`
- Edit Batch: `/batch-psi/[id]/edit`
- Histori QC: `/batch-psi/[id]/history`
- Tambah Unit: `/unit/new?batch=[id]`
- Login: `/login`

Saat database sudah aktif, tombol **Simpan** di halaman ini disambungkan ke Prisma supaya data benar-benar tersimpan.

## n8n ke WhatsApp

Endpoint untuk n8n:

```text
GET https://core.fscomp.id/api/integrations/n8n/whatsapp-alert
```

Flow n8n:

```text
Schedule Trigger
  -> HTTP Request ke /api/integrations/n8n/whatsapp-alert
  -> ambil field whatsappText
  -> kirim ke WhatsApp
```

Isi alert:

- Unit yang `RECHECK`.
- Unit `CANDIDATE RETUR`.
- QC harian yang punya catatan/gagal.
- Batch PSI yang mendekati tempo.
- Link detail unit di `core.fscomp.id`.

## Sync ke katalog.fscomp.id via Spreadsheet

Sementara karena katalog masih via spreadsheet, endpoint yang disiapkan:

```text
GET https://core.fscomp.id/api/integrations/catalog/spreadsheet-export
```

Flow n8n:

```text
Schedule Trigger
  -> HTTP Request ke /api/integrations/catalog/spreadsheet-export
  -> ambil rows
  -> Google Sheets: Clear / Update Rows
  -> katalog.fscomp.id baca spreadsheet
```

Yang dikirim hanya unit siap katalog:

- `VERIFIED`
- `VERIFIED WITH NOTES`

Data yang dikirim:

- Nomor unit
- Model
- Processor
- RAM
- SSD
- Harga jual
- Status QC
- Battery health
- SSD health
- Link detail unit
