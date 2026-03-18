#!/usr/bin/env bash
set -euo pipefail

# Run minimal migrations to restore core features:
# A) post media fields (videos/location/show_time/show_location)
# B) coins + checkin fields
# C) shop products for pet_food/pet_accessory/avatar frames
#
# Safe defaults:
# - uses mysql app/app123 to DB animal_world on localhost
# - does NOT touch nginx/ports
# - tries to be idempotent where possible (SQL files are mostly idempotent; product inserts are not)

DB_NAME="${DB_NAME:-animal_world}"
DB_USER="${DB_USER:-app}"
DB_PASS="${DB_PASS:-app123}"

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
ROOT_DIR="$(cd -- "${SCRIPT_DIR}/.." >/dev/null 2>&1 && pwd)"

mysql_cmd() {
  mysql -u "${DB_USER}" -p"${DB_PASS}" "${DB_NAME}" "$@"
}

echo "[0/5] Quick backup (optional but recommended)"
echo "Creating ~/animal_world_backup_$(date +%Y%m%d_%H%M%S).sql"
mysqldump -u "${DB_USER}" -p"${DB_PASS}" "${DB_NAME}" > "${HOME}/animal_world_backup_$(date +%Y%m%d_%H%M%S).sql"

echo "[A/5] Add post media fields (if missing)"
cd "${ROOT_DIR}/backend"
node scripts/add-post-media.js

echo "[B/5] Add coins/checkin fields (idempotent SQL)"
cd "${ROOT_DIR}/database"
mysql_cmd < add-virtual-coins.sql
mysql_cmd < add-checkin-24h.sql

echo "[C/5] Ensure shop products exist"
# Avoid duplicating inserts by checking whether pet_food exists.
HAS_FOOD="$(mysql_cmd -N -e "SELECT COUNT(*) FROM products WHERE type='pet_food';" || echo 0)"
if [[ "${HAS_FOOD}" -gt 0 ]]; then
  echo "Products already present (pet_food count=${HAS_FOOD}); skipping add-shop-products.sql to avoid duplicates."
else
  echo "Adding shop products..."
  mysql_cmd < add-shop-products.sql
fi

echo "[4/5] Restart pm2 process (if exists)"
if command -v pm2 >/dev/null 2>&1; then
  pm2 restart animal-world || true
fi

echo "[5/5] Health checks"
curl -sS "http://localhost:${APP_PORT:-3002}/api/health" || true
echo
echo "Done."

