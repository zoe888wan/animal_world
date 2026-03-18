#!/usr/bin/env bash
set -euo pipefail

# Enables pm2 startup on system boot for current user.
# This prints a command you must run with sudo (pm2 requires this design).

echo "Running: pm2 startup"
pm2 startup
echo
echo "IMPORTANT:"
echo "pm2 printed a sudo command above."
echo "Copy/paste that exact command to enable autostart, then run:"
echo "  pm2 save"

