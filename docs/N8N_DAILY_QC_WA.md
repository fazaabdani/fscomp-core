# n8n Report WA: Wajib QC Harian 30 Jam

Workflow siap import:

```text
docs/N8N_DAILY_QC_WA_WORKFLOW.json
```

## Fungsi

Workflow ini:

1. Jalan otomatis sesuai jadwal.
2. Ambil list unit wajib QC dari Core:

```text
GET https://core.fscomp.id/api/integrations/n8n/daily-qc-list
```

3. Kalau `count > 0`, kirim isi `whatsappText` ke WhatsApp.
4. Kalau tidak ada unit wajib QC, tidak kirim pesan.

## Environment Variable di n8n

Isi variable ini di n8n:

```env
CORE_DAILY_QC_URL=https://core.fscomp.id/api/integrations/n8n/daily-qc-list
WA_SEND_URL=https://api.fonnte.com/send
WA_TOKEN=token_whatsapp_gateway
WA_TARGET=62816660056
```

Untuk grup WhatsApp, isi `WA_TARGET` sesuai format provider WA yang dipakai.

## Provider WA

Template workflow ini memakai format yang cocok untuk Fonnte:

- Header: `Authorization: WA_TOKEN`
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

Default workflow ini jalan setiap 2 jam. Untuk toko, opsi yang masuk akal:

- Setiap 2 jam saat jam kerja.
- Atau jam 08:00, 12:00, 16:00, 20:00.

Kalau ingin tidak terlalu ramai, mulai dari setiap 2 jam dulu.

## Test Manual

Di n8n:

1. Import workflow JSON.
2. Isi environment variable.
3. Buka node **Get Daily QC List**.
4. Klik **Execute step**.
5. Kalau `count` lebih dari 0, klik node **Send WhatsApp Report** untuk test kirim WA.

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
