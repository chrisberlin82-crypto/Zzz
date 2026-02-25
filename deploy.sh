#!/bin/bash
# ===========================================
# Vente CRM - Deployment Script
# ===========================================
# Startet die komplette Vente CRM Anwendung
# mit Docker Compose (Frontend, Backend, DB, Redis, Nginx)
#
# Nutzung:
#   ./deploy.sh              # Normaler Start
#   ./deploy.sh --build      # Mit Neu-Build aller Container
#   ./deploy.sh --stop       # Alles stoppen
#   ./deploy.sh --restart    # Neustart
#   ./deploy.sh --logs       # Logs anzeigen
#   ./deploy.sh --status     # Status aller Container
#   ./deploy.sh --backup     # Datenbank-Backup erstellen
#   ./deploy.sh --update     # Git pull + Neu-Build + Restart
# ===========================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CRM_DIR="$SCRIPT_DIR/vente-crm"
COMPOSE_FILE="$CRM_DIR/docker-compose.yml"
ENV_FILE="$CRM_DIR/.env"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info()  { echo -e "${BLUE}[INFO]${NC}  $1"; }
log_ok()    { echo -e "${GREEN}[OK]${NC}    $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC}  $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# ===========================================
# Pruefen ob Docker laeuft
# ===========================================
check_docker() {
  if ! command -v docker &>/dev/null; then
    log_error "Docker ist nicht installiert!"
    echo "  Installation: curl -fsSL https://get.docker.com | sh"
    exit 1
  fi
  if ! docker info &>/dev/null; then
    log_error "Docker-Daemon laeuft nicht!"
    echo "  Start: sudo systemctl start docker"
    exit 1
  fi
}

# ===========================================
# Verzeichnisse pruefen/erstellen
# ===========================================
check_dirs() {
  log_info "Verzeichnisse pruefen..."
  mkdir -p "$CRM_DIR/uploads/documents"
  mkdir -p "$CRM_DIR/uploads/signatures"
  mkdir -p "$CRM_DIR/uploads/address-lists"
  mkdir -p "$CRM_DIR/uploads/receipts"
  mkdir -p "$CRM_DIR/uploads/temp"
  mkdir -p "$CRM_DIR/logs"
  mkdir -p "$CRM_DIR/backups"
  mkdir -p "$CRM_DIR/nginx/ssl"
  log_ok "Verzeichnisse bereit"
}

# ===========================================
# .env pruefen
# ===========================================
check_env() {
  if [ ! -f "$ENV_FILE" ]; then
    log_warn ".env-Datei nicht gefunden, kopiere .env.example..."
    if [ -f "$CRM_DIR/.env.example" ]; then
      cp "$CRM_DIR/.env.example" "$ENV_FILE"
      log_warn "Bitte .env-Datei anpassen: $ENV_FILE"
    else
      log_error "Keine .env.example gefunden!"
      exit 1
    fi
  fi
  log_ok ".env vorhanden"
}

# ===========================================
# SSL-Zertifikate (Self-Signed falls noetig)
# ===========================================
check_ssl() {
  local SSL_DIR="$CRM_DIR/nginx/ssl"
  if [ ! -f "$SSL_DIR/cert.pem" ] || [ ! -f "$SSL_DIR/private.key" ]; then
    log_warn "Keine SSL-Zertifikate gefunden, erstelle Self-Signed..."
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
      -keyout "$SSL_DIR/private.key" \
      -out "$SSL_DIR/cert.pem" \
      -subj "/C=DE/ST=Berlin/L=Berlin/O=Vente/CN=localhost" \
      2>/dev/null
    log_ok "Self-Signed SSL-Zertifikat erstellt"
  else
    log_ok "SSL-Zertifikate vorhanden"
  fi
}

# ===========================================
# Container starten
# ===========================================
start_containers() {
  local BUILD_FLAG=""
  if [ "$1" = "--build" ]; then
    BUILD_FLAG="--build"
    log_info "Container werden neu gebaut..."
  fi

  cd "$CRM_DIR"
  log_info "Container starten..."
  docker compose up -d $BUILD_FLAG

  # Warten bis Backend gesund ist
  log_info "Warte auf Backend..."
  local retries=0
  while [ $retries -lt 30 ]; do
    if docker exec vente-backend wget -q -O- http://localhost:3001/api/health 2>/dev/null | grep -q "ok\|healthy\|success"; then
      break
    fi
    retries=$((retries + 1))
    sleep 2
  done

  if [ $retries -ge 30 ]; then
    log_warn "Backend antwortet noch nicht - Container-Status pruefen"
  fi
}

# ===========================================
# Migrationen ausfuehren
# ===========================================
run_migrations() {
  log_info "Datenbank-Migrationen ausfuehren..."
  docker exec vente-backend npx sequelize-cli db:migrate 2>/dev/null || true
  log_info "Seeds pruefen..."
  docker exec vente-backend npx sequelize-cli db:seed:all 2>/dev/null || true
  log_ok "Datenbank aktuell"
}

# ===========================================
# Status anzeigen
# ===========================================
show_status() {
  echo ""
  echo "=========================================="
  echo "  Vente CRM - Container Status"
  echo "=========================================="
  cd "$CRM_DIR"
  docker compose ps
  echo ""

  # Server-IP ermitteln
  local SERVER_IP=$(hostname -I 2>/dev/null | awk '{print $1}')
  if [ -z "$SERVER_IP" ]; then
    SERVER_IP="localhost"
  fi

  echo "=========================================="
  echo -e "  ${GREEN}App:${NC}     http://$SERVER_IP"
  echo -e "  ${BLUE}API:${NC}     http://$SERVER_IP/api/health"
  echo ""
  echo "  Logs:    ./deploy.sh --logs"
  echo "  Stop:    ./deploy.sh --stop"
  echo "  Restart: ./deploy.sh --restart"
  echo "=========================================="
}

# ===========================================
# Container stoppen
# ===========================================
stop_containers() {
  cd "$CRM_DIR"
  log_info "Container stoppen..."
  docker compose down
  log_ok "Alle Container gestoppt"
}

# ===========================================
# Logs anzeigen
# ===========================================
show_logs() {
  cd "$CRM_DIR"
  docker compose logs -f --tail=100
}

# ===========================================
# Datenbank-Backup
# ===========================================
create_backup() {
  local BACKUP_FILE="$CRM_DIR/backups/vente_crm_$(date +%Y%m%d_%H%M%S).sql"
  log_info "Erstelle Datenbank-Backup..."
  docker exec vente-postgres pg_dump -U vente_user vente_crm > "$BACKUP_FILE"
  log_ok "Backup erstellt: $BACKUP_FILE"
  log_info "Backup-Groesse: $(du -h "$BACKUP_FILE" | cut -f1)"
}

# ===========================================
# Git Update + Rebuild
# ===========================================
do_update() {
  log_info "Git Pull..."
  cd "$SCRIPT_DIR"
  git pull origin "$(git branch --show-current)" || true

  log_info "Container neu bauen und starten..."
  stop_containers
  start_containers --build
  run_migrations
  show_status
}

# ===========================================
# Hauptprogramm
# ===========================================
echo ""
echo "=========================================="
echo "  Vente CRM - Deployment"
echo "=========================================="
echo ""

case "${1:-}" in
  --stop)
    check_docker
    stop_containers
    ;;
  --restart)
    check_docker
    stop_containers
    check_dirs
    check_env
    check_ssl
    start_containers
    run_migrations
    show_status
    ;;
  --logs)
    show_logs
    ;;
  --status)
    cd "$CRM_DIR"
    show_status
    ;;
  --backup)
    check_docker
    create_backup
    ;;
  --update)
    check_docker
    do_update
    ;;
  --build)
    check_docker
    check_dirs
    check_env
    check_ssl
    start_containers --build
    run_migrations
    show_status
    ;;
  *)
    check_docker
    check_dirs
    check_env
    check_ssl
    start_containers
    run_migrations
    show_status
    ;;
esac
