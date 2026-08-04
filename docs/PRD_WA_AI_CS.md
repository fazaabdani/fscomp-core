# PRD: WA AI Sales — Tahap 7 (AI Reply Generation)

Status: **Kode sudah ditulis** di branch `feature/wa-ai-catalog-reply` (belum di-push/di-review/di-deploy). Termasuk revisi besar 2026-08-04: jalur pesan WA dipindah langsung Fonnte ↔ Core, tanpa n8n (lihat `docs/WA_AI_SALES_ADMIN.md` §"Tahap 8: Fonnte Langsung ke Core"). §4a dan §4e di bawah ini (workflow n8n arah masuk) **sudah tidak berlaku** — dipertahankan di PRD ini cuma untuk histori kenapa keputusannya berubah. Detail teknis final selalu ada di `docs/WA_AI_SALES_ADMIN.md`, PRD ini untuk histori diskusi saja.
Dibuat: 2026-08-04 (revisi setelah cek ulang ke GitHub — draft pertama dibuang karena bentrok dengan implementasi yang sudah ada)
Wajib dibaca dulu: [WA_AI_SALES_ADMIN.md](WA_AI_SALES_ADMIN.md) — dokumen kontrak asli fitur ini (Tahap 1-6, sudah di-merge ke `main` 23 Jun 2026 lewat branch `feature/wa-ai-sales-admin-core` dan `feature/wa-ai-telegram-queue`)

## 0. Ralat

Draft PRD sebelumnya ditulis tanpa cek GitHub dan mengusulkan skema tabel (`WaLead`, `WaMessage`) serta arsitektur yang sudah ada versi lebih matangnya di `main`. Dokumen ini menggantikan draft itu sepenuhnya dan melanjutkan dari apa yang sudah dibangun, bukan mulai dari nol.

## 1. Yang Sudah Ada (Tahap 1-6, sudah di `main`)

- **Skema DB** (`prisma/migrations/202606230001_wa_ai_sales_admin`): `WaCustomer` (policy per pelanggan: `AUTO_SAFE`/`ADMIN_ONLY`/`VIP_ADMIN_ONLY`/`BLOCKED_AI`), `WaConversation` (status, `leadScore` COLD/WARM/HOT, `riskLevel` SAFE/WATCH/RISK), `WaMessage`, `WaAiSetting`, `WaAiEventLog`, `WaTelegramNotificationLog`.
- **Policy engine** [lib/wa-ai-policy.ts](../lib/wa-ai-policy.ts) — `decideWaAiPolicy()` menentukan aksi: `AUTO_REPLY`, `BRIDGE_AND_HANDOVER`, `HANDOVER_ADMIN`, termasuk deteksi jam operasional, HOT lead, RISK.
- **Adapter katalog aman** [lib/wa-ai-catalog.ts](../lib/wa-ai-catalog.ts) — `getSafeWaCatalogUnits()`, sudah **berfungsi penuh**: query Prisma unit `VERIFIED`/`VERIFIED_WITH_NOTES`, belum terjual, lolos QC harian terakhir, support pencarian teks & limit, hasil sudah termasuk harga jual, lokasi, link detail. Ini sudah siap pakai, tinggal dipanggil.
- **Template pesan** [lib/wa-ai-responses.ts](../lib/wa-ai-responses.ts) — pesan jembatan, di luar jam operasional, error katalog, serah-admin.
- **Endpoint** `POST /api/integrations/n8n/wa-incoming` ([route.ts](../app/api/integrations/n8n/wa-incoming/route.ts)) — aman (token `CORE_INTEGRATION_TOKEN`), sudah upsert customer/conversation, catat `WaMessage` & `WaAiEventLog`, antre notifikasi Telegram.
- **Dashboard** `/wa-ai` (staf admin/sales) — lihat percakapan, ubah status/`aiTakeoverAllowed`/policy pelanggan.
- **Notifikasi Telegram** ke tim untuk kasus HOT/RISK/butuh admin.
- Test: `npm run test:wa-ai` ([scripts/test-wa-ai-policy.mjs](../scripts/test-wa-ai-policy.mjs)).

