#!/usr/bin/env bash
set -euo pipefail

# ==========================================================
#  Zault — Debian Laptop Setup (one-time)
#  Run: chmod +x scripts/setup_debian.sh && sudo ./scripts/setup_debian.sh
#
#  Assumes Docker & Cloudflare Tunnel are already installed.
# ==========================================================

echo "--- Creating data directory for SQLite volume ---"
mkdir -p /opt/zault/data
echo "Created /opt/zault/data"

echo "--- Pulling production compose images ---"
cd "$(dirname "$0")/.."
docker compose -f docker-compose.prod.yml pull

echo ""
echo "=== Setup complete ==="
echo "To start:  docker compose -f docker-compose.prod.yml up -d"
echo "To check:  docker compose -f docker-compose.prod.yml ps"
