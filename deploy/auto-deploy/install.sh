#!/usr/bin/env bash
# Pasang cron auto-deploy untuk user yang menjalankan skrip ini (tanpa sudo). Aman dijalankan berulang.
set -euo pipefail
DIR="${AUTO_DEPLOY_DIR:-$HOME/auto-deploy}"
chmod 700 "$DIR"
chmod 755 "$DIR/auto-deploy.sh" "$DIR/set-token.sh" "$DIR/install.sh"
LINE="*/3 * * * * $DIR/auto-deploy.sh >/dev/null 2>&1"
( crontab -l 2>/dev/null | grep -v -F "$DIR/auto-deploy.sh" || true; echo "$LINE" ) | crontab -
echo "Cron terpasang:"; crontab -l | grep -F "$DIR/auto-deploy.sh"
