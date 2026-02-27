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
#   - Mindestens 8 GB RAM (fuer Ollama LLM)
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

# [1] Port 80 freimachen (System-Nginx, Apache, alte Container)
echo "[1/6] Mache Port 80 frei..."
ssh "$SSH_HOST" "
    systemctl stop nginx 2>/dev/null || true
    systemctl disable nginx 2>/dev/null || true
    systemctl stop apache2 2>/dev/null || true
    systemctl disable apache2 2>/dev/null || true
    cd $REMOTE_DIR/deploy/hetzner 2>/dev/null && docker compose down 2>/dev/null || true
    fuser -k 80/tcp 2>/dev/null || true
    sleep 1
    if fuser 80/tcp 2>/dev/null; then
        echo 'FEHLER: Port 80 ist noch belegt!'
        fuser -v 80/tcp
        exit 1
    fi
    echo 'Port 80 ist frei.'
"

# [2] Server vorbereiten
echo "[2/6] Erstelle Verzeichnisse auf Server..."
ssh "$SSH_HOST" "mkdir -p $REMOTE_DIR/deploy/hetzner"

# [3] Dateien hochladen
echo "[3/6] Lade Projekt hoch..."
# Sicherstellen: Server-Daten NIEMALS ueberschreiben
ssh "$SSH_HOST" "
    if [ -f $REMOTE_DIR/deploy/hetzner/.env ]; then
        cp $REMOTE_DIR/deploy/hetzner/.env /tmp/.env.backup
        echo '.env gesichert.'
    fi
"

rsync -avz --exclude='.git' --exclude='node_modules' --exclude='__pycache__' \
    --exclude='.env' --exclude='*.sqlite' --exclude='*.db' \
    --exclude='*.db-wal' --exclude='*.db-shm' \
    --exclude='*.sqlite-wal' --exclude='*.sqlite-shm' \
    --exclude='daten/' \
    "$PROJECT_DIR/" "$SSH_HOST:$REMOTE_DIR/"

# .env wiederherstellen falls rsync sie versehentlich geloescht hat
ssh "$SSH_HOST" "
    if [ ! -f $REMOTE_DIR/deploy/hetzner/.env ] && [ -f /tmp/.env.backup ]; then
        cp /tmp/.env.backup $REMOTE_DIR/deploy/hetzner/.env
        echo '.env wiederhergestellt.'
    fi
"

# [4] .env pruefen
echo "[4/6] Pruefe .env..."
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
echo "[5/6] Starte Container..."
ssh "$SSH_HOST" "
    cd $REMOTE_DIR/deploy/hetzner
    docker compose down 2>/dev/null || true
    fuser -k 80/tcp 2>/dev/null || true
    docker compose build --no-cache
    docker compose up -d
    echo ''
    echo 'Container-Status:'
    docker compose ps
    echo ''
    # Pruefen ob alle Container laufen
    if docker compose ps --format json | grep -q '\"exited\"'; then
        echo 'WARNUNG: Nicht alle Container laufen!'
        docker compose logs --tail=20
        exit 1
    fi
"

# [6] Ollama LLM-Modell laden
echo "[6/6] Lade LLM-Modell (kann beim ersten Mal 5-10 Minuten dauern)..."
ssh "$SSH_HOST" "
    cd $REMOTE_DIR/deploy/hetzner
    echo 'Warte auf Ollama...'
    sleep 8
    MODEL=\$(grep MR_LLM_MODEL .env 2>/dev/null | grep -v '^#' | cut -d= -f2 | tr -d ' ')
    MODEL=\${MODEL:-llama3.1:8b-instruct-q4_K_M}
    if ! docker compose exec -T ollama ollama list 2>/dev/null | grep -q \"\$MODEL\"; then
        echo \"Lade Modell: \$MODEL ...\"
        docker compose exec -T ollama ollama pull \"\$MODEL\"
    else
        echo \"Modell bereits vorhanden: \$MODEL\"
    fi
"

echo ""
echo "=== Live-System erfolgreich deployed ==="
echo ""
echo "Frontend:  http://${SSH_HOST#*@}"
echo "Voicebot:  http://${SSH_HOST#*@}/voicebot-live.html"
echo ""
echo "Status:    ssh $SSH_HOST 'cd $REMOTE_DIR/deploy/hetzner && docker compose ps'"
echo "Logs:      ssh $SSH_HOST 'cd $REMOTE_DIR/deploy/hetzner && docker compose logs -f'"
echo "Voicebot:  ssh $SSH_HOST 'cd $REMOTE_DIR/deploy/hetzner && docker compose logs -f voicebot'"
echo ""
echo "WICHTIG: Falls noch nicht geschehen, API-Key eintragen:"
echo "  ssh $SSH_HOST 'nano $REMOTE_DIR/deploy/hetzner/.env'"
echo "  ssh $SSH_HOST 'cd $REMOTE_DIR/deploy/hetzner && docker compose restart web'"
