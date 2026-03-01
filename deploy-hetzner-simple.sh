#!/bin/bash
# ============================================================
# MedReception — Einfaches Hetzner Deployment (OHNE Docker)
# ============================================================
# Direkt Python + Nginx — kein Docker noetig.
#
# SSH zum Server: ssh root@46.225.86.170
# Dann: bash deploy-hetzner-simple.sh
# ============================================================

set -e

APP_DIR="/root/Zzz"
BRANCH="claude/medreception-mvp-COCku"
REPO="https://github.com/chrisberlin82-crypto/Zzz.git"
VENV="$APP_DIR/venv"

echo ""
echo "========================================"
echo "  MedReception — Simple Deploy"
echo "========================================"

# ===== 1. System-Pakete =====
echo ""
echo "[1/7] System-Pakete..."
apt-get update -qq
apt-get install -y -qq python3 python3-venv python3-pip git nginx curl

# ===== 2. Code holen =====
echo ""
echo "[2/7] Code holen..."
if [ -d "$APP_DIR/.git" ]; then
    cd "$APP_DIR"
    git fetch origin "$BRANCH"
    git checkout "$BRANCH" 2>/dev/null || git checkout -b "$BRANCH" "origin/$BRANCH"
    git pull origin "$BRANCH"
else
    git clone -b "$BRANCH" "$REPO" "$APP_DIR"
    cd "$APP_DIR"
fi

# ===== 3. Python Virtual Environment =====
echo ""
echo "[3/7] Python Environment..."
if [ ! -d "$VENV" ]; then
    python3 -m venv "$VENV"
    echo "  Erstellt."
fi
source "$VENV/bin/activate"
pip install --quiet --upgrade pip
pip install --quiet -r "$APP_DIR/backend/requirements.txt"

# ===== 4. Verzeichnisse =====
echo ""
echo "[4/7] Verzeichnisse..."
mkdir -p "$APP_DIR/data" "$APP_DIR/logs" "$APP_DIR/audio/hintergrund"

# ===== 5. Backend starten =====
echo ""
echo "[5/7] Backend starten..."
pkill -f "uvicorn main:app" 2>/dev/null || true
sleep 2

cd "$APP_DIR/backend"
nohup "$VENV/bin/python" -m uvicorn main:app --host 127.0.0.1 --port 8000 > "$APP_DIR/logs/backend.log" 2>&1 &
BACKEND_PID=$!
echo "  PID: $BACKEND_PID"

# ===== 6. Frontend (statische Dateien) =====
echo ""
echo "[6/7] Frontend deployen..."
rm -rf /var/www/medrezeption
mkdir -p /var/www/medrezeption
cp "$APP_DIR/docs/"* /var/www/medrezeption/
echo "  $(ls /var/www/medrezeption/*.html | wc -l) HTML-Dateien kopiert."

# ===== 7. Nginx konfigurieren =====
echo ""
echo "[7/7] Nginx konfigurieren..."

cat > /etc/nginx/sites-available/medrezeption <<'NGINX'
server {
    listen 80 default_server;
    server_name _;

    root /var/www/medrezeption;
    index admin-dashboard.html index.html;

    # Security
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;

    # ALLE API-Requests -> FastAPI Backend
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 60s;
    }

    # WebSocket -> Voicebot
    location /ws/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 3600;
    }

    # Statische Dateien
    location / {
        try_files $uri $uri/ /admin-dashboard.html;
    }

    # Caching
    location ~* \.(css|js|png|jpg|ico|svg|woff2?)$ {
        expires 7d;
        add_header Cache-Control "public";
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript;
    client_max_body_size 10M;
}
NGINX

# Aktivieren
rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/medrezeption /etc/nginx/sites-enabled/
nginx -t && systemctl restart nginx

# ===== Health Check =====
echo ""
echo "Warte auf Backend..."
sleep 5
for i in $(seq 1 10); do
    if curl -sf http://localhost:8000/api/system/status &>/dev/null; then
        echo "Backend online!"
        break
    fi
    sleep 2
done

# ===== Systemd Service (damit Backend nach Reboot startet) =====
cat > /etc/systemd/system/medrezeption.service <<SYSTEMD
[Unit]
Description=MedReception Backend
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$APP_DIR/backend
ExecStart=$VENV/bin/python -m uvicorn main:app --host 127.0.0.1 --port 8000
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
SYSTEMD

systemctl daemon-reload
systemctl enable medrezeption

SERVER_IP=$(hostname -I | awk '{print $1}')

echo ""
echo "========================================"
echo "  DEPLOYMENT ERFOLGREICH!"
echo "========================================"
echo ""
echo "  Frontend:     http://$SERVER_IP"
echo "  Dashboard:    http://$SERVER_IP/admin-dashboard.html"
echo "  AI Agent:     http://$SERVER_IP/ai-agent.html"
echo "  API Status:   http://$SERVER_IP/api/system/status"
echo ""
echo "  Befehle:"
echo "  --------"
echo "  Status:       systemctl status medrezeption"
echo "  Log:          tail -f $APP_DIR/logs/backend.log"
echo "  Neustarten:   systemctl restart medrezeption"
echo "  Update:       cd $APP_DIR && git pull && cp docs/* /var/www/medrezeption/ && systemctl restart medrezeption"
echo ""
