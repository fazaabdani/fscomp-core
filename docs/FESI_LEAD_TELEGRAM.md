# Fesi: peringatan lead ke Telegram

Saat pengunjung katalog klik tombol WhatsApp di chat Fesi ("Tanya via WA" pada kartu unit, atau "Chat admin"),
server mengirim pesan ke grup/chat Telegram admin supaya admin siap membalas.

Contoh isi pesan:

```
🔔 Calon pembeli dari Fesi
Baru klik Tanya via WA untuk unit di bawah. Chat bisa masuk sebentar lagi, siap-siap balas ya!

Kebutuhan: Kuliah / Sekolah
Budget: 3 – 5 jt
Unit ditanyakan: A1 · LENOVO THINKPAD X13 (Rp4.300.000, Wiradesa)
Unit yang ditampilkan Fesi:
1. ...
Sempat tanya: Garansi
HP · 10.42 WIB
```

Tanpa nama/nomor HP pengunjung (memang tidak dikumpulkan). Nama dan harga unit diambil dari database, bukan dari browser.

## Aktivasi (sekali saja)

Fitur **tidak aktif sampai dua variabel ini diisi** di aplikasi `core-fscomp` (Coolify > Environment Variables):

| Variabel | Isi |
|---|---|
| `TELEGRAM_BOT_TOKEN` | Token bot dari @BotFather (disarankan bot baru khusus lead, mis. "FS Comp Lead", terpisah dari bot monitoring server) |
| `TELEGRAM_LEAD_CHAT_ID` | ID grup/chat admin tujuan (grup biasanya diawali minus, mis. `-1001234567890`) |

Langkah:
1. Telegram > @BotFather > `/newbot` > simpan token.
2. Buat grup admin (atau pakai yang ada), tambahkan bot ke grup.
3. Kirim satu pesan di grup, lalu buka `https://api.telegram.org/bot<TOKEN>/getUpdates` di browser dan cari `"chat":{"id":...}`. Itu ID grupnya.
4. Isi dua variabel di Coolify, lalu **Redeploy** (variabel baru hanya terbaca setelah deploy ulang).

Jangan menempelkan token ke chat atau ke repo.

## Pengaman

- Endpoint publik `POST /api/katalog/fesi/lead`: ukuran maksimal 2 KB, hanya dari halaman sendiri (Origin), bot dan staf yang login ditolak.
- Maksimal 6 peringatan per pengunjung per jam dan 40 per jam untuk seluruh situs; klik berulang untuk unit yang sama dalam 15 menit hanya dikirim sekali.
- Isi dari browser hanya diterima kalau cocok dengan daftar yang dikenal (kebutuhan, budget, topik FAQ, id unit).
- Selalu menjawab 204; gagal kirim Telegram tidak pernah mengganggu pengunjung.
- Sesi yang diawali `tes-` ditandai "[TES]" di pesan (untuk uji coba).

## Uji

`node scripts/test-fesi.mjs` (validasi, penyusunan pesan, pengurang duplikat).
