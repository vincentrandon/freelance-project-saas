#!/bin/bash
# =============================================================================
# Database Backup Script for kiik.app
# Backs up PostgreSQL database with timestamp and retention policy
# =============================================================================

set -e  # Exit on error

# Configuration
BACKUP_DIR="/backups/postgres"
RETENTION_DAYS=30
DATE=$(date +%Y%m%d_%H%M%S)
FILENAME="kiik_db_backup_$DATE.sql.gz"

# Docker compose file location
COMPOSE_FILE="/opt/kiik-app/docker-compose.prod.yml"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}kiik.app Database Backup${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "Timestamp: $(date)"
echo -e "Backup file: $FILENAME"
echo ""

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}Error: Docker is not running${NC}"
    exit 1
fi

# Perform backup
echo -e "${YELLOW}Starting database backup...${NC}"
if docker compose -f "$COMPOSE_FILE" exec -T db pg_dump -U postgres freelancermgmt | gzip > "$BACKUP_DIR/$FILENAME"; then
    echo -e "${GREEN}✓ Database backup completed successfully${NC}"

    # Get file size
    SIZE=$(du -h "$BACKUP_DIR/$FILENAME" | cut -f1)
    echo -e "Backup size: $SIZE"
else
    echo -e "${RED}✗ Database backup failed${NC}"
    exit 1
fi

# Clean up old backups (keep last N days)
echo ""
echo -e "${YELLOW}Cleaning up old backups (keeping last $RETENTION_DAYS days)...${NC}"
DELETED_COUNT=$(find "$BACKUP_DIR" -name "kiik_db_backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete -print | wc -l)
echo -e "${GREEN}✓ Deleted $DELETED_COUNT old backup(s)${NC}"

# List recent backups
echo ""
echo -e "${YELLOW}Recent backups:${NC}"
ls -lht "$BACKUP_DIR"/kiik_db_backup_*.sql.gz | head -5

# Summary
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Backup Summary${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "Backup location: $BACKUP_DIR/$FILENAME"
echo -e "Total backups: $(ls -1 "$BACKUP_DIR"/kiik_db_backup_*.sql.gz 2>/dev/null | wc -l)"
echo -e "Disk usage: $(du -sh "$BACKUP_DIR" | cut -f1)"
echo -e "${GREEN}========================================${NC}"

exit 0
