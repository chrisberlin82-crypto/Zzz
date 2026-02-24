#!/bin/bash
set -e

# ===========================================
# Vente CRM - Hetzner CX32 Deployment Script
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
    print_error "Usage: $0 <server-ip> [ssh-user] [repo-url]"
    echo ""
    echo "Arguments:"
    echo "  server-ip   IP address of the Hetzner CX32 server (required)"
    echo "  ssh-user    SSH user (default: root)"
    echo "  repo-url    Git repository URL (default: https://github.com/vente-projekt/vente-crm.git)"
    echo ""
    echo "Example:"
    echo "  $0 116.203.xxx.xxx"
    echo "  $0 116.203.xxx.xxx root https://github.com/myorg/vente-crm.git"
    exit 1
fi

SERVER_IP="$1"
SSH_USER="${2:-root}"
REPO_URL="${3:-https://github.com/vente-projekt/vente-crm.git}"
DEPLOY_DIR="/opt/vente-crm"
BACKUP_CRON_HOUR="3"
BACKUP_CRON_MINUTE="0"

print_header "Vente CRM - Hetzner CX32 Deployment"

echo "Server:     ${SSH_USER}@${SERVER_IP}"
echo "Repository: ${REPO_URL}"
echo "Deploy to:  ${DEPLOY_DIR}"
echo ""

# ------------------------------------
# Verify SSH connectivity
# ------------------------------------
print_header "Verifying SSH Connection"

echo "Testing SSH connection to ${SSH_USER}@${SERVER_IP}..."
if ! ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=accept-new "${SSH_USER}@${SERVER_IP}" "echo 'SSH connection successful'"; then
    print_error "Cannot connect to ${SSH_USER}@${SERVER_IP}"
    echo "Make sure:"
    echo "  1. The server IP is correct"
    echo "  2. Your SSH key is added to the server"
    echo "  3. The server is running and accessible"
    exit 1
fi
print_success "SSH connection established"

# ------------------------------------
# Deploy via SSH
# ------------------------------------
print_header "Starting Remote Deployment"

