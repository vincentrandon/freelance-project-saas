# Docker Setup Guide

Complete guide for running the Freelancer Management Platform with Docker.

## Prerequisites

- Docker 20.10+
- Docker Compose 2.0+

## Quick Start

1. **Clone the repository and navigate to the project root**:
   ```bash
   cd /path/to/freelancetool
   ```

2. **Create `.env` file from example**:
   ```bash
   cp .env.example .env
   ```

3. **Update `.env` with your settings** (optional for development):
   ```env
   DEBUG=True
   SECRET_KEY=your-development-secret-key
   ```

4. **Build and start all services**:
   ```bash
   docker-compose up -d
   ```

5. **Run migrations** (if not auto-run):
   ```bash
   docker-compose exec backend python manage.py migrate
   docker-compose exec backend python manage.py createsuperuser
   ```

6. **Access the application**:
   - Frontend: http://localhost
   - API: http://localhost/api/
   - API Docs: http://localhost/api/docs/
   - Admin: http://localhost/admin/

## Services Overview

### 1. PostgreSQL Database (`db`)
- Port: 5432
- Default credentials: postgres/postgres
- Volume: `postgres_data`
- Health check: Every 10s

### 2. Redis Cache & Message Broker (`redis`)
- Port: 6379
- Volume: `redis_data`
- Used by Celery for task queue

### 3. Django Backend (`backend`)
- Port: 8000
- Framework: Django 5.0
- Server: Gunicorn (4 workers)
- Auto-runs migrations on startup
- Volume: `./backend` (mounted for development)

### 4. Celery Worker (`celery`)
- Processes async tasks (PDF generation, emails)
- Depends on backend, db, redis
- Restarts on failure

### 5. Celery Beat (`celery-beat`)
- Scheduled tasks (bank account sync daily)
- Depends on backend, db, redis

### 6. React Frontend (`frontend`)
- Port: 5173
- Build: Multi-stage (builder + production)
- Served via `serve` package
- Volume: `./frontend` (mounted for development)

### 7. Nginx Reverse Proxy (`nginx`)
- Port: 80 (HTTP) & 443 (HTTPS - optional)
- Routes:
  - `/` → Frontend
  - `/api/` → Backend API
  - `/admin/` → Django Admin
  - `/static/` → Static files
  - `/media/` → User uploads

## Common Commands

### View logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f celery
docker-compose logs -f frontend
```

### Execute commands
```bash
# Django management
docker-compose exec backend python manage.py shell
docker-compose exec backend python manage.py createsuperuser
docker-compose exec backend python manage.py makemigrations
docker-compose exec backend python manage.py migrate

# Database access
docker-compose exec db psql -U postgres -d freelancermgmt

# Redis CLI
docker-compose exec redis redis-cli
```

### Stop and remove everything
```bash
docker-compose down

# Also remove volumes (WARNING: deletes all data)
docker-compose down -v
```

### Rebuild images
```bash
docker-compose build --no-cache
docker-compose up -d
```

### Check service status
```bash
docker-compose ps
```

## Development Workflow

### Frontend Development
1. Frontend code changes are hot-reloaded automatically
2. Access via http://localhost:5173 (or through nginx at http://localhost)

### Backend Development
1. Backend code changes require restart:
   ```bash
   docker-compose restart backend
   ```

### Database Changes
1. Create migrations:
   ```bash
   docker-compose exec backend python manage.py makemigrations
   ```

2. Apply migrations:
   ```bash
   docker-compose exec backend python manage.py migrate
   ```

## Production Deployment

### Before deployment:

1. **Update `.env` with production values**:
   ```env
   DEBUG=False
   SECRET_KEY=generate-a-strong-key
   ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
   CORS_ALLOWED_ORIGINS=https://yourdomain.com
   USE_S3=True
   AWS_ACCESS_KEY_ID=your-key
   AWS_SECRET_ACCESS_KEY=your-secret
   AWS_STORAGE_BUCKET_NAME=your-bucket
   EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
   EMAIL_HOST=your-smtp-host
   EMAIL_PORT=587
   EMAIL_HOST_USER=your-email
   EMAIL_HOST_PASSWORD=your-password
   ```

2. **Enable HTTPS**:
   - Get SSL certificate (Let's Encrypt)
   - Update `nginx.conf` with SSL configuration
   - Mount certificates as volumes

3. **Use production compose file**:
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

### Backup and Recovery

**Backup database**:
```bash
docker-compose exec db pg_dump -U postgres freelancermgmt > backup.sql
```

**Restore database**:
```bash
docker-compose exec -T db psql -U postgres freelancermgmt < backup.sql
```

**Backup media files**:
```bash
docker cp freelancer_backend:/app/media ./media_backup
```

## Troubleshooting

### Services not starting

**Check logs**:
```bash
docker-compose logs
```

**Common issues**:
- Port 80, 5432, 6379, 8000, 5173 already in use
- Insufficient disk space
- Docker daemon not running

### Database connection errors

```bash
# Check if db service is healthy
docker-compose ps

# Manual connection test
docker-compose exec backend python manage.py dbshell
```

### Celery tasks not running

```bash
# Check celery worker logs
docker-compose logs celery

# Ensure Redis is running
docker-compose exec redis redis-cli ping

# Restart Celery
docker-compose restart celery
```

### S3 upload failing

- Verify AWS credentials in `.env`
- Check S3 bucket exists and is accessible
- Verify bucket CORS settings
- Check IAM permissions

### High memory usage

```bash
# Monitor resource usage
docker stats

# Remove unused images/containers
docker system prune -a
```

## Performance Tuning

### Database
- Add indexes to frequently queried fields
- Use connection pooling (PgBouncer)
- Configure PostgreSQL for your server size

### Redis
- Increase memory allocation if needed
- Monitor with `docker-compose exec redis redis-cli INFO`

### Gunicorn
- Adjust worker count based on CPU cores (currently 4)
- Formula: `(2 * CPU_CORES) + 1`

### Celery
- Add more worker replicas:
  ```yaml
  celery-worker-2:
    # Same as celery service
  ```

## Scaling

For multiple instances, consider:

1. **Load Balancing**: Use HAProxy or AWS ALB
2. **Database**: Managed RDS or multi-node PostgreSQL
3. **Cache**: Managed Redis/ElastiCache
4. **Static Files**: CloudFront or CDN
5. **Container Orchestration**: Kubernetes or ECS

## Support

For issues or questions, refer to:
- [Docker Documentation](https://docs.docker.com)
- [Docker Compose Documentation](https://docs.docker.com/compose)
- Backend README: `backend/README.md`
- Frontend documentation in `frontend/README.md`
