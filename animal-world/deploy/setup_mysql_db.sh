#!/usr/bin/env bash
set -euo pipefail

# Creates DB + app user and imports schema/seed.
# Assumes MySQL server is already installed locally.

DB_NAME="${DB_NAME:-animal_world}"
DB_USER="${DB_USER:-app}"
DB_PASS="${DB_PASS:-app123}"
MYSQL_ROOT_USER="${MYSQL_ROOT_USER:-root}"

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
ROOT_DIR="$(cd -- "${SCRIPT_DIR}/.." >/dev/null 2>&1 && pwd)"
DB_DIR="${ROOT_DIR}/database"

SCHEMA="${DB_DIR}/schema-mysql.sql"
SEED="${DB_DIR}/seed-mysql.sql"

if [[ ! -f "${SCHEMA}" ]]; then
  echo "Missing ${SCHEMA}"
  exit 1
fi
if [[ ! -f "${SEED}" ]]; then
  echo "Missing ${SEED}"
  exit 1
fi

echo "This will:"
echo "- create database: ${DB_NAME}"
echo "- create user: ${DB_USER} (if not exists)"
echo "- grant privileges on ${DB_NAME}.*"
echo "- import schema + seed"
echo
echo "You will be prompted for MySQL ${MYSQL_ROOT_USER} password."
echo

mysql -u "${MYSQL_ROOT_USER}" -p -e "CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u "${MYSQL_ROOT_USER}" -p -e "CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASS}';"
mysql -u "${MYSQL_ROOT_USER}" -p -e "GRANT ALL PRIVILEGES ON \`${DB_NAME}\`.* TO '${DB_USER}'@'localhost'; FLUSH PRIVILEGES;"

echo "Importing schema..."
mysql -u "${MYSQL_ROOT_USER}" -p "${DB_NAME}" < "${SCHEMA}"
echo "Importing seed..."
mysql -u "${MYSQL_ROOT_USER}" -p "${DB_NAME}" < "${SEED}"

echo "Done. Database '${DB_NAME}' is ready."

