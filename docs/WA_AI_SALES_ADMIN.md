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
- `channel` (`STORE` atau `PERSONAL` — lihat Tahap 7 §Multi-Channel)
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

## Balasan AI Tahap 7

Sebelum tahap ini, `draftReply` kosong untuk kasus paling umum: pertanyaan produk biasa (`decision.action = AUTO_REPLY`, `allowSafeCatalog = true`). Tahap 7 mengisi bagian itu.

File baru:

- `lib/wa-ai-catalog-reply.ts`: `generateWaAiCatalogReply()`. Ambil sampai 30 unit ready (`getSafeWaCatalogUnits`), kirim ke OpenAI (`OPENAI_API_KEY`, `OPENAI_MODEL`) bersama histori 10 pesan terakhir, minta output terstruktur (`response_format: json_schema`) berupa `{ reply, recommendedUnitIds }`. `recommendedUnitIds` yang tidak ada di daftar unit yang dikirim otomatis dibuang (pagar anti-halusinasi). Kalau OpenAI gagal/timeout (15 detik) atau stok kosong, fallback ke pesan aman, bukan mengarang.
- Prompt sistem punya dua lapis: aturan wajib (hardcoded, di `hardSafetyPreamble`, tidak bisa diubah dari UI) + persona gaya bicara (dari `WaAiSetting` key `ai_sales_persona_prompt`, bisa diedit admin di `/wa-ai`, default di `defaultWaAiPersonaPrompt`).

Intent `GENERAL_SERVICE` (servis umum, rakit PC — bukan klaim garansi) sekarang punya jalur sendiri di `decideWaAiPolicy()`: `AUTO_REPLY` tapi `notifyAdmin: true` dan `nextStatus: PENDING_ADMIN`, balasannya template tetap (`waAiGeneralServiceBridgeMessage()`, "kami cekkan ulang dulu") karena belum ada database riwayat servis untuk dibaca AI. Sebelumnya kata "servis"/"service" salah ke-match ke `WARRANTY` di `inferWaAiIntent()` — sudah diperbaiki, sekarang hanya "garansi"/"klaim" yang masuk `WARRANTY`.

## Multi-Channel WA Tahap 7

Fonnte bisa terhubung ke lebih dari satu nomor WA (toko, pribadi). Supaya bisa diatur tanpa redeploy:

- Nomor & token tetap di environment variable (`WA_CHANNEL_STORE_NUMBER`, `WA_CHANNEL_PERSONAL_NUMBER`, token Fonnte tetap ikut pola `N8N_SALES_WA.md`/`N8N_DAILY_QC_WA.md`).
- Channel mana yang aktif diatur dari `/wa-ai` (checkbox), disimpan di `WaAiSetting` key `active_wa_channels` (array, default `["PERSONAL"]` — sesuai kondisi Fonnte saat ini yang baru tersambung ke WA pribadi).
- Payload `wa-incoming` menerima field opsional `channel` (`STORE`/`PERSONAL`). Kalau diisi dan channel itu tidak aktif, request langsung dijawab `{ ok: true, skipped: true, reason: "channel_inactive" }` tanpa menyentuh database. Kalau field ini tidak dikirim sama sekali (mis. test lama), gate ini dilewati — tidak memblokir apa pun, demi kompatibilitas mundur.
- `lib/wa-ai-channels.ts` isinya registry channel + `isWaChannelActive()`.

## Setting Tambahan Tahap 7

Migration `202608040001_wa_ai_reply_settings` menambah dua row `WaAiSetting` (idempotent, `ON CONFLICT DO NOTHING` supaya tidak menimpa value yang sudah diubah admin):

- `ai_sales_persona_prompt`
- `active_wa_channels`

## Editor Setting Tahap 7

Dashboard `/wa-ai` sekarang punya form untuk dua setting di atas (sebelumnya read-only). Perubahan tercatat di `WaAiEventLog` (`ADMIN_PERSONA_UPDATE`, `ADMIN_CHANNELS_UPDATE`), mengikuti pola audit yang sama dengan `ADMIN_CONVERSATION_UPDATE`/`ADMIN_CUSTOMER_POLICY_UPDATE` yang sudah ada.

## Tahap 8: Fonnte Langsung ke Core (Tanpa n8n)