## 2. Kenapa Kelihatan "Belum Jalan"

Progres berhenti persis sebelum bagian paling terlihat oleh customer. Di `route.ts`, fungsi `responseDraft()` cuma mengisi teks untuk 4 kasus: di luar jam operasional, bridge/booking, error katalog, dan serah-admin. Untuk kasus paling umum — pertanyaan produk biasa dengan `decision.action === "AUTO_REPLY"` dan `allowSafeCatalog === true` — fungsi ini **mengembalikan string kosong**. Artinya: mesin pengambil keputusan dan pengaman sudah lengkap, tapi belum ada yang benar-benar menyusun jawaban natural pakai AI + data katalog untuk pertanyaan produk. `getSafeWaCatalogUnits()` sudah siap tapi belum dipanggil dari mana pun. Tidak ada commit lanjutan sejak 23 Juni 2026 sampai sekarang (29 Jul 2026 jadi commit terbaru `main`, tidak menyentuh file WA AI).

Tidak ada dependency `openai` di `package.json`, dan tidak ada pemanggilan `OPENAI_API_KEY` di file `wa-ai-*` manapun — konfirmasi bagian ini memang belum ditulis, bukan cuma tersembunyi.

## 3. Tujuan Tahap 7

Isi bagian yang kosong itu: saat `decision.action === "AUTO_REPLY"` dan `allowSafeCatalog === true`, panggil `getSafeWaCatalogUnits()` lalu minta OpenAI menyusun jawaban **natural, gaya sales konsultan (bukan bot template), dan mengarah ke closing** — berdasarkan kebutuhan customer + hasil query — dengan pagar yang sama seperti prinsip di §Prinsip Aman `WA_AI_SALES_ADMIN.md` (tidak boleh mengarang harga/stok/garansi).

Definisi "natural & mengarah closing" untuk prompt (lihat §4b): bertanya balik kalau kebutuhan belum jelas (bukan langsung jualan), rekomendasi maksimal 2-3 unit dengan alasan singkat kenapa cocok, dan selalu ditutup dengan ajakan bertindak (mis. "mau saya bantu cek stok fisiknya sekarang?" / "unit ini termasuk yang paling dicari bulan ini, mau saya bookingkan?") — bukan sekadar kasih info lalu diam.

## 4. Scope Tahap 7 (Ada)

- Fungsi baru, mis. `generateWaAiCatalogReply()` di `lib/wa-ai-catalog-reply.ts`:
  - Input: histori pesan (`WaMessage` conversation berjalan) + hasil `getSafeWaCatalogUnits()`.
  - Panggil OpenAI (`OPENAI_API_KEY`, `OPENAI_MODEL` — reuse env yang sudah ada) dengan system prompt yang **hanya** boleh menyusun kalimat dari data unit yang diberikan, dilarang menyebut unit di luar list, dilarang sebut harga modal (memang tidak pernah dikirim ke prompt).
  - Kalau `getSafeWaCatalogUnits()` mengembalikan `{ ok: false }` → tetap pakai `waAiCatalogErrorMessage()` yang sudah ada (tidak perlu diubah, gap-nya cuma di jalur sukses).
  - Kalau hasil pencarian kosong (0 unit cocok) → balasan jujur "belum ada unit yang cocok" + tetap tawarkan eskalasi ke admin, bukan AI mengarang.
- Wire ke `responseDraft()` di `route.ts`: tambah cabang untuk `action === "AUTO_REPLY" && !outsideOperationalHours` yang manggil fungsi baru ini.
- Ekstraksi kebutuhan (budget, jenis pemakaian) dari histori chat pakai AI, hasilnya jadi parameter `query` ke `getSafeWaCatalogUnits()` — bisa satu pemanggilan AI gabungan (ekstrak + susun balasan) atau dua tahap, diputuskan saat implementasi mana yang lebih stabil.
- Update `scripts/test-wa-ai-policy.mjs` atau tambah test baru untuk pertanyaan produk biasa (assert `draftReply` tidak kosong, nada natural, dan tidak menyebut unit fiktif).

