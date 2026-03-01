#!/bin/bash
# ============================================================
# MedReception — Hetzner ALL-IN-ONE Deployment
# ============================================================
#
# EIN EINZIGER BEFEHL — auf dem Server als root ausfuehren:
#
#   curl -sL https://raw.githubusercontent.com/chrisberlin82-crypto/Zzz/claude/medreception-mvp-COCku/deploy-hetzner-copypaste.sh | bash
#
# Das Script macht ALLES automatisch:
#   - Docker + Git + Ollama installieren
#   - Code von GitHub klonen
#   - API-Key abfragen (interaktiv)
#   - Docker-Container bauen und starten
#   - LLM-Modell herunterladen
#   - Alles pruefen und Status anzeigen
#
# Voraussetzungen:
#   - Hetzner Server (oder aehnlich) mit Ubuntu/Debian
#   - Root-Zugang (ssh root@DEINE-IP)
#   - Mindestens 4 GB RAM (8 GB fuer lokales LLM empfohlen)
#   - 20 GB freier Speicher
#
# Optional: API-Key vorab setzen (dann keine Abfrage):
#   export MED_LLM_API_KEY="sk-ant-DEIN-KEY"
#   curl -sL ... | bash
# ============================================================

set -e

APP_DIR="/root/Zzz"
BRANCH="claude/medreception-mvp-COCku"
REPO="https://github.com/chrisberlin82-crypto/Zzz.git"
ENV_FILE=""  # wird spaeter gesetzt
COMPOSE=""   # wird spaeter gesetzt

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║   MedReception — ALL-IN-ONE Deployment   ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# ===== 1. System-Pakete pruefen / installieren =====
echo "[1/10] System-Pakete pruefen..."
apt-get update -qq
apt-get install -y -qq git curl wget lsof > /dev/null 2>&1
echo "  Git, curl, wget vorhanden."

# ===== 2. Docker pruefen / installieren =====
echo ""
echo "[2/10] Docker pruefen..."
if ! command -v docker &>/dev/null; then
    echo "  Docker nicht gefunden — installiere..."
    apt-get install -y -qq docker.io docker-compose-plugin > /dev/null 2>&1
    systemctl enable docker
    systemctl start docker
    echo "  Docker installiert!"
else
    echo "  Docker vorhanden: $(docker --version | head -1)"
fi

# Docker Compose (Plugin oder standalone)
if docker compose version &>/dev/null; then
    COMPOSE="docker compose"
elif command -v docker-compose &>/dev/null; then
    COMPOSE="docker-compose"
else
    echo "  Docker Compose Plugin installieren..."
    apt-get install -y -qq docker-compose-plugin > /dev/null 2>&1
    COMPOSE="docker compose"
fi
echo "  Compose: $($COMPOSE version 2>/dev/null | head -1)"

# ===== 3. Ollama installieren (fuer lokales LLM) =====
echo ""
echo "[3/10] Ollama pruefen..."
if ! command -v ollama &>/dev/null; then
    echo "  Ollama nicht gefunden — installiere..."
    curl -fsSL https://ollama.com/install.sh | sh
    # Ollama als Service starten
    systemctl enable ollama 2>/dev/null || true
    systemctl start ollama 2>/dev/null || true
    sleep 3
    echo "  Ollama installiert und gestartet!"
else
    echo "  Ollama vorhanden: $(ollama --version 2>/dev/null || echo 'installiert')"
    # Sicherstellen dass Ollama laeuft
    systemctl start ollama 2>/dev/null || true
fi

# ===== 4. Code klonen oder aktualisieren =====
echo ""
echo "[4/10] Code von GitHub holen..."
if [ -d "$APP_DIR/.git" ]; then
    cd "$APP_DIR"
    git fetch origin "$BRANCH"
    git checkout "$BRANCH" 2>/dev/null || git checkout -b "$BRANCH" "origin/$BRANCH"
    git reset --hard "origin/$BRANCH"
    echo "  Code aktualisiert (Branch: $BRANCH)."
else
    rm -rf "$APP_DIR" 2>/dev/null || true
    git clone -b "$BRANCH" "$REPO" "$APP_DIR"
    cd "$APP_DIR"
    echo "  Repository geklont (Branch: $BRANCH)."
fi

# ===== 5. Verzeichnisse anlegen =====
echo ""
echo "[5/10] Verzeichnisse anlegen..."
mkdir -p "$APP_DIR/data" "$APP_DIR/logs" "$APP_DIR/audio/hintergrund"
echo "  data/, logs/, audio/ erstellt."

