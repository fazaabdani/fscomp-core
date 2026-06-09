# n8n Report WA: Wajib QC Harian 30 Jam

Workflow siap import:

```text
docs/N8N_DAILY_QC_WA_WORKFLOW.json
```

## Fungsi

Workflow ini:

1. Jalan otomatis tiap pagi jam 09:00 WIB.
2. Ambil list unit wajib QC dari Core:

```text
GET https://core.fscomp.id/api/integrations/n8n/daily-qc-list
```

3. Kalau `count > 0`, kirim isi `whatsappText` ke WhatsApp.
4. Kalau tidak ada unit wajib QC, tidak kirim pesan.

## Setting Setelah Import

Template ini tidak memakai environment variable karena beberapa instalasi n8n memblokir akses `$env` di node.

Yang perlu dicek setelah import:

- Node **Get Daily QC List** sudah memakai URL fixed:
  `https://core.fscomp.id/api/integrations/n8n/daily-qc-list`
- Node **Send WhatsApp Report** sudah memakai URL fixed:
  `https://api.fonnte.com/send`
- Header `Authorization` di node **Send WhatsApp Report** masih berisi placeholder:
  `ISI_TOKEN_FONNTE_DI_SINI`
- Ganti placeholder itu dengan token Fonnte asli.
- Target default sudah:
  `62816660056`

Jangan commit token Fonnte asli ke GitHub.

## Provider WA

Template workflow ini memakai format yang cocok untuk Fonnte:

- Header: `Authorization: token_fonnte`
- Body:
  - `target`
  - `message`

Kalau pakai Wablas atau WAHA/Baileys, cukup ubah node terakhir **Send WhatsApp Report**:

- URL gateway
- Header token
- nama field nomor tujuan
- nama field pesan

Isi pesan tetap dari:

```text
{{$json.whatsappText}}
```

## Jadwal

Default workflow ini jalan setiap pagi jam 09:00 WIB.

Catatan: saat dibuat, timezone n8n terdeteksi `America/New_York`, sehingga node schedule memakai jam `22:00` agar setara dengan `09:00 WIB`. Kalau timezone n8n nanti sudah diganti ke `Asia/Jakarta`, ubah node schedule ke jam `09:00`.

## Test Manual

Di n8n:

1. Import workflow JSON.
2. Buka node **Send WhatsApp Report**.
3. Ganti `ISI_TOKEN_FONNTE_DI_SINI` dengan token Fonnte asli.
4. Buka node **Get Daily QC List**.
5. Klik **Execute step**.
6. Kalau `count` lebih dari 0, klik node **Send WhatsApp Report** untuk test kirim WA.
7. Klik **Publish** kalau test sudah sukses.

## Payload Core

Core mengirim JSON seperti:

```json
{
  "title": "FS Comp Core - List QC Harian",
  "count": 3,
  "units": [],
  "whatsappText": "*QC Harian FS Comp - 2026-06-09*..."
}
```

Field utama untuk WhatsApp adalah `whatsappText`.
