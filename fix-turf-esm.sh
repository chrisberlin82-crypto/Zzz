#!/bin/bash
# ============================================================
# Fix: @turf/turf ESM-Kompatibilitaetsfehler
# ============================================================
# Problem: concaveman v2+ ist ESM-only, @turf/convex versucht
#          es mit require() zu laden -> ERR_REQUIRE_ESM
# Loesung: concaveman auf v1.1.1 (CJS-kompatibel) pinnen
# ============================================================
# Ausfuehrung auf dem Hetzner-Server:
#   chmod +x fix-turf-esm.sh
#   ./fix-turf-esm.sh
# ============================================================

set -e

echo "=== Vente CRM - @turf/turf ESM Fix ==="
echo ""

# Backend-Verzeichnis suchen
BACKEND_DIR=""
for dir in \
    "/root/vente-crm/backend" \
    "/root/Zzz/backend" \
    "/root/vente-crm" \
    "/root/Zzz" \
    "/home/*/vente-crm/backend" \
    "/home/*/Zzz/backend"; do
    if [ -f "$dir/package.json" ]; then
        BACKEND_DIR="$dir"
        break
    fi
done

# Auch in Unterverzeichnissen suchen
if [ -z "$BACKEND_DIR" ]; then
    echo "[INFO] Suche nach package.json mit @turf Abhaengigkeit..."
    BACKEND_DIR=$(find /root /home -maxdepth 5 -name "package.json" -exec grep -l "@turf" {} \; 2>/dev/null | head -1 | xargs dirname 2>/dev/null)
fi

if [ -z "$BACKEND_DIR" ]; then
    echo "[FEHLER] Backend-Verzeichnis nicht gefunden!"
    echo "  Bitte manuell ausfuehren:"
    echo "    cd /pfad/zum/backend"
    echo "    node -e \"let p=require('./package.json'); p.overrides=p.overrides||{}; p.overrides.concaveman='1.1.1'; require('fs').writeFileSync('package.json', JSON.stringify(p, null, 2)+'\\n')\""
    echo "    npm install"
    echo "    docker compose up -d --build"
    exit 1
fi

echo "[OK] Backend gefunden: $BACKEND_DIR"
cd "$BACKEND_DIR"

# Pruefen ob @turf/turf installiert ist
if ! grep -q "@turf" package.json; then
    echo "[FEHLER] Keine @turf Abhaengigkeit in package.json gefunden"
    exit 1
fi

echo "[INFO] Aktuelle @turf Abhaengigkeiten:"
grep -i "turf\|concaveman" package.json || true
echo ""

# === FIX 1: concaveman auf CJS-kompatible Version pinnen ===
echo "[FIX]  concaveman Override hinzufuegen..."

# Backup erstellen
cp package.json package.json.backup

# Override hinzufuegen via Node.js
node -e "
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

// overrides Sektion erstellen/erweitern
if (!pkg.overrides) pkg.overrides = {};
pkg.overrides.concaveman = '1.1.1';

fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
console.log('[OK]    overrides.concaveman = 1.1.1 gesetzt');
"

echo ""
echo "[INFO] Aenderungen in package.json:"
diff package.json.backup package.json || true
echo ""

# === Entscheidung: Docker oder direkt ===
if command -v docker &>/dev/null && docker ps 2>/dev/null | grep -q "vente"; then
    echo "[INFO] Docker-Container erkannt - Rebuild starten..."

    # Docker-Compose Verzeichnis finden
    COMPOSE_DIR="$BACKEND_DIR"
    while [ "$COMPOSE_DIR" != "/" ]; do
        if [ -f "$COMPOSE_DIR/docker-compose.yml" ] || [ -f "$COMPOSE_DIR/docker-compose.yaml" ]; then
            break
        fi
        COMPOSE_DIR=$(dirname "$COMPOSE_DIR")
    done

    if [ -f "$COMPOSE_DIR/docker-compose.yml" ] || [ -f "$COMPOSE_DIR/docker-compose.yaml" ]; then
        echo "[INFO] docker-compose.yml gefunden: $COMPOSE_DIR"
        cd "$COMPOSE_DIR"

        echo "[INFO] Backend-Container stoppen und neu bauen..."
        docker compose stop backend
        docker compose build --no-cache backend
        docker compose up -d backend

        echo ""
        echo "[INFO] Warte 5 Sekunden auf Start..."
        sleep 5

        echo ""
        echo "=== Container Status ==="
        docker compose ps
        echo ""
        echo "=== Backend Logs (letzte 20 Zeilen) ==="
        docker compose logs --tail 20 backend
    else
        echo "[WARN]  docker-compose.yml nicht gefunden"
        echo "  Bitte manuell: docker compose up -d --build"
    fi
else
    echo "[INFO] Kein Docker erkannt - npm install ausfuehren..."
    npm install
    echo ""
    echo "[OK]    npm install abgeschlossen"
    echo "[INFO]  Server manuell neu starten (z.B. pm2 restart oder node server.js)"
fi

echo ""
echo "=========================================="
echo "  Fix angewendet!"
echo "  Falls das Problem weiterhin besteht:"
echo "    docker logs vente-backend --tail 20"
echo "=========================================="
