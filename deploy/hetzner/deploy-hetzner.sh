#!/bin/bash
# ============================================================
# Deploy Live auf Hetzner CPX Server (HTTP-only)
# ============================================================
# Verwendung:
#   ./deploy-hetzner.sh user@hetzner-ip
#
# Beispiel:
#   ./deploy-hetzner.sh root@46.225.86.170
#
# Voraussetzungen auf dem Server:
#   - Docker + Docker Compose installiert
# ============================================================

set -e

SSH_HOST="${1:?Fehler: SSH-Host angeben (z.B. root@46.225.86.170)}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
REMOTE_DIR="/opt/medrezeption"

echo "=== MED Rezeption LIVE-Deployment auf Hetzner CPX ==="
echo "Host:   $SSH_HOST"
echo "Remote: $REMOTE_DIR"
echo ""

# [1] System-Nginx stoppen falls aktiv (Port-80-Konflikt vermeiden)
echo "[1/5] Stoppe System-Nginx falls aktiv..."
ssh "$SSH_HOST" "
    systemctl stop nginx 2>/dev/null || true
    systemctl disable nginx 2>/dev/null || true
"

# [2] Server vorbereiten
echo "[2/5] Erstelle Verzeichnisse auf Server..."
ssh "$SSH_HOST" "mkdir -p $REMOTE_DIR/deploy/hetzner"

# [3] Dateien hochladen
echo "[3/5] Lade Projekt hoch..."
rsync -avz --exclude='.git' --exclude='node_modules' --exclude='__pycache__' \
    --exclude='.env' --exclude='*.sqlite' --exclude='*.db' \
    "$PROJECT_DIR/" "$SSH_HOST:$REMOTE_DIR/"

# [4] .env pruefen
echo "[4/5] Pruefe .env..."
ssh "$SSH_HOST" "
    if [ ! -f $REMOTE_DIR/deploy/hetzner/.env ]; then
        cp $REMOTE_DIR/deploy/hetzner/.env.beispiel $REMOTE_DIR/deploy/hetzner/.env
        echo 'ACHTUNG: .env erstellt - API-Key muss noch eingetragen werden!'
        echo '         ssh $SSH_HOST nano $REMOTE_DIR/deploy/hetzner/.env'
    else
        echo '.env existiert bereits.'
    fi
"

# [5] Docker starten
echo "[5/5] Starte Container..."
ssh "$SSH_HOST" "
    cd $REMOTE_DIR/deploy/hetzner
    docker compose down 2>/dev/null || true
    docker compose build --no-cache
    docker compose up -d
    echo ''
    echo 'Container-Status:'
    docker compose ps
"

echo ""
echo "=== Live-System erfolgreich deployed ==="
echo ""
echo "URL:    http://${SSH_HOST#*@}"
echo "Status: ssh $SSH_HOST 'cd $REMOTE_DIR/deploy/hetzner && docker compose ps'"
echo "Logs:   ssh $SSH_HOST 'cd $REMOTE_DIR/deploy/hetzner && docker compose logs -f'"
echo ""
echo "WICHTIG: Falls noch nicht geschehen, API-Key eintragen:"
echo "  ssh $SSH_HOST 'nano $REMOTE_DIR/deploy/hetzner/.env'"
echo "  ssh $SSH_HOST 'cd $REMOTE_DIR/deploy/hetzner && docker compose restart web'"
