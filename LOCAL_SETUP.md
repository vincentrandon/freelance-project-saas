# Local Development Setup Guide

## 🚀 Quick Start (15 minutes)

### Prerequisites
- Python 3.11+
- Node.js 20+
- PostgreSQL 15+ (or use Docker)
- Redis 7+ (or use Docker)

---

## Option 1: Run Everything with Docker (Recommended ⭐)

### Step 1: Create Environment File
```bash
cd /Users/vincent/Documents/freelancetool
```

Create `.env` file in project root:
```env
# Django Settings
DEBUG=True
SECRET_KEY=django-insecure-dev-key-change-in-production
ALLOWED_HOSTS=localhost,127.0.0.1

# Database
DB_NAME=freelancermgmt
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=db
DB_PORT=5432

# Redis/Celery
CELERY_BROKER_URL=redis://redis:6379/0
CELERY_RESULT_BACKEND=redis://redis:6379/0
REDIS_URL=redis://redis:6379/0

# CORS
CORS_ALLOWED_ORIGINS=http://localhost,http://127.0.0.1,http://localhost:5173,http://localhost:3000

# File Storage (S3 - optional)
USE_S3=False
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_STORAGE_BUCKET_NAME=

# Email (Console output by default)
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend

# Frontend API URL
VITE_API_URL=http://localhost/api
```

### Step 2: Start Docker Compose
```bash
docker-compose up -d
```

This starts:
- PostgreSQL database
- Redis cache
- Django backend (port 8000)
- Celery worker
- Celery beat
- React frontend (port 5173)
- Nginx proxy (port 80)

### Step 3: Create Superuser (Optional)
```bash
docker-compose exec backend python manage.py createsuperuser
```

### Step 4: Access the Application
- **Frontend**: http://localhost
- **API Docs**: http://localhost/api/docs/
- **Admin Panel**: http://localhost/admin/ (use superuser credentials)

### Step 5: Stop Services
```bash
docker-compose down
```

---

## Option 2: Local Development (Separate Terminals)

### Prerequisites
```bash
# Install Homebrew packages (macOS)
brew install python@3.11 postgresql redis node@20

# Start PostgreSQL
brew services start postgresql

# Start Redis
brew services start redis
```

### Backend Setup (Terminal 1)

```bash
cd /Users/vincent/Documents/freelancetool/backend

# Create virtual environment
python3.11 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create database
python manage.py makemigrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Run development server
python manage.py runserver
```

**Backend running at**: http://localhost:8000

### Celery Worker (Terminal 2)

```bash
cd /Users/vincent/Documents/freelancetool/backend
source venv/bin/activate

# Start Celery worker
celery -A freelancermgmt worker -l info
```

### Celery Beat (Terminal 3)

```bash
cd /Users/vincent/Documents/freelancetool/backend
source venv/bin/activate

# Start Celery beat
celery -A freelancermgmt beat -l info
```

### Frontend Setup (Terminal 4)

```bash
cd /Users/vincent/Documents/freelancetool/frontend

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

**Frontend running at**: http://localhost:5173

### Access the App
- Open http://localhost:5173 in your browser
- Sign up for a new account
- Start using the app!

---

## 🔧 Useful Commands

### Backend Commands

```bash
# Activate virtual environment
cd backend
source venv/bin/activate

# Run migrations
python manage.py migrate

# Create new migration
python manage.py makemigrations

# Create superuser
python manage.py createsuperuser

# Run Django shell
python manage.py shell

# Collect static files
python manage.py collectstatic

# Run tests
python manage.py test

# Check for security issues
python manage.py check --deploy
```

### Database Commands

```bash
# Access PostgreSQL
psql -U postgres freelancermgmt

# Common SQL commands
\dt                    # List tables
\d table_name          # Describe table
SELECT * FROM users;   # Query data
```

### Docker Commands

```bash
# View logs
docker-compose logs -f backend      # Backend logs
docker-compose logs -f frontend     # Frontend logs
docker-compose logs -f db           # Database logs

# Execute command in container
docker-compose exec backend python manage.py migrate
docker-compose exec backend python manage.py shell

# Restart services
docker-compose restart backend
docker-compose restart frontend

# Stop all services
docker-compose down

# Remove volumes (WARNING: Deletes data)
docker-compose down -v

# Rebuild containers
docker-compose build --no-cache
```

### Frontend Commands

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview

# Format code
pnpm format

# Check linting
pnpm lint
```

---

## 🗄️ Database Management

### Reset Database (Local)

```bash
# Option 1: Django command
python manage.py flush

# Option 2: Drop all and recreate
dropdb freelancermgmt
createdb freelancermgmt
python manage.py migrate
python manage.py createsuperuser
```

### Reset Database (Docker)

```bash
# Remove database volume
docker-compose down -v

# Start fresh
docker-compose up -d backend
docker-compose exec backend python manage.py createsuperuser
```

---

## 📝 API Documentation

### Access Swagger/OpenAPI Docs

