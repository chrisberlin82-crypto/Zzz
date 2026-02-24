#!/bin/bash
set -e

# ===========================================
# Vente CRM - Server Bootstrap Script
# ===========================================
# Dieses Script direkt auf dem Hetzner Server ausfuehren.
# Es installiert alles und startet das CRM.
#
# Verwendung (auf dem Server):
#   bash bootstrap-server.sh
# ===========================================

# Farben
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_header() {
    echo ""
    echo -e "${BLUE}============================================${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}============================================${NC}"
    echo ""
}

print_success() { echo -e "${GREEN}[OK]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARN]${NC} $1"; }
print_error() { echo -e "${RED}[FEHLER]${NC} $1"; }

# ------------------------------------
# Pruefen ob als root ausgefuehrt
# ------------------------------------
if [ "$(id -u)" -ne 0 ]; then
    print_error "Bitte als root ausfuehren: sudo bash bootstrap-server.sh"
    exit 1
fi

DEPLOY_DIR="/opt/vente-crm"
REPO_URL="https://github.com/chrisberlin82-crypto/Zzz.git"
BRANCH="claude/update-todo-list-WOZif"
SERVER_IP=$(hostname -I | awk '{print $1}')

print_header "Vente CRM - Server Bootstrap"

echo "Server IP:     ${SERVER_IP}"
echo "Deploy nach:   ${DEPLOY_DIR}"
echo "Repository:    ${REPO_URL}"
echo "Branch:        ${BRANCH}"
echo ""

# ------------------------------------
# 1. System aktualisieren
# ------------------------------------
print_header "1/8 - System aktualisieren"

export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get upgrade -y -qq
apt-get install -y -qq \
    ca-certificates curl gnupg lsb-release \
    git ufw fail2ban htop unzip openssl

print_success "System aktualisiert"

# ------------------------------------
# 2. Docker installieren
# ------------------------------------
print_header "2/8 - Docker installieren"

if command -v docker &> /dev/null; then
    print_warning "Docker bereits installiert: $(docker --version)"
else
    echo "Installiere Docker..."
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
    chmod a+r /etc/apt/keyrings/docker.asc
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
      $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
      tee /etc/apt/sources.list.d/docker.list > /dev/null
    apt-get update -qq
    apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    systemctl start docker
    systemctl enable docker
    print_success "Docker installiert: $(docker --version)"
fi

# Docker Compose pruefen
if docker compose version &> /dev/null; then
    print_success "Docker Compose: $(docker compose version --short)"
else
    print_error "Docker Compose Plugin nicht gefunden!"
    exit 1
fi

# ------------------------------------
# 3. Firewall & Sicherheit
# ------------------------------------
print_header "3/8 - Firewall & Sicherheit"

# UFW Firewall
ufw --force reset > /dev/null 2>&1
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp comment 'SSH'
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'
ufw --force enable
print_success "Firewall konfiguriert (22, 80, 443)"

# fail2ban
cat > /etc/fail2ban/jail.local <<'F2B'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 7200
F2B

systemctl restart fail2ban
systemctl enable fail2ban
print_success "fail2ban konfiguriert"

# ------------------------------------
# 4. Swap erstellen
# ------------------------------------
print_header "4/8 - Swap erstellen"

if [ ! -f /swapfile ]; then
    fallocate -l 4G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
    sysctl -w vm.swappiness=10 > /dev/null
    grep -q 'vm.swappiness' /etc/sysctl.conf || echo 'vm.swappiness=10' >> /etc/sysctl.conf
    print_success "4GB Swap erstellt"
else
    print_warning "Swap existiert bereits"
fi

# ------------------------------------
# 5. Repository klonen
# ------------------------------------
print_header "5/8 - Repository klonen"

if [ -d "${DEPLOY_DIR}" ]; then
    print_warning "Verzeichnis ${DEPLOY_DIR} existiert bereits. Aktualisiere..."
    cd "${DEPLOY_DIR}"
    git fetch origin "${BRANCH}"
    git checkout "${BRANCH}"
    git reset --hard "origin/${BRANCH}"
else
    git clone --branch "${BRANCH}" --single-branch "${REPO_URL}" "${DEPLOY_DIR}"
fi

cd "${DEPLOY_DIR}/vente-crm"
print_success "Repository geklont nach ${DEPLOY_DIR}"

# ------------------------------------
# 6. Konfiguration erstellen
# ------------------------------------
print_header "6/8 - Konfiguration erstellen"

# Sichere Passwoerter generieren
DB_PASSWORD=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 32)
REDIS_PASSWORD=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 24)
JWT_SECRET=$(openssl rand -base64 64 | tr -dc 'a-zA-Z0-9' | head -c 64)
JWT_REFRESH_SECRET=$(openssl rand -base64 64 | tr -dc 'a-zA-Z0-9' | head -c 64)

print_success "Sichere Passwoerter generiert"

# .env erstellen
if [ -f .env ]; then
    cp .env ".env.backup.$(date +%Y%m%d%H%M%S)"
    print_warning "Bestehende .env gesichert"
fi

cp .env.example .env

# Passwoerter einsetzen
sed -i "s|POSTGRES_PASSWORD=CHANGE_ME_secure_password_min_16|POSTGRES_PASSWORD=${DB_PASSWORD}|g" .env
sed -i "s|CHANGE_ME_secure_password_min_16@postgres|${DB_PASSWORD}@postgres|g" .env
sed -i "s|REDIS_PASSWORD=CHANGE_ME_redis_password|REDIS_PASSWORD=${REDIS_PASSWORD}|g" .env
sed -i "s|JWT_SECRET=CHANGE_ME_jwt_secret_mindestens_32_zeichen_lang|JWT_SECRET=${JWT_SECRET}|g" .env
sed -i "s|JWT_REFRESH_SECRET=CHANGE_ME_refresh_secret_mindestens_32_zeichen|JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}|g" .env

