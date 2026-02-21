#!/bin/bash
# ============================================
# MED Rezeption - SSL-Zertifikat einrichten
# Verwendung: bash ssl-setup.sh meine-domain.de
# ============================================

set -e

DOMAIN=$1

if [ -z "$DOMAIN" ]; then
    echo "Verwendung: bash ssl-setup.sh DEINE-DOMAIN.de"
    echo "Beispiel:   bash ssl-setup.sh praxis-mueller.de"
    exit 1
fi

echo "=== SSL-Setup fuer $DOMAIN ==="
echo ""

# --- Stelle sicher, dass die App laeuft ---
echo "[1/4] Pruefe ob die Anwendung laeuft..."
if ! docker compose ps --status running | grep -q nginx; then
    echo "Anwendung starten..."
    docker compose up -d
    sleep 5
fi

# --- Zertifikat anfordern ---
echo "[2/4] SSL-Zertifikat von Let's Encrypt anfordern..."
read -p "E-Mail-Adresse fuer SSL-Benachrichtigungen: " EMAIL

docker compose run --rm certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    -d "$DOMAIN"

# --- Nginx-Konfiguration aktualisieren ---
echo "[3/4] Nginx-Konfiguration fuer HTTPS aktualisieren..."
cat > nginx/default.conf << NGINX_EOF
server {
    listen 80;
    server_name $DOMAIN;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://\$host\$request_uri;
    }
}

server {
    listen 443 ssl;
    server_name $DOMAIN;

    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    location / {
        proxy_pass http://web:5000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
NGINX_EOF

# --- Nginx neu laden ---
echo "[4/4] Nginx neu laden..."
docker compose restart nginx

echo ""
echo "=== SSL-Setup abgeschlossen! ==="
echo "Deine Anwendung ist jetzt erreichbar unter:"
echo "  https://$DOMAIN"
echo ""
