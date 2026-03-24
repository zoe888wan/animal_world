#!/usr/bin/env bash
set -euo pipefail

# 从 GitHub 拉取最新代码、构建、执行商城迁移、重启服务
# 在服务器上执行：cd ~/animal-world/deploy 或 cd ~/animal_world/animal-world/deploy 后运行
#   bash update_from_github.sh

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
ROOT_DIR="$(cd -- "${SCRIPT_DIR}/.." >/dev/null 2>&1 && pwd)"

# 查找 git 仓库根目录（可能是 ROOT_DIR 或 ROOT_DIR 的父级）
GIT_ROOT="${ROOT_DIR}"
if [[ ! -d "${ROOT_DIR}/.git" ]]; then
  GIT_ROOT="$(cd -- "${ROOT_DIR}/.." >/dev/null 2>&1 && pwd)"
fi

echo "[1/5] Git pull..."
cd "${GIT_ROOT}"
git pull origin master

echo "[2/5] Install deps & build..."
cd "${ROOT_DIR}/backend"
npm install
npm run build

cd "${ROOT_DIR}/frontend"
npm install
npm run build

echo "[3/5] Run shop products cleanup (keep 改名卡/置顶卡/头像)..."
DB_NAME="${DB_NAME:-animal_world}"
DB_USER="${DB_USER:-app}"
DB_PASS="${DB_PASS:-app123}"
mysql -u "${DB_USER}" -p"${DB_PASS}" "${DB_NAME}" < "${ROOT_DIR}/database/shop-products-only-rename-pin-avatar.sql" || true

echo "[4/5] Restart pm2..."
cd "${ROOT_DIR}"
if command -v pm2 >/dev/null 2>&1; then
  pm2 restart animal-world --update-env
  pm2 save
fi

echo "[5/5] Health check..."
sleep 2
curl -sS "http://localhost:${APP_PORT:-3002}/api/health" || true
echo
echo "Update done."
