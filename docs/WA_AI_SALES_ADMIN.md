# AI WhatsApp Sales Admin

Dokumen ini mencatat kontrak awal fitur AI WhatsApp Sales Admin FS Comp / FS.ID.

## Prinsip Aman

- Produk, stok, harga, status, dan spesifikasi wajib bersumber dari katalog Core.
- AI tidak boleh memiliki stok, harga, atau list produk sendiri.
- AI tidak boleh mengarang harga, stok, garansi, kondisi, rekening, diskon final, atau janji barang pasti ready.
- Komplain, garansi, refund, transfer, nego final, pelanggan marah, dan kasus khusus wajib masuk admin.
- Jika API katalog error atau data produk tidak lengkap, AI tidak menjawab stok dan membuat event untuk admin.

## Customer AI Policy

- `AUTO_SAFE`: AI boleh menjawab info aman seperti katalog, alamat, jam buka, layanan umum, garansi umum, dan stok sederhana dari katalog.
- `ADMIN_ONLY`: AI tidak menjawab otomatis dan percakapan masuk admin.
- `VIP_ADMIN_ONLY`: pelanggan penting, AI tidak ikut menjawab.
- `BLOCKED_AI`: AI tidak boleh ikut percakapan.

Default:

- Pelanggan baru: `AUTO_SAFE`.
- Pelanggan lama setelah deal: `ADMIN_ONLY`, kecuali admin mengubah ke `AUTO_SAFE`.
- Pelanggan VIP: `VIP_ADMIN_ONLY`.

## Status Percakapan

- `OPEN`: percakapan aktif dan masih boleh diproses sesuai policy.
- `PENDING_ADMIN`: perlu perhatian admin, tetapi belum benar-benar handover penuh.
- `WAITING_ADMIN`: AI sudah menyerahkan ke admin dan berhenti membalas sampai admin membuka takeover.
- `CLOSED`: percakapan selesai.
- `DEAL`: sudah closing.
- `LOST`: peluang batal.
- `ARCHIVED`: disimpan sebagai arsip.

Jika admin sudah merespons, `lastAdminResponseAt` harus terisi. AI tidak boleh menyela kecuali `aiTakeoverAllowed = true` atau status kembali `OPEN`.

## HOT dan RISK

Flow HOT:

1. AI mengirim satu pesan jembatan yang aman.
2. AI membuat ringkasan handover.
3. Admin diberi notifikasi.
4. Status percakapan menjadi `WAITING_ADMIN`.
5. AI berhenti membalas sampai admin merespons atau mengaktifkan takeover.

RISK langsung admin, memakai notifikasi dan status `WAITING_ADMIN`.

## Default Setting

- `ai_enabled`: `true`
- `safe_auto_reply_only`: `true`
- `pending_only`: `false`
- `followup_passive`: `false`
- `active_24_hours`: `true`
- `outside_hours_message_enabled`: `true`
- `product_source`: `core_catalog`
- `new_customer_policy`: `AUTO_SAFE`
- `known_customer_policy_after_deal`: `ADMIN_ONLY`

## Migration Tahap 1

Migration `202606230001_wa_ai_sales_admin` bersifat additive-only dan menambah:

- `WaCustomer`
- `WaConversation`
- `WaMessage`
- `WaAiSetting`
- `WaAiEventLog`
- `WaTelegramNotificationLog`

Belum ada endpoint atau UI yang aktif pada tahap ini.

## Fondasi Logic Tahap 2

File fondasi yang disiapkan:

- `lib/wa-ai-policy.ts`: policy engine untuk `AUTO_SAFE`, `ADMIN_ONLY`, HOT, RISK, outside hours, dan admin takeover.
- `lib/wa-ai-catalog.ts`: adapter katalog aman yang hanya membaca unit ready dari Core.
- `lib/wa-ai-responses.ts`: template pesan jembatan, outside hours, fallback katalog error, dan admin handover.
- `lib/wa-ai-telegram.ts`: format notifikasi Telegram dan allowlist event agar tidak spam.
- `lib/wa-ai-settings.ts`: default runtime setting yang sama dengan seed migration.

Tahap ini belum menerima traffic dari WhatsApp/n8n.

## Endpoint Incoming Tahap 3

Endpoint awal:

```text
POST /api/integrations/n8n/wa-incoming
```

Keamanan:

- Wajib header `x-api-key` atau `Bearer` yang cocok dengan `CORE_INTEGRATION_TOKEN`.
- Tidak mengirim WhatsApp otomatis.
- Tidak mengirim Telegram langsung.
- Hanya mencatat incoming message, membuat/memperbarui customer dan conversation, menjalankan policy decision, membuat event log, dan menyiapkan draft response/notifikasi untuk n8n.

Payload minimal:

```json
{
  "phone": "628xxxx",
  "message": "Ada stok laptop budget 4 jutaan?",
  "customerName": "Nama pelanggan"
}
```

Field opsional:

- `messageId`
- `timestamp`
- `intent`
- `leadScore`
- `riskLevel`
- `raw`

## Dashboard Read-Only Tahap 4

Halaman staf:

```text
/wa-ai
```

Akses:

- `admin`
- `sales`

Fungsi tahap ini:

- Lihat jumlah pelanggan WA.
- Lihat percakapan terbaru.
- Lihat status `WAITING_ADMIN`, HOT, RISK, dan queue Telegram.
- Lihat default setting AI.

## Aksi Admin Tahap 5

Dashboard `/wa-ai` dapat mengubah:

- Status percakapan.
- `aiTakeoverAllowed`.
- `customer_ai_policy`.

Setiap perubahan dicatat ke `WaAiEventLog`.

Belum ada pengiriman pesan WA otomatis dari Core.

## Test Tahap 6

Test logic policy tanpa database:

```bash
npm run test:wa-ai
```

Manual test endpoint setelah aplikasi berjalan dan migration sudah diterapkan:

```bash
BASE_URL="http://127.0.0.1:3000"
TOKEN="isi_core_integration_token_di_shell_saja"

curl -sS -o /dev/null -w 'NO_TOKEN=%{http_code}\n' \
  "$BASE_URL/api/integrations/n8n/wa-incoming"

curl -sS -X POST "$BASE_URL/api/integrations/n8n/wa-incoming" \
  -H "content-type: application/json" \
  -H "x-api-key: $TOKEN" \
  -d '{"phone":"628123456789","customerName":"Test WA","message":"mau ambil laptop yang ready hari ini","leadScore":"HOT"}'
```

Hasil yang diharapkan:

- Tanpa token: `403`.
- Dengan token: JSON `ok: true`.
- HOT lead menghasilkan `decision.action = BRIDGE_AND_HANDOVER`.
- Status conversation menjadi `WAITING_ADMIN`.
- Dashboard `/wa-ai` menampilkan percakapan.
