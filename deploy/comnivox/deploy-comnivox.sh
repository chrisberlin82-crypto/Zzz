#!/bin/bash
# ============================================================
# Deploy MED Rezeption auf Comnivox Webspace (Root)
# ============================================================
# Deployed direkt in public_html/ -> comnivox.com
# Die alte Wartungsseite wird ersetzt.
#
# Verwendung:
#   ./deploy-comnivox.sh user@comnivox-server
#
# Beispiel:
#   ./deploy-comnivox.sh chris@comnivox.com
#
# Ergebnis:
#   https://comnivox.com
#
# Voraussetzungen:
#   - SSH-Zugang zum Webspace
# ============================================================

set -e

SSH_HOST="${1:?Fehler: SSH-Host angeben (z.B. chris@comnivox.com)}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
REMOTE_DIR="public_html"

echo "=== MED Rezeption Deployment auf Comnivox ==="
echo "Host:   $SSH_HOST"
echo "Pfad:   $REMOTE_DIR"
echo "URL:    https://comnivox.com"
echo ""
echo "ACHTUNG: Die aktuelle Wartungsseite wird ersetzt!"
echo ""

# Temporaeres Build-Verzeichnis
BUILD_DIR=$(mktemp -d)
trap "rm -rf $BUILD_DIR" EXIT

echo "[1/5] Kopiere HTML/JS/CSS..."
cp -r "$PROJECT_DIR/docs/"* "$BUILD_DIR/"

echo "[2/5] Kopiere PHP-Backend..."
mkdir -p "$BUILD_DIR/src/php"
if [ -f "$PROJECT_DIR/src/php/api.php" ]; then
    cp "$PROJECT_DIR/src/php/api.php" "$BUILD_DIR/"
fi
if [ -d "$PROJECT_DIR/src/php" ]; then
    cp -r "$PROJECT_DIR/src/php/" "$BUILD_DIR/src/php/"
fi

# Composer-Abhaengigkeiten (falls vorhanden)
if [ -d "$PROJECT_DIR/vendor" ]; then
    echo "       Kopiere Composer-Vendor..."
    cp -r "$PROJECT_DIR/vendor" "$BUILD_DIR/vendor"
fi

echo "[3/5] Kopiere .htaccess..."
cp "$SCRIPT_DIR/.htaccess" "$BUILD_DIR/.htaccess"

echo "[4/5] Raeume Server auf und erstelle Verzeichnis..."
ssh "$SSH_HOST" "rm -rf $REMOTE_DIR/* && mkdir -p $REMOTE_DIR"

echo "[5/5] Lade hoch via rsync..."
rsync -avz --delete \
    --exclude='*.sqlite' \
    --exclude='*.db' \
    --exclude='.env' \
    "$BUILD_DIR/" "$SSH_HOST:$REMOTE_DIR/"

echo ""
echo "=== MED Rezeption erfolgreich deployed ==="
echo ""
echo "URL:  https://comnivox.com"
echo ""
echo "Hinweis: Die Demo laeuft im Browser (localStorage)."
echo "         Das PHP-Backend ist optional fuer Server-seitige Daten."
