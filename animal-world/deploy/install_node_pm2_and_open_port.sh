#!/usr/bin/env bash
set -euo pipefail

# Installs Node.js (20 LTS) + pm2 and opens APP_PORT in UFW.
# Does not touch nginx config or existing services.

APP_PORT="${APP_PORT:-3002}"

echo "[1/4] Checking OS..."
. /etc/os-release
echo "Detected: ${PRETTY_NAME:-unknown}"

echo "[2/4] Installing Node.js 20 LTS (NodeSource) ..."
sudo apt-get update -y
sudo apt-get install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | sudo gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
NODE_MAJOR=20
echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_${NODE_MAJOR}.x nodistro main" | sudo tee /etc/apt/sources.list.d/nodesource.list >/dev/null
sudo apt-get update -y
sudo apt-get install -y nodejs

echo "[3/4] Installing pm2 globally ..."
sudo npm i -g pm2

echo "[4/4] Opening TCP port ${APP_PORT} in UFW (if active) ..."
if sudo ufw status | grep -qi "Status: active"; then
  sudo ufw allow "${APP_PORT}/tcp"
  sudo ufw status
else
  echo "UFW not active; skipping."
fi

echo "Done. Node: $(node -v), npm: $(npm -v), pm2: $(pm2 -v)"

