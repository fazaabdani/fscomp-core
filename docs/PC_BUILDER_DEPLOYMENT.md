# Deployment Rakit PC

Fitur Rakit PC memakai tabel baru dan tidak mengubah data laptop, penjualan, atau status stok yang sudah ada. Simulasi dan draft tidak mengurangi Inventaris.

## Sebelum Merge

1. Pastikan PR Rakit PC sudah lulus `npm run build`.
2. Pastikan tidak ada migration lain dengan nama `202606190002_pc_builder`.
3. Buat backup PostgreSQL dari menu backup resource database Coolify.

## Konfigurasi Coolify

Gunakan environment variable database yang sama dengan FS Comp Core:

```env
DATABASE_URL=postgresql://user:password@postgres:5432/fscomp_core
CORE_PUBLIC_URL=https://core.fscomp.id
```

Isi **Pre-deploy Command**:

```bash
npm run db:migrate
```

Jangan menjalankan `prisma migrate reset` atau `prisma db push` di production. `migrate deploy` hanya menerapkan migration yang belum pernah dijalankan.

## Urutan Deployment

1. Backup database.
2. Merge PR ke `main`.
3. Redeploy aplikasi Core.
4. Pastikan pre-deploy migration selesai tanpa error.
5. Login sebagai admin/sales dan buka `/rakit-pc`.
6. Tambahkan komponen atau tautkan item Inventaris yang berstatus `STOCK`.
7. Buat preset lengkap, lalu aktifkan.
8. Buka `/katalog/rakit-pc` tanpa login dan uji paket, custom builder, WhatsApp, serta draft.

## Pemeriksaan Setelah Deploy

```bash
npm run db:migrate
npx prisma migrate status
```

Periksa hal berikut:

- katalog laptop lama di `/katalog` tetap tampil;
- menu internal **Operasional → Rakit PC** hanya terlihat untuk admin/sales;
- komponen bertaut Inventaris hilang dari publik ketika statusnya bukan `STOCK`;
- pembuatan draft tidak mengubah `InventoryItem.status`;
- draft baru tampil di panel admin untuk ditindaklanjuti sales.

## Rollback Aman

Jika UI bermasalah, rollback image aplikasi ke commit sebelumnya. Tabel Rakit PC boleh tetap berada di database karena tidak mengubah tabel transaksi lama. Jangan menghapus tabel atau menjalankan rollback SQL saat masih ada draft/preset yang ingin dipertahankan.
