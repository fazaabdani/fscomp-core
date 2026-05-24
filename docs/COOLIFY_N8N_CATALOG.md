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
- `magang / PKL`: hanya bisa akses **QC Harian**, **QC Tools**, **Katalog**, dan **Label QR**.

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

## n8n Laporan Penjualan Otomatis

Core akan mengirim webhook setiap ada transaksi penjualan baru kalau environment variable ini diisi di Coolify app:

```env
N8N_SALES_WEBHOOK_URL="https://n8n-domain-kamu/webhook/fscomp-sale"
WA_OWNER_NUMBER="0816660056"
WA_REPORT_GROUP_ID="isi_id_grup_whatsapp_jika_ada"
```

Payload yang dikirim Core ke n8n berisi:

- `message`: teks laporan untuk owner.
- `notifyTo`: nomor owner.
- `notifyGroup`: ID grup WhatsApp jika ada.
- `sourceLocation`: Wiradesa utama atau Kajen secondary.
- `invoiceNumber`, `unit`, `subtotal`, `grossProfit`, `paymentMethod`.
- `buyerName`, `buyerPhone`, `buyerAddress`.
- `receiptUrl`: nota internal.
- `customerReceiptUrl`: nota untuk pelanggan.
- `customerMessage`: chat terima kasih + tips perawatan laptop.

Flow n8n yang disarankan:

```text
Webhook Trigger /fscomp-sale
  -> WhatsApp Send Message ke {{$json.notifyTo}} pakai {{$json.message}}
  -> IF {{$json.notifyGroup}} tidak kosong
       -> WhatsApp Send Message ke grup pakai {{$json.message}}
  -> IF {{$json.customerPhone}} tidak kosong
       -> WhatsApp Send Message ke pembeli pakai {{$json.customerMessage}}
```

Untuk WhatsApp, pilih salah satu provider:

- **Wablas**: paling mudah untuk nomor Indonesia.
- **Fonnte**: mudah dan murah untuk WA blast/notif.
- **WAHA / Baileys self-hosted**: lebih fleksibel, tapi perlu maintenance.

Rekomendasi awal FS Comp: pakai **Fonnte atau Wablas** dulu supaya cepat jalan.

## Chief Assistant FS Comp

Chief Assistant sebaiknya dibuat sebagai workflow n8n harian:

```text
Schedule Trigger setiap jam 09:00 dan 17:00
  -> HTTP Request GET https://core.fscomp.id/api/integrations/n8n/whatsapp-alert
  -> OpenAI / AI Agent merapikan ringkasan
  -> WhatsApp Send Message ke owner dan grup
```

Tugas Chief Assistant:

- Mengingatkan unit yang belum siap jual.
- Menandai unit Gen 8 ke atas yang belum Windows 11.
- Mengingatkan batch PSI mendekati tempo.
- Mengingatkan unit problem yang perlu keputusan retur/potongan.
- Membuat ringkasan stok siap katalog.
- Membuat ringkasan penjualan harian dan profit kotor.

Prompt AI Agent yang bisa dipakai:

```text
Kamu adalah Chief Assistant FS Comp. Baca data JSON dari Core.
Buat laporan singkat, tegas, dan mudah ditindaklanjuti.
Prioritaskan:
1. Unit yang menghambat siap jual.
2. Unit problem yang perlu keputusan owner.
3. Batch yang mendekati tempo pembayaran.
4. Rekomendasi tindakan hari ini.
Gunakan Bahasa Indonesia, gaya operasional toko.
```

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