ssh -o StrictHostKeyChecking=accept-new "${SSH_USER}@${SERVER_IP}" bash -s <<'REMOTE_SCRIPT'
set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_success() { echo -e "${GREEN}[OK]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARN]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

echo "============================================"
echo "  Remote Deployment Started"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "============================================"
echo ""

# ------------------------------------
# System update
# ------------------------------------
echo "Updating system packages..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get upgrade -y -qq
print_success "System packages updated"

# ------------------------------------
# Install dependencies
# ------------------------------------
echo "Installing required packages..."
apt-get install -y -qq \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    git \
    ufw \
    fail2ban \
    htop \
    unzip \
    openssl

print_success "Base packages installed"

# ------------------------------------
# Install Docker
# ------------------------------------
if command -v docker &> /dev/null; then
    print_warning "Docker is already installed: $(docker --version)"
else
    echo "Installing Docker..."

    # Add Docker official GPG key
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
    chmod a+r /etc/apt/keyrings/docker.asc

    # Add Docker repository
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
      $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
      tee /etc/apt/sources.list.d/docker.list > /dev/null

    apt-get update -qq
    apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

    # Start and enable Docker
    systemctl start docker
    systemctl enable docker

    print_success "Docker installed: $(docker --version)"
fi

# Verify Docker Compose
if docker compose version &> /dev/null; then
    print_success "Docker Compose available: $(docker compose version --short)"
else
    print_error "Docker Compose plugin not found"
    exit 1
fi

# ------------------------------------
# Configure UFW firewall
# ------------------------------------
echo "Configuring UFW firewall..."

ufw --force reset > /dev/null 2>&1
ufw default deny incoming
ufw default allow outgoing

# Allow SSH
ufw allow 22/tcp comment 'SSH'

# Allow HTTP and HTTPS
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'

# Enable UFW
ufw --force enable

print_success "UFW firewall configured (ports: 22, 80, 443)"
ufw status numbered

# ------------------------------------
# Configure fail2ban
# ------------------------------------
echo "Configuring fail2ban..."

cat > /etc/fail2ban/jail.local <<'FAIL2BAN'
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
FAIL2BAN

systemctl restart fail2ban
systemctl enable fail2ban
print_success "fail2ban configured and running"

# ------------------------------------
# Create swap space (for CX32 with 8GB RAM)
# ------------------------------------
if [ ! -f /swapfile ]; then
    echo "Creating 4GB swap file..."
    fallocate -l 4G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab

    # Optimize swap settings
    echo 'vm.swappiness=10' >> /etc/sysctl.conf
    echo 'vm.vfs_cache_pressure=50' >> /etc/sysctl.conf
    sysctl -p > /dev/null

    print_success "4GB swap created and enabled"
else
    print_warning "Swap file already exists"
fi

echo ""
echo "============================================"
echo "  System preparation complete"
echo "============================================"
REMOTE_SCRIPT

print_success "System dependencies installed on remote server"

# ------------------------------------
# Clone repository and run setup
# ------------------------------------
print_header "Cloning Repository & Running Setup"

ssh "${SSH_USER}@${SERVER_IP}" bash -s -- "$REPO_URL" "$DEPLOY_DIR" <<'CLONE_SCRIPT'
set -e

REPO_URL="$1"
DEPLOY_DIR="$2"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_success() { echo -e "${GREEN}[OK]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARN]${NC} $1"; }

# Clone or update repository
if [ -d "${DEPLOY_DIR}" ]; then
    print_warning "Deploy directory already exists. Pulling latest changes..."
    cd "${DEPLOY_DIR}"
    git pull origin main || git pull origin master || true
else
    echo "Cloning repository..."
    git clone "${REPO_URL}" "${DEPLOY_DIR}"
    cd "${DEPLOY_DIR}"
fi

print_success "Repository ready at ${DEPLOY_DIR}"

# Make scripts executable
chmod +x scripts/*.sh
print_success "Scripts made executable"

# Run the setup script
echo ""
echo "Running setup.sh..."
echo ""
./scripts/setup.sh

print_success "Setup completed"
CLONE_SCRIPT

print_success "Application deployed and running"

# ------------------------------------
# Set up automatic backup cron job
# ------------------------------------
print_header "Setting Up Automatic Backups"

ssh "${SSH_USER}@${SERVER_IP}" bash -s -- "$DEPLOY_DIR" "$BACKUP_CRON_HOUR" "$BACKUP_CRON_MINUTE" <<'CRON_SCRIPT'
set -e

DEPLOY_DIR="$1"
CRON_HOUR="$2"
CRON_MINUTE="$3"

GREEN='\033[0;32m'
NC='\033[0m'

print_success() { echo -e "${GREEN}[OK]${NC} $1"; }

CRON_JOB="${CRON_MINUTE} ${CRON_HOUR} * * * ${DEPLOY_DIR}/scripts/backup.sh >> /var/log/vente-backup.log 2>&1"

# Remove any existing vente backup cron jobs
crontab -l 2>/dev/null | grep -v "vente.*backup" | crontab - 2>/dev/null || true

# Add the new cron job
(crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -

# Create log file
touch /var/log/vente-backup.log

print_success "Automatic backup cron job installed"
echo "  Schedule: Daily at ${CRON_HOUR}:${CRON_MINUTE}"
echo "  Log file: /var/log/vente-backup.log"
CRON_SCRIPT

print_success "Automatic backups configured"

# ------------------------------------
# Final summary
# ------------------------------------
print_header "Deployment Complete!"

echo -e "${GREEN}Vente CRM has been deployed to Hetzner CX32!${NC}"
echo ""
echo "Server Details:"
echo "  IP Address:    ${SERVER_IP}"
echo "  Deploy Path:   ${DEPLOY_DIR}"
echo ""
echo "Access URLs:"
echo "  Frontend:      https://${SERVER_IP}"
echo "  Backend API:   https://${SERVER_IP}/api"
echo ""
echo "Firewall Rules:"
echo "  Port 22  - SSH"
echo "  Port 80  - HTTP (redirects to HTTPS)"
echo "  Port 443 - HTTPS"
echo ""
echo "Automatic Backups:"
echo "  Schedule:      Daily at ${BACKUP_CRON_HOUR}:${BACKUP_CRON_MINUTE}"
echo "  Location:      ${DEPLOY_DIR}/backups/"
echo "  Log:           /var/log/vente-backup.log"
echo ""
echo "Default Login Credentials:"
echo "  Admin:         admin@vente-projekt.de / Admin123!"
echo ""
echo -e "${YELLOW}IMPORTANT: Change all default passwords immediately!${NC}"
echo -e "${YELLOW}IMPORTANT: Replace self-signed SSL certificates with Let's Encrypt!${NC}"
echo ""
echo "Next Steps:"
echo "  1. Point your domain DNS to ${SERVER_IP}"
echo "  2. Set up Let's Encrypt: certbot --nginx -d yourdomain.de"
echo "  3. Change all default passwords"
echo "  4. Configure email SMTP settings in .env"
echo "  5. Review and update .env for production"
echo ""
echo "SSH into server: ssh ${SSH_USER}@${SERVER_IP}"
echo ""
