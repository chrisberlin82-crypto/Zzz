#!/bin/bash
# ============================================================
# Deploy Live auf Hetzner CPX Server (IP-only, ohne Domain)
# ============================================================
# Verwendung:
#   ./deploy-hetzner.sh user@hetzner-ip
#
# Beispiel:
#   ./deploy-hetzner.sh root@89.167.100.239
#
# Voraussetzungen auf dem Server:
#   - Docker + Docker Compose installiert
# ============================================================

set -e

SSH_HOST="${1:?Fehler: SSH-Host angeben (z.B. root@89.167.100.239)}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
REMOTE_DIR="/opt/medrezeption"

# IP aus SSH_HOST extrahieren
SERVER_IP="${SSH_HOST#*@}"

echo "=== MED Rezeption LIVE-Deployment auf Hetzner CPX ==="
echo "Host:   $SSH_HOST"
echo "IP:     $SERVER_IP"
echo "Remote: $REMOTE_DIR"
echo ""

# [1] Server vorbereiten
echo "[1/4] Erstelle Verzeichnisse auf Server..."
ssh "$SSH_HOST" "mkdir -p $REMOTE_DIR/deploy/hetzner"

# [2] Dateien hochladen
echo "[2/4] Lade Projekt hoch..."
rsync -avz --exclude='.git' --exclude='node_modules' --exclude='__pycache__' \
    --exclude='.env' --exclude='*.sqlite' --exclude='*.db' \
    "$PROJECT_DIR/" "$SSH_HOST:$REMOTE_DIR/"

# [3] .env pruefen
echo "[3/4] Pruefe .env..."
ssh "$SSH_HOST" "
    if [ ! -f $REMOTE_DIR/deploy/hetzner/.env ]; then
        cp $REMOTE_DIR/deploy/hetzner/.env.beispiel $REMOTE_DIR/deploy/hetzner/.env
        echo 'ACHTUNG: .env erstellt - API-Key muss noch eingetragen werden!'
        echo '         ssh $SSH_HOST nano $REMOTE_DIR/deploy/hetzner/.env'
    else
        echo '.env existiert bereits.'
    fi
"

# [4] Docker starten
echo "[4/4] Starte Container..."
ssh "$SSH_HOST" "
    cd $REMOTE_DIR/deploy/hetzner
    docker compose build --no-cache
    docker compose up -d
    docker compose ps
"

echo ""
echo "=== Live-System erfolgreich deployed ==="
echo ""
echo "URL:    http://$SERVER_IP"
echo "Status: ssh $SSH_HOST 'cd $REMOTE_DIR/deploy/hetzner && docker compose ps'"
echo "Logs:   ssh $SSH_HOST 'cd $REMOTE_DIR/deploy/hetzner && docker compose logs -f'"
echo ""
echo "WICHTIG: Falls noch nicht geschehen, API-Key eintragen:"
echo "  ssh $SSH_HOST 'nano $REMOTE_DIR/deploy/hetzner/.env'"
echo "  ssh $SSH_HOST 'cd $REMOTE_DIR/deploy/hetzner && docker compose restart web'"
