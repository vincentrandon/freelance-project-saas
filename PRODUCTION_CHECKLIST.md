# Production Deployment Checklist for kiik.app

Use this checklist to ensure all critical steps are completed before and after deployment.

---

## Pre-Deployment Security

### Secrets & Credentials

- [ ] **Generate new SECRET_KEY**
  ```bash
  python3 -c "import secrets; print(secrets.token_urlsafe(50))"
  ```

- [ ] **Generate strong DB_PASSWORD**
  ```bash
  openssl rand -base64 32
  ```

- [ ] **Rotate OPENAI_API_KEY**
  - Visit: https://platform.openai.com/api-keys
  - Create new key
  - Delete old exposed key

- [ ] **Rotate INSEE_API_KEY**
  - Visit: https://portail-api.insee.fr/
  - Generate new key
  - Update in `.env`

- [ ] **Regenerate Google OAuth Credentials**
  - Visit: https://console.cloud.google.com/apis/credentials
  - Create new OAuth 2.0 Client ID
  - Add authorized redirect URI: `https://kiik.app/auth/google/callback`

- [ ] **Setup Stripe LIVE Keys**
  - Visit: https://dashboard.stripe.com/apikeys
  - Use **LIVE** keys (not test!)
  - Add to `.env`: `STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`

- [ ] **Create Sentry Project**
  - Sign up: https://sentry.io
  - Create project: "kiik-app"
  - Copy DSN to `.env`

- [ ] **Verify `.env` file completeness**
  - All `REPLACE_WITH_*` values filled
  - No placeholder values remaining
  - `DEBUG=False`

---

## Infrastructure Setup

### DNS Configuration

- [ ] **Configure A Records**
  - `kiik.app` → `138.199.232.159`
  - `www.kiik.app` → `138.199.232.159`

- [ ] **Verify DNS Propagation**
  ```bash
  dig kiik.app +short
  dig www.kiik.app +short
  ```

### Server Access

- [ ] **SSH Access Configured**
  ```bash
  ssh root@138.199.232.159
  ```

- [ ] **Non-root User Created** (`kiikapp`)

- [ ] **SSH Key Authentication Setup** (password auth disabled)

---

## Server Setup

### System Configuration

- [ ] **Run server-setup.sh script**
  ```bash
  ./scripts/server-setup.sh
  ```

- [ ] **Docker Installed**
  ```bash
  docker --version
  docker compose version
  ```

- [ ] **Firewall Configured (UFW)**
  ```bash
  sudo ufw status
  # Should show: 22, 80, 443 allowed
  ```

- [ ] **Fail2ban Enabled**
  ```bash
  sudo systemctl status fail2ban
  ```

- [ ] **Application Directory Created** (`/opt/kiik-app`)

- [ ] **Backup Directories Created** (`/backups/postgres`, `/backups/media`)

---

## SSL/HTTPS

### Let's Encrypt Certificate

- [ ] **Certbot Installed**
  ```bash
  certbot --version
  ```

- [ ] **SSL Certificate Obtained**
  ```bash
  sudo certbot certonly --standalone \
    -d kiik.app \
    -d www.kiik.app \
    --email your-email@example.com \
    --agree-tos
  ```

- [ ] **Certificate Files Verified**
  ```bash
  sudo ls -la /etc/letsencrypt/live/kiik.app/
  # Should contain: fullchain.pem, privkey.pem, chain.pem
  ```

- [ ] **Auto-Renewal Tested**
  ```bash
  sudo certbot renew --dry-run
  ```

- [ ] **Certbot Timer Active**
  ```bash
  sudo systemctl status certbot.timer
  ```

---

## Hetzner S3 Storage

### S3 Bucket Configuration

- [ ] **S3 Bucket Created** (Hetzner Console)
  - Bucket name: `kiik-production-media`
  - Region: `eu-central-1` (or your choice)

- [ ] **S3 Credentials in `.env`**
  - `AWS_ACCESS_KEY_ID=TRCRV7JT1DMSBRQS153X`
  - `AWS_SECRET_ACCESS_KEY=1VK0rwY3wd28scUQJlGZ6xdLhHmd9Lh3Udpqak9h`
  - `AWS_STORAGE_BUCKET_NAME=kiik-production-media`
  - `AWS_S3_ENDPOINT_URL=https://fsn1.your-objectstorage.com`

- [ ] **S3 Connectivity Tested**
  ```bash
  docker compose -f docker-compose.prod.yml exec backend python manage.py shell
  >>> from django.core.files.storage import default_storage
  >>> from django.core.files.base import ContentFile
  >>> default_storage.save('test.txt', ContentFile(b'test'))
  >>> default_storage.exists('test.txt')
  True
  ```

---

