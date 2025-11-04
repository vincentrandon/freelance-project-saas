#!/bin/bash
# =============================================================================
# Server Setup Script for kiik.app on Hetzner
# Installs Docker, configures firewall, sets up SSL, and prepares server
# =============================================================================

set -e  # Exit on error

# Configuration
APP_DIR="/opt/kiik-app"
APP_USER="kiikapp"
DOMAIN="kiik.app"
EMAIL="your-email@example.com"  # Change this for Let's Encrypt notifications

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}kiik.app Server Setup${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "Timestamp: $(date)"
echo -e "Server: $(hostname)"
echo -e "IP: $(hostname -I | awk '{print $1}')"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Error: This script must be run as root${NC}"
    exit 1
fi

# Step 1: System update
echo -e "${YELLOW}[1/12] Updating system packages...${NC}"
apt-get update
apt-get upgrade -y
echo -e "${GREEN}✓ System updated${NC}"

# Step 2: Install essential packages
echo ""
echo -e "${YELLOW}[2/12] Installing essential packages...${NC}"
apt-get install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    software-properties-common \
    git \
    vim \
    htop \
    ufw \
    fail2ban \
    awscli
echo -e "${GREEN}✓ Essential packages installed${NC}"

# Step 3: Install Docker
echo ""
echo -e "${YELLOW}[3/12] Installing Docker...${NC}"
if ! command -v docker &> /dev/null; then
    # Add Docker's official GPG key
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

    # Set up Docker repository
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

    # Install Docker
    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

    # Start and enable Docker
    systemctl start docker
    systemctl enable docker

    echo -e "${GREEN}✓ Docker installed successfully${NC}"
else
    echo -e "${GREEN}✓ Docker already installed${NC}"
fi

# Verify Docker installation
docker --version
docker compose version

# Step 4: Create application user
echo ""
echo -e "${YELLOW}[4/12] Creating application user...${NC}"
if id "$APP_USER" &>/dev/null; then
    echo -e "${GREEN}✓ User $APP_USER already exists${NC}"
else
    useradd -m -s /bin/bash "$APP_USER"
    usermod -aG docker "$APP_USER"
    echo -e "${GREEN}✓ User $APP_USER created and added to docker group${NC}"
fi

# Step 5: Configure firewall (UFW)
echo ""
echo -e "${YELLOW}[5/12] Configuring firewall...${NC}"
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw --force enable
echo -e "${GREEN}✓ Firewall configured${NC}"
ufw status

# Step 6: Configure fail2ban
echo ""
echo -e "${YELLOW}[6/12] Configuring fail2ban...${NC}"
systemctl enable fail2ban
systemctl start fail2ban
echo -e "${GREEN}✓ Fail2ban enabled${NC}"

# Step 7: Create application directory
echo ""
echo -e "${YELLOW}[7/12] Creating application directory...${NC}"
mkdir -p "$APP_DIR"
chown -R "$APP_USER:$APP_USER" "$APP_DIR"
echo -e "${GREEN}✓ Application directory created: $APP_DIR${NC}"

# Step 8: Create backup directories
echo ""
echo -e "${YELLOW}[8/12] Creating backup directories...${NC}"
mkdir -p /backups/postgres /backups/media
chown -R "$APP_USER:$APP_USER" /backups
echo -e "${GREEN}✓ Backup directories created${NC}"

# Step 9: Install Certbot for Let's Encrypt
echo ""
echo -e "${YELLOW}[9/12] Installing Certbot...${NC}"
if ! command -v certbot &> /dev/null; then
    apt-get install -y certbot python3-certbot-nginx
    echo -e "${GREEN}✓ Certbot installed${NC}"
else
    echo -e "${GREEN}✓ Certbot already installed${NC}"
fi

# Step 10: Clone repository (or prompt for manual clone)
echo ""
echo -e "${YELLOW}[10/12] Repository setup...${NC}"
echo -e "${YELLOW}You need to clone your repository to $APP_DIR${NC}"
echo -e "${YELLOW}Run as $APP_USER:${NC}"
echo -e "  sudo -u $APP_USER git clone https://github.com/YOUR_USERNAME/freelancetool.git $APP_DIR"
echo -e "${YELLOW}Or copy files manually if already cloned${NC}"

# Step 11: Setup cron jobs for backups
echo ""
echo -e "${YELLOW}[11/12] Setting up cron jobs for backups...${NC}"
CRON_FILE="/etc/cron.d/kiik-backups"
cat > "$CRON_FILE" <<EOF
# kiik.app Automated Backups
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin

# Daily database backup at 2 AM
0 2 * * * root $APP_DIR/scripts/backup-db.sh >> /var/log/kiik-backup.log 2>&1

# Daily media backup at 3 AM (if not using S3)
0 3 * * * root $APP_DIR/scripts/backup-media.sh >> /var/log/kiik-backup.log 2>&1

# Sync backups to Hetzner S3 at 4 AM
0 4 * * * root $APP_DIR/scripts/sync-backups-to-s3.sh >> /var/log/kiik-backup.log 2>&1
EOF
chmod 644 "$CRON_FILE"
echo -e "${GREEN}✓ Cron jobs configured${NC}"

# Step 12: Display next steps
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Server Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo ""
echo -e "${BLUE}1. Clone repository:${NC}"
echo -e "   sudo -u $APP_USER git clone YOUR_REPO_URL $APP_DIR"
echo ""
echo -e "${BLUE}2. Create .env file:${NC}"
echo -e "   cd $APP_DIR"
echo -e "   cp .env.production.example .env"
echo -e "   nano .env  # Edit with production values"
echo ""
echo -e "${BLUE}3. Obtain SSL certificate:${NC}"
echo -e "   certbot certonly --standalone -d $DOMAIN -d www.$DOMAIN --email $EMAIL --agree-tos"
echo ""
echo -e "${BLUE}4. Setup auto-renewal for SSL:${NC}"
echo -e "   certbot renew --dry-run"
echo ""
echo -e "${BLUE}5. Build and start application:${NC}"
echo -e "   cd $APP_DIR"
echo -e "   docker compose -f docker-compose.prod.yml build"
echo -e "   docker compose -f docker-compose.prod.yml up -d"
echo ""
echo -e "${BLUE}6. Run initial migrations:${NC}"
echo -e "   docker compose -f docker-compose.prod.yml exec backend python manage.py migrate"
echo -e "   docker compose -f docker-compose.prod.yml exec backend python manage.py createsuperuser"
echo -e "   docker compose -f docker-compose.prod.yml exec backend python manage.py collectstatic --noinput"
echo ""
echo -e "${BLUE}7. Test the application:${NC}"
echo -e "   curl https://$DOMAIN/health/"
echo -e "   Visit: https://$DOMAIN"
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "Created by: kiik.app deployment script"
echo -e "Server IP: $(hostname -I | awk '{print $1}')"
echo -e "Domain: $DOMAIN"
echo -e "${GREEN}========================================${NC}"

exit 0
