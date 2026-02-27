#!/bin/bash
# ============================================================
# Server-seitiges Start-Script fuer Hetzner
# Direkt auf dem Server ausfuehren:
#   cd /opt/medrezeption/deploy/hetzner && ./start.sh
# ============================================================

set -e

echo "=== MED Rezeption Server-Start ==="

# Port 80 freimachen
echo "[1/5] Mache Port 80 frei..."
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

# .env pruefen
echo "[2/5] Pruefe .env..."
if [ ! -f .env ]; then
    cp .env.beispiel .env
    echo "ACHTUNG: .env erstellt — bitte API-Key eintragen!"
    echo "  nano $(pwd)/.env"
fi

# Container bauen und starten
echo "[3/5] Baue und starte Container..."
docker compose build --no-cache
docker compose up -d

# Ollama LLM-Modell laden
echo "[4/5] Lade LLM-Modell (kann beim ersten Mal 5-10 Minuten dauern)..."
echo "       Warte auf Ollama..."
sleep 5
for i in 1 2 3 4 5; do
    if docker compose exec -T ollama ollama list >/dev/null 2>&1; then
        break
    fi
    echo "       Warte noch... (Versuch $i/5)"
    sleep 5
done

MODEL=$(grep MR_LLM_MODEL .env 2>/dev/null | grep -v '^#' | cut -d= -f2 | tr -d ' ')
MODEL=${MODEL:-"llama3.1:8b-instruct-q4_K_M"}

if ! docker compose exec -T ollama ollama list 2>/dev/null | grep -q "$MODEL"; then
    echo "       Lade Modell: $MODEL ..."
    docker compose exec -T ollama ollama pull "$MODEL"
    echo "       Modell geladen."
else
    echo "       Modell bereits vorhanden: $MODEL"
fi

# Status pruefen
echo ""
echo "[5/5] Container-Status:"
docker compose ps
echo ""
echo "=== Fertig ==="
echo ""
echo "  Frontend: http://$(hostname -I | awk '{print $1}')"
echo "  Voicebot: http://$(hostname -I | awk '{print $1}')/voicebot-live.html"
echo ""
echo "  Logs:     docker compose logs -f"
echo "  Stoppen:  docker compose down"
echo ""
