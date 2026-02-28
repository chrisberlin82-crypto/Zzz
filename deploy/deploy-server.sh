#!/bin/bash
# ============================================================
# MedReception — Server-Deployment
# Ausfuehren als root auf 46.225.86.170
# ssh root@46.225.86.170
# ============================================================

set -e
echo "===== MedReception Deployment Start ====="

# 1. Repo aktualisieren
echo "[1/5] Repository aktualisieren..."
cd /root/Zzz
git fetch origin claude/medreception-mvp-COCku
git checkout claude/medreception-mvp-COCku
git pull origin claude/medreception-mvp-COCku

# 2. Web-Verzeichnis vorbereiten
echo "[2/5] Web-Verzeichnis vorbereiten..."
mkdir -p /var/www/html

# 3. Alle HTML + CSS + JS Dateien kopieren
echo "[3/5] Dateien nach /var/www/html kopieren..."
cp /root/Zzz/docs/index.html       /var/www/html/
cp /root/Zzz/docs/guard.html       /var/www/html/
cp /root/Zzz/docs/admin-dashboard.html /var/www/html/
cp /root/Zzz/docs/agenten.html     /var/www/html/
cp /root/Zzz/docs/voicebot.html    /var/www/html/
cp /root/Zzz/docs/ansagen.html     /var/www/html/
cp /root/Zzz/docs/callflow.html    /var/www/html/
cp /root/Zzz/docs/termine.html     /var/www/html/
cp /root/Zzz/docs/auswertung.html  /var/www/html/
cp /root/Zzz/docs/asterisk.html    /var/www/html/
cp /root/Zzz/docs/acd.html         /var/www/html/
cp /root/Zzz/docs/ai-agent.html    /var/www/html/
cp /root/Zzz/docs/404.html         /var/www/html/
cp /root/Zzz/docs/style.css        /var/www/html/
cp /root/Zzz/docs/app.js           /var/www/html/ 2>/dev/null || true

# 4. Nginx reparieren
echo "[4/5] Nginx konfigurieren..."
rm -f /etc/nginx/sites-enabled/*

cat > /etc/nginx/sites-available/medreception << 'NGINX'
server {
    listen 80;
    server_name _;
    root /var/www/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    error_page 404 /404.html;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml;
}
NGINX

ln -sf /etc/nginx/sites-available/medreception /etc/nginx/sites-enabled/medreception

# 5. Nginx testen und neustarten
echo "[5/5] Nginx testen und neustarten..."
nginx -t
systemctl restart nginx
systemctl status nginx --no-pager

echo ""
echo "===== Deployment abgeschlossen ====="
echo "Seite erreichbar unter: http://46.225.86.170"
echo ""
