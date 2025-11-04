#!/bin/bash
# =============================================================================
# Database Restore Script for kiik.app
# Restores PostgreSQL database from backup file
# =============================================================================

set -e  # Exit on error

# Configuration
BACKUP_DIR="/backups/postgres"
COMPOSE_FILE="/opt/kiik-app/docker-compose.prod.yml"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}kiik.app Database Restore${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if backup file is provided
if [ -z "$1" ]; then
    echo -e "${YELLOW}Usage: $0 <backup-file>${NC}"
    echo ""
    echo -e "Available backups:"
    echo -e "${GREEN}------------------${NC}"
    ls -lht "$BACKUP_DIR"/kiik_db_backup_*.sql.gz 2>/dev/null | head -10 || echo "No backups found"
    echo ""
    echo -e "Example: $0 kiik_db_backup_20250104_020000.sql.gz"
    exit 1
fi

BACKUP_FILE="$1"

# Check if file exists (try both full path and just filename)
if [ -f "$BACKUP_FILE" ]; then
    BACKUP_PATH="$BACKUP_FILE"
elif [ -f "$BACKUP_DIR/$BACKUP_FILE" ]; then
    BACKUP_PATH="$BACKUP_DIR/$BACKUP_FILE"
else
    echo -e "${RED}Error: Backup file not found: $BACKUP_FILE${NC}"
    exit 1
fi

echo -e "Backup file: ${GREEN}$BACKUP_PATH${NC}"
echo -e "File size: $(du -h "$BACKUP_PATH" | cut -f1)"
echo ""

# Warning prompt
echo -e "${RED}⚠️  WARNING ⚠️${NC}"
echo -e "${RED}This will REPLACE the current database with the backup!${NC}"
echo -e "${RED}All current data will be LOST!${NC}"
echo ""
read -p "Are you sure you want to continue? (type 'yes' to confirm): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo -e "${YELLOW}Restore cancelled${NC}"
    exit 0
fi

echo ""
echo -e "${YELLOW}Starting database restore...${NC}"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}Error: Docker is not running${NC}"
    exit 1
fi

# Stop backend services to prevent connections during restore
echo -e "${YELLOW}Stopping backend services...${NC}"
docker compose -f "$COMPOSE_FILE" stop backend celery celery-beat

# Drop existing connections
echo -e "${YELLOW}Terminating existing database connections...${NC}"
docker compose -f "$COMPOSE_FILE" exec -T db psql -U postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'freelancermgmt' AND pid <> pg_backend_pid();" || true

# Drop and recreate database
echo -e "${YELLOW}Dropping and recreating database...${NC}"
docker compose -f "$COMPOSE_FILE" exec -T db psql -U postgres -c "DROP DATABASE IF EXISTS freelancermgmt;"
docker compose -f "$COMPOSE_FILE" exec -T db psql -U postgres -c "CREATE DATABASE freelancermgmt;"

# Restore from backup
echo -e "${YELLOW}Restoring database from backup...${NC}"
if gunzip < "$BACKUP_PATH" | docker compose -f "$COMPOSE_FILE" exec -T db psql -U postgres freelancermgmt; then
    echo -e "${GREEN}✓ Database restore completed successfully${NC}"
else
    echo -e "${RED}✗ Database restore failed${NC}"
    echo -e "${YELLOW}Starting backend services...${NC}"
    docker compose -f "$COMPOSE_FILE" start backend celery celery-beat
    exit 1
fi

# Restart backend services
echo -e "${YELLOW}Starting backend services...${NC}"
docker compose -f "$COMPOSE_FILE" start backend celery celery-beat

# Wait for services to be healthy
echo -e "${YELLOW}Waiting for services to be healthy...${NC}"
sleep 5

# Test database connection
echo -e "${YELLOW}Testing database connection...${NC}"
if docker compose -f "$COMPOSE_FILE" exec -T backend python manage.py showmigrations > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Database connection successful${NC}"
else
    echo -e "${RED}✗ Database connection failed${NC}"
    exit 1
fi

# Summary
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Restore Complete${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "Restored from: $BACKUP_PATH"
echo -e "Timestamp: $(date)"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo -e "1. Verify the application is working correctly"
echo -e "2. Check logs: docker compose -f $COMPOSE_FILE logs backend"
echo -e "3. Test critical functionality"

exit 0
