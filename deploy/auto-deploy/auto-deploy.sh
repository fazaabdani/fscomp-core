#!/usr/bin/env bash
# Auto-deploy core-fscomp (core.fscomp.id) setelah CI GitHub hijau.
#
# Jalan dari cron milik user "faza" di server toko (tanpa sudo, tanpa koneksi masuk dari luar):
#   1. Baca commit terbaru branch main lewat API publik GitHub (hanya baca).
#   2. Kalau commit itu belum pernah di-deploy dan semua check CI-nya sukses -> picu deploy
#      lewat API Coolify lokal, lalu tunggu sampai selesai.
#   3. Catat hasilnya di state.env supaya commit yang sama tidak di-deploy/dicoba berulang.
#
# Migrasi database ikut otomatis (Dockerfile menjalankan "prisma migrate deploy" saat container start).
# Pemakaian:  auto-deploy.sh [--dry-run]   (dry-run: cek saja, tidak memicu deploy)

set -uo pipefail

DIR="${AUTO_DEPLOY_DIR:-$HOME/auto-deploy}"
[ -f "$DIR/config.env" ] && . "$DIR/config.env"

REPO="${REPO:-fazaabdani/fscomp-core}"
BRANCH="${BRANCH:-main}"
COOLIFY_URL="${COOLIFY_URL:-http://localhost:8000}"
APP_UUID="${APP_UUID:-lhbr78ngql5noay0zul1gxok}"
TOKEN_FILE="${TOKEN_FILE:-$DIR/coolify-token}"
STATE="$DIR/state.env"
LOG="$DIR/auto-deploy.log"
MAX_WAIT_SECONDS="${MAX_WAIT_SECONDS:-1500}"

DRY_RUN=0
[ "${1:-}" = "--dry-run" ] && DRY_RUN=1

mkdir -p "$DIR"
exec 9>"$DIR/.lock"
flock -n 9 || exit 0   # proses sebelumnya masih jalan (mis. menunggu deploy selesai)

log() { printf '%s  %s\n' "$(TZ=Asia/Jakarta date '+%Y-%m-%d %H:%M:%S WIB')" "$*" | tee -a "$LOG" >&2; }

# Rotasi log sederhana (>500 KB).
if [ -f "$LOG" ] && [ "$(wc -c <"$LOG")" -gt 512000 ]; then mv "$LOG" "$LOG.1"; fi

LAST_DEPLOYED=""
LAST_FAILED=""
[ -f "$STATE" ] && . "$STATE"
save_state() { printf 'LAST_DEPLOYED=%s\nLAST_FAILED=%s\n' "$LAST_DEPLOYED" "$LAST_FAILED" >"$STATE"; }

gh_api() { curl -fsS -m 20 -H "Accept: application/vnd.github+json" "https://api.github.com/repos/$REPO/$1"; }

SHA="$(gh_api "commits/$BRANCH" | jq -r '.sha // empty' 2>/dev/null)"
[ -z "$SHA" ] && exit 0   # GitHub tidak terjangkau / kena rate limit: coba lagi di putaran berikutnya
[ "$SHA" = "$LAST_DEPLOYED" ] && exit 0
[ "$SHA" = "$LAST_FAILED" ] && exit 0

RUNS="$(gh_api "commits/$SHA/check-runs?per_page=100" 2>/dev/null)" || exit 0
TOTAL="$(jq -r '.total_count' <<<"$RUNS")"
PENDING="$(jq -r '[.check_runs[] | select(.status != "completed")] | length' <<<"$RUNS")"
BAD="$(jq -r '[.check_runs[] | select(.status == "completed" and (.conclusion | IN("success","skipped","neutral") | not))] | length' <<<"$RUNS")"

[ "${TOTAL:-0}" -eq 0 ] && exit 0      # CI belum mulai
[ "${PENDING:-0}" -gt 0 ] && exit 0    # CI masih jalan
if [ "${BAD:-0}" -gt 0 ]; then
  log "SKIP ${SHA:0:8}: CI gagal ($BAD check merah). Tidak di-deploy."
  LAST_FAILED="$SHA"; save_state; exit 0
fi

if [ "$DRY_RUN" -eq 1 ]; then
  log "DRY-RUN: commit ${SHA:0:8} CI hijau, belum pernah di-deploy -> akan deploy (tidak dipicu)."
  exit 0
fi

if [ ! -s "$TOKEN_FILE" ]; then
  log "GAGAL: token Coolify belum diisi ($TOKEN_FILE). Jalankan set-token.sh."
  exit 0
fi
TOKEN="$(cat "$TOKEN_FILE")"

log "DEPLOY ${SHA:0:8}: CI hijau, memicu deploy di Coolify..."
RESP="$(curl -fsS -m 30 -X POST -H "Authorization: Bearer $TOKEN" "$COOLIFY_URL/api/v1/deploy?uuid=$APP_UUID" 2>/dev/null)" || {
  log "GAGAL memanggil API Coolify (token salah/kedaluwarsa atau Coolify mati). Coba lagi putaran berikutnya."
  exit 0
}
DEP="$(jq -r '.deployments[0].deployment_uuid // empty' <<<"$RESP")"
if [ -z "$DEP" ]; then
  log "GAGAL: Coolify tidak mengembalikan deployment_uuid."
  LAST_FAILED="$SHA"; save_state; exit 0
fi

WAITED=0
while [ "$WAITED" -lt "$MAX_WAIT_SECONDS" ]; do
  sleep 15; WAITED=$((WAITED + 15))
  STATUS="$(curl -fsS -m 20 -H "Authorization: Bearer $TOKEN" "$COOLIFY_URL/api/v1/deployments/$DEP" 2>/dev/null | jq -r '.status // empty')"
  case "$STATUS" in
    finished) log "SELESAI ${SHA:0:8}: deploy sukses (deployment $DEP)."; LAST_DEPLOYED="$SHA"; save_state; exit 0 ;;
    failed|cancelled-by-user) log "GAGAL ${SHA:0:8}: status $STATUS (deployment $DEP). Perbaiki lalu push commit baru."; LAST_FAILED="$SHA"; save_state; exit 0 ;;
  esac
done
log "TIMEOUT ${SHA:0:8}: deploy belum selesai setelah ${MAX_WAIT_SECONDS}s (deployment $DEP). Cek Coolify."
LAST_FAILED="$SHA"; save_state
