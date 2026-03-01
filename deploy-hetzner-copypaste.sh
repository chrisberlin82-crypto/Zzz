#!/bin/bash
# ============================================================
# MedReception — Hetzner Copy&Paste Deployment
# ============================================================
#
# ANLEITUNG:
# 1. SSH zum Hetzner: ssh root@46.225.86.170
# 2. Dieses Script ausfuehren:
#    curl -sL https://raw.githubusercontent.com/chrisberlin82-crypto/Zzz/claude/medreception-mvp-COCku/deploy-hetzner-copypaste.sh | bash
#
#    ODER: Inhalt kopieren und einfuegen im Terminal.
#
# Voraussetzungen:
#   - Docker + Docker Compose installiert
#   - Git installiert
#   - Mindestens 4 GB RAM (8 GB fuer Ollama LLM)
# ============================================================

set -e

APP_DIR="/root/Zzz"
BRANCH="claude/medreception-mvp-COCku"
REPO="https://github.com/chrisberlin82-crypto/Zzz.git"
VENV="$APP_DIR/venv"

echo ""
echo "========================================"
echo "  MedReception — Hetzner Deployment"
echo "========================================"
echo ""

# ===== 1. Docker pruefen / installieren =====
echo "[1/8] Docker pruefen..."
if ! command -v docker &>/dev/null; then
    echo "  Docker nicht gefunden — installiere..."
    apt-get update -qq
    apt-get install -y -qq docker.io docker-compose-plugin
    systemctl enable docker
    systemctl start docker
    echo "  Docker installiert!"
else
    echo "  Docker vorhanden: $(docker --version)"
fi

# Docker Compose (Plugin oder standalone)
if docker compose version &>/dev/null; then
    COMPOSE="docker compose"
elif command -v docker-compose &>/dev/null; then
    COMPOSE="docker-compose"
else
    echo "  Docker Compose Plugin installieren..."
    apt-get install -y -qq docker-compose-plugin
    COMPOSE="docker compose"
fi
echo "  Compose: $COMPOSE"

# ===== 2. Git pruefen =====
echo ""
echo "[2/8] Git pruefen..."
if ! command -v git &>/dev/null; then
    apt-get update -qq && apt-get install -y -qq git
fi

# ===== 3. Code klonen oder aktualisieren =====
echo ""
echo "[3/8] Code holen..."
if [ -d "$APP_DIR/.git" ]; then
    cd "$APP_DIR"
    git fetch origin "$BRANCH"
    git checkout "$BRANCH" 2>/dev/null || git checkout -b "$BRANCH" "origin/$BRANCH"
    git pull origin "$BRANCH"
    echo "  Code aktualisiert."
else
    git clone -b "$BRANCH" "$REPO" "$APP_DIR"
    cd "$APP_DIR"
    echo "  Repository geklont."
fi

# ===== 4. Verzeichnisse anlegen =====
echo ""
echo "[4/8] Verzeichnisse anlegen..."
mkdir -p "$APP_DIR/data" "$APP_DIR/logs" "$APP_DIR/audio/hintergrund"

# ===== 5. .env erstellen (falls nicht vorhanden) =====
echo ""
echo "[5/8] Konfiguration pruefen..."
ENV_FILE="$APP_DIR/deploy/hetzner/.env"
if [ ! -f "$ENV_FILE" ]; then
    cp "$APP_DIR/deploy/hetzner/.env.beispiel" "$ENV_FILE"
    # Standard-Secret-Key generieren
    SECRET=$(python3 -c "import secrets; print(secrets.token_hex(32))" 2>/dev/null || echo "medrezeption-$(date +%s)")
    sed -i "s/CHANGE-ME-IN-PRODUCTION/$SECRET/" "$ENV_FILE"
    echo "  .env erstellt aus Vorlage."
    echo ""
    echo "  =========================================="
    echo "  WICHTIG: API-Key eintragen!"
    echo "  nano $ENV_FILE"
    echo "  =========================================="
    echo ""
else
    echo "  .env vorhanden."
fi

# ===== 6. Port 80 freimachen =====
echo ""
echo "[6/8] Port 80 freimachen..."
systemctl stop nginx 2>/dev/null || true
systemctl stop apache2 2>/dev/null || true
cd "$APP_DIR/deploy/hetzner"
$COMPOSE down 2>/dev/null || true
fuser -k 80/tcp 2>/dev/null || true
sleep 1
echo "  Port 80 frei."

# ===== 7. Docker Container bauen und starten =====
echo ""
echo "[7/8] Container bauen und starten..."
cd "$APP_DIR/deploy/hetzner"
$COMPOSE build --no-cache
$COMPOSE up -d

echo ""
echo "  Container-Status:"
$COMPOSE ps
echo ""

# Warten auf Start
echo "  Warte auf Backend..."
for i in $(seq 1 30); do
    if curl -sf http://localhost:8000/api/system/status &>/dev/null; then
        echo "  Backend ist online!"
        break
    fi
    sleep 2
done

# ===== 8. Ollama LLM pruefen (laeuft nativ auf dem Host) =====
echo ""
echo "[8/8] Ollama LLM pruefen..."
MODEL=$(grep "^MR_LLM_MODEL=" "$ENV_FILE" 2>/dev/null | cut -d= -f2 | tr -d ' ')
MODEL=${MODEL:-llama3.1:8b-instruct-q4_K_M}

if command -v ollama &>/dev/null; then
    if ollama list 2>/dev/null | grep -q "$MODEL"; then
        echo "  Modell vorhanden: $MODEL"
    else
        echo "  Lade Modell: $MODEL (kann 5-10 Minuten dauern)..."
        ollama pull "$MODEL" || echo "  WARNUNG: Modell konnte nicht geladen werden. Manuell: ollama pull $MODEL"
    fi
else
    echo "  Ollama nicht installiert. Installation:"
    echo "    curl -fsSL https://ollama.com/install.sh | sh"
    echo "    ollama pull $MODEL"
fi

# ===== Fertig =====
SERVER_IP=$(hostname -I | awk '{print $1}')

echo ""
echo "========================================"
echo "  DEPLOYMENT ERFOLGREICH!"
echo "========================================"
echo ""
echo "  Frontend:     http://$SERVER_IP"
echo "  Dashboard:    http://$SERVER_IP/admin-dashboard.html"
echo "  AI Agent:     http://$SERVER_IP/ai-agent.html"
echo "  Voicebot:     http://$SERVER_IP/voicebot.html"
echo "  API Status:   http://$SERVER_IP/api/system/status"
echo ""
echo "  Nuetzliche Befehle:"
echo "  -------------------"
echo "  Status:       cd $APP_DIR/deploy/hetzner && $COMPOSE ps"
echo "  Logs:         cd $APP_DIR/deploy/hetzner && $COMPOSE logs -f"
echo "  Backend-Log:  cd $APP_DIR/deploy/hetzner && $COMPOSE logs -f voicebot"
echo "  Neustarten:   cd $APP_DIR/deploy/hetzner && $COMPOSE restart"
echo "  Stoppen:      cd $APP_DIR/deploy/hetzner && $COMPOSE down"
echo ""
echo "  Update (spaeter):"
echo "  cd $APP_DIR && git pull origin $BRANCH"
echo "  cd deploy/hetzner && $COMPOSE build --no-cache && $COMPOSE up -d"
echo ""
