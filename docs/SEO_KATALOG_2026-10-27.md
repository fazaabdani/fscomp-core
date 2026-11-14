# SEO halaman katalog & unit (core.fscomp.id)

Tanggal: 2026-10-27
Status: **kode selesai di working tree, build + tes hijau, BELUM di-commit dan BELUM di-deploy** (deploy butuh persetujuan owner).
Asal tugas: audit di `D:\fscomp-landing\docs\SEO-LAPTOP-SECOND.md` (temuan T2, T3, rencana 4B).

## Yang berubah

| Halaman | Perubahan |
|---|---|
| `/katalog` | `<link rel="canonical" href="https://core.fscomp.id/katalog">` (semua `?q=`, `?sort=`, `?view=` menunjuk ke sini), judul + deskripsi baru, JSON-LD `CollectionPage` + `ItemList` (URL & nama bersih tiap unit ready, maks 100). |
| `/katalog/rakit-pc` | canonical tanpa query (`?draft=`, `?error=`), judul + deskripsi + Open Graph baru (sebelumnya tidak punya metadata sendiri). |
| `/unit/<id>` | canonical `https://core.fscomp.id/unit/<id>` (tanpa `?from=` / `?view=`), judul & deskripsi ramah pencarian, JSON-LD `Product` + `Offer`. Hanya dirender untuk pengunjung anonim (bukan staf yang login). |
| `sitemap.xml` | `force-dynamic` (dibuat saat diminta, tidak beku saat build); syarat unit disamakan persis dengan katalog: terverifikasi, belum terjual, **QC harian terakhir ada dan bukan `TIDAK_LOLOS`**. Tanpa URL ber-query. |
| `robots.txt` | `Allow: /api/media/file/` ditambahkan. Foto unit disajikan dari `/api/media/file/...` yang sebelumnya kena `Disallow: /api/`, jadi Google tidak boleh mengambil gambar produk. |

File: `lib/seo.ts` (baru, semua pembuat judul/deskripsi/JSON-LD), `app/components/JsonLd.tsx` (baru), `app/katalog/page.tsx`, `app/katalog/rakit-pc/page.tsx`, `app/unit/[id]/page.tsx`, `app/sitemap.ts`, `app/robots.ts`, `lib/db-data.ts` (menambah `soldAt` ke `getUnitForDetail`), `scripts/test-seo.mjs` + `npm run test:seo` (juga dijalankan di `.github/workflows/core-ci.yml`).

## Aturan judul & deskripsi unit

- Judul: `Jual <Merek Model> <prosesor> <RAM> <storage> — Laptop Second Pekalongan | FS Comp` (PC set: `PC Second`). Maks 90 karakter; kalau kepanjangan, spek dikurangi dari belakang (storage, lalu RAM, lalu prosesor).
- Nama model dirapikan **hanya saat render** (data di database tidak diubah): huruf kapital semua → `Dell Latitude 7410`, catatan internal `ADA WS DILAYAR` / `WS di Layar` dibuang dari judul, deskripsi, dan `name` JSON-LD, salah ketik `THOSIBA` → `Toshiba`.
- Deskripsi: `Jual laptop second Pekalongan: <model> <spek> — Rp <harga>. Stok <Wiradesa|Kajen>. QC ketat, garansi software 3 bulan, hardware 3 minggu.`
- Judul `<h1>` di badan halaman **tidak diubah** (masih nama mentah, termasuk catatan "WS di layar" = white spot, informasi kondisi layar untuk pembeli).

## JSON-LD `Product` (halaman unit)

Hanya data yang ada di sistem: `name`, `description` (spek + catatan katalog + garansi toko), `url`, `sku` (= ID unit; `nomorUnit` hanya unik per batch), `category`, `brand` (tidak diisi untuk PC set), `image` (foto unit; tidak diisi bila tidak ada foto), `additionalProperty` (prosesor, RAM, penyimpanan, ukuran layar), dan `Offer`: `price` + `priceCurrency: IDR`, `itemCondition: UsedCondition`, `availability` (`InStock` bila tampil di katalog, `SoldOut` bila sudah terjual, selain itu `OutOfStock`), `seller` FS Comp.
Sengaja **tidak** ada: `aggregateRating`, `review`, `priceValidUntil` (bukan data sistem).

