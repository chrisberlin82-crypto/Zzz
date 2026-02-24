#!/bin/bash
set -e

# ===========================================
# Vente CRM - Backup Script
# ===========================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="${PROJECT_DIR}/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="vente_backup_${TIMESTAMP}"
TEMP_DIR="${BACKUP_DIR}/${BACKUP_NAME}"

# Default retention: 30 days (can be overridden via .env)
source "${PROJECT_DIR}/.env" 2>/dev/null || true
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_success() { echo -e "${GREEN}[OK]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARN]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

echo "============================================"
echo "  Vente CRM - Backup"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "============================================"
echo ""

# ------------------------------------
# Pre-flight checks
# ------------------------------------
if ! docker ps --format '{{.Names}}' | grep -q "vente-postgres"; then
    print_error "PostgreSQL container (vente-postgres) is not running."
    echo "Start the application first: docker compose up -d"
    exit 1
fi

# ------------------------------------
# Create temporary backup directory
# ------------------------------------
mkdir -p "${TEMP_DIR}"
print_success "Created backup directory: ${BACKUP_NAME}"

# ------------------------------------
# Dump PostgreSQL database
# ------------------------------------
echo "Dumping PostgreSQL database..."

POSTGRES_USER="${POSTGRES_USER:-vente_user}"
POSTGRES_DB="${POSTGRES_DB:-vente_crm}"

docker exec vente-postgres pg_dump \
    -U "${POSTGRES_USER}" \
    -d "${POSTGRES_DB}" \
    --format=custom \
    --compress=9 \
    --verbose \
    > "${TEMP_DIR}/database.dump" 2>"${TEMP_DIR}/pg_dump.log"

DB_SIZE=$(du -sh "${TEMP_DIR}/database.dump" | cut -f1)
print_success "Database dump completed (${DB_SIZE})"

# ------------------------------------
# Copy uploads directory
# ------------------------------------
echo "Backing up uploads..."

if [ -d "${PROJECT_DIR}/uploads" ] && [ "$(ls -A "${PROJECT_DIR}/uploads" 2>/dev/null)" ]; then
    cp -r "${PROJECT_DIR}/uploads" "${TEMP_DIR}/uploads"
    UPLOAD_SIZE=$(du -sh "${TEMP_DIR}/uploads" | cut -f1)
    print_success "Uploads backed up (${UPLOAD_SIZE})"
else
    mkdir -p "${TEMP_DIR}/uploads"
    print_warning "Uploads directory is empty. Creating placeholder."
fi

# ------------------------------------
# Save metadata
# ------------------------------------
cat > "${TEMP_DIR}/backup_metadata.json" <<EOF
{
    "backup_name": "${BACKUP_NAME}",
    "timestamp": "$(date -Iseconds)",
    "postgres_version": "$(docker exec vente-postgres pg_config --version 2>/dev/null || echo 'unknown')",
    "database_name": "${POSTGRES_DB}",
    "database_user": "${POSTGRES_USER}",
    "includes_uploads": true,
    "created_by": "$(whoami)",
    "hostname": "$(hostname)"
}
EOF
print_success "Backup metadata saved"

# ------------------------------------
# Create tar.gz archive
# ------------------------------------
echo "Creating archive..."

cd "${BACKUP_DIR}"
tar -czf "${BACKUP_NAME}.tar.gz" "${BACKUP_NAME}"

ARCHIVE_SIZE=$(du -sh "${BACKUP_NAME}.tar.gz" | cut -f1)
print_success "Archive created: ${BACKUP_NAME}.tar.gz (${ARCHIVE_SIZE})"

# ------------------------------------
# Clean up temporary directory
# ------------------------------------
rm -rf "${TEMP_DIR}"
print_success "Temporary files cleaned up"

# ------------------------------------
# Clean old backups based on retention
# ------------------------------------
echo ""
echo "Cleaning backups older than ${RETENTION_DAYS} days..."

DELETED_COUNT=0
while IFS= read -r old_backup; do
    if [ -n "$old_backup" ]; then
        rm -f "$old_backup"
        print_warning "Deleted old backup: $(basename "$old_backup")"
        DELETED_COUNT=$((DELETED_COUNT + 1))
    fi
done < <(find "${BACKUP_DIR}" -name "vente_backup_*.tar.gz" -type f -mtime "+${RETENTION_DAYS}" 2>/dev/null)

if [ $DELETED_COUNT -eq 0 ]; then
    print_success "No old backups to clean up"
else
    print_success "Deleted ${DELETED_COUNT} old backup(s)"
fi

# ------------------------------------
# Summary
# ------------------------------------
echo ""
echo "============================================"
echo "  Backup Complete"
echo "============================================"
echo "  File:      ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"
echo "  Size:      ${ARCHIVE_SIZE}"
echo "  Retention: ${RETENTION_DAYS} days"
echo ""
echo "  Restore with: ./scripts/restore.sh ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"
echo "============================================"
