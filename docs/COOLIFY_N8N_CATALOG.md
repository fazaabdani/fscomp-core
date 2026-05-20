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

## Jika Redeploy Database Error Container Name Already In Use

Error seperti ini:

```text
Conflict. The container name "/ypfup6a4kcje5lrr0gzlhuxu" is already in use
```

Artinya Coolify/Docker masih punya container lama dengan nama yang sama. Biasanya terjadi karena deploy database sebelumnya berhenti di tengah, lalu Coolify mencoba membuat container baru dengan nama yang sama.

Cara paling aman dari UI Coolify:

1. Buka resource PostgreSQL yang error.
2. Klik **Stop**.
3. Jika ada tombol **Restart**, coba Restart dulu.
4. Jika masih error, buka menu resource database tersebut.
5. Cari aksi seperti **Delete Resource**, **Remove**, atau **Force Delete**.
6. Hapus resource database yang gagal itu.
7. Buat ulang PostgreSQL baru dari **New Resource -> Database -> PostgreSQL**.

Kalau database belum pernah berisi data penting, hapus dan buat ulang adalah cara paling cepat.

Kalau sudah ada data penting, jangan hapus volume/database. Yang perlu dihapus hanya container yang bentrok lewat SSH:

```bash
docker ps -a | grep ypfup6a4kcje5lrr0gzlhuxu
docker stop ypfup6a4kcje5lrr0gzlhuxu
docker rm ypfup6a4kcje5lrr0gzlhuxu
```

Setelah itu redeploy database dari Coolify.

## Setelah Database PostgreSQL Hidup

Di app `fscomp-core`, isi Environment Variables:

```env
DATABASE_URL="connection-string-dari-postgresql-coolify"
```

Lalu di Coolify app `fscomp-core`:

- Build Command:

```bash
npm run build
```

- Start Command:

```bash
npm run start
```

Untuk migrasi tabel pertama kali, jalankan command ini di terminal app/server:

```bash
npm run db:migrate
```

Kalau Coolify punya field **Pre-deploy Command**, isi:

```bash
npm run db:migrate
```

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
