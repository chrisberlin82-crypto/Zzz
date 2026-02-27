#!/bin/bash
# ============================================================
# Server-seitiges Start-Script fuer Hetzner
# Direkt auf dem Server ausfuehren:
#   cd /opt/medrezeption/deploy/hetzner && ./start.sh
# ============================================================

set -e

echo "=== MED Rezeption Server-Start ==="

# Port 80 freimachen
echo "[1/3] Mache Port 80 frei..."
systemctl stop nginx 2>/dev/null || true
systemctl disable nginx 2>/dev/null || true
systemctl stop apache2 2>/dev/null || true
systemctl disable apache2 2>/dev/null || true
docker compose down 2>/dev/null || true
fuser -k 80/tcp 2>/dev/null || true
sleep 1

if fuser 80/tcp 2>/dev/null; then
    echo "FEHLER: Port 80 ist noch belegt!"
    fuser -v 80/tcp
    exit 1
fi
echo "Port 80 ist frei."

# Container bauen und starten
echo "[2/3] Baue und starte Container..."
docker compose build --no-cache
docker compose up -d

# Status pruefen
echo ""
echo "[3/3] Container-Status:"
docker compose ps
echo ""
echo "=== Fertig ==="
