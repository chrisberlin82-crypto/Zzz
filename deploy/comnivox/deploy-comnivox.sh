#!/bin/bash
# ============================================================
# Deploy Demo auf Comnivox Webspace (Unterverzeichnis)
# ============================================================
# WICHTIG: Die bestehende Homepage auf comnivox.com bleibt
# unangetastet! Die Demo wird in ein Unterverzeichnis deployed.
#
# Verwendung:
#   ./deploy-comnivox.sh user@comnivox-server
#
# Beispiel:
#   ./deploy-comnivox.sh chris@comnivox.com
#
# Die Demo ist dann erreichbar unter:
#   https://comnivox.com/app/
#
# Voraussetzungen:
#   - SSH-Zugang zum Webspace
#   - Die bestehende Homepage liegt im Document Root (public_html/)
#   - Das Unterverzeichnis /app/ wird NUR fuer die Demo genutzt
# ============================================================

set -e

SSH_HOST="${1:?Fehler: SSH-Host angeben (z.B. chris@comnivox.com)}"

# Unterverzeichnis auf dem Webspace (aendern falls gewuenscht)
APP_SUBDIR="app"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Standard-Pfad fuer Webspace (public_html ist typisch fuer Plesk/cPanel)
REMOTE_DIR="public_html/${APP_SUBDIR}"

echo "=== MED Rezeption Demo-Deployment auf Comnivox ==="
echo "Host:   $SSH_HOST"
echo "Pfad:   $REMOTE_DIR"
echo "URL:    https://comnivox.com/${APP_SUBDIR}/"
echo ""
echo "SICHERHEIT: Die bestehende Homepage wird NICHT veraendert."
echo "             Nur das Unterverzeichnis /${APP_SUBDIR}/ wird aktualisiert."
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
    echo "[2b/5] Kopiere Composer-Vendor..."
    cp -r "$PROJECT_DIR/vendor" "$BUILD_DIR/vendor"
fi

echo "[3/5] Kopiere .htaccess fuer Unterverzeichnis..."
cp "$SCRIPT_DIR/.htaccess" "$BUILD_DIR/.htaccess"

echo "[4/5] Erstelle Unterverzeichnis auf Server..."
ssh "$SSH_HOST" "mkdir -p $REMOTE_DIR"

echo "[5/5] Lade hoch via rsync (NUR in /${APP_SUBDIR}/)..."
rsync -avz --delete \
    --exclude='*.sqlite' \
    --exclude='*.db' \
    --exclude='.env' \
    "$BUILD_DIR/" "$SSH_HOST:$REMOTE_DIR/"

echo ""
echo "=== Demo erfolgreich deployed ==="
echo ""
echo "URL:  https://comnivox.com/${APP_SUBDIR}/"
echo ""
echo "Hinweis: Die Demo laeuft komplett im Browser (localStorage)."
echo "         Das PHP-Backend ist optional fuer Server-seitige Daten."
echo "         Die Homepage auf comnivox.com wurde NICHT veraendert."
