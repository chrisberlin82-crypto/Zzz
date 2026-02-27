#!/bin/bash
# ============================================================
# MedReception — Installationsscript
# Installiert Asterisk, Ollama, Piper-TTS, Faster-Whisper
# und alle Abhaengigkeiten auf einem Debian/Ubuntu-Server.
# ============================================================
set -euo pipefail

# Farben fuer Ausgabe
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

info()  { echo -e "${BLUE}[INFO]${NC}  $1"; }
ok()    { echo -e "${GREEN}[OK]${NC}    $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# Root-Check
if [ "$EUID" -ne 0 ]; then
    error "Bitte als root ausfuehren: sudo bash install.sh"
fi

INSTALL_DIR="/opt/medreception"
DATA_DIR="${INSTALL_DIR}/data"
AUDIO_DIR="${INSTALL_DIR}/audio"
LOG_DIR="/var/log/medreception"
VENV_DIR="${INSTALL_DIR}/venv"
REPO_DIR="$(cd "$(dirname "$0")" && pwd)"

echo ""
echo "=============================================="
echo "  MedReception — Installation"
echo "=============================================="
echo ""
info "Repo-Verzeichnis: ${REPO_DIR}"
info "Installationsverzeichnis: ${INSTALL_DIR}"
echo ""

# ===== 1. System-Updates und Grundpakete =====
info "1/8 — Systempakete aktualisieren..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq \
    build-essential \
    python3 python3-pip python3-venv python3-dev \
    git curl wget jq sox libsox-fmt-all \
    ffmpeg libavcodec-extra \
    sqlite3 \
    nginx certbot python3-certbot-nginx \
    > /dev/null 2>&1
ok "Systempakete installiert"

# ===== 2. Asterisk installieren =====
info "2/8 — Asterisk installieren..."
if command -v asterisk &> /dev/null; then
    ok "Asterisk ist bereits installiert: $(asterisk -V)"
else
    apt-get install -y -qq \
        asterisk asterisk-core-sounds-de-wav \
        asterisk-modules \
        > /dev/null 2>&1
    ok "Asterisk installiert: $(asterisk -V)"
fi

# Asterisk-Konfiguration kopieren
info "Asterisk-Konfiguration einrichten..."
ASTERISK_CONF="/etc/asterisk"

# Backup bestehender Konfiguration
if [ -d "${ASTERISK_CONF}" ]; then
    BACKUP_DIR="/root/backups/asterisk-$(date +%Y%m%d-%H%M%S)"
    mkdir -p "${BACKUP_DIR}"
    cp -a "${ASTERISK_CONF}" "${BACKUP_DIR}/"
    ok "Backup erstellt: ${BACKUP_DIR}"
fi

# PJSIP
cp "${REPO_DIR}/asterisk/sip/pjsip.conf" "${ASTERISK_CONF}/pjsip.conf"
# Dialplan
cp "${REPO_DIR}/asterisk/dialplan/extensions.conf" "${ASTERISK_CONF}/extensions.conf"
# Queues
cp "${REPO_DIR}/asterisk/queues/queues.conf" "${ASTERISK_CONF}/queues.conf"
# HTTP (fuer ARI)
if [ -f "${REPO_DIR}/asterisk/http.conf" ]; then
    cp "${REPO_DIR}/asterisk/http.conf" "${ASTERISK_CONF}/http.conf"
fi

# ARI aktivieren
cat > "${ASTERISK_CONF}/ari.conf" << 'ARIEOF'
[general]
enabled=yes
pretty=yes

[medreception]
type=user
read_only=no
password=CHANGE-ME
ARIEOF

# AMI aktivieren
cat > "${ASTERISK_CONF}/manager.conf" << 'AMIEOF'
[general]
enabled=yes
port=5038
bindaddr=127.0.0.1

[medreception]
secret=CHANGE-ME
deny=0.0.0.0/0.0.0.0
permit=127.0.0.1/255.255.255.0
read=all
write=all
AMIEOF

ok "Asterisk-Konfiguration eingerichtet"

# ===== 3. Ollama installieren (lokales LLM) =====
info "3/8 — Ollama installieren..."
if command -v ollama &> /dev/null; then
    ok "Ollama ist bereits installiert"
else
    curl -fsSL https://ollama.com/install.sh | sh
    ok "Ollama installiert"
fi

# Ollama als Service aktivieren
systemctl enable ollama 2>/dev/null || true
systemctl start ollama 2>/dev/null || true

# LLM-Modell herunterladen (im Hintergrund)
info "LLM-Modell herunterladen (llama3.1:8b-instruct-q4_K_M)..."
info "Dies kann mehrere Minuten dauern..."
ollama pull llama3.1:8b-instruct-q4_K_M || warn "Modell-Download fehlgeschlagen — spaeter manuell: ollama pull llama3.1:8b-instruct-q4_K_M"
ok "LLM-Modell bereit"

# ===== 4. Python-Umgebung =====
info "4/8 — Python-Umgebung einrichten..."
mkdir -p "${INSTALL_DIR}" "${DATA_DIR}" "${AUDIO_DIR}" "${LOG_DIR}"

# Virtualenv erstellen
python3 -m venv "${VENV_DIR}"
source "${VENV_DIR}/bin/activate"

# Abhaengigkeiten installieren
pip install --upgrade pip wheel setuptools > /dev/null 2>&1
pip install -r "${REPO_DIR}/backend/requirements.txt" > /dev/null 2>&1
ok "Python-Umgebung eingerichtet"

# ===== 5. Piper TTS (Deutsche Stimme) =====
info "5/8 — Piper TTS einrichten..."
PIPER_DIR="${INSTALL_DIR}/models/tts"
mkdir -p "${PIPER_DIR}"

# Thorsten-High Modell herunterladen
PIPER_MODEL="de_DE-thorsten-high"
PIPER_URL="https://huggingface.co/rhasspy/piper-voices/resolve/main/de/de_DE/thorsten/high"

if [ ! -f "${PIPER_DIR}/${PIPER_MODEL}.onnx" ]; then
    info "Lade Piper-Stimme herunter: ${PIPER_MODEL}..."
    wget -q -O "${PIPER_DIR}/${PIPER_MODEL}.onnx" \
        "${PIPER_URL}/${PIPER_MODEL}.onnx" || warn "Piper-Modell Download fehlgeschlagen"
    wget -q -O "${PIPER_DIR}/${PIPER_MODEL}.onnx.json" \
        "${PIPER_URL}/${PIPER_MODEL}.onnx.json" || warn "Piper-Config Download fehlgeschlagen"
    ok "Piper TTS-Modell heruntergeladen"
else
    ok "Piper TTS-Modell bereits vorhanden"
fi

# ===== 6. Backend installieren =====
info "6/8 — Backend installieren..."

# Backend-Code kopieren
cp -r "${REPO_DIR}/backend/"* "${INSTALL_DIR}/"
cp -r "${REPO_DIR}/asterisk/agi/fastagi_server.py" "${INSTALL_DIR}/fastagi_server.py"

# Audio-Verzeichnisse anlegen
mkdir -p "${AUDIO_DIR}/hintergrund"
mkdir -p "${AUDIO_DIR}/ansagen"
mkdir -p "${INSTALL_DIR}/models/tts"

# Standard-Hintergrundgeraeusche generieren (Stille als Platzhalter)
for typ in buero praxis ruhig; do
    if [ ! -f "${AUDIO_DIR}/hintergrund/${typ}.wav" ]; then
        sox -n "${AUDIO_DIR}/hintergrund/${typ}.wav" synth 60 brownnoise vol 0.02
        ok "Hintergrund-Audio erstellt: ${typ}"
    fi
done

# .env Datei erstellen (falls nicht vorhanden)
if [ ! -f "${INSTALL_DIR}/.env" ]; then
    cat > "${INSTALL_DIR}/.env" << ENVEOF
# MedReception Konfiguration
MR_DEBUG=false
MR_SECRET_KEY=$(openssl rand -hex 32)
MR_API_PORT=8000
MR_FRONTEND_URL=http://$(hostname -I | awk '{print $1}')

# Datenbank
MR_DB_URL=sqlite+aiosqlite:///${DATA_DIR}/medreception.db

# Asterisk
MR_ASTERISK_HOST=127.0.0.1
MR_ASTERISK_ARI_USER=medreception
MR_ASTERISK_ARI_PASSWORD=$(openssl rand -hex 16)
MR_ASTERISK_AMI_USER=medreception
MR_ASTERISK_AMI_PASSWORD=$(openssl rand -hex 16)

# LLM (Ollama)
MR_LLM_MODEL=llama3.1:8b-instruct-q4_K_M
MR_LLM_BASE_URL=http://127.0.0.1:11434

# STT (Faster-Whisper)
MR_STT_MODEL=small
MR_STT_DEVICE=cpu
MR_STT_COMPUTE_TYPE=int8

# TTS (Piper)
MR_TTS_MODEL=de_DE-thorsten-high
MR_TTS_MODELS_DIR=${PIPER_DIR}
MR_TTS_SPEED=1.0

# Audio
MR_AUDIO_HINTERGRUND_DIR=${AUDIO_DIR}/hintergrund
MR_AUDIO_HINTERGRUND_TYP=buero
MR_AUDIO_HINTERGRUND_LAUTSTAERKE=0.08
MR_AUDIO_HINTERGRUND_AKTIV=true
ENVEOF
    ok ".env Datei erstellt"
else
    ok ".env Datei bereits vorhanden"
fi

ok "Backend installiert"

# ===== 7. Systemd Services =====
info "7/8 — Systemd Services einrichten..."

# MedReception Backend Service
cat > /etc/systemd/system/medreception.service << SVCEOF
[Unit]
Description=MedReception Backend (FastAPI)
After=network.target ollama.service
Wants=ollama.service

[Service]
Type=simple
User=root
WorkingDirectory=${INSTALL_DIR}
Environment=PATH=${VENV_DIR}/bin:/usr/local/bin:/usr/bin
ExecStart=${VENV_DIR}/bin/python -m uvicorn main:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=5
StandardOutput=append:${LOG_DIR}/backend.log
StandardError=append:${LOG_DIR}/backend-error.log

[Install]
WantedBy=multi-user.target
SVCEOF

# FastAGI Server Service
cat > /etc/systemd/system/medreception-agi.service << AGIEOF
[Unit]
Description=MedReception FastAGI Server
After=network.target asterisk.service

[Service]
Type=simple
User=root
WorkingDirectory=${INSTALL_DIR}
Environment=PATH=${VENV_DIR}/bin:/usr/local/bin:/usr/bin
Environment=MR_API_URL=http://127.0.0.1:8000/api
ExecStart=${VENV_DIR}/bin/python fastagi_server.py
Restart=always
RestartSec=5
StandardOutput=append:${LOG_DIR}/agi.log
StandardError=append:${LOG_DIR}/agi-error.log

[Install]
WantedBy=multi-user.target
AGIEOF

# Services aktivieren
systemctl daemon-reload
systemctl enable medreception.service
systemctl enable medreception-agi.service
ok "Systemd Services eingerichtet"

# ===== 8. Nginx Reverse-Proxy =====
info "8/8 — Nginx Reverse-Proxy einrichten..."

cat > /etc/nginx/sites-available/medreception << 'NGXEOF'
server {
    listen 80;
    server_name _;

    # Frontend (statische Dateien)
    root /var/www/html;
    index index.html;

    # API Reverse-Proxy
    location /api/ {
        proxy_pass http://127.0.0.1:8000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket Reverse-Proxy
    location /ws/ {
        proxy_pass http://127.0.0.1:8000/ws/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 3600;
        proxy_send_timeout 3600;
    }

    # Statische Dateien
    location / {
        try_files $uri $uri/ /index.html;
    }
}
NGXEOF

# Nginx-Seite aktivieren
ln -sf /etc/nginx/sites-available/medreception /etc/nginx/sites-enabled/medreception
rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true

# Nginx Config testen und neuladen
nginx -t > /dev/null 2>&1 && systemctl reload nginx
ok "Nginx eingerichtet"

# ===== Fertig =====
echo ""
echo "=============================================="
echo -e "  ${GREEN}MedReception — Installation abgeschlossen!${NC}"
echo "=============================================="
echo ""
echo "  Verzeichnisse:"
echo "    Backend:  ${INSTALL_DIR}"
echo "    Daten:    ${DATA_DIR}"
echo "    Audio:    ${AUDIO_DIR}"
echo "    Logs:     ${LOG_DIR}"
echo ""
echo "  Services starten:"
echo "    systemctl start asterisk"
echo "    systemctl start medreception"
echo "    systemctl start medreception-agi"
echo ""
echo "  Status pruefen:"
echo "    systemctl status medreception"
echo "    systemctl status medreception-agi"
echo "    systemctl status asterisk"
echo "    systemctl status ollama"
echo ""
echo "  Logs:"
echo "    tail -f ${LOG_DIR}/backend.log"
echo "    tail -f ${LOG_DIR}/agi.log"
echo "    asterisk -rvvv"
echo ""
echo "  WICHTIG — Vor dem Start anpassen:"
echo "    1. ${INSTALL_DIR}/.env      — Passwoerter aendern"
echo "    2. /etc/asterisk/pjsip.conf — SIP-Provider eintragen"
echo "    3. /etc/asterisk/ari.conf   — ARI-Passwort aendern"
echo "    4. /etc/asterisk/manager.conf — AMI-Passwort aendern"
echo ""
echo -e "  ${YELLOW}Erster Start:${NC}"
echo "    systemctl start asterisk && systemctl start medreception && systemctl start medreception-agi"
echo ""