## Application Deployment

### Build & Start

- [ ] **Repository Cloned**
  ```bash
  git clone YOUR_REPO_URL /opt/kiik-app
  ```

- [ ] **`.env` File Created** (copied from `.env.production.example`)

- [ ] **Docker Images Built**
  ```bash
  docker compose -f docker-compose.prod.yml build
  ```

- [ ] **Services Started**
  ```bash
  docker compose -f docker-compose.prod.yml up -d
  ```

- [ ] **All Containers Running**
  ```bash
  docker compose -f docker-compose.prod.yml ps
  # Should show: db, redis, backend, celery, celery-beat, frontend, nginx
  ```

### Database Setup

- [ ] **Migrations Run**
  ```bash
  docker compose -f docker-compose.prod.yml exec backend python manage.py migrate
  ```

- [ ] **Superuser Created**
  ```bash
  docker compose -f docker-compose.prod.yml exec backend python manage.py createsuperuser
  ```

- [ ] **Static Files Collected**
  ```bash
  docker compose -f docker-compose.prod.yml exec backend python manage.py collectstatic --noinput
  ```

- [ ] **Subscription Plans Seeded** (if applicable)
  ```bash
  docker compose -f docker-compose.prod.yml exec backend python manage.py seed_subscription_plans
  ```

---

## Post-Deployment Verification

### Health Checks

- [ ] **Health Endpoint Accessible**
  ```bash
  curl https://kiik.app/health/
  # Expected: {"status":"healthy","checks":{"database":"ok","cache":"ok"}}
  ```

- [ ] **HTTP → HTTPS Redirect Working**
  ```bash
  curl -I http://kiik.app
  # Expected: 301 redirect to https://
  ```

- [ ] **SSL Certificate Valid**
  - Test at: https://www.ssllabs.com/ssltest/analyze.html?d=kiik.app
  - Expected grade: A or A+

### Security Headers

- [ ] **HSTS Header Present**
  ```bash
  curl -I https://kiik.app | grep Strict-Transport-Security
  ```

- [ ] **X-Frame-Options Present**
  ```bash
  curl -I https://kiik.app | grep X-Frame-Options
  ```

- [ ] **X-Content-Type-Options Present**
  ```bash
  curl -I https://kiik.app | grep X-Content-Type-Options
  ```

### Port Security

- [ ] **Database Port NOT Exposed**
  ```bash
  nc -zv 138.199.232.159 5432
  # Expected: Connection refused
  ```

- [ ] **Redis Port NOT Exposed**
  ```bash
  nc -zv 138.199.232.159 6379
  # Expected: Connection refused
  ```

- [ ] **Backend Port NOT Exposed**
  ```bash
  nc -zv 138.199.232.159 8000
  # Expected: Connection refused
  ```

---

## Functional Testing

### Core Features

- [ ] **Frontend Loads** - Visit https://kiik.app

- [ ] **User Registration** - Create test account

- [ ] **User Login** - Login with test account

- [ ] **Google OAuth** (if enabled) - Test Google login

- [ ] **Dashboard Access** - View dashboard after login

### API Testing

- [ ] **API Documentation Accessible** - Visit https://kiik.app/api/docs/

- [ ] **API Authentication** - Test JWT token generation

- [ ] **Health Endpoint** - GET https://kiik.app/health/

### Business Features

- [ ] **Create Customer** - Add new customer

- [ ] **Create Lead** - Add lead to pipeline

- [ ] **Create Project** - Create project with notes

- [ ] **Create Invoice** - Generate invoice

- [ ] **Generate PDF** - Export invoice to PDF

- [ ] **File Upload to S3** - Upload customer attachment

- [ ] **AI Document Processing** - Upload PDF for extraction

- [ ] **Email Sending** - Test password reset email (when SMTP configured)

### Admin Panel

- [ ] **Admin Panel Accessible** - Visit https://kiik.app/admin/

- [ ] **Superuser Login Works**

- [ ] **Models Visible** - Check all models are registered

---

## Monitoring & Logging

### Sentry Integration

- [ ] **Sentry Configured** - DSN in `.env`

- [ ] **Test Error Logged**
  ```bash
  docker compose -f docker-compose.prod.yml exec backend python manage.py shell
  >>> import sentry_sdk
  >>> sentry_sdk.capture_message("Test deployment error")
  ```

- [ ] **Error Visible in Sentry Dashboard**

### Uptime Monitoring

- [ ] **UptimeRobot Monitor Added**
  - URL: https://kiik.app/health/
  - Interval: 5 minutes
  - Alert: Email notification

### Log Access

- [ ] **Django Logs Accessible**
  ```bash
  docker compose -f docker-compose.prod.yml exec backend tail -f /app/logs/django.log
  ```

