#!/bin/bash
set -e

# ===========================================
# Vente CRM - Restore Script
# ===========================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

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
    print_error "Usage: $0 <backup_file.tar.gz>"
    echo ""
    echo "Available backups:"
    ls -lh "${PROJECT_DIR}/backups/"vente_backup_*.tar.gz 2>/dev/null || echo "  No backups found."
    exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
    print_error "Backup file not found: $BACKUP_FILE"
    exit 1
fi

print_header "Vente CRM - Restore"

echo "Backup file: $BACKUP_FILE"
echo "File size:   $(du -sh "$BACKUP_FILE" | cut -f1)"
echo ""

# ------------------------------------
# Confirmation prompt
# ------------------------------------
echo -e "${YELLOW}WARNING: This will overwrite the current database and uploads!${NC}"
echo -e "${YELLOW}Make sure you have a current backup before proceeding.${NC}"
echo ""
read -p "Are you sure you want to restore from this backup? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Restore cancelled."
    exit 0
fi

# ------------------------------------
# Pre-flight checks
# ------------------------------------
print_header "Pre-flight Checks"

if ! docker ps --format '{{.Names}}' | grep -q "vente-postgres"; then
    print_error "PostgreSQL container (vente-postgres) is not running."
    echo "Start the application first: docker compose up -d"
    exit 1
fi
print_success "PostgreSQL container is running"

# Load environment variables
source "${PROJECT_DIR}/.env" 2>/dev/null || true
POSTGRES_USER="${POSTGRES_USER:-vente_user}"
POSTGRES_DB="${POSTGRES_DB:-vente_crm}"

# ------------------------------------
# Extract backup archive
# ------------------------------------
print_header "Extracting Backup"

TEMP_RESTORE_DIR=$(mktemp -d "${PROJECT_DIR}/backups/restore_XXXXXX")
trap "rm -rf ${TEMP_RESTORE_DIR}" EXIT

tar -xzf "$BACKUP_FILE" -C "$TEMP_RESTORE_DIR"

# Find the extracted backup directory (handle nested directory structure)
EXTRACTED_DIR=$(find "$TEMP_RESTORE_DIR" -maxdepth 1 -type d -name "vente_backup_*" | head -1)

if [ -z "$EXTRACTED_DIR" ]; then
    print_error "Invalid backup archive structure. Expected vente_backup_* directory inside."
    exit 1
fi

print_success "Backup extracted to temporary directory"

# Display backup metadata if available
if [ -f "${EXTRACTED_DIR}/backup_metadata.json" ]; then
    echo ""
    echo "Backup metadata:"
    cat "${EXTRACTED_DIR}/backup_metadata.json"
    echo ""
fi

# ------------------------------------
# Verify backup contents
# ------------------------------------
if [ ! -f "${EXTRACTED_DIR}/database.dump" ]; then
    print_error "Database dump not found in backup."
    exit 1
fi
print_success "Database dump found"

if [ -d "${EXTRACTED_DIR}/uploads" ]; then
    print_success "Uploads directory found"
    UPLOADS_SIZE=$(du -sh "${EXTRACTED_DIR}/uploads" | cut -f1)
    echo "  Uploads size: ${UPLOADS_SIZE}"
else
    print_warning "No uploads directory in backup"
fi

# ------------------------------------
# Restore PostgreSQL database
# ------------------------------------
print_header "Restoring Database"

echo "Dropping and recreating database..."

# Terminate existing connections to the database
docker exec vente-postgres psql -U "${POSTGRES_USER}" -d postgres -c \
    "SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE pg_stat_activity.datname = '${POSTGRES_DB}' AND pid <> pg_backend_pid();" \
    2>/dev/null || true

# Drop and recreate the database
docker exec vente-postgres psql -U "${POSTGRES_USER}" -d postgres -c "DROP DATABASE IF EXISTS ${POSTGRES_DB};"
docker exec vente-postgres psql -U "${POSTGRES_USER}" -d postgres -c "CREATE DATABASE ${POSTGRES_DB} OWNER ${POSTGRES_USER};"
print_success "Database recreated"

# Restore from dump
echo "Restoring database from dump (this may take a while)..."
cat "${EXTRACTED_DIR}/database.dump" | docker exec -i vente-postgres pg_restore \
    -U "${POSTGRES_USER}" \
    -d "${POSTGRES_DB}" \
    --no-owner \
    --no-privileges \
    --verbose 2>"${TEMP_RESTORE_DIR}/pg_restore.log" || {
        # pg_restore returns non-zero on warnings too, check for actual errors
        if grep -q "FATAL\|could not" "${TEMP_RESTORE_DIR}/pg_restore.log"; then
            print_error "Database restore failed. Check ${TEMP_RESTORE_DIR}/pg_restore.log"
            exit 1
        fi
        print_warning "pg_restore completed with warnings (this is usually OK)"
    }

print_success "Database restored successfully"

# ------------------------------------
# Restore uploads
# ------------------------------------
print_header "Restoring Uploads"

if [ -d "${EXTRACTED_DIR}/uploads" ]; then
    # Backup current uploads just in case
    if [ -d "${PROJECT_DIR}/uploads" ] && [ "$(ls -A "${PROJECT_DIR}/uploads" 2>/dev/null)" ]; then
        UPLOADS_BACKUP="${PROJECT_DIR}/uploads.pre-restore.$(date +%Y%m%d%H%M%S)"
        mv "${PROJECT_DIR}/uploads" "$UPLOADS_BACKUP"
        print_warning "Existing uploads moved to: $(basename "$UPLOADS_BACKUP")"
    fi

    # Copy restored uploads
    cp -r "${EXTRACTED_DIR}/uploads" "${PROJECT_DIR}/uploads"
    print_success "Uploads restored"
else
    print_warning "No uploads to restore. Keeping existing uploads."
fi

# ------------------------------------
# Restart backend to pick up changes
# ------------------------------------
print_header "Restarting Services"

if docker compose version &> /dev/null; then
    COMPOSE_CMD="docker compose"
else
    COMPOSE_CMD="docker-compose"
fi

cd "$PROJECT_DIR"
$COMPOSE_CMD restart backend
print_success "Backend service restarted"

# Wait for backend to be ready
echo "Waiting for backend to be ready..."
sleep 5

if docker ps --format '{{.Names}}' | grep -q "vente-backend"; then
    print_success "Backend is running"
else
    print_warning "Backend may still be starting up. Check with: $COMPOSE_CMD logs backend"
fi

# ------------------------------------
# Summary
# ------------------------------------
print_header "Restore Complete!"

echo -e "${GREEN}Database and uploads have been restored successfully.${NC}"
echo ""
echo "Restored from: $(basename "$BACKUP_FILE")"
echo ""
echo "Please verify the application is working correctly:"
echo "  Frontend: https://localhost"
echo "  Backend:  https://localhost/api"
echo ""
echo -e "${YELLOW}NOTE: If you encounter issues, check the logs:${NC}"
echo "  $COMPOSE_CMD logs -f backend"
echo ""