## 4b. Kontrol Gaya Jawab AI (Editable, Bukan Lewat Kode)

Supaya Faza bisa atur sendiri gaya bicara AI tanpa minta developer tiap kali:

- System prompt/persona disimpan sebagai **row baru di `WaAiSetting`** (tabel key-value yang sudah ada), key mis. `ai_sales_persona_prompt`. Ini beda dari draft sebelumnya yang mengusulkan prompt di file kode — sekarang dipindah ke database supaya bisa diedit lewat UI, bukan lewat git/redeploy.
- Ada nilai default di kode sebagai fallback kalau setting kosong (persona sales konsultan FS Comp, natural, ramah, sedikit kasual, selalu tanya kebutuhan dulu, tutup dengan ajakan closing).
- Tambah satu form sederhana di dashboard `/wa-ai` — textarea untuk edit isi persona/prompt ini, tombol simpan → update `WaAiSetting`. Ini **mengubah scope §5 lama** yang bilang "dashboard tidak disentuh" — sekarang perlu ditambah field ini.
- Batasan tetap berlaku walau prompt bisa diedit bebas: instruksi sistem (dilarang mengarang harga/stok, dilarang lewati aturan handover admin) **tidak ikut bisa diubah dari UI** — itu tetap hardcoded terpisah dari bagian "gaya bicara" yang bisa diedit Faza, supaya persona boleh diutak-atik tapi pagar keamanan tidak bisa kebobolan lewat kolom teks.

## 4c. Cakupan Nomor & Routing Kategori Pertanyaan (arahan Faza, 2026-08-04)

Ketentuan ini bersifat sementara — akan ditambah/direvisi Faza seiring berjalan. Dicatat di sini supaya tidak hilang antar sesi.

**Cakupan nomor v1:** hanya **WA toko** yang diotomatiskan dulu. WA pribadi Faza ditunda — dicatat sebagai target masa depan (kemungkinan perlu setting/pagar sendiri karena bercampur chat pribadi & bisnis), bukan bagian Tahap 7.

**Konteks WA toko:** dipakai untuk CS umum toko (termasuk servis, rakit PC, dll), tapi ~90% chat yang masuk (dari iklan) soal stok/beli laptop. Jadi AI harus **mengklasifikasi arah pertanyaan dulu**, baru menjawab sesuai kategorinya — bukan satu jawaban generik untuk semua topik.

**Temuan saat cek kode:** taxonomy intent sudah ada di [lib/wa-ai-policy.ts](../lib/wa-ai-policy.ts) (`WaAiIntent`), termasuk `GENERAL_SERVICE` yang sudah didaftarkan sebagai safe-intent. Tapi fallback keyword di `inferWaAiIntent()` ([lib/wa-ai-incoming.ts](../lib/wa-ai-incoming.ts)) punya bug/gap: kata "servis"/"service" ikut ke-match regex `WARRANTY` (`/garansi|klaim|servis|service/`), sehingga pertanyaan servis biasa (mis. "berapa biaya servis ganti keyboard") saat ini jatuh ke jalur klaim garansi (risk RISK → langsung admin), bukan `GENERAL_SERVICE`. `GENERAL_SERVICE` sendiri tidak pernah dihasilkan oleh fungsi ini sama sekali — hanya bisa terisi kalau caller (n8n) mengirim field `intent` eksplisit, yang saat ini tidak ada yang mengirimnya.

**Rencana routing (menambah Scope §4):**