- [ ] **Celery Logs Accessible**
  ```bash
  docker compose -f docker-compose.prod.yml exec backend tail -f /app/logs/celery.log
  ```

- [ ] **Nginx Logs Accessible**
  ```bash
  docker compose -f docker-compose.prod.yml logs nginx
  ```

---

## Backup & Recovery

### Automated Backups

- [ ] **Cron Jobs Configured** - `/etc/cron.d/kiik-backups`

- [ ] **Backup Scripts Executable**
  ```bash
  ls -la /opt/kiik-app/scripts/*.sh
  ```

- [ ] **Manual Database Backup Works**
  ```bash
  /opt/kiik-app/scripts/backup-db.sh
  ```

- [ ] **Backup Files Created**
  ```bash
  ls -lh /backups/postgres/
  ```

- [ ] **S3 Sync Works**
  ```bash
  /opt/kiik-app/scripts/sync-backups-to-s3.sh
  ```

### Recovery Testing

- [ ] **Restore Process Documented**

- [ ] **Test Restore on Backup** (on test environment, not production!)
  ```bash
  /opt/kiik-app/scripts/restore-db.sh BACKUP_FILE
  ```

---

## CI/CD Configuration

### GitHub Actions

- [ ] **GitHub Secrets Configured**
  - `PRODUCTION_HOST`: `138.199.232.159`
  - `PRODUCTION_USER`: `root`
  - `SSH_PRIVATE_KEY`: SSH private key

- [ ] **Deployment Workflow Exists** - `.github/workflows/deploy.yml`

- [ ] **Test Deployment**
  ```bash
  git push origin main
  # Check GitHub Actions tab
  ```

- [ ] **Deployment Successful**

---

## Performance & Optimization

### Resource Usage

- [ ] **Check Server Resources**
  ```bash
  htop
  free -h
  df -h
  ```

- [ ] **Docker Resource Limits Applied** (in docker-compose.prod.yml)

- [ ] **Redis Memory Limit Set** (in redis.conf)

### Caching

- [ ] **Static Files Cached** (30 days as per nginx config)

- [ ] **Redis Working**
  ```bash
  docker compose -f docker-compose.prod.yml exec redis redis-cli ping
  # Expected: PONG
  ```

### Database

- [ ] **Database Connections Healthy**
  ```bash
  docker compose -f docker-compose.prod.yml exec db psql -U postgres -c "SELECT count(*) FROM pg_stat_activity;"
  ```

---

## Documentation

### Internal Documentation

- [ ] **DEPLOYMENT.md Reviewed**

- [ ] **PRODUCTION_CHECKLIST.md Completed** (this file!)

- [ ] **CLAUDE.md Updated** (if necessary)

### Credentials Storage

- [ ] **`.env` File Backed Up Securely**
  - Stored in password manager
  - Offline encrypted backup

- [ ] **SSH Keys Backed Up**

- [ ] **Database Credentials Documented** (securely)

---

## Final Checks

### Access & URLs

- [ ] **Production URL**: https://kiik.app ✅
- [ ] **Health Check**: https://kiik.app/health/ ✅
- [ ] **Admin Panel**: https://kiik.app/admin/ ✅
- [ ] **API Docs**: https://kiik.app/api/docs/ ✅

### Team Notification

- [ ] **Deployment Announcement** (team notified)

- [ ] **Credentials Shared Securely** (if applicable)

- [ ] **Monitoring Dashboards Shared**
  - Sentry URL
  - Uptime monitoring

### Post-Deployment Support

- [ ] **Monitor Sentry for 24 Hours**

- [ ] **Check Server Logs Regularly**

- [ ] **Test Critical User Flows**

- [ ] **User Feedback Collection Plan**

---

## Rollback Plan

In case deployment fails or critical issues arise:

1. **Stop services**:
   ```bash
   docker compose -f docker-compose.prod.yml down
   ```

2. **Restore from backup**:
   ```bash
   /opt/kiik-app/scripts/restore-db.sh LAST_GOOD_BACKUP.sql.gz
   ```

3. **Checkout previous version**:
   ```bash
   git checkout PREVIOUS_COMMIT_HASH
   docker compose -f docker-compose.prod.yml up -d
   ```

4. **Notify stakeholders**

---

## Completion

**Deployment Date**: ___________________

**Deployed By**: ___________________

**Production Version**: ___________________

**Checklist Completed**: ☐ Yes ☐ No

**Issues Encountered**:
___________________
___________________

**Notes**:
___________________
___________________

---

**🎉 Congratulations! kiik.app is now live in production!**

For ongoing maintenance, refer to [DEPLOYMENT.md](./DEPLOYMENT.md) → Monitoring & Maintenance section.
