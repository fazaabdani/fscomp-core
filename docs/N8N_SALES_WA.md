# n8n Report WA: Unit Terjual

Workflow siap import:

```text
docs/N8N_SALES_WA_WORKFLOW.json
```

## Fungsi

Workflow ini menerima webhook dari Core setiap ada transaksi penjualan baru, lalu mengirim report ke WhatsApp admin.

Core sudah mengirim payload berisi:

- invoice
- unit terjual
- lokasi unit
- total transaksi
- profit kotor
- metode pembayaran
- nama/WA/alamat pembeli
- link nota admin
- link nota customer

## Setting n8n

Setelah import workflow:

1. Buka node **Send Owner Sales Report**.
2. Ganti header `Authorization` dari:

```text
ISI_TOKEN_FONNTE_DI_SINI
```

menjadi token Fonnte asli.

3. Target default sudah:

```text
62816660056
```

Jangan commit token Fonnte asli ke GitHub.

## Setting Core

Setelah workflow dipublish, buka node **Core Sale Webhook** dan salin **Production URL**.

Di aplikasi Core/Coolify, isi environment variable:

```env
N8N_SALES_WEBHOOK_URL=https://n8n-core.fscomp.id/webhook/fscomp-sale-report
CORE_PUBLIC_URL=https://core.fscomp.id
WA_OWNER_NUMBER=62816660056
```

Lalu redeploy/restart Core.

Catatan:

- URL di atas contoh. Pakai Production URL asli dari node webhook n8n.
- `WA_OWNER_NUMBER` saat ini hanya ikut dikirim di payload Core, sedangkan target WA di workflow tetap di node n8n agar mudah dicek manual.

## Test Manual

Di n8n:

1. Import workflow JSON.
2. Ganti token Fonnte.
3. Klik **Publish**.
4. Salin Production URL webhook.
5. Isi `N8N_SALES_WEBHOOK_URL` di Core.
6. Buat transaksi test di menu Penjualan Core.
7. Cek WA admin.

## Contoh Pesan

```text
*FS Comp Core - Penjualan Baru*
Invoice: FS-20260609-090000-ABC
Unit: Unit 25 - LENOVO THINKPAD E14
Lokasi: Wiradesa
Total: Rp 4.500.000
Profit kotor: Rp 700.000
Pembayaran: Cash
Pembeli: Fulan
WA pembeli: 628xxxx
Alamat: Pekalongan
```

## Catatan Keamanan

Untuk tahap cepat, webhook ini tanpa secret karena n8n URL-nya panjang dan tidak diumumkan. Nanti kalau ingin lebih aman, bisa ditambah header secret dari Core ke n8n.
