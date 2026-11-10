#!/usr/bin/env bash
# Simpan token API Coolify ke server tanpa menampilkannya di layar atau chat.
# Jalankan di terminal interaktif:  ssh -t faza@100.97.87.101 'bash ~/auto-deploy/set-token.sh'
set -euo pipefail
DIR="${AUTO_DEPLOY_DIR:-$HOME/auto-deploy}"
mkdir -p "$DIR"
read -r -s -p "Tempel token Coolify (tidak akan tampil), lalu Enter: " TOKEN
echo
[ -n "$TOKEN" ] || { echo "Token kosong, dibatalkan."; exit 1; }
umask 077
printf '%s' "$TOKEN" >"$DIR/coolify-token"
chmod 600 "$DIR/coolify-token"
unset TOKEN

CODE="$(curl -s -m 15 -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $(cat "$DIR/coolify-token")" "${COOLIFY_URL:-http://localhost:8000}/api/v1/applications" || true)"
if [ "$CODE" = "200" ]; then echo "Token tersimpan dan diterima Coolify (HTTP 200)."; else echo "Token tersimpan, tetapi Coolify menjawab HTTP $CODE. Cek izin token (Deploy + Read) dan API Coolify aktif."; fi