1. Ganti (atau dampingi) klasifikasi keyword dengan klasifikasi AI yang membedakan minimal 3 arah: **LAPTOP** (stok/katalog — intent `CATALOG`/`STOCK_SIMPLE`, pakai pipeline Tahap 7 yang sudah dirancang di §4), **SERVIS** (pertanyaan servis umum, bukan klaim garansi/komplain — tetap pisahkan dari `WARRANTY`/`COMPLAINT` yang sudah benar diarahkan ke admin), dan **LAINNYA** (termasuk rakit PC untuk saat ini — belum ada integrasi data, jadi masuk sini dulu).
2. Perbaiki bug regex `inferWaAiIntent()` supaya "servis"/"service" tanpa kata klaim/rusak/komplain jatuh ke `GENERAL_SERVICE`, bukan otomatis `WARRANTY`.
3. **Jalur SERVIS:** karena database riwayat servis belum ada (lihat §4d), AI **tidak boleh mengarang status servis apa pun**. Balasan tetap dari template tetap: *"Baik, kami cekkan ulang terlebih dahulu ya"* (bukan hasil generate bebas) — dan tetap memicu notifikasi admin (`notifyAdmin: true`) supaya ada manusia yang benar-benar menindaklanjuti, mirip pola `BRIDGE_AND_HANDOVER` yang sudah ada tapi dengan teks khusus konteks servis (bukan teks booking laptop yang sudah ada di `waAiBookingBridgeMessage()`).
4. **Rakit PC** sebetulnya sudah punya data sendiri di database (`PcBuildPreset`, `PcComponent`, `PcBuildDraft` — dari fitur Rakit PC yang sudah ada di Core), tapi **belum diintegrasikan** ke jalur AI WA ini. Ditandai sebagai peluang tahap berikutnya, bukan scope Tahap 7 — supaya fokus dulu ke 90% volume (laptop) + jalur servis dasar.
5. Kategori di luar 3 di atas (termasuk yang AI tidak yakin arahnya) → tetap ke jalur `HANDOVER_ADMIN` yang sudah ada (`reason: "unknown_or_unsafe"`) — sudah sesuai permintaan "hal yang tidak diketahui hand over ke admin langsung dengan notifikasi", tidak perlu diubah.

## 4d. Asumsi yang Perlu Dikonfirmasi Faza

- **Arti "nomor yang sudah pernah disimpan"**: dokumen ini mengasumsikan maksudnya adalah nomor yang **punya riwayat servis** di FS Comp (bukan sekadar pernah chat WA sebelumnya) — karena kalimatnya langsung disambung ke "ambil dari database servis". Kalau yang dimaksud beda (mis. sekadar `WaCustomer` sudah pernah tercatat di sistem WA, apa pun topiknya), tolong dikoreksi karena ini menentukan bentuk tabel servis yang akan dibuat nanti.
- Karena database servis **belum ada sama sekali** (bukan cuma "belum diisi"), untuk Tahap 7 *semua* pertanyaan servis — baik dari nomor yang pernah servis maupun belum — sementara mendapat balasan template yang sama ("kami cekkan ulang dulu") + handover admin, karena AI memang belum punya cara membedakan keduanya secara otomatis. Pembeda nomor lama/baru baru bisa benar-benar jalan setelah database servis dibuat (bukan bagian Tahap 7 — dicatat sebagai Tahap 8 kandidat).
- Balasan untuk nomor **baru** yang tanya servis (belum pernah servis sama sekali) belum ditentukan gayanya — apakah tetap sama persis ("kami cekkan dulu") atau beda (mis. lebih ke arah menjelaskan proses servis & minta detail kerusakan). Default sementara: sama dulu, supaya tidak butuh keputusan tambahan sebelum ini dites.

## 4e. Nomor WA Bisa Diatur (revisi §4c, 2026-08-04)

Info baru dari Faza: **Fonnte saat ini nyambung ke WA pribadi Faza, bukan WA toko.** Ini mengubah asumsi §4c ("WA toko saja dulu") — realitanya untuk testing/tahap awal justru WA pribadi yang dipakai duluan karena itu yang sudah tersambung Fonnte.

Daripada hardcode satu nomor, Faza minta bisa **mengatur sendiri WA mana saja yang aktif** untuk fitur ini (toko, pribadi, atau nanti nomor lain). Desainnya:

