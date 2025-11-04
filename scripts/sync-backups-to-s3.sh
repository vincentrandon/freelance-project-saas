#!/bin/bash
# =============================================================================
# Sync Backups to Hetzner S3 for Off-Site Storage
# Uses AWS CLI (compatible with Hetzner S3)
# =============================================================================

set -e  # Exit on error

# Configuration
BACKUP_DIR="/backups"
S3_BUCKET="kiik-production-backups"  # Change this to your bucket name
S3_ENDPOINT="https://fsn1.your-objectstorage.com"  # Hetzner S3 endpoint
AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID:-TRCRV7JT1DMSBRQS153X}"
AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY:-1VK0rwY3wd28scUQJlGZ6xdLhHmd9Lh3Udpqak9h}"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Sync Backups to Hetzner S3${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "Timestamp: $(date)"
echo ""

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}Error: AWS CLI is not installed${NC}"
    echo -e "${YELLOW}Install with: apt-get install awscli${NC}"
    exit 1
fi

# Export credentials for aws cli
export AWS_ACCESS_KEY_ID
export AWS_SECRET_ACCESS_KEY

# Sync database backups
if [ -d "$BACKUP_DIR/postgres" ]; then
    echo -e "${YELLOW}Syncing database backups to S3...${NC}"
    if aws s3 sync "$BACKUP_DIR/postgres" "s3://$S3_BUCKET/postgres/" \
        --endpoint-url="$S3_ENDPOINT" \
        --storage-class STANDARD \
        --no-progress; then
        echo -e "${GREEN}✓ Database backups synced successfully${NC}"
    else
        echo -e "${RED}✗ Failed to sync database backups${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}No database backups found, skipping${NC}"
fi

# Sync media backups (if any)
if [ -d "$BACKUP_DIR/media" ]; then
    echo ""
    echo -e "${YELLOW}Syncing media backups to S3...${NC}"
    if aws s3 sync "$BACKUP_DIR/media" "s3://$S3_BUCKET/media/" \
        --endpoint-url="$S3_ENDPOINT" \
        --storage-class STANDARD \
        --no-progress; then
        echo -e "${GREEN}✓ Media backups synced successfully${NC}"
    else
        echo -e "${RED}✗ Failed to sync media backups${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}No media backups found, skipping${NC}"
fi

# List S3 backup summary
echo ""
echo -e "${YELLOW}S3 Backup Summary:${NC}"
aws s3 ls "s3://$S3_BUCKET/" --endpoint-url="$S3_ENDPOINT" --recursive --human-readable --summarize | tail -2

# Summary
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Sync Complete${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "S3 Bucket: s3://$S3_BUCKET"
echo -e "Endpoint: $S3_ENDPOINT"
echo -e "${GREEN}========================================${NC}"

exit 0