**Local**: http://localhost:8000/api/schema/swagger-ui/

### Key Endpoints

```
# Authentication
POST   /api/auth/login/
POST   /api/auth/registration/
POST   /api/auth/logout/
POST   /api/auth/token/refresh/

# Customers
GET    /api/customers/
POST   /api/customers/
GET    /api/customers/{id}/
PUT    /api/customers/{id}/
DELETE /api/customers/{id}/

# Leads
GET    /api/leads/
POST   /api/leads/
GET    /api/leads/kanban_board/
GET    /api/leads/stats/
PATCH  /api/leads/{id}/update_status/

# Projects
GET    /api/projects/
POST   /api/projects/
PUT    /api/projects/{id}/update_notes/

# Finance
GET    /api/finance/accounts/
GET    /api/finance/transactions/
GET    /api/finance/transactions/dashboard/
PATCH  /api/finance/transactions/{id}/reconcile/

# Invoicing
GET    /api/invoices/invoices/
POST   /api/invoices/invoices/
POST   /api/invoices/invoices/{id}/send_email/
PATCH  /api/invoices/invoices/{id}/mark_paid/
GET    /api/invoices/estimates/
POST   /api/invoices/estimates/
```

---

## 🐛 Troubleshooting

### Port Already in Use

```bash
# Find process using port 8000
lsof -i :8000

# Find process using port 5173
lsof -i :5173

# Kill process
kill -9 <PID>
```

### Database Connection Error

```bash
# Check PostgreSQL is running
brew services list

# Start PostgreSQL if needed
brew services start postgresql

# Test connection
psql -U postgres freelancermgmt
```

### Redis Connection Error

```bash
# Check Redis is running
brew services list

# Start Redis if needed
brew services start redis

# Test connection
redis-cli ping
```

### Module Not Found Errors

```bash
# Backend
cd backend
source venv/bin/activate
pip install -r requirements.txt

# Frontend
cd frontend
pnpm install
```

### Frontend Not Connecting to Backend

Check `.env` file has correct API URL:
```env
VITE_API_URL=http://localhost/api  # For Docker
VITE_API_URL=http://localhost:8000/api  # For local development
```

### Database Migration Issues

```bash
# Reset migrations
python manage.py migrate zero <app_name>

# Recreate migrations
python manage.py makemigrations
python manage.py migrate
```

---

## 🔐 Security Notes

### Development Only
- `SECRET_KEY` should be changed in production
- `DEBUG=True` should be `False` in production
- Use strong `DB_PASSWORD` in production
- Configure `ALLOWED_HOSTS` for production domain

### Environment Variables
Never commit `.env` file to git!

---

## 📊 Project Structure Reference

```
freelancetool/
├── backend/
│   ├── venv/                       # Virtual environment
│   ├── freelancermgmt/             # Django project settings
│   ├── customers/                  # Customer app
│   ├── leads/                      # Lead app (kanban)
│   ├── projects/                   # Project app (Tiptap)
│   ├── finance/                    # Finance app
│   ├── invoicing/                  # Invoice app
│   ├── manage.py                   # Django CLI
│   ├── requirements.txt            # Python dependencies
│   └── Dockerfile                  # Docker image
│
├── frontend/
│   ├── node_modules/               # NPM packages
│   ├── src/
│   │   ├── api/                    # API client & hooks
│   │   ├── pages/                  # React pages
│   │   ├── components/             # Reusable components
│   │   ├── partials/               # Layout partials
│   │   └── main.jsx                # Entry point
│   ├── package.json                # NPM dependencies
│   ├── pnpm-lock.yaml              # Lockfile
│   ├── vite.config.js              # Vite config
│   └── Dockerfile                  # Docker image
│
├── docker-compose.yml              # Docker services
├── nginx.conf                      # Reverse proxy
└── .env                            # Environment variables
```

---

## 🚀 Next Steps

1. **Create test data**: Sign up and create customers, leads, projects
2. **Configure email**: Set up SendGrid/Mailgun for real email sending
3. **Add S3 storage**: Configure AWS credentials for file uploads
4. **Deploy**: Use Docker to deploy to production (AWS, DigitalOcean, Heroku)
5. **Monitor**: Set up Sentry for error tracking

---

## 📞 Support

For issues or questions:
1. Check the troubleshooting section above
2. Review backend `README.md` in `/backend`
3. Check `DOCKER.md` for Docker-specific issues
4. Review API logs: `docker-compose logs -f backend`
5. Review frontend console: Browser DevTools → Console

---

## ✅ Verification Checklist

After setup, verify everything works:

- [ ] Backend API accessible at http://localhost:8000
- [ ] Frontend accessible at http://localhost:5173 (or http://localhost with Docker)
- [ ] Can sign up for new account
- [ ] Can log in
- [ ] Can create customers
- [ ] Can create leads
- [ ] Can create projects
- [ ] Can view finance dashboard
- [ ] Can create invoices
- [ ] Database migrations ran successfully
- [ ] No errors in console/logs

All set! Happy coding! 🎉
