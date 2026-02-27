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
#   - Docker-Container starten
# ============================================================

set -e

REMOTE_DIR="/opt/medrezeption"
REPO_URL="https://github.com/chrisberlin82-crypto/Zzz.git"
BRANCH="main"

echo ""
echo "=== MED Rezeption Server-Setup ==="
echo ""

# [1] Docker installieren falls noetig
echo "[1/5] Pruefe Docker..."
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
echo "[2/5] Deaktiviere System-Webserver..."
systemctl stop nginx 2>/dev/null || true
systemctl disable nginx 2>/dev/null || true
systemctl stop apache2 2>/dev/null || true
systemctl disable apache2 2>/dev/null || true
fuser -k 80/tcp 2>/dev/null || true

# [3] Projekt klonen oder aktualisieren
echo "[3/5] Lade Projekt von GitHub..."
if [ -d "$REMOTE_DIR/.git" ]; then
    cd "$REMOTE_DIR"
    git fetch origin "$BRANCH"
    git checkout "$BRANCH"
    git reset --hard "origin/$BRANCH"
    echo "       Projekt aktualisiert."
else
    # Bestehende Dateien sichern (.env)
    ENV_BACKUP=""
    if [ -f "$REMOTE_DIR/deploy/hetzner/.env" ]; then
        ENV_BACKUP=$(cat "$REMOTE_DIR/deploy/hetzner/.env")
    fi

    rm -rf "$REMOTE_DIR"
    git clone -b "$BRANCH" "$REPO_URL" "$REMOTE_DIR"

    # .env wiederherstellen
    if [ -n "$ENV_BACKUP" ]; then
        echo "$ENV_BACKUP" > "$REMOTE_DIR/deploy/hetzner/.env"
        echo "       .env wiederhergestellt."
    fi
    echo "       Projekt geklont."
fi

# [4] .env pruefen
echo "[4/5] Pruefe .env..."
cd "$REMOTE_DIR/deploy/hetzner"
if [ ! -f .env ]; then
    cp .env.beispiel .env
    echo ""
    echo "  ACHTUNG: .env wurde erstellt!"
    echo "  API-Key eintragen: nano $REMOTE_DIR/deploy/hetzner/.env"
    echo ""
fi

# [5] Container starten
echo "[5/5] Starte Container..."
docker compose down 2>/dev/null || true
fuser -k 80/tcp 2>/dev/null || true
docker compose build --no-cache
docker compose up -d

echo ""
echo "=== Container-Status ==="
docker compose ps
echo ""
echo "=== MED Rezeption laeuft ==="
echo ""
echo "  URL:     http://$(hostname -I | awk '{print $1}')"
echo "  Logs:    cd $REMOTE_DIR/deploy/hetzner && docker compose logs -f"
echo "  Stoppen: cd $REMOTE_DIR/deploy/hetzner && docker compose down"
echo "  Starten: cd $REMOTE_DIR/deploy/hetzner && docker compose up -d"
echo ""
