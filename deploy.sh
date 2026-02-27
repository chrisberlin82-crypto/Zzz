#!/bin/bash
# MedReception — Deployment auf Root-Server
# Aufruf: bash deploy.sh
set -e

APP_DIR="/root/Zzz"
BRANCH="claude/medreception-mvp-COCku"
VENV="$APP_DIR/venv"

echo "=== MedReception Deployment ==="

# 1. Code aktualisieren
echo "[1/5] Code pullen..."
cd "$APP_DIR"
git pull origin "$BRANCH"

# 2. Virtual Environment (falls nicht vorhanden)
if [ ! -d "$VENV" ]; then
    echo "[2/5] Virtual Environment erstellen..."
    python3 -m venv "$VENV"
else
    echo "[2/5] Virtual Environment vorhanden"
fi
source "$VENV/bin/activate"

# 3. Abhaengigkeiten installieren
echo "[3/5] Abhaengigkeiten installieren..."
pip install --quiet --upgrade pip
pip install --quiet -r "$APP_DIR/backend/requirements.txt"

# 4. Laufenden Prozess stoppen (falls vorhanden)
echo "[4/5] Alten Prozess stoppen..."
pkill -f "uvicorn main:app" 2>/dev/null || true
sleep 2

# 5. Backend starten
echo "[5/5] Backend starten..."
cd "$APP_DIR/backend"
nohup python main.py > "$APP_DIR/logs/backend.log" 2>&1 &
echo "PID: $!"

sleep 3

# Pruefen ob gestartet
if curl -s http://localhost:8000/api/system/status | grep -q "online"; then
    echo ""
    echo "=== MedReception laeuft auf Port 8000 ==="
    echo "Log: tail -f $APP_DIR/logs/backend.log"
else
    echo ""
    echo "WARNUNG: Backend antwortet nicht. Log pruefen:"
    echo "  tail -50 $APP_DIR/logs/backend.log"
fi