# URLs auf Server-IP setzen
sed -i "s|FRONTEND_URL=http://localhost:3000|FRONTEND_URL=https://${SERVER_IP}|g" .env
sed -i "s|BACKEND_URL=http://localhost:3001|BACKEND_URL=https://${SERVER_IP}/api|g" .env

print_success ".env erstellt mit sicheren Passwoertern"

# Verzeichnisse erstellen
mkdir -p uploads/{receipts,signatures,documents,address-lists,temp}
mkdir -p backups logs nginx/ssl

print_success "Verzeichnisse erstellt"

# ------------------------------------
# 7. SSL-Zertifikat erstellen
# ------------------------------------
print_header "7/8 - SSL-Zertifikat erstellen"

if [ -f nginx/ssl/cert.pem ] && [ -f nginx/ssl/private.key ]; then
    print_warning "SSL-Zertifikate existieren bereits"
else
    SAN_ENTRY="IP:127.0.0.1,IP:${SERVER_IP}"

    openssl req -x509 -nodes -days 365 \
        -newkey rsa:2048 \
        -keyout nginx/ssl/private.key \
        -out nginx/ssl/cert.pem \
        -subj "/C=DE/ST=NRW/L=Duesseldorf/O=Vente Projekt GmbH/OU=Production/CN=${SERVER_IP}" \
        -addext "subjectAltName=DNS:localhost,${SAN_ENTRY}" \
        2>/dev/null

    print_success "Self-Signed SSL-Zertifikat erstellt (IP: ${SERVER_IP})"
fi

# ------------------------------------
# 8. Docker Container starten
# ------------------------------------
print_header "8/8 - Docker Container starten"

docker compose down --remove-orphans 2>/dev/null || true

echo "Baue und starte Container (das dauert beim ersten Mal)..."
docker compose up -d --build

print_success "Container gestartet"

# Warte auf PostgreSQL
echo ""
echo "Warte auf PostgreSQL..."
MAX_RETRIES=60
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if docker exec vente-postgres pg_isready -U vente_user -d vente_crm &>/dev/null; then
        print_success "PostgreSQL ist bereit"
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo "  Warte... (${RETRY_COUNT}/${MAX_RETRIES})"
    sleep 3
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    print_error "PostgreSQL nicht bereit. Logs pruefen: docker compose logs postgres"
    exit 1
fi

# Extra Wartezeit fuer vollstaendige Initialisierung
sleep 5

# Migrationen ausfuehren
echo ""
echo "Fuehre Datenbank-Migrationen aus..."
docker exec vente-backend npx sequelize-cli db:migrate \
    --config src/config/database.js \
    --migrations-path src/database/migrations

print_success "Migrationen ausgefuehrt"

# Seed-Daten einspielen
echo ""
echo "Spiele Seed-Daten ein..."
docker exec vente-backend npx sequelize-cli db:seed:all \
    --config src/config/database.js \
    --seeders-path src/database/seeders

print_success "Seed-Daten eingespielt"

# ------------------------------------
# Taegl. Backup einrichten
# ------------------------------------
chmod +x scripts/*.sh 2>/dev/null || true

CRON_JOB="0 3 * * * cd /opt/vente-crm/vente-crm && ./scripts/backup.sh >> /var/log/vente-backup.log 2>&1"
crontab -l 2>/dev/null | grep -v "vente.*backup" | crontab - 2>/dev/null || true
(crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
touch /var/log/vente-backup.log

print_success "Taegliches Backup eingerichtet (3:00 Uhr)"

# ------------------------------------
# Container-Status pruefen
# ------------------------------------
echo ""
echo "Container-Status:"
docker compose ps

# Health-Check
echo ""
echo "Pruefe Backend Health-Check..."
sleep 5
HEALTH=$(docker exec vente-backend wget -qO- http://localhost:3001/api/health 2>/dev/null || echo "FEHLER")
echo "Health: ${HEALTH}"

# ------------------------------------
# Zusammenfassung
# ------------------------------------
print_header "Deployment abgeschlossen!"

echo -e "${GREEN}Vente CRM laeuft auf dem Server!${NC}"
echo ""
echo "============================================"
echo "  Server-Informationen"
echo "============================================"
echo ""
echo "  URL:         https://${SERVER_IP}"
echo "  API:         https://${SERVER_IP}/api/health"
echo "  HTTP:        http://${SERVER_IP} (-> HTTPS)"
echo ""
echo "============================================"
echo "  Standard-Logins"
echo "============================================"
echo ""
echo "  Admin:       admin@vente-projekt.de / Admin123!"
echo "  Standort:    standort@vente-projekt.de / Standort123!"
echo "  Teamlead:    team@vente-projekt.de / Team123!"
echo "  Backoffice:  backoffice@vente-projekt.de / Backoffice123!"
echo "  Vertrieb:    vertrieb@vente-projekt.de / Vertrieb123!"
echo ""
echo -e "${YELLOW}WICHTIG: Alle Passwoerter nach erstem Login aendern!${NC}"
echo ""
echo "============================================"
echo "  Nuetzliche Befehle"
echo "============================================"
echo ""
echo "  Status:      cd /opt/vente-crm/vente-crm && docker compose ps"
echo "  Logs:        cd /opt/vente-crm/vente-crm && docker compose logs -f"
echo "  Neustart:    cd /opt/vente-crm/vente-crm && docker compose restart"
echo "  Backup:      cd /opt/vente-crm/vente-crm && ./scripts/backup.sh"
echo "  Update:      cd /opt/vente-crm && git pull && cd vente-crm && docker compose up -d --build"
echo ""
