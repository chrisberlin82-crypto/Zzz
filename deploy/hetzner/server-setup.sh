#!/bin/bash
# ============================================================
# MED Rezeption - Server-Ersteinrichtung / Recovery
# ============================================================
# Auf dem Hetzner-Server ausfuehren:
#   curl -sSL https://raw.githubusercontent.com/chrisberlin82-crypto/Zzz/main/deploy/hetzner/server-setup.sh | bash
#
# Oder manuell:
#   ssh root@46.225.86.170
#   bash /opt/medrezeption/deploy/hetzner/server-setup.sh
#
# Was passiert:
#   - Docker installieren (falls noetig)
#   - Projekt von GitHub klonen/aktualisieren
#   - System-Nginx deaktivieren
#   - Docker-Container starten (web + voicebot + ollama + nginx)
#   - LLM-Modell herunterladen
#
# Voraussetzungen:
#   - Mindestens 8 GB RAM (fuer Ollama LLM)
#   - 20 GB freier Speicher
# ============================================================

set -e

REMOTE_DIR="/opt/medrezeption"
REPO_URL="https://github.com/chrisberlin82-crypto/Zzz.git"
BRANCH="main"

echo ""
echo "=== MED Rezeption Server-Setup ==="
echo ""

# [1] Docker installieren falls noetig
echo "[1/7] Pruefe Docker..."
if ! command -v docker &>/dev/null; then
    echo "       Installiere Docker..."
    apt-get update
    apt-get install -y docker.io docker-compose-plugin
    systemctl enable docker
    systemctl start docker
    echo "       Docker installiert."
else
    echo "       Docker vorhanden."
fi

# [2] System-Webserver deaktivieren
echo "[2/7] Deaktiviere System-Webserver..."
systemctl stop nginx 2>/dev/null || true
systemctl disable nginx 2>/dev/null || true
systemctl stop apache2 2>/dev/null || true
systemctl disable apache2 2>/dev/null || true
fuser -k 80/tcp 2>/dev/null || true

# [3] Server-Daten sichern BEVOR Code aktualisiert wird
echo "[3/7] Sichere Server-Daten..."
BACKUP_DIR="/opt/medrezeption-backup/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"

# .env sichern
if [ -f "$REMOTE_DIR/deploy/hetzner/.env" ]; then
    cp "$REMOTE_DIR/deploy/hetzner/.env" "$BACKUP_DIR/.env"
    echo "       .env gesichert."
fi

# Datenbank sichern (aus Docker-Volume)
if docker volume inspect hetzner_app_daten &>/dev/null; then
    docker run --rm -v hetzner_app_daten:/data -v "$BACKUP_DIR":/backup alpine \
        sh -c "cp -a /data/. /backup/daten/ 2>/dev/null || true"
    echo "       Datenbank gesichert nach $BACKUP_DIR/daten/"
fi

# Letzte 5 Backups behalten, aeltere loeschen
ls -dt /opt/medrezeption-backup/*/ 2>/dev/null | tail -n +6 | xargs rm -rf 2>/dev/null || true
echo "       Backup: $BACKUP_DIR"

# [4] Projekt klonen oder aktualisieren
echo "[4/7] Lade Projekt von GitHub..."
if [ -d "$REMOTE_DIR/.git" ]; then
    cd "$REMOTE_DIR"
    git fetch origin "$BRANCH"
    git checkout "$BRANCH"
    git reset --hard "origin/$BRANCH"
    echo "       Projekt aktualisiert."
else
    rm -rf "$REMOTE_DIR"
    git clone -b "$BRANCH" "$REPO_URL" "$REMOTE_DIR"
    echo "       Projekt geklont."
fi

# .env aus Backup wiederherstellen
if [ -f "$BACKUP_DIR/.env" ]; then
    cp "$BACKUP_DIR/.env" "$REMOTE_DIR/deploy/hetzner/.env"
    echo "       .env wiederhergestellt."
fi

# [5] .env pruefen
echo "[5/7] Pruefe .env..."
cd "$REMOTE_DIR/deploy/hetzner"
if [ ! -f .env ]; then
    cp .env.beispiel .env
    echo ""
    echo "  ACHTUNG: .env wurde erstellt!"
    echo "  API-Key eintragen: nano $REMOTE_DIR/deploy/hetzner/.env"
    echo ""
fi

# [6] Container starten
echo "[6/7] Starte Container..."
docker compose down 2>/dev/null || true
fuser -k 80/tcp 2>/dev/null || true
docker compose build --no-cache
docker compose up -d

# [7] Ollama LLM-Modell laden
echo "[7/7] Lade LLM-Modell..."
echo "       Warte auf Ollama..."
sleep 8

MODEL=$(grep MR_LLM_MODEL .env 2>/dev/null | grep -v '^#' | cut -d= -f2 | tr -d ' ')
MODEL=${MODEL:-"llama3.1:8b-instruct-q4_K_M"}

for i in 1 2 3 4 5; do
    if docker compose exec -T ollama ollama list >/dev/null 2>&1; then
        break
    fi
    echo "       Warte noch... (Versuch $i/5)"
    sleep 5
done

if ! docker compose exec -T ollama ollama list 2>/dev/null | grep -q "$MODEL"; then
    echo "       Lade Modell: $MODEL (kann 5-10 Minuten dauern)..."
    docker compose exec -T ollama ollama pull "$MODEL"
    echo "       Modell geladen."
else
    echo "       Modell bereits vorhanden: $MODEL"
fi

echo ""
echo "=== Container-Status ==="
docker compose ps
echo ""
echo "=== MED Rezeption laeuft ==="
echo ""
echo "  Frontend:  http://$(hostname -I | awk '{print $1}')"
echo "  Voicebot:  http://$(hostname -I | awk '{print $1}')/voicebot-live.html"
echo ""
echo "  Logs:      cd $REMOTE_DIR/deploy/hetzner && docker compose logs -f"
echo "  Stoppen:   cd $REMOTE_DIR/deploy/hetzner && docker compose down"
echo "  Starten:   cd $REMOTE_DIR/deploy/hetzner && docker compose up -d"
echo ""
