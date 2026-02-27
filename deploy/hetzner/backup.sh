#!/bin/bash
# ============================================================
# MED Rezeption - Daten-Backup
# ============================================================
# Auf dem Server ausfuehren:
#   bash /opt/medrezeption/deploy/hetzner/backup.sh
#
# Sichert:
#   - .env (API-Keys, Konfiguration)
#   - SQLite-Datenbank (Patienten, Termine, etc.)
#   - Letzte 10 Backups werden behalten
#
# Backup-Verzeichnis: /opt/medrezeption-backup/
# ============================================================

set -e

REMOTE_DIR="/opt/medrezeption"
BACKUP_BASE="/opt/medrezeption-backup"
BACKUP_DIR="$BACKUP_BASE/$(date +%Y%m%d-%H%M%S)"

echo ""
echo "=== MED Rezeption Backup ==="
echo ""

mkdir -p "$BACKUP_DIR"

# .env sichern
if [ -f "$REMOTE_DIR/deploy/hetzner/.env" ]; then
    cp "$REMOTE_DIR/deploy/hetzner/.env" "$BACKUP_DIR/.env"
    echo "[OK] .env gesichert"
else
    echo "[--] Keine .env vorhanden"
fi

# Datenbank aus Docker-Volume sichern
if docker volume inspect hetzner_app_daten &>/dev/null; then
    mkdir -p "$BACKUP_DIR/daten"
    docker run --rm \
        -v hetzner_app_daten:/data:ro \
        -v "$BACKUP_DIR/daten":/backup \
        alpine sh -c "cp -a /data/. /backup/"
    echo "[OK] Datenbank gesichert"
else
    echo "[--] Docker-Volume nicht vorhanden"
fi

# Nginx-Config sichern
if [ -f "$REMOTE_DIR/deploy/hetzner/nginx.conf" ]; then
    cp "$REMOTE_DIR/deploy/hetzner/nginx.conf" "$BACKUP_DIR/nginx.conf"
    echo "[OK] nginx.conf gesichert"
fi

# Docker-Compose sichern
if [ -f "$REMOTE_DIR/deploy/hetzner/docker-compose.yml" ]; then
    cp "$REMOTE_DIR/deploy/hetzner/docker-compose.yml" "$BACKUP_DIR/docker-compose.yml"
    echo "[OK] docker-compose.yml gesichert"
fi

# Alte Backups aufraeumen (nur die letzten 10 behalten)
ANZAHL=$(ls -d "$BACKUP_BASE"/*/ 2>/dev/null | wc -l)
if [ "$ANZAHL" -gt 10 ]; then
    ls -dt "$BACKUP_BASE"/*/ | tail -n +11 | xargs rm -rf
    echo ""
    echo "Alte Backups aufgeraeumt (10 behalten)."
fi

echo ""
echo "=== Backup fertig ==="
echo "Verzeichnis: $BACKUP_DIR"
echo ""
ls -la "$BACKUP_DIR"
echo ""