- Nomor & token Fonnte tetap di **environment variable** (bukan disimpan di database) — konsisten dengan prinsip keamanan yang sudah ada di `N8N_SALES_WA.md`/`N8N_DAILY_QC_WA.md` ("jangan commit token Fonnte"). Contoh:
  ```env
  WA_CHANNEL_STORE_NUMBER=...
  WA_CHANNEL_PERSONAL_NUMBER=...
  ```
- Yang bisa diatur Faza dari **dashboard `/wa-ai`** (bukan lewat env/redeploy) hanya **on/off per channel** — disimpan sebagai key baru di `WaAiSetting`, mis. `active_wa_channels: ["PERSONAL"]`. Reuse pola yang sama dengan editor persona di §4b (satu tabel setting, satu form dashboard).
- Payload dari n8n ke `/api/integrations/n8n/wa-incoming` ditambah field `channel` (mis. `"STORE"` atau `"PERSONAL"`) — n8n yang tahu dari webhook Fonnte nomor mana yang menerima pesan, lalu diteruskan sebagai field simpel ini (field mentah Fonnte tidak perlu diparse di Core). Kalau `channel` yang masuk tidak ada di `active_wa_channels`, Core tidak memproses AI/tidak balas (dicatat sebagai event `WA_INCOMING_CHANNEL_INACTIVE`), supaya nomor yang belum diaktifkan Faza tidak ikut kebalas otomatis.
- Default `active_wa_channels` untuk mulai: `["PERSONAL"]`, sesuai kondisi Fonnte sekarang. Faza tinggal ganti ke `["STORE"]` atau `["STORE", "PERSONAL"]` dari dashboard kapan pun nomor toko sudah tersambung juga.

**Testing:** boleh langsung pakai WA pribadi — memang itu yang sudah tersambung Fonnte sekarang, jadi jalur tercepat untuk mulai testing nyata tanpa perlu setup Fonnte baru dulu.

## 5. Scope Tahap 7 (Tidak Ada)

- Tidak mengubah policy engine, skema DB, atau alur HOT/RISK/bridge yang sudah ada — semua itu sudah benar, jangan disentuh.
- Tidak membangun pengiriman WA langsung dari Core (masih lewat n8n → Fonnte seperti sekarang; `draftReply` di response JSON tetap yang dikirim n8n, sama seperti pola `N8N_SALES_WA` dan `N8N_DAILY_QC_WA` yang sudah terbukti jalan).
- Tidak membangun editor prompt yang kompleks (mis. versioning, A/B test) — cukup satu textarea simpan-langsung-pakai untuk v1.
- Tidak mengotomatiskan WA pribadi Faza — hanya WA toko (lihat §4c).
- Tidak membangun database riwayat servis, dan tidak mengintegrasikan data Rakit PC (`PcBuildPreset`/`PcComponent`) ke jalur AI WA — dicatat sebagai kandidat Tahap 8, bukan Tahap 7.

## 6. Keamanan (mengikuti prinsip yang sudah ditetapkan di WA_AI_SALES_ADMIN.md)

- Prompt OpenAI hanya menerima field yang sudah difilter aman dari `getSafeWaCatalogUnits()` (model, spek, harga jual, lokasi, link) — tidak pernah `hargaModal` atau field admin-only lain, karena field itu memang tidak ada di return type `WaAiCatalogUnit`.
- AI tidak boleh menjanjikan stok pasti ready (harus ada disclaimer "cek stok fisik ke admin" tetap muncul, sesuai prinsip yang sudah ada).

## 7. Yang Perlu Ditambah

```env
# reuse yang sudah ada, pastikan terisi di Coolify:
OPENAI_API_KEY=...
OPENAI_MODEL=...

# baru, untuk multi-channel WA (lihat §4e):
WA_CHANNEL_STORE_NUMBER=...
WA_CHANNEL_PERSONAL_NUMBER=...
```

