# Deployment keamanan Core

Tambahkan variabel berikut di Coolify sebelum deploy branch keamanan:

```env
SESSION_SECRET=<acak-minimal-32-karakter>
CORE_INTEGRATION_TOKEN=<token-acak-minimal-24-karakter>
N8N_WEBHOOK_SECRET=<token-acak-minimal-24-karakter>
BACKUP_EXPORT_TOKEN=<token-acak-minimal-24-karakter>
```

Semua nilai dapat dibuat sekaligus dengan:

```bash
npm run security:generate
```

Salin hasilnya langsung ke Coolify dan jangan kirim screenshot yang menampilkan nilainya.

Gunakan token berbeda untuk setiap variabel. `SESSION_SECRET` tidak boleh diganti rutin karena penggantian akan mengeluarkan semua sesi aktif.

Endpoint n8n menerima token melalui header `x-api-key` atau `Authorization: Bearer <token>`. Backup otomatis menerima `x-backup-token`, `x-api-key`, atau bearer token. Token tidak lagi diterima lewat query string agar tidak masuk log URL.

Password lama yang masih plaintext akan diverifikasi satu kali saat login berhasil lalu langsung diubah ke bcrypt. Setelah deploy, semua pengguna harus login ulang karena cookie JSON lama sengaja tidak diterima. Password default yang pernah masuk Git harus tetap diganti dari menu User karena riwayat Git tidak dapat dianggap rahasia.

`OPENAI_API_KEY` dan `OPENAI_MODEL` (sudah ada untuk fitur AI WhatsApp) sekarang dipakai bersama oleh Asisten AI internal di `/asisten-ai` (menu Operasional, role admin/teknisi/sales). Tidak ada env var baru untuk fitur ini - kalau dua variabel itu belum terisi di Coolify, halaman asisten akan menampilkan pesan "belum aktif" alih-alih error.
