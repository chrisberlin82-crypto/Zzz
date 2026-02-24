#!/bin/bash
set -e

# ===========================================
# Vente CRM - Hetzner Server Deployment
# ===========================================
# Deployt das Vente CRM auf einen Hetzner Server
# via rsync (kein Git auf dem Server noetig).
#
# Verwendung:
#   ./deploy-hetzner.sh <server-ip> [ssh-user] [domain]
#
# Beispiel:
#   ./deploy-hetzner.sh 116.203.xxx.xxx
#   ./deploy-hetzner.sh 116.203.xxx.xxx root mein-crm.de
# ===========================================

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_header() {
    echo -e "\n${BLUE}============================================${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}============================================${NC}\n"
}

print_success() { echo -e "${GREEN}[OK]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARN]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# ------------------------------------
# Validate arguments
# ------------------------------------
if [ -z "$1" ]; then
    print_error "Usage: $0 <server-ip> [ssh-user] [domain]"
    echo ""
    echo "Arguments:"
    echo "  server-ip   IP address of the Hetzner server (required)"
    echo "  ssh-user    SSH user (default: root)"
    echo "  domain      Domain name (optional, for Let's Encrypt)"
    echo ""
    echo "Example:"
    echo "  $0 116.203.xxx.xxx"
    echo "  $0 116.203.xxx.xxx root vente.example.de"
    exit 1
fi

SERVER_IP="$1"
SSH_USER="${2:-root}"
DOMAIN="${3:-}"
DEPLOY_DIR="/opt/vente-crm"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

print_header "Vente CRM - Hetzner Deployment"

echo "Server:     ${SSH_USER}@${SERVER_IP}"
echo "Deploy to:  ${DEPLOY_DIR}"
[ -n "$DOMAIN" ] && echo "Domain:     ${DOMAIN}"
echo ""

# ------------------------------------
# Verify SSH connectivity
# ------------------------------------
print_header "Pruefe SSH-Verbindung"

echo "Teste SSH Verbindung zu ${SSH_USER}@${SERVER_IP}..."
if ! ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=accept-new "${SSH_USER}@${SERVER_IP}" "echo 'SSH OK'"; then
    print_error "Kann nicht verbinden zu ${SSH_USER}@${SERVER_IP}"
    exit 1
fi
print_success "SSH Verbindung hergestellt"

# ------------------------------------
# Install Docker & dependencies on server
# ------------------------------------
print_header "Server vorbereiten"

ssh -o StrictHostKeyChecking=accept-new "${SSH_USER}@${SERVER_IP}" bash -s <<'REMOTE_SETUP'
set -e
export DEBIAN_FRONTEND=noninteractive

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'
print_success() { echo -e "${GREEN}[OK]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARN]${NC} $1"; }

# System update
echo "Systemupdate..."
apt-get update -qq
apt-get upgrade -y -qq
print_success "System aktualisiert"

# Install packages
echo "Installiere Pakete..."
apt-get install -y -qq \
    ca-certificates curl gnupg lsb-release \
    git ufw fail2ban htop unzip openssl rsync

print_success "Pakete installiert"

# Install Docker if not present
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

# Verify Docker Compose
if docker compose version &> /dev/null; then
    print_success "Docker Compose: $(docker compose version --short)"
else
    echo "Docker Compose Plugin nicht gefunden!"
    exit 1
fi

# Configure UFW firewall
echo "Konfiguriere Firewall..."
ufw --force reset > /dev/null 2>&1
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp comment 'SSH'
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'
ufw --force enable
print_success "Firewall konfiguriert (22, 80, 443)"

# Configure fail2ban
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

# Create swap if not exists
if [ ! -f /swapfile ]; then
    echo "Erstelle 4GB Swap..."
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

echo ""
echo "Server-Vorbereitung abgeschlossen."
REMOTE_SETUP

print_success "Server ist bereit"

# ------------------------------------
# Upload project via rsync
# ------------------------------------
print_header "Projektdateien hochladen"

echo "Synchronisiere Dateien..."

# Create deploy dir on remote
ssh "${SSH_USER}@${SERVER_IP}" "mkdir -p ${DEPLOY_DIR}"

# Rsync project to server (exclude dev/temp files)
rsync -avz --delete \
    --exclude='.git' \
    --exclude='node_modules' \
    --exclude='__pycache__' \
    --exclude='.env' \
    --exclude='*.sqlite' \
    --exclude='*.db' \
    --exclude='nginx/ssl/*' \
    --exclude='backups/*.tar.gz' \
    --exclude='logs/*.log' \
    --exclude='uploads/temp/*' \
    "${PROJECT_DIR}/" "${SSH_USER}@${SERVER_IP}:${DEPLOY_DIR}/"

print_success "Dateien hochgeladen"

# ------------------------------------
# Run setup on server
# ------------------------------------
print_header "Starte Setup auf dem Server"

ssh "${SSH_USER}@${SERVER_IP}" bash -s -- "${DEPLOY_DIR}" <<'REMOTE_DEPLOY'
set -e
DEPLOY_DIR="$1"

GREEN='\033[0;32m'
NC='\033[0m'
print_success() { echo -e "${GREEN}[OK]${NC} $1"; }

cd "${DEPLOY_DIR}"

# Make scripts executable
chmod +x scripts/*.sh
print_success "Scripts sind ausfuehrbar"

# Run setup.sh (creates .env, SSL certs, starts containers, runs migrations)
./scripts/setup.sh

print_success "Setup abgeschlossen"
REMOTE_DEPLOY

print_success "Anwendung deployed und laeuft"

# ------------------------------------
# Setup automatic backups
# ------------------------------------
print_header "Automatische Backups einrichten"

ssh "${SSH_USER}@${SERVER_IP}" bash -s -- "${DEPLOY_DIR}" <<'CRON_SETUP'
set -e
DEPLOY_DIR="$1"
GREEN='\033[0;32m'
NC='\033[0m'
print_success() { echo -e "${GREEN}[OK]${NC} $1"; }

CRON_JOB="0 3 * * * ${DEPLOY_DIR}/scripts/backup.sh >> /var/log/vente-backup.log 2>&1"

# Remove existing vente backup crons
crontab -l 2>/dev/null | grep -v "vente.*backup" | crontab - 2>/dev/null || true

# Add new cron
(crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -

touch /var/log/vente-backup.log
print_success "Backup Cron eingerichtet (taeglich 3:00 Uhr)"
CRON_SETUP

print_success "Automatische Backups konfiguriert"

# ------------------------------------
# Optional: Let's Encrypt SSL
# ------------------------------------
if [ -n "$DOMAIN" ]; then
    print_header "Let's Encrypt SSL fuer ${DOMAIN}"
    print_warning "Let's Encrypt Setup muss manuell durchgefuehrt werden:"
    echo ""
    echo "  1. DNS A-Record zeigt auf: ${SERVER_IP}"
    echo "  2. SSH zum Server: ssh ${SSH_USER}@${SERVER_IP}"
    echo "  3. Certbot installieren:"
    echo "     apt install certbot"
    echo "  4. Zertifikat holen:"
    echo "     certbot certonly --standalone -d ${DOMAIN}"
    echo "  5. SSL-Dateien in nginx/ssl/ verlinken:"
    echo "     ln -sf /etc/letsencrypt/live/${DOMAIN}/fullchain.pem ${DEPLOY_DIR}/nginx/ssl/cert.pem"
    echo "     ln -sf /etc/letsencrypt/live/${DOMAIN}/privkey.pem ${DEPLOY_DIR}/nginx/ssl/private.key"
    echo "  6. Nginx neu starten:"
    echo "     cd ${DEPLOY_DIR} && docker compose restart nginx"
    echo ""
fi

# ------------------------------------
# Final summary
# ------------------------------------
print_header "Deployment abgeschlossen!"

echo -e "${GREEN}Vente CRM laeuft auf dem Hetzner Server!${NC}"
echo ""
echo "Server Details:"
echo "  IP:          ${SERVER_IP}"
echo "  Pfad:        ${DEPLOY_DIR}"
echo ""
echo "URLs:"
echo "  HTTPS:       https://${SERVER_IP}"
echo "  HTTP:        http://${SERVER_IP} (-> HTTPS)"
echo "  API Health:  https://${SERVER_IP}/api/health"
echo ""
echo "Standard-Login:"
echo "  Admin:       admin@vente-projekt.de / Admin123!"
echo ""
echo -e "${YELLOW}WICHTIG: Alle Standard-Passwoerter nach erstem Login aendern!${NC}"
echo -e "${YELLOW}WICHTIG: Self-Signed SSL durch Let's Encrypt ersetzen!${NC}"
echo ""
echo "Nuetzliche Befehle (auf dem Server):"
echo "  Status:      cd ${DEPLOY_DIR} && docker compose ps"
echo "  Logs:        cd ${DEPLOY_DIR} && docker compose logs -f"
echo "  Neustart:    cd ${DEPLOY_DIR} && docker compose restart"
echo "  Backup:      ${DEPLOY_DIR}/scripts/backup.sh"
echo "  Restore:     ${DEPLOY_DIR}/scripts/restore.sh <backup.tar.gz>"
echo ""
echo "SSH:           ssh ${SSH_USER}@${SERVER_IP}"
echo ""
