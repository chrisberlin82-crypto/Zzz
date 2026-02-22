#!/bin/bash
# ============================================================
# Deploy Demo auf Comnivox Webspace
# ============================================================
# Verwendung:
#   ./deploy-comnivox.sh user@comnivox-server /pfad/zum/webroot
#
# Beispiel:
#   ./deploy-comnivox.sh chris@ftp.comnivox.de /var/www/html/demo
#   ./deploy-comnivox.sh chris@comnivox.de public_html/medrezeption
# ============================================================

set -e

SSH_HOST="${1:?Fehler: SSH-Host angeben (z.B. user@server)}"
REMOTE_DIR="${2:?Fehler: Remote-Verzeichnis angeben (z.B. /var/www/html/demo)}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "=== MED Rezeption Demo-Deployment auf Comnivox ==="
echo "Host:   $SSH_HOST"
echo "Pfad:   $REMOTE_DIR"
echo ""

# Temporaeres Build-Verzeichnis
BUILD_DIR=$(mktemp -d)
trap "rm -rf $BUILD_DIR" EXIT

echo "[1/4] Kopiere HTML/JS/CSS..."
cp -r "$PROJECT_DIR/docs/"* "$BUILD_DIR/"

echo "[2/4] Kopiere PHP-Backend..."
mkdir -p "$BUILD_DIR/src/php"
cp "$PROJECT_DIR/src/php/api.php" "$BUILD_DIR/"
cp -r "$PROJECT_DIR/src/php/" "$BUILD_DIR/src/php/"

# Composer-Abhaengigkeiten (falls vorhanden)
if [ -d "$PROJECT_DIR/vendor" ]; then
    echo "[2b/4] Kopiere Composer-Vendor..."
    cp -r "$PROJECT_DIR/vendor" "$BUILD_DIR/vendor"
fi

echo "[3/4] Kopiere .htaccess..."
cp "$SCRIPT_DIR/.htaccess" "$BUILD_DIR/.htaccess"

echo "[4/4] Lade hoch via rsync..."
rsync -avz --delete \
    --exclude='*.sqlite' \
    --exclude='*.db' \
    --exclude='.env' \
    "$BUILD_DIR/" "$SSH_HOST:$REMOTE_DIR/"

echo ""
echo "=== Demo erfolgreich deployed ==="
echo "URL: https://deine-domain.comnivox.de/"
echo ""
echo "Hinweis: Die Demo laeuft komplett im Browser (localStorage)."
echo "         Das PHP-Backend ist optional fuer Server-seitige Daten."
