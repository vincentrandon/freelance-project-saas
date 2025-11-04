#!/bin/bash
# =============================================================================
# Deployment Script for kiik.app
# Pulls latest code, rebuilds containers, runs migrations, and restarts services
# =============================================================================

set -e  # Exit on error

# Configuration
APP_DIR="/opt/kiik-app"
COMPOSE_FILE="$APP_DIR/docker-compose.prod.yml"
BRANCH="${1:-main}"  # Default to main branch

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}kiik.app Deployment${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "Timestamp: $(date)"
echo -e "Branch: $BRANCH"
echo ""

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Error: This script must be run as root or with sudo${NC}"
    exit 1
fi

# Navigate to application directory
cd "$APP_DIR" || exit 1

# Step 1: Pull latest code
echo -e "${YELLOW}[1/8] Pulling latest code from git...${NC}"
if git pull origin "$BRANCH"; then
    echo -e "${GREEN}✓ Code updated successfully${NC}"
else
    echo -e "${RED}✗ Failed to pull latest code${NC}"
    exit 1
fi

# Step 2: Build Docker images
echo ""
echo -e "${YELLOW}[2/8] Building Docker images...${NC}"
if docker compose -f "$COMPOSE_FILE" build --no-cache; then
    echo -e "${GREEN}✓ Docker images built successfully${NC}"
else
    echo -e "${RED}✗ Failed to build Docker images${NC}"
    exit 1
fi

# Step 3: Stop services gracefully
echo ""
echo -e "${YELLOW}[3/8] Stopping services...${NC}"
docker compose -f "$COMPOSE_FILE" stop
echo -e "${GREEN}✓ Services stopped${NC}"

# Step 4: Start database and redis first
echo ""
echo -e "${YELLOW}[4/8] Starting database and Redis...${NC}"
docker compose -f "$COMPOSE_FILE" up -d db redis
sleep 5  # Wait for services to be ready
echo -e "${GREEN}✓ Database and Redis started${NC}"

# Step 5: Run database migrations
echo ""
echo -e "${YELLOW}[5/8] Running database migrations...${NC}"
if docker compose -f "$COMPOSE_FILE" run --rm backend python manage.py migrate; then
    echo -e "${GREEN}✓ Migrations completed successfully${NC}"
else
    echo -e "${RED}✗ Migrations failed${NC}"
    echo -e "${YELLOW}Rolling back deployment...${NC}"
    docker compose -f "$COMPOSE_FILE" down
    exit 1
fi

# Step 6: Collect static files
echo ""
echo -e "${YELLOW}[6/8] Collecting static files...${NC}"
if docker compose -f "$COMPOSE_FILE" run --rm backend python manage.py collectstatic --noinput; then
    echo -e "${GREEN}✓ Static files collected${NC}"
else
    echo -e "${YELLOW}⚠ Static files collection failed (non-critical)${NC}"
fi

# Step 7: Start all services
echo ""
echo -e "${YELLOW}[7/8] Starting all services...${NC}"
if docker compose -f "$COMPOSE_FILE" up -d; then
    echo -e "${GREEN}✓ All services started${NC}"
else
    echo -e "${RED}✗ Failed to start services${NC}"
    exit 1
fi

# Step 8: Health check
echo ""
echo -e "${YELLOW}[8/8] Performing health check...${NC}"
sleep 10  # Wait for services to warm up

# Check health endpoint
if curl -f -s https://kiik.app/health/ > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Health check passed${NC}"
else
    echo -e "${RED}✗ Health check failed${NC}"
    echo -e "${YELLOW}Checking container logs...${NC}"
    docker compose -f "$COMPOSE_FILE" logs --tail=50 backend
    exit 1
fi

# Display running services
echo ""
echo -e "${YELLOW}Running services:${NC}"
docker compose -f "$COMPOSE_FILE" ps

# Summary
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Deployment Successful!${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "Application: https://kiik.app"
echo -e "Health check: https://kiik.app/health/"
echo -e "Admin panel: https://kiik.app/admin/"
echo -e "API docs: https://kiik.app/api/docs/"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}Useful commands:${NC}"
echo -e "  View logs:    docker compose -f $COMPOSE_FILE logs -f"
echo -e "  Restart:      docker compose -f $COMPOSE_FILE restart"
echo -e "  Stop all:     docker compose -f $COMPOSE_FILE down"
echo -e "  View status:  docker compose -f $COMPOSE_FILE ps"

exit 0
