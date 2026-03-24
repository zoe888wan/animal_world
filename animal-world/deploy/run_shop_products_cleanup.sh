#!/usr/bin/env bash
set -euo pipefail

# 商城仅保留：改名卡、置顶卡、头像
# 删除其他商品（食物、饰品、药物、功能卡等）
#
# 执行：在服务器上 cd 到 deploy 目录后运行：
#   bash run_shop_products_cleanup.sh

DB_NAME="${DB_NAME:-animal_world}"
DB_USER="${DB_USER:-app}"
DB_PASS="${DB_PASS:-app123}"

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
ROOT_DIR="$(cd -- "${SCRIPT_DIR}/.." >/dev/null 2>&1 && pwd)"

echo "Running shop products cleanup (keep: 改名卡, 置顶卡, 头像)..."
mysql -u "${DB_USER}" -p"${DB_PASS}" "${DB_NAME}" < "${ROOT_DIR}/database/shop-products-only-rename-pin-avatar.sql"
echo "Done. Shop now shows only 改名卡, 置顶卡, 头像."

if command -v pm2 >/dev/null 2>&1; then
  echo "Restarting pm2..."
  pm2 restart animal-world || true
fi
