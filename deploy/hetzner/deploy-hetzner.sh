#!/bin/bash
# ============================================================
# Deploy Live auf Hetzner CPX Server
# ============================================================
# Verwendung:
#   ./deploy-hetzner.sh user@hetzner-ip deine-domain.de
#
# Beispiel:
#   ./deploy-hetzner.sh root@168.119.xxx.xxx medrezeption.de
#
# Voraussetzungen auf dem Server:
#   - Docker + Docker Compose installiert
#   - Domain zeigt per A-Record auf die Server-IP
# ============================================================

set -e

SSH_HOST="${1:?Fehler: SSH-Host angeben (z.B. root@168.119.xxx.xxx)}"
DOMAIN="${2:?Fehler: Domain angeben (z.B. medrezeption.de)}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
REMOTE_DIR="/opt/medrezeption"

echo "=== MED Rezeption LIVE-Deployment auf Hetzner CPX ==="
echo "Host:   $SSH_HOST"
echo "Domain: $DOMAIN"
echo "Remote: $REMOTE_DIR"
echo ""

# [1] Nginx-Config: Domain einsetzen
echo "[1/6] Bereite Nginx-Config vor..."
NGINX_CONF=$(mktemp)
sed "s/DEINE-DOMAIN.de/$DOMAIN/g" "$SCRIPT_DIR/nginx.conf" > "$NGINX_CONF"

# [2] Server vorbereiten
echo "[2/6] Erstelle Verzeichnisse auf Server..."
ssh "$SSH_HOST" "mkdir -p $REMOTE_DIR/deploy/hetzner"

# [3] Dateien hochladen
echo "[3/6] Lade Projekt hoch..."
rsync -avz --exclude='.git' --exclude='node_modules' --exclude='__pycache__' \
    --exclude='.env' --exclude='*.sqlite' --exclude='*.db' \
    "$PROJECT_DIR/" "$SSH_HOST:$REMOTE_DIR/"

# Nginx-Config mit richtiger Domain
scp "$NGINX_CONF" "$SSH_HOST:$REMOTE_DIR/deploy/hetzner/nginx.conf"
rm "$NGINX_CONF"

# [4] .env pruefen
echo "[4/6] Pruefe .env..."
ssh "$SSH_HOST" "
    if [ ! -f $REMOTE_DIR/deploy/hetzner/.env ]; then
        cp $REMOTE_DIR/deploy/hetzner/.env.beispiel $REMOTE_DIR/deploy/hetzner/.env
        echo 'ACHTUNG: .env erstellt - API-Key muss noch eingetragen werden!'
        echo '         ssh $SSH_HOST nano $REMOTE_DIR/deploy/hetzner/.env'
    else
        echo '.env existiert bereits.'
    fi
"

# [5] SSL-Zertifikat holen (beim ersten Mal)
echo "[5/6] SSL-Zertifikat..."
ssh "$SSH_HOST" "
    cd $REMOTE_DIR/deploy/hetzner
    if [ ! -d /etc/letsencrypt/live/$DOMAIN ]; then
        # Temporaer Nginx ohne SSL starten fuer ACME Challenge
        docker compose up -d nginx 2>/dev/null || true
        docker run --rm \
            -v medrezeption_certbot_certs:/etc/letsencrypt \
            -v medrezeption_certbot_www:/var/www/certbot \
            certbot/certbot certonly \
            --webroot --webroot-path=/var/www/certbot \
            -d $DOMAIN -d www.$DOMAIN \
            --non-interactive --agree-tos --email admin@$DOMAIN \
            2>/dev/null || echo 'SSL wird beim naechsten Mal eingerichtet'
        docker compose down 2>/dev/null || true
    fi
"

# [6] Docker starten
echo "[6/6] Starte Container..."
ssh "$SSH_HOST" "
    cd $REMOTE_DIR/deploy/hetzner
    docker compose build --no-cache
    docker compose up -d
    docker compose ps
"

echo ""
echo "=== Live-System erfolgreich deployed ==="
echo ""
echo "URL:    https://$DOMAIN"
echo "Status: ssh $SSH_HOST 'cd $REMOTE_DIR/deploy/hetzner && docker compose ps'"
echo "Logs:   ssh $SSH_HOST 'cd $REMOTE_DIR/deploy/hetzner && docker compose logs -f'"
echo ""
echo "WICHTIG: Falls noch nicht geschehen, API-Key eintragen:"
echo "  ssh $SSH_HOST 'nano $REMOTE_DIR/deploy/hetzner/.env'"
echo "  ssh $SSH_HOST 'cd $REMOTE_DIR/deploy/hetzner && docker compose restart web'"
