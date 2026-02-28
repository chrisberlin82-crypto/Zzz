#!/bin/bash
# MedReception — Remote-Deployment von lokal auf den Hetzner-Server
# Ausfuehren auf deinem lokalen PC (Git Bash / WSL / PowerShell):
#   bash deploy.sh
#
# Beim ersten Mal: SSH-Key einrichten damit kein Passwort noetig ist:
#   ssh-keygen -t ed25519       (Enter druecken, kein Passwort)
#   ssh-copy-id root@46.225.86.170
# Danach nie wieder Passwort eingeben.

set -e

SERVER="root@46.225.86.170"
APP_DIR="/root/Zzz"
BRANCH="claude/medreception-mvp-COCku"

echo "=== MedReception Remote-Deployment ==="
echo "Server: $SERVER"
echo ""

ssh "$SERVER" bash -s <<'REMOTE'
set -e

APP_DIR="/root/Zzz"
BRANCH="claude/medreception-mvp-COCku"
VENV="$APP_DIR/venv"

echo "[1/6] Code pullen..."
cd "$APP_DIR"
git pull origin "$BRANCH"

echo "[2/6] Virtual Environment..."
if [ ! -d "$VENV" ]; then
    python3 -m venv "$VENV"
    echo "  Neu erstellt"
else
    echo "  Vorhanden"
fi
source "$VENV/bin/activate"

echo "[3/6] Abhaengigkeiten installieren..."
pip install --quiet --upgrade pip
pip install --quiet -r "$APP_DIR/backend/requirements.txt"

echo "[4/6] Verzeichnisse anlegen..."
mkdir -p "$APP_DIR/logs" "$APP_DIR/data" "$APP_DIR/audio/hintergrund"

echo "[5/6] Alten Prozess stoppen..."
pkill -f "uvicorn main:app" 2>/dev/null || true
sleep 2

echo "[6/6] Backend starten..."
cd "$APP_DIR/backend"
nohup "$VENV/bin/python" main.py > "$APP_DIR/logs/backend.log" 2>&1 &
echo "  PID: $!"

sleep 5

if curl -s http://localhost:8000/api/system/status | grep -q "online"; then
    echo ""
    echo "=== ERFOLGREICH — MedReception laeuft ==="
    echo "  URL: http://46.225.86.170:8000"
    echo "  Log: ssh root@46.225.86.170 tail -f /root/Zzz/logs/backend.log"
else
    echo ""
    echo "WARNUNG: Backend antwortet noch nicht (Whisper laedt noch?)."
    echo "  Log pruefen: ssh root@46.225.86.170 tail -50 /root/Zzz/logs/backend.log"
fi
REMOTE

echo ""
echo "Fertig."