Keputusan (2026-08-04): endpoint `wa-incoming` di atas awalnya didesain dipanggil n8n. Setelah dipertimbangkan ulang, jalur masuk-keluar pesan WA dipindah **langsung** Fonnte ↔ Core, tanpa n8n di tengah — n8n punya titik gagal sendiri (kalau container n8n down, WA AI ikut mati) padahal cuma jadi pipa. Policy engine, AI reply, dan seluruh logic di `lib/wa-ai-*.ts` **tidak berubah sama sekali** — yang berubah cuma jalur masuk/keluarnya pesan.

Supaya logic tidak dobel antara jalur lama (n8n) dan jalur baru (langsung), transaksi inti dipindah ke satu fungsi bersama:

- `lib/wa-ai-orchestrator.ts` — `processWaIncomingMessage()`. Isinya persis logic yang sebelumnya ada di dalam `wa-incoming/route.ts`: upsert customer/conversation, simpan pesan, jalankan policy, generate balasan, log event, antre Telegram. Ditambah **rate limit baru**: maksimal 10 pesan masuk per menit per nomor (dihitung dari tabel `WaMessage` yang sudah ada, bukan tabel/Redis baru) — kalau kelewat, request dijawab `{ skipped: true, reason: "rate_limited" }` tanpa diproses AI sama sekali.
- `app/api/integrations/n8n/wa-incoming/route.ts` sekarang cuma pembungkus tipis: validasi payload + panggil `processWaIncomingMessage()`. Tetap ada dan tetap berfungsi persis seperti sebelumnya (dipakai untuk test manual via curl, lihat §Test Tahap 6) — tidak dihapus, cuma tidak lagi dipakai untuk trafik produksi.

Endpoint baru:

