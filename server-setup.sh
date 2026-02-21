#!/bin/bash
# ============================================
# MED Rezeption - Server Ersteinrichtung
# Fuer Hetzner Cloud (Ubuntu 22.04/24.04)
# ============================================

set -e

echo "=== MED Rezeption Server-Setup ==="
echo ""

# --- Pruefe Root-Rechte ---
if [ "$EUID" -ne 0 ]; then
    echo "Bitte als root ausfuehren: sudo bash server-setup.sh"
    exit 1
fi

# --- System aktualisieren ---
echo "[1/5] System aktualisieren..."
apt-get update && apt-get upgrade -y

# --- Docker installieren ---
echo "[2/5] Docker installieren..."
if ! command -v docker &> /dev/null; then
    apt-get install -y ca-certificates curl gnupg
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" > /etc/apt/sources.list.d/docker.list
    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    systemctl enable docker
    echo "Docker installiert."
else
    echo "Docker bereits vorhanden."
fi

# --- Firewall einrichten ---
echo "[3/5] Firewall einrichten..."
apt-get install -y ufw
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw --force enable
echo "Firewall aktiv (SSH, HTTP, HTTPS erlaubt)."

# --- Projekt klonen ---
echo "[4/5] Projekt einrichten..."
APP_DIR="/opt/med-rezeption"
if [ ! -d "$APP_DIR" ]; then
    mkdir -p "$APP_DIR"
    echo ""
    echo "Bitte das Repository klonen:"
    echo "  git clone https://github.com/chrisberlin82-crypto/Zzz.git $APP_DIR"
    echo ""
else
    echo "Verzeichnis $APP_DIR existiert bereits."
fi

# --- Automatische SSL-Erneuerung ---
echo "[5/5] SSL-Erneuerung einrichten..."
CRON_CMD="0 3 * * * cd $APP_DIR && docker compose run --rm certbot renew --quiet && docker compose exec nginx nginx -s reload"
(crontab -l 2>/dev/null | grep -v "certbot renew"; echo "$CRON_CMD") | crontab -
echo "Cronjob fuer SSL-Erneuerung eingerichtet."

echo ""
echo "=== Setup abgeschlossen! ==="
echo ""
echo "Naechste Schritte:"
echo "  1. Repository klonen:"
echo "     git clone https://github.com/chrisberlin82-crypto/Zzz.git $APP_DIR"
echo ""
echo "  2. In das Verzeichnis wechseln:"
echo "     cd $APP_DIR"
echo ""
echo "  3. Anwendung starten (ohne SSL):"
echo "     docker compose up -d"
echo "     -> Erreichbar unter http://DEINE-SERVER-IP"
echo ""
echo "  4. SSL-Zertifikat einrichten (mit Domain):"
echo "     bash ssl-setup.sh DEINE-DOMAIN.de"
echo ""
