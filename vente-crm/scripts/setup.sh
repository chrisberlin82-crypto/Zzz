#!/bin/bash
set -e

# ===========================================
# Vente CRM - Automated Setup Script
# ===========================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_header() {
    echo -e "\n${BLUE}============================================${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}============================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}[OK]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# ------------------------------------
# Pre-flight checks
# ------------------------------------
print_header "Vente CRM - Setup"

echo "Checking prerequisites..."

if ! command -v docker &> /dev/null; then
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi
print_success "Docker found"

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    print_error "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi
print_success "Docker Compose found"

if ! command -v openssl &> /dev/null; then
    print_error "OpenSSL is not installed. Please install OpenSSL first."
    exit 1
fi
print_success "OpenSSL found"

# ------------------------------------
# Generate random passwords
# ------------------------------------
print_header "Generating Secure Passwords"

DB_PASSWORD=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 32)
REDIS_PASSWORD=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 24)
JWT_SECRET=$(openssl rand -base64 64 | tr -dc 'a-zA-Z0-9' | head -c 64)
JWT_REFRESH_SECRET=$(openssl rand -base64 64 | tr -dc 'a-zA-Z0-9' | head -c 64)

print_success "Database password generated"
print_success "Redis password generated"
print_success "JWT secret generated"
print_success "JWT refresh secret generated"

# ------------------------------------
# Create .env from .env.example
# ------------------------------------
print_header "Creating Environment Configuration"

cd "$PROJECT_DIR"

if [ -f .env ]; then
    print_warning ".env file already exists. Backing up to .env.backup"
    cp .env ".env.backup.$(date +%Y%m%d%H%M%S)"
fi

if [ ! -f .env.example ]; then
    print_error ".env.example not found in $PROJECT_DIR"
    exit 1
fi

cp .env.example .env

# Replace placeholder values with generated passwords
sed -i "s|POSTGRES_PASSWORD=CHANGE_ME_secure_password_min_16|POSTGRES_PASSWORD=${DB_PASSWORD}|g" .env
sed -i "s|CHANGE_ME_secure_password_min_16@postgres|${DB_PASSWORD}@postgres|g" .env
sed -i "s|REDIS_PASSWORD=CHANGE_ME_redis_password|REDIS_PASSWORD=${REDIS_PASSWORD}|g" .env
sed -i "s|JWT_SECRET=CHANGE_ME_jwt_secret_mindestens_32_zeichen_lang|JWT_SECRET=${JWT_SECRET}|g" .env
sed -i "s|JWT_REFRESH_SECRET=CHANGE_ME_refresh_secret_mindestens_32_zeichen|JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}|g" .env

print_success ".env file created with secure passwords"

# ------------------------------------
# Create required directories
# ------------------------------------
print_header "Creating Directories"

mkdir -p uploads/receipts
mkdir -p uploads/signatures
mkdir -p uploads/documents
mkdir -p uploads/temp
mkdir -p backups
mkdir -p logs
mkdir -p nginx/ssl

print_success "Upload directories created"
print_success "Backup directory created"
print_success "Log directory created"
print_success "SSL directory created"

# ------------------------------------
# Generate self-signed SSL certificates (dev)
# ------------------------------------
print_header "Generating SSL Certificates (Development)"

if [ -f nginx/ssl/cert.pem ] && [ -f nginx/ssl/private.key ]; then
    print_warning "SSL certificates already exist. Skipping generation."
else
    openssl req -x509 -nodes -days 365 \
        -newkey rsa:2048 \
        -keyout nginx/ssl/private.key \
        -out nginx/ssl/cert.pem \
        -subj "/C=DE/ST=NRW/L=Duesseldorf/O=Vente Projekt GmbH/OU=Development/CN=localhost" \
        2>/dev/null

    print_success "Self-signed SSL certificates generated"
    print_warning "These certificates are for development only!"
    print_warning "For production, use Let's Encrypt or a proper CA certificate."
fi

# ------------------------------------
# Start Docker containers
# ------------------------------------
print_header "Starting Docker Containers"

if docker compose version &> /dev/null; then
    COMPOSE_CMD="docker compose"
else
    COMPOSE_CMD="docker-compose"
fi

$COMPOSE_CMD down --remove-orphans 2>/dev/null || true
$COMPOSE_CMD up -d --build

print_success "Docker containers started"

# ------------------------------------
# Wait for PostgreSQL to be ready
# ------------------------------------
print_header "Waiting for PostgreSQL"

MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if docker exec vente-postgres pg_isready -U vente_user -d vente_crm &>/dev/null; then
        print_success "PostgreSQL is ready"
        break
    fi

    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo "  Waiting for PostgreSQL... (${RETRY_COUNT}/${MAX_RETRIES})"
    sleep 2
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    print_error "PostgreSQL failed to start within timeout."
    echo "Check logs with: $COMPOSE_CMD logs postgres"
    exit 1
fi

# Wait a bit more for PostgreSQL to fully initialize
sleep 3

# ------------------------------------
# Run database migrations
# ------------------------------------
print_header "Running Database Migrations"

docker exec vente-backend npx sequelize-cli db:migrate --config src/config/database.js --migrations-path src/database/migrations
print_success "Migrations completed"

# ------------------------------------
# Run database seeds
# ------------------------------------
print_header "Seeding Database"

docker exec vente-backend npx sequelize-cli db:seed:all --config src/config/database.js --seeders-path src/database/seeders
print_success "Database seeded with default data"

# ------------------------------------
# Final output
# ------------------------------------
print_header "Setup Complete!"

echo -e "${GREEN}Vente CRM is now running!${NC}\n"
echo "Access URLs:"
echo "  Frontend:  https://localhost"
echo "  Backend:   https://localhost/api"
echo "  HTTP:      http://localhost (redirects to HTTPS)"
echo ""
echo "Default Login Credentials:"
echo "  -----------------------------------------------"
echo "  Role              | Email                         | Password"
echo "  -----------------------------------------------"
echo "  Admin             | admin@vente-projekt.de        | Admin123!"
echo "  Standortleitung   | standort@vente-projekt.de     | Standort123!"
echo "  Teamlead          | team@vente-projekt.de         | Team123!"
echo "  Backoffice        | backoffice@vente-projekt.de   | Backoffice123!"
echo "  Vertrieb          | vertrieb@vente-projekt.de     | Vertrieb123!"
echo "  -----------------------------------------------"
echo ""
echo -e "${YELLOW}IMPORTANT: Change all default passwords after first login!${NC}"
echo ""
echo "Useful Commands:"
echo "  Logs:     $COMPOSE_CMD logs -f"
echo "  Stop:     $COMPOSE_CMD down"
echo "  Restart:  $COMPOSE_CMD restart"
echo "  Backup:   ./scripts/backup.sh"
echo ""
