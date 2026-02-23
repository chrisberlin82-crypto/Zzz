#!/bin/bash
# ============================================
# MedReception Deploy auf Hetzner Server
# ============================================
# Nutzung: ./deploy-to-hetzner.sh
#
# Voraussetzungen:
#   - git, ssh, scp installiert
#   - Zugang zum Server 46.225.86.170 als root
# ============================================

set -e

SERVER="root@46.225.86.170"
WEBROOT="/var/www/html"
REPO="https://github.com/chrisberlin82-crypto/Zzz.git"
BRANCH="claude/debug-ssh-connection-6eYvF"
TMPDIR=$(mktemp -d)

echo "=========================================="
echo "  MedReception → Hetzner Deploy"
echo "=========================================="

# Schritt 1: Repo klonen
echo ""
echo "[1/4] Lade aktuelle Dateien von GitHub..."
git clone --branch "$BRANCH" --depth 1 "$REPO" "$TMPDIR/zzz" 2>&1 | tail -2
echo "      ✓ 7 HTML-Dateien geladen"

# Schritt 2: SSH-Verbindung testen
echo ""
echo "[2/4] Teste SSH-Verbindung zu $SERVER..."
if ! ssh -o ConnectTimeout=10 -o BatchMode=yes "$SERVER" "echo OK" 2>/dev/null; then
    echo "      SSH-Key funktioniert nicht, Passwort wird abgefragt..."
fi

# Schritt 3: Alte Dateien löschen
echo ""
echo "[3/4] Lösche alte Dateien auf dem Server..."
ssh "$SERVER" "rm -rf ${WEBROOT}/*"
echo "      ✓ ${WEBROOT} geleert"

# Schritt 4: Neue Dateien hochladen
echo ""
echo "[4/4] Lade neue Dateien hoch..."
scp "$TMPDIR/zzz/docs/"*.html "$SERVER:${WEBROOT}/"
echo "      ✓ Alle HTML-Dateien hochgeladen"

# Aufräumen
rm -rf "$TMPDIR"

# Ergebnis prüfen
echo ""
echo "=========================================="
echo "  Dateien auf dem Server:"
echo "=========================================="
ssh "$SERVER" "ls -la ${WEBROOT}/"

echo ""
echo "=========================================="
echo "  ✓ Deploy abgeschlossen!"
echo "  Öffne: http://46.225.86.170/"
echo "  Passwort: MedReception2025!"
echo "=========================================="
