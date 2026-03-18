#!/usr/bin/env bash
set -euo pipefail

# One-shot migrations to match backend feature set.
# Goal: stop "Unknown column/table" runtime errors after starting from schema-mysql.sql.
#
# Defaults are aligned with deploy scripts:
# - DB: animal_world
# - User: app / app123
# - App port: 3002

DB_NAME="${DB_NAME:-animal_world}"
DB_USER="${DB_USER:-app}"
DB_PASS="${DB_PASS:-app123}"
APP_PORT="${APP_PORT:-3002}"

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
ROOT_DIR="$(cd -- "${SCRIPT_DIR}/.." >/dev/null 2>&1 && pwd)"

mysql_cmd() {
  mysql -u "${DB_USER}" -p"${DB_PASS}" "${DB_NAME}" "$@"
}

echo "[0/7] Backup database (no tablespaces)"
BACKUP="${HOME}/animal_world_backup_$(date +%Y%m%d_%H%M%S).sql"
mysqldump -u "${DB_USER}" -p"${DB_PASS}" --no-tablespaces "${DB_NAME}" > "${BACKUP}"
echo "Backup written: ${BACKUP}"

echo "[1/7] Core user/game economy fields"
cd "${ROOT_DIR}/database"
mysql_cmd < add-virtual-coins.sql
mysql_cmd < add-checkin-24h.sql
mysql_cmd < add-credit-score.sql
mysql_cmd < add-products-and-pet-health.sql

echo "[2/7] Email verify fields (optional but keeps auth consistent)"
mysql_cmd < add-email-verify.sql || true

echo "[3/7] Events / playdate feature set"
mysql_cmd < add-features-v2.sql
mysql_cmd < add-event-cancel-and-notifications.sql
mysql_cmd < add-events-end-date-location.sql || true
mysql_cmd < add-event-participant-phone.sql || true

echo "[4/7] Profile edit quota / rename card support"
mysql_cmd < add-profile-edit-limit-and-rename-card.sql || true

echo "[5/7] Posts/media additional fields"
cd "${ROOT_DIR}/backend"
node scripts/add-post-media.js
node scripts/add-post-views.js || true

echo "[6/7] Shop products sanity"
cd "${ROOT_DIR}/database"
# Keep it safe: don't blindly insert duplicates if the seed already populated products.
HAS_PRODUCTS="$(mysql_cmd -N -e "SELECT COUNT(*) FROM products;" || echo 0)"
if [[ "${HAS_PRODUCTS}" -eq 0 ]]; then
  echo "No products found; seeding base products..."
  mysql_cmd < seed-mysql.sql
fi

echo "[7/7] Restart and health check"
if command -v pm2 >/dev/null 2>&1; then
  pm2 restart animal-world || true
fi
sleep 1
curl -sS "http://localhost:${APP_PORT}/api/health" || true
echo
echo "Done."

