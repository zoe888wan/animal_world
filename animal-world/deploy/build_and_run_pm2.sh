#!/usr/bin/env bash
set -euo pipefail

# Builds frontend + backend and runs backend with pm2.
# Backend will serve frontend/dist automatically (project already supports this).

APP_PORT="${APP_PORT:-3002}"
DB_NAME="${DB_NAME:-animal_world}"
DB_USER="${DB_USER:-app}"
DB_PASS="${DB_PASS:-app123}"
JWT_SECRET="${JWT_SECRET:-change-me-now}"

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
ROOT_DIR="$(cd -- "${SCRIPT_DIR}/.." >/dev/null 2>&1 && pwd)"

echo "[1/5] Installing dependencies..."
cd "${ROOT_DIR}/backend"
npm install
cd "${ROOT_DIR}/frontend"
npm install

echo "[2/5] Building frontend..."
cd "${ROOT_DIR}/frontend"
npm run build

echo "[3/5] Building backend..."
cd "${ROOT_DIR}/backend"
npm run build

echo "[4/5] Writing backend .env (PORT=${APP_PORT})..."
ENV_FILE="${ROOT_DIR}/backend/.env"
cat > "${ENV_FILE}" <<EOF
PORT=${APP_PORT}
DATABASE_URL=mysql://${DB_USER}:${DB_PASS}@localhost:3306/${DB_NAME}
JWT_SECRET=${JWT_SECRET}
EOF
chmod 600 "${ENV_FILE}"

echo "[5/5] Starting with pm2..."
cd "${ROOT_DIR}/backend"
pm2 start dist/index.js --name animal-world --update-env
pm2 save

echo
echo "Health check:"
curl -sS "http://127.0.0.1:${APP_PORT}/api/health" || true
echo
echo "Public URL (after firewall/security-group opened):"
echo "  http://$(curl -sS ifconfig.me 2>/dev/null || echo '<server-ip>'):${APP_PORT}"
echo
echo "Logs:"
echo "  pm2 logs animal-world --lines 200"