# ===== 6. .env konfigurieren (API-Key abfragen) =====
echo ""
echo "[6/10] Konfiguration erstellen..."
ENV_FILE="$APP_DIR/deploy/hetzner/.env"

# Secret-Key generieren
SECRET=$(python3 -c "import secrets; print(secrets.token_hex(32))" 2>/dev/null || echo "medrezeption-$(date +%s)-$(head -c 16 /dev/urandom | xxd -p)")

# Pruefen ob .env schon existiert mit gueltigem API-Key
EXISTING_KEY=""
if [ -f "$ENV_FILE" ]; then
    EXISTING_KEY=$(grep "^MED_LLM_API_KEY=" "$ENV_FILE" 2>/dev/null | cut -d= -f2 | tr -d ' ')
fi

# API-Key bestimmen: Umgebungsvariable > bestehende .env > interaktiv abfragen
API_KEY="${MED_LLM_API_KEY:-$EXISTING_KEY}"

if [ -z "$API_KEY" ] || [ "$API_KEY" = "sk-ant-DEIN-API-KEY-HIER" ]; then
    echo ""
    echo "  ┌────────────────────────────────────────────┐"
    echo "  │  API-Key wird benoetigt!                   │"
    echo "  │                                            │"
    echo "  │  Anthropic: console.anthropic.com          │"
    echo "  │  OpenAI:    platform.openai.com/api-keys   │"
    echo "  │                                            │"
    echo "  │  Oder ENTER druecken um zu ueberspringen   │"
    echo "  │  (kann spaeter in .env eingetragen werden) │"
    echo "  └────────────────────────────────────────────┘"
    echo ""
    read -r -p "  API-Key eingeben: " API_KEY
    if [ -z "$API_KEY" ]; then
        API_KEY="sk-ant-DEIN-API-KEY-HIER"
        echo "  Uebersprungen — spaeter eintragen: nano $ENV_FILE"
    else
        echo "  API-Key gespeichert!"
    fi
fi

# LLM-Provider erkennen (anhand Key-Prefix)
LLM_PROVIDER="anthropic"
if [[ "$API_KEY" == sk-ant-* ]]; then
    LLM_PROVIDER="anthropic"
elif [[ "$API_KEY" == sk-* ]]; then
    LLM_PROVIDER="openai"
fi

# .env schreiben
cat > "$ENV_FILE" << ENVEOF
# ============================================================
# MED Rezeption LIVE - Konfiguration
# Erstellt am: $(date '+%Y-%m-%d %H:%M:%S')
# ============================================================

# --- LLM Provider ---
MED_LLM_PROVIDER=$LLM_PROVIDER
MED_LLM_API_KEY=$API_KEY
MED_LLM_MODEL=

# --- Branche ---
MED_BRANCHE=arztpraxis

# --- Flask ---
FLASK_ENV=production

# --- Voicebot Engine (FastAPI) ---
MR_LLM_MODEL=llama3.1:8b-instruct-q4_K_M
MR_STT_MODEL=small
MR_STT_DEVICE=cpu
MR_STT_COMPUTE_TYPE=int8
MR_TTS_MODEL=de_DE-thorsten-high
MR_TTS_SPEED=1.0
MR_AUDIO_HINTERGRUND_TYP=buero
MR_AUDIO_HINTERGRUND_AKTIV=true
MR_AUDIO_HINTERGRUND_LAUTSTAERKE=0.08
MR_DEBUG=false
MR_SECRET_KEY=$SECRET
ENVEOF

echo "  .env geschrieben: $ENV_FILE"
echo "  Provider: $LLM_PROVIDER"

# ===== 7. Ports freimachen =====
echo ""
echo "[7/10] Ports freimachen (80, 5000, 8000)..."
systemctl stop nginx 2>/dev/null || true
systemctl disable nginx 2>/dev/null || true
systemctl stop apache2 2>/dev/null || true
systemctl disable apache2 2>/dev/null || true

# Alte Docker-Container stoppen
cd "$APP_DIR/deploy/hetzner"
$COMPOSE down --remove-orphans 2>/dev/null || true

# Alte Prozesse killen
pkill -f "uvicorn main:app" 2>/dev/null || true
pkill -f "flask run" 2>/dev/null || true
pkill -f "gunicorn" 2>/dev/null || true
sleep 2
fuser -k 80/tcp 2>/dev/null || true
fuser -k 5000/tcp 2>/dev/null || true
fuser -k 8000/tcp 2>/dev/null || true
sleep 1
echo "  Ports 80, 5000, 8000 sind frei."