- `POST /api/wa/webhook` — dipanggil langsung oleh Fonnte. Field payload Fonnte sudah dicek ke [dokumentasi resmi](https://docs.fonnte.com/webhook-reply-message/), bukan ditebak: `sender` (nomor), `message` (teks), `name` (nama pengirim), `device` (device penerima). Field `device` **belum tahu nilai aslinya** sampai ada webhook asli yang masuk — `resolveWaChannelFromDevice()` di `lib/fonnte-client.ts` akan mengembalikan `null` (tidak dikenali, tidak diblokir) sampai `WA_CHANNEL_STORE_DEVICE`/`WA_CHANNEL_PERSONAL_DEVICE` diisi dengan nilai asli yang dilihat dari payload pertama yang masuk.
- Verifikasi: Fonnte **tidak** mengirim header/signature apa pun untuk webhook masuk (sudah dicek ke dokumentasi resmi kategori webhook, tidak disebutkan sama sekali) — jadi verifikasinya pakai query param secret: daftarkan URL webhook di Fonnte sebagai `https://core.fscomp.id/api/wa/webhook?key=<FONNTE_WEBHOOK_SECRET>`. Dicek lewat `hasFonnteWebhookAccess()` di `lib/api-auth.ts`.
- Kirim balasan: `sendFonnteMessage()` di `lib/fonnte-client.ts`, `POST https://api.fonnte.com/send`, body `application/x-www-form-urlencoded` (**bukan JSON** — API Fonnte pakai form fields, sudah dicek ke dokumentasi resmi), header `Authorization: <FONNTE_TOKEN>`.

Env baru:

```env
FONNTE_TOKEN=...
FONNTE_WEBHOOK_SECRET=...
WA_CHANNEL_STORE_DEVICE=...
WA_CHANNEL_PERSONAL_DEVICE=...
```

Yang **tidak** ikut dipindah: notifikasi Telegram ke admin tetap lewat `app/api/integrations/n8n/wa-telegram-queue` yang di-poll n8n seperti sebelumnya — keputusan ini cuma soal jalur pesan WA customer, bukan jalur notifikasi admin. n8n masih dipakai untuk itu, dan untuk 2 workflow lama (laporan penjualan, reminder QC) yang tidak disentuh sama sekali.

Sebelum live: pasang webhook URL di dashboard Fonnte, kirim 1 pesan test, buka `WaMessage.rawPayload` di Prisma Studio untuk lihat nilai asli field `device`, baru isi `WA_CHANNEL_*_DEVICE` yang benar.

## Tahap 9: Kill Switch dan Filter Grup

Ditambah setelah tes langsung ke nomor WA pribadi Faza (yang juga dipakai chat sehari-hari, termasuk ikut banyak grup):

- **Kill switch `ai_enabled`.** Row ini sebenarnya sudah ada di database sejak migration Tahap 1 (`202606230001_wa_ai_sales_admin`), tapi tidak ada kode mana pun yang membacanya — jadi walau row-nya ada, dia tidak pernah berfungsi jadi saklar. Sekarang `processWaIncomingMessage()` di `lib/wa-ai-orchestrator.ts` mengecek ini paling pertama sebelum apa pun lain (sebelum channel gate, sebelum rate limit). Kalau `false`, semua pesan masuk diabaikan total (`{ skipped: true, reason: "ai_disabled" }`), dari channel mana pun. Togglenya ada di panel paling atas dashboard `/wa-ai` — dipisah dari panel "Kontrol AI" yang lain supaya jadi tombol darurat yang gampang ditemukan.
- **Pesan grup diabaikan otomatis.** Fonnte menandai pesan dari grup lewat field `member` (isi nama/ID anggota grup yang kirim — dokumentasi resmi: hanya terisi untuk pesan grup, kosong untuk chat pribadi). `parseFonnteInboundWebhook()` di `lib/fonnte-client.ts` mendeteksi ini (`isGroupMessage`), dan `app/api/wa/webhook/route.ts` langsung membalas `{ skipped: true, reason: "group_message" }` **sebelum menyentuh database sama sekali** — tidak ada `WaCustomer`/`WaConversation` yang dibuat untuk grup. Ini penting karena nomor WA yang dipakai testing sekarang adalah nomor pribadi Faza yang juga aktif di banyak grup WhatsApp lain.

## Tahap 10: Admin Takeover dan Follow-up Otomatis

**Admin takeover.** `decideWaAiPolicy()` sejak awal sudah punya logic "kalau `lastAdminResponseAt` terisi dan `aiTakeoverAllowed` false, serahkan ke admin" — tapi field `lastAdminResponseAt` tidak pernah ditulis kode mana pun, jadi logic itu tidak pernah nyala. Sekarang ada dua tombol di tiap baris tabel `/wa-ai`:

- **Ambil Alih** (`takeoverWaConversationAction`) — set `status: WAITING_ADMIN`, `aiTakeoverAllowed: false`, `lastAdminResponseAt: now()`. AI langsung berhenti membalas percakapan itu.
- **Kembalikan ke AI** (`releaseWaConversationToAiAction`) — kebalikannya: `status: OPEN`, `aiTakeoverAllowed: true`, `lastAdminResponseAt: null`.

Dropdown status + checkbox manual yang lama tetap ada untuk kontrol lebih detail.

**Follow-up otomatis.** Sama seperti `ai_enabled` dan `lastAdminResponseAt`, field `WaConversation.followupPassiveSentAt` dan setting `followupPassive` sudah ada sejak migration Tahap 1 tapi tidak pernah dipakai. Sekarang:

- `lib/wa-ai-followup.ts` — `isConversationDueForFollowUp()` (murni logic, dites manual: HOT/WARM/COLD pakai ambang jam beda-beda dari setting `follow_up_hours`, hanya untuk percakapan `OPEN`/`PENDING_ADMIN` yang belum pernah di-follow-up dan pesan terakhirnya dari kita — bukan pelanggan yang lagi nunggu dibalas), dan `generateWaAiFollowUpMessage()` (AI generate pesan follow-up natural, pakai persona yang sama, bukan template kaku).
- Setting `follow_up_mode`: `OFF` (default) / `SEMI` / `AUTO`, diatur dari dashboard `/wa-ai`, plus 3 input jam (HOT/WARM/COLD) — migration `202608040002_wa_ai_followup_settings`.
- **SEMI**: baris yang layak di-follow-up dapat pill "Perlu Follow-up" di tabel, admin klik tombol "Kirim Follow-up" manual per baris (tombol ini **selalu ada apa pun mode-nya**, bukan cuma pas SEMI).
- **AUTO**: `POST /api/wa/follow-up-sweep` (auth `CORE_INTEGRATION_TOKEN`, sama seperti endpoint n8n-facing lain) — perlu dipanggil berkala dari luar (Coolify Scheduled Task atau n8n Schedule Trigger yang cuma hit URL ini, tanpa logic apa pun di n8n-nya, sama prinsip Tahap 8). Endpoint ini no-op kalau mode bukan `AUTO`. Belum ada scheduler yang benar-benar terpasang — itu langkah setup terpisah setelah PR ini di-deploy.
- Follow-up yang terkirim (manual maupun otomatis) menandai `followupPassiveSentAt` supaya tidak dobel-follow-up percakapan yang sama.
