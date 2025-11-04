#!/bin/bash
# =============================================================================
# Media Files Backup Script for kiik.app
# Backs up media files (if not using S3) with timestamp and retention policy
# =============================================================================

set -e  # Exit on error

# Configuration
BACKUP_DIR="/backups/media"
MEDIA_SOURCE="/opt/kiik-app/media"  # Docker volume mount point
RETENTION_DAYS=30
DATE=$(date +%Y%m%d_%H%M%S)
FILENAME="kiik_media_backup_$DATE.tar.gz"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}kiik.app Media Files Backup${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "Timestamp: $(date)"
echo -e "Backup file: $FILENAME"
echo ""

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Check if media directory exists
if [ ! -d "$MEDIA_SOURCE" ]; then
    echo -e "${YELLOW}Warning: Media directory not found at $MEDIA_SOURCE${NC}"
    echo -e "${YELLOW}This is normal if using Hetzner S3 for media storage${NC}"
    exit 0
fi

# Check if media directory has files
if [ -z "$(ls -A $MEDIA_SOURCE)" ]; then
    echo -e "${YELLOW}Warning: Media directory is empty${NC}"
    echo -e "${YELLOW}Skipping backup${NC}"
    exit 0
fi

# Perform backup
echo -e "${YELLOW}Starting media files backup...${NC}"
if tar -czf "$BACKUP_DIR/$FILENAME" -C "$MEDIA_SOURCE" .; then
    echo -e "${GREEN}✓ Media files backup completed successfully${NC}"

    # Get file size
    SIZE=$(du -h "$BACKUP_DIR/$FILENAME" | cut -f1)
    echo -e "Backup size: $SIZE"
else
    echo -e "${RED}✗ Media files backup failed${NC}"
    exit 1
fi

# Clean up old backups (keep last N days)
echo ""
echo -e "${YELLOW}Cleaning up old backups (keeping last $RETENTION_DAYS days)...${NC}"
DELETED_COUNT=$(find "$BACKUP_DIR" -name "kiik_media_backup_*.tar.gz" -mtime +$RETENTION_DAYS -delete -print | wc -l)
echo -e "${GREEN}✓ Deleted $DELETED_COUNT old backup(s)${NC}"

# List recent backups
echo ""
echo -e "${YELLOW}Recent backups:${NC}"
ls -lht "$BACKUP_DIR"/kiik_media_backup_*.tar.gz 2>/dev/null | head -5 || echo "No backups found"

# Summary
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Backup Summary${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "Backup location: $BACKUP_DIR/$FILENAME"
echo -e "Total backups: $(ls -1 "$BACKUP_DIR"/kiik_media_backup_*.tar.gz 2>/dev/null | wc -l)"
echo -e "Disk usage: $(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1)"
echo -e "${GREEN}========================================${NC}"

exit 0
