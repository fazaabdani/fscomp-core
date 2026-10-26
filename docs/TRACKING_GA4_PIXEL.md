# Tracking GA4 + Meta Pixel (katalog publik)

Dipasang 2026-10-26. Tujuan: mengukur perjalanan pelanggan landing `fscomp.id` -> katalog `core.fscomp.id/katalog` -> detail unit -> klik chat WhatsApp.

## ID (sama dengan landing `fscomp.id`, jadi satu properti)

- GA4 Measurement ID: `G-NME96NZF9K` (properti "FS COMP")
- Meta Pixel ID: `1026284083787634`

## Di mana dipasang

- `app/components/PublicTracking.tsx` — tag GA4 + Pixel (`afterInteractive`) dan komponen klik WhatsApp.
- Dipasang lewat dua layout baru: `app/katalog/layout.tsx` (mencakup `/katalog` dan `/katalog/rakit-pc`) dan `app/unit/[id]/layout.tsx` (detail unit publik).
- **Tidak** dipasang di halaman internal (kasir, inventory, nota, dashboard, dll) dan tidak di `/nota/[id]` (struk pelanggan).
- **Staf yang sedang login dilewati**: jika cookie sesi `fscomp_user` ada, tag tidak dirender sama sekali. Alasannya: kunjungan internal tidak mengotori data, dan URL/judul halaman internal tidak terkirim ke Google/Meta. Konsekuensi: untuk menguji sendiri, buka katalog di jendela privat/incognito atau setelah logout.

## Event

| Sumber | GA4 | Meta Pixel |
|---|---|---|
| Buka halaman (termasuk pindah halaman di dalam katalog) | `page_view` otomatis | `PageView` otomatis |
| Klik link `wa.me` / `api.whatsapp.com` mana pun | `whatsapp_click` (`event_label` = label) | `Contact` (`content_name` = label) |

Label diambil dari pesan WhatsApp yang sudah terisi otomatis: `Unit FSC-0123 - HP EliteBook 840 G5` untuk tombol "Tanya Unit"; `chat_admin` untuk link tanpa pesan; `tanya_admin` untuk pesan umum (mis. "belum menemukan laptop yang sesuai"). Logika ada di `whatsappLabel()` di `app/components/TrackingEvents.tsx` — kalau format pesan WA di `app/katalog/page.tsx` atau `app/unit/[id]/page.tsx` diubah, cek parser ini.

## Yang harus dilakukan di dashboard GA4 (tidak bisa dari kode)

1. Admin -> Custom definitions -> buat **custom dimension** event-scoped untuk parameter `event_label` — tanpa ini label unit tidak muncul di laporan (berlaku juga untuk event `whatsapp_click` dari landing).
2. Tandai `whatsapp_click` sebagai **Key event** supaya terhitung konversi.
3. Data dari `core.fscomp.id` masuk ke properti yang sama; bedakan lewat dimensi hostname/Page location.

## Catatan atribusi

Landing menautkan ke `fscomp.id/katalog`, yang me-redirect (307) ke `core.fscomp.id/katalog` dan meneruskan parameter `?utm_*`. Tanpa UTM, sesi katalog tercatat sebagai referral dari `fscomp.id`. Cross-domain linker GA4 tidak dipakai karena tautan awalnya same-origin.
