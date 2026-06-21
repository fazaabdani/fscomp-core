# Checklist deployment final Core

## Sudah selesai

- [x] Seluruh koreksi audit digabung dalam PR #7.
- [x] Migration diuji pada PostgreSQL 18 melalui GitHub Actions.
- [x] Typecheck dan production build lulus.
- [x] PR dapat di-merge tanpa konflik.
- [x] Tidak ada migration database baru pada paket audit.

## Belum dilakukan, tunggu hari deployment

- [ ] Buat backup database terbaru.
- [ ] Jalankan `npm run security:generate`, lalu masukkan hasilnya ke Environment Variables Coolify.
- [ ] Pasang nilai `N8N_WEBHOOK_SECRET` yang sama pada header `x-api-key` di workflow n8n.
- [ ] Jalankan `npm run predeploy:check` dengan environment produksi.
- [ ] Ubah PR #7 dari Draft menjadi Ready, lalu merge ke `main`.
- [ ] Redeploy aplikasi Core di Coolify.
- [ ] Login ulang dan ganti semua password lama yang pernah diketahui publik.
- [ ] Smoke test Dashboard, Batch, QC, Kasir, Finance, Inventaris, Katalog, Rakit PC, nota, dan workflow n8n.

Jangan merge atau redeploy jika salah satu pemeriksaan sebelum merge gagal.
