# Production Deployment Guide for kiik.app

Complete step-by-step guide for deploying kiik.app to Hetzner production server.

---

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Server Setup](#server-setup)
3. [SSL Certificate Setup](#ssl-certificate-setup)
4. [Application Deployment](#application-deployment)
5. [Post-Deployment Verification](#post-deployment-verification)
6. [Monitoring & Maintenance](#monitoring--maintenance)
7. [Troubleshooting](#troubleshooting)

---

## Pre-Deployment Checklist

### 1. Secrets & API Keys

**CRITICAL: Rotate all exposed secrets before deployment!**

- [ ] Generate new `SECRET_KEY` for Django
- [ ] Generate strong `DB_PASSWORD` (20+ characters)
- [ ] Rotate `OPENAI_API_KEY` (was exposed in previous .env)
- [ ] Rotate `INSEE_API_KEY` (was exposed in previous .env)
- [ ] Regenerate Google OAuth credentials for production domain
- [ ] Setup Stripe LIVE keys (not test keys)
- [ ] Create Sentry account and get DSN
- [ ] Create Hetzner S3 bucket for media storage

### 2. DNS Configuration

- [ ] Point `kiik.app` A record to `138.199.232.159`
- [ ] Point `www.kiik.app` A record to `138.199.232.159`
- [ ] Verify DNS propagation: `dig kiik.app +short`

### 3. Local Preparation

```bash
# Ensure all changes are committed
git status
git add .
git commit -m "Production deployment configuration"
git push origin main
```

---

## Server Setup

### 1. Initial Server Access

```bash
# SSH into server
ssh root@138.199.232.159

# Update system
apt-get update && apt-get upgrade -y
```

### 2. Run Server Setup Script

```bash
# Download and run setup script
curl -O https://raw.githubusercontent.com/YOUR_USERNAME/freelancetool/main/scripts/server-setup.sh
chmod +x server-setup.sh
./server-setup.sh
```

**What this script does:**
- Installs Docker and Docker Compose
- Configures UFW firewall (ports 22, 80, 443)
- Sets up fail2ban
- Creates application user (`kiikapp`)
- Installs Certbot for SSL
- Creates backup directories
- Sets up cron jobs for automated backups

### 3. Clone Repository

```bash
# Switch to application user
sudo -u kiikapp bash
cd /opt/kiik-app

# Clone repository
git clone https://github.com/YOUR_USERNAME/freelancetool.git .

# Verify files
ls -la
```

### 4. Create Production Environment File

```bash
# Copy template
cp .env.production.example .env

# Edit with production values
nano .env
```

**Required changes in .env:**

```bash
# Generate SECRET_KEY
python3 -c "import secrets; print(secrets.token_urlsafe(50))"

# Generate DB_PASSWORD
openssl rand -base64 32

# Fill in all values marked with REPLACE_WITH_*
# See .env.production.example for full list
```

---

## SSL Certificate Setup

### 1. Obtain Let's Encrypt Certificate

```bash
# Stop nginx if running
docker compose -f docker-compose.prod.yml stop nginx

# Get certificate for both domains
sudo certbot certonly --standalone \
  -d kiik.app \
  -d www.kiik.app \
  --email your-email@example.com \
  --agree-tos \
  --no-eff-email

# Verify certificate
sudo ls -la /etc/letsencrypt/live/kiik.app/
```

### 2. Setup Auto-Renewal

```bash
# Test renewal
sudo certbot renew --dry-run

# Auto-renewal is already configured via systemd timer
sudo systemctl status certbot.timer
```

### 3. Update Nginx Configuration

The nginx configuration in `nginx/nginx-ssl.conf` is already set up for SSL.
No changes needed if using the default paths.

---

## Application Deployment

### 1. Create Hetzner S3 Bucket

**In Hetzner Cloud Console:**
1. Go to Storage > Object Storage
2. Create new bucket: `kiik-production-media`
3. Note the endpoint URL (e.g., `https://fsn1.your-objectstorage.com`)
4. Use credentials already in `.env`:
   - Access Key: `TRCRV7JT1DMSBRQS153X`
   - Secret Key: `1VK0rwY3wd28scUQJlGZ6xdLhHmd9Lh3Udpqak9h`

### 2. Build and Start Services

```bash
cd /opt/kiik-app

# Build Docker images
docker compose -f docker-compose.prod.yml build

# Start all services
docker compose -f docker-compose.prod.yml up -d

# Check service status
docker compose -f docker-compose.prod.yml ps
```

### 3. Run Database Migrations

```bash
# Run migrations
docker compose -f docker-compose.prod.yml exec backend python manage.py migrate

# Create superuser
docker compose -f docker-compose.prod.yml exec backend python manage.py createsuperuser

# Collect static files
docker compose -f docker-compose.prod.yml exec backend python manage.py collectstatic --noinput

# Seed subscription plans (if needed)
docker compose -f docker-compose.prod.yml exec backend python manage.py seed_subscription_plans
```

### 4. Verify Services

```bash
# Check logs
docker compose -f docker-compose.prod.yml logs backend --tail=50
docker compose -f docker-compose.prod.yml logs celery --tail=50
docker compose -f docker-compose.prod.yml logs nginx --tail=50

# Test health endpoint
curl https://kiik.app/health/
```

---

## Post-Deployment Verification

### 1. Health Checks

```bash
# Test health endpoint
curl -v https://kiik.app/health/
# Should return: {"status":"healthy","checks":{"database":"ok","cache":"ok"}}

# Test HTTPS redirect
curl -I http://kiik.app
# Should return: 301 redirect to https://

# Test SSL
curl -vI https://kiik.app 2>&1 | grep -i "SSL"
```

### 2. Functional Testing

- [ ] **Frontend**: Visit https://kiik.app
- [ ] **Login**: Test user authentication
- [ ] **API**: Visit https://kiik.app/api/docs/
- [ ] **Admin**: Visit https://kiik.app/admin/
- [ ] **File Upload**: Test document upload to Hetzner S3
- [ ] **PDF Generation**: Create invoice and generate PDF
- [ ] **AI Processing**: Upload document for AI extraction
- [ ] **OAuth**: Test Google login (if enabled)

### 3. Security Verification

```bash
# Test SSL with SSL Labs (in browser)
# https://www.ssllabs.com/ssltest/analyze.html?d=kiik.app

# Check security headers
curl -I https://kiik.app | grep -E "Strict-Transport-Security|X-Frame-Options|X-Content-Type"

# Verify firewall
sudo ufw status
# Should show: 22, 80, 443 allowed only

# Test database port is NOT exposed
nc -zv 138.199.232.159 5432
# Should fail (connection refused)
```

---

## Monitoring & Maintenance

### 1. Setup Sentry

**In https://sentry.io:**
1. Create account (free tier available)
2. Create new project: "kiik-app"
3. Copy DSN
4. Update `.env`: `SENTRY_DSN=https://your-dsn@sentry.io/project-id`
5. Restart backend: `docker compose -f docker-compose.prod.yml restart backend celery`

### 2. Setup Uptime Monitoring

**Using UptimeRobot (free):**
1. Sign up at https://uptimerobot.com
2. Add monitor:
   - Type: HTTPS
   - URL: https://kiik.app/health/
   - Interval: 5 minutes
3. Add email alerts

### 3. View Logs

```bash
# Real-time logs
docker compose -f docker-compose.prod.yml logs -f

# Specific service
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f celery
docker compose -f docker-compose.prod.yml logs -f nginx

# Log files (inside container)
docker compose -f docker-compose.prod.yml exec backend tail -f /app/logs/django.log
docker compose -f docker-compose.prod.yml exec backend tail -f /app/logs/celery.log
```

### 4. Backups

**Automated backups are configured via cron:**
- **Database**: Daily at 2 AM (`/etc/cron.d/kiik-backups`)
- **Media**: Daily at 3 AM (if not using S3)
- **S3 Sync**: Daily at 4 AM (off-site backup)

**Manual backup:**
```bash
# Database
/opt/kiik-app/scripts/backup-db.sh

# Media (if applicable)
/opt/kiik-app/scripts/backup-media.sh

# Sync to S3
/opt/kiik-app/scripts/sync-backups-to-s3.sh
```

**Restore from backup:**
```bash
# List backups
ls -lh /backups/postgres/

# Restore specific backup
/opt/kiik-app/scripts/restore-db.sh kiik_db_backup_20250104_020000.sql.gz
```

### 5. Update Application

**Automatic (via GitHub Actions):**
- Push to `main` branch triggers automatic deployment

**Manual deployment:**
```bash
ssh root@138.199.232.159
cd /opt/kiik-app
./scripts/deploy.sh
```

---

## Troubleshooting

### Common Issues

#### 1. "502 Bad Gateway" Error

```bash
# Check backend logs
docker compose -f docker-compose.prod.yml logs backend --tail=100

# Restart backend
docker compose -f docker-compose.prod.yml restart backend

# Check if backend is running
docker compose -f docker-compose.prod.yml ps backend
```

#### 2. Static Files Not Loading

```bash
# Collect static files again
docker compose -f docker-compose.prod.yml exec backend python manage.py collectstatic --noinput

# Check nginx static volume
docker compose -f docker-compose.prod.yml exec nginx ls -la /app/staticfiles/

# Restart nginx
docker compose -f docker-compose.prod.yml restart nginx
```

#### 3. Database Connection Errors

```bash
# Check database status
docker compose -f docker-compose.prod.yml ps db

# Check database logs
docker compose -f docker-compose.prod.yml logs db --tail=100

# Test database connection
docker compose -f docker-compose.prod.yml exec backend python manage.py dbshell
```

#### 4. Celery Tasks Not Running

```bash
# Check Celery worker
docker compose -f docker-compose.prod.yml logs celery --tail=100

# Restart Celery
docker compose -f docker-compose.prod.yml restart celery celery-beat

# Check Redis
docker compose -f docker-compose.prod.yml exec redis redis-cli ping
```

#### 5. S3 Upload Failures

```bash
# Test S3 connection
docker compose -f docker-compose.prod.yml exec backend python manage.py shell
>>> from django.core.files.storage import default_storage
>>> default_storage.save('test.txt', ContentFile(b'test'))
>>> default_storage.exists('test.txt')

# Check environment variables
docker compose -f docker-compose.prod.yml exec backend env | grep AWS
```

### Performance Issues

```bash
# Check server resources
htop

# Check Docker stats
docker stats

# Check disk usage
df -h
du -sh /var/lib/docker/

# Clean up old images
docker system prune -a
```

### Restart Everything

```bash
# Full restart
cd /opt/kiik-app
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d

# Check status
docker compose -f docker-compose.prod.yml ps
```

---

## CI/CD with GitHub Actions

### Setup

1. **Add GitHub Secrets** (Settings > Secrets and variables > Actions):
   - `PRODUCTION_HOST`: `138.199.232.159`
   - `PRODUCTION_USER`: `root`
   - `SSH_PRIVATE_KEY`: Your SSH private key

2. **Generate SSH Key** (if needed):
```bash
# On your local machine
ssh-keygen -t ed25519 -C "github-actions"
# Save as: ~/.ssh/kiik_deploy

# Copy public key to server
ssh-copy-id -i ~/.ssh/kiik_deploy.pub root@138.199.232.159

# Copy private key to GitHub Secrets
cat ~/.ssh/kiik_deploy
```

3. **Test Deployment**:
```bash
# Push to main branch
git push origin main

# Check GitHub Actions tab in repository
# Deployment should trigger automatically
```

---

## Maintenance Schedule

### Daily
- [ ] Monitor Sentry for errors
- [ ] Check uptime monitoring alerts

### Weekly
- [ ] Review server logs
- [ ] Check disk usage
- [ ] Test backup restoration

### Monthly
- [ ] Update system packages: `apt-get update && apt-get upgrade`
- [ ] Review and rotate logs
- [ ] Check SSL certificate expiry

### Quarterly
- [ ] Security audit
- [ ] Performance optimization
- [ ] Dependency updates

---

## Support & Resources

- **Server IP**: `138.199.232.159`
- **Domain**: `https://kiik.app`
- **Health Check**: `https://kiik.app/health/`
- **Admin Panel**: `https://kiik.app/admin/`
- **API Docs**: `https://kiik.app/api/docs/`

- **Sentry**: https://sentry.io
- **Uptime Robot**: https://uptimerobot.com
- **Hetzner Console**: https://console.hetzner.cloud
- **Let's Encrypt**: https://letsencrypt.org

---

**Last Updated**: January 2025
**Deployment Version**: Production v1.0