# ===== 8. Docker Container bauen und starten =====
echo ""
echo "[8/10] Docker Container bauen und starten..."
echo "  (Das kann beim ersten Mal 3-5 Minuten dauern)"
echo ""
cd "$APP_DIR/deploy/hetzner"
$COMPOSE build --no-cache
$COMPOSE up -d --remove-orphans

echo ""
echo "  Container-Status:"
$COMPOSE ps
echo ""

# ===== 9. Auf Backend warten =====
echo "[9/10] Warte auf Backend..."
BACKEND_READY=false
for i in $(seq 1 60); do
    if curl -sf http://localhost/api/system/status &>/dev/null; then
        echo "  Backend ist ONLINE! (nach ${i}s)"
        BACKEND_READY=true
        break
    fi
    if [ "$((i % 10))" -eq 0 ]; then
        echo "  Warte noch... (${i}s)"
    fi
    sleep 1
done

if [ "$BACKEND_READY" = false ]; then
    echo "  Backend antwortet noch nicht — pruefe Logs:"
    echo "  $COMPOSE logs --tail=20 voicebot"
    echo ""
    $COMPOSE logs --tail=10 voicebot 2>/dev/null || true
    echo ""
    echo "  Das Backend braucht manchmal laenger beim ersten Start."
    echo "  Pruefe spaeter: curl http://localhost/api/system/status"
fi

# ===== 10. Ollama LLM-Modell laden =====
echo ""
echo "[10/10] Ollama LLM-Modell pruefen..."
MODEL=$(grep "^MR_LLM_MODEL=" "$ENV_FILE" 2>/dev/null | cut -d= -f2 | tr -d ' ')
MODEL=${MODEL:-llama3.1:8b-instruct-q4_K_M}

if command -v ollama &>/dev/null; then
    if ollama list 2>/dev/null | grep -q "$MODEL"; then
        echo "  Modell bereits vorhanden: $MODEL"
    else
        echo "  Lade Modell: $MODEL"
        echo "  (Beim ersten Mal ca. 5 GB Download — 5-10 Minuten)"
        echo ""
        ollama pull "$MODEL" || echo "  WARNUNG: Download fehlgeschlagen. Spaeter: ollama pull $MODEL"
    fi
else
    echo "  WARNUNG: Ollama nicht verfuegbar."
    echo "  Installation: curl -fsSL https://ollama.com/install.sh | sh"
    echo "  Dann: ollama pull $MODEL"
fi

# ===== FERTIG =====
SERVER_IP=$(hostname -I | awk '{print $1}')

echo ""
echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║          DEPLOYMENT ERFOLGREICH!                 ║"
echo "╠══════════════════════════════════════════════════╣"
echo "║                                                  ║"
echo "  Frontend:      http://$SERVER_IP"
echo "  Dashboard:     http://$SERVER_IP/admin-dashboard.html"
echo "  AI Agent:      http://$SERVER_IP/ai-agent.html"
echo "  Voicebot:      http://$SERVER_IP/voicebot-live.html"
echo "  API Status:    http://$SERVER_IP/api/system/status"
echo "║                                                  ║"
echo "╠══════════════════════════════════════════════════╣"
echo "║  Nuetzliche Befehle:                             ║"
echo "╠══════════════════════════════════════════════════╣"
echo "║                                                  ║"
echo "  Status:   cd $APP_DIR/deploy/hetzner && $COMPOSE ps"
echo "  Logs:     cd $APP_DIR/deploy/hetzner && $COMPOSE logs -f"
echo "  Backend:  cd $APP_DIR/deploy/hetzner && $COMPOSE logs -f voicebot"
echo "  Restart:  cd $APP_DIR/deploy/hetzner && $COMPOSE restart"
echo "  Stop:     cd $APP_DIR/deploy/hetzner && $COMPOSE down"
echo "║                                                  ║"
echo "  Config:   nano $ENV_FILE"
echo "║                                                  ║"
echo "╠══════════════════════════════════════════════════╣"
echo "║  Spaeter updaten:                                ║"
echo "╠══════════════════════════════════════════════════╣"
echo "║                                                  ║"
echo "  cd $APP_DIR && git pull origin $BRANCH"
echo "  cd deploy/hetzner && $COMPOSE build --no-cache && $COMPOSE up -d"
echo "║                                                  ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""
