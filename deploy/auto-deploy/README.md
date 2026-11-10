# Auto-deploy core.fscomp.id

Cron di server toko (user `faza`, tiap 3 menit) mengecek `main` di GitHub. Kalau ada commit baru dan
semua check CI-nya hijau, skrip memicu deploy lewat API Coolify lokal. Tidak ada koneksi masuk dari
luar dan tidak ada runner GitHub (repo ini publik, jadi self-hosted runner sengaja dihindari).

Migrasi database ikut otomatis: `Dockerfile` menjalankan `prisma migrate deploy` saat container start.

## Pasang / perbarui

Dari PC (folder repo):

```bash
ssh -i ~/.ssh/fscomp_local_server faza@100.97.87.101 'mkdir -p ~/auto-deploy'
scp -i ~/.ssh/fscomp_local_server deploy/auto-deploy/*.sh faza@100.97.87.101:~/auto-deploy/
ssh -i ~/.ssh/fscomp_local_server faza@100.97.87.101 "sed -i 's/\r$//' ~/auto-deploy/*.sh && bash ~/auto-deploy/install.sh"
```

Isi token Coolify (izin Deploy + Read, dibuat di Coolify > Keys & Tokens > API tokens), sekali saja:

```bash
ssh -t -i ~/.ssh/fscomp_local_server faza@100.97.87.101 'bash ~/auto-deploy/set-token.sh'
```

## Memantau

- Log: `~/auto-deploy/auto-deploy.log` di server.
- State: `~/auto-deploy/state.env` (commit terakhir yang sukses/gagal). Hapus baris `LAST_FAILED` untuk
  mencoba ulang commit yang gagal tanpa push baru.
- Cek tanpa deploy: `bash ~/auto-deploy/auto-deploy.sh --dry-run`.
- Matikan: `crontab -e` lalu hapus baris `auto-deploy.sh`.

## Catatan

- Commit yang CI-nya merah dilewati dan dicatat di log; deploy berikutnya menunggu commit baru.
- Coolify membangun HEAD `main` saat deploy dipicu. Kalau ada commit baru masuk tepat di antara
  pengecekan dan build, commit itu ikut terbawa walau CI-nya belum sempat dicek.
- Konfigurasi (opsional) lewat `~/auto-deploy/config.env`: `REPO`, `BRANCH`, `COOLIFY_URL`, `APP_UUID`.