Dependency baru di `package.json`: `openai` (SDK resmi) atau langsung `fetch` ke REST API OpenAI (lebih ringan, tidak nambah dependency) — dipilih saat implementasi.

## 8. Rencana Rollout

1. Deploy Tahap 7 tapi `WaAiSetting` untuk auto-reply katalog di-set nonaktif dulu (kalau ada toggle granular; kalau belum ada, tambahkan satu key setting baru mis. `ai_catalog_reply_enabled`), dan `active_wa_channels` default kosong dulu.
2. Test manual lewat `curl` ke `wa-incoming` (pola sudah ada di `WA_AI_SALES_ADMIN.md` §Test Tahap 6) dengan pertanyaan produk, cek `draftReply` masuk akal dan datanya benar.
3. Set `active_wa_channels: ["PERSONAL"]` dan tes lewat WA pribadi Faza (satu-satunya yang sudah tersambung Fonnte sekarang) sebelum nomor toko ikut disambungkan.
4. Pantau `WaAiEventLog` + `WaMessage` seminggu, baru pertimbangkan tambah channel `STORE` dan buka lebih luas.

## 9. Keputusan Faza (2026-08-04)

1. **Perlu ekstraksi kebutuhan pakai AI** (bukan cuma keyword). Ditambahkan ke scope §4: satu pemanggilan AI untuk menangkap budget/jenis pemakaian dari histori chat → jadi `query` ke `getSafeWaCatalogUnits()` → pemanggilan AI kedua (atau digabung sekali jalan) untuk menyusun balasan natural dari unit yang ketemu.
2. **Dicek ke repo — workflow n8n untuk arah masuk (Fonnte → Core) BELUM ADA.** Sudah digrep ke seluruh docs & JSON: tidak ada file `N8N_WA_INCOMING*.json`, tidak disebut di `COOLIFY_N8N_CATALOG.md`, `FINAL_DEPLOYMENT_CHECKLIST.md`, maupun `SECURITY_DEPLOYMENT.md`. Yang ada di n8n sekarang cuma 2 workflow **satu arah keluar** (laporan penjualan, reminder QC). Endpoint `wa-incoming` di Core sudah siap sejak Juni tapi belum ada yang memanggilnya dari Fonnte. Ini jadi item scope tambahan — lihat §4a.
3. **OpenAI dikonfirmasi, API key sudah dibeli.** Tinggal pastikan `OPENAI_API_KEY` & `OPENAI_MODEL` terisi di Coolify env app `fscomp-core`.

## 4a. Tambahan Scope: Workflow n8n Arah Masuk

Karena belum ada, perlu dibuat satu workflow n8n baru mengikuti pola yang **sudah terbukti jalan** di [N8N_SALES_WA.md](N8N_SALES_WA.md) / [N8N_DAILY_QC_WA.md](N8N_DAILY_QC_WA.md) — bedanya di sini n8n cuma jadi jembatan pipa data, bukan tempat logic AI (logic tetap di Core, sesuai keluhan awal soal n8n yang jlimet kalau dipakai untuk hal yang sering berubah):

```text
Fonnte (pesan masuk dari customer)
  -> Webhook trigger n8n (mis. /webhook/fscomp-wa-incoming)
  -> HTTP Request POST https://core.fscomp.id/api/integrations/n8n/wa-incoming
       header: x-api-key = CORE_INTEGRATION_TOKEN
       body: { phone, message, customerName }
  -> ambil field draftReply dari response JSON
  -> IF draftReply tidak kosong -> Send WhatsApp via Fonnte (POST https://api.fonnte.com/send)
  -> IF draftReply kosong -> tidak kirim apa-apa (berarti kasus WAITING_ADMIN/silent, sesuai desain policy engine)
```

Setting yang perlu diganti setelah import (sama seperti 2 workflow lain): token Fonnte di header, dan `CORE_INTEGRATION_TOKEN` di HTTP Request node. Ini bagian yang mekanis/sekali-setting saja — tidak berubah-ubah seperti logic AI, jadi cocok tetap di n8n.