## Contoh keluaran nyata (halaman dirender dari build produksi + DB lokal berisi 29 unit dari katalog live)

`/unit/<id>?from=%2Fkatalog%3Fview%3Dlist&view=compact`:

```html
<title>Jual Dell Latitude 7410 i7 Gen 10 16GB 256GB — Laptop Second Pekalongan | FS Comp</title>
<meta name="description" content="Jual laptop second Pekalongan: Dell Latitude 7410 i7 Gen 10, 16GB, SSD 256GB — Rp 4.500.000. Stok Wiradesa. QC ketat, garansi software 3 bulan, hardware 3 minggu."/>
<link rel="canonical" href="https://core.fscomp.id/unit/<id>"/>
<script type="application/ld+json">{"@context":"https://schema.org","@type":"Product","name":"Dell Latitude 7410","brand":{"@type":"Brand","name":"Dell"},
  "offers":{"@type":"Offer","priceCurrency":"IDR","price":4500000,"itemCondition":"https://schema.org/UsedCondition","availability":"https://schema.org/InStock",...},...}</script>
```

`/katalog?q=thinkpad&view=list`:

```html
<title>Katalog Laptop Second Pekalongan, Harga &amp; Spek Ready — FS Comp</title>
<link rel="canonical" href="https://core.fscomp.id/katalog"/>
<script type="application/ld+json">{"@context":"https://schema.org","@type":"CollectionPage","url":"https://core.fscomp.id/katalog","mainEntity":{"@type":"ItemList","numberOfItems":29,"itemListElement":[{"@type":"ListItem","position":1,"url":"https://core.fscomp.id/unit/<id>","name":"Lenovo ThinkPad T14 G2"},...]}}</script>
```

Verifikasi sitemap (DB lokal: 29 unit ready + 4 kasus tepi): 31 URL, semua unit ready ada, unit terjual / QC gagal / tanpa QC harian / status RECHECK tidak ada, tidak ada URL ber-query, himpunan ID sama persis dengan tautan di `/katalog`.

## Cara menguji ulang

```bash
npm run test:seo      # 14 tes helper (judul, deskripsi, JSON-LD), tanpa database
npx tsc --noEmit
npm run build
```

Untuk melihat HTML asli perlu database; CI memakai Postgres, lokal bisa pakai instance sementara + `npx prisma migrate deploy`, isi beberapa unit (lengkap dengan satu `QcHarian` `LOLOS`), lalu `next start`.

## Yang BELUM / perlu keputusan

1. **Deploy** ke server toko (butuh persetujuan). Setelah live: cek `curl -s https://core.fscomp.id/unit/<id> | grep -o '<link rel="canonical"[^>]*>'`, uji satu URL di Google Rich Results Test, lalu minta pengindeksan ulang di Search Console.
2. **Commit**: perubahan SEO ini sempat ikut ter-commit tidak sengaja bersama commit lain (lihat `5bf9cba2`) karena `lib/seo.ts` & `JsonLd.tsx` belum di-track. Commit semuanya sekaligus (`lib/seo.ts`, `app/components/JsonLd.tsx`, dan file yang diubah di atas); jangan commit sebagian.
3. Salah ketik di data: unit `THOSIBA DYNABOOK PORTEGE ...` (seharusnya Toshiba). Di SEO sudah dibenarkan saat render; sebaiknya juga dibenarkan di inventori (filter merek di katalog masih menampilkan "THOSIBA").
4. Halaman unit yang sudah terjual / tidak lolos tetap bisa diakses dengan JSON-LD `SoldOut`/`OutOfStock` dan tetap boleh diindeks (tidak ada `noindex`). Bila ingin dikeluarkan dari Google, tambahkan `robots: { index: false }` untuk kasus itu.
5. Keputusan arsitektur "katalog di bawah `fscomp.id/katalog`" tidak termasuk pekerjaan ini; canonical sekarang menunjuk ke `core.fscomp.id`.
