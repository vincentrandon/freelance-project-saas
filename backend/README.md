# kiik.app - Backend

Django REST API for managing customers, leads, projects, finances, and invoicing.

## Features

- **Customer Management**: Track clients with attachments and contact info
- **Lead Pipeline**: Kanban-style lead management with status tracking and pipeline analytics
- **Project Management**: Link projects to customers with Tiptap-based rich text notes
- **Financial Management**: Bank account integration via Open Banking API, transaction reconciliation
- **Invoicing**: Create, send, and track invoices and estimates with PDF generation
- **Authentication**: JWT-based auth with OAuth2 social login (Google, GitHub)
- **Admin Interface**: Full Django admin for easy management

## Tech Stack

- **Framework**: Django 5.0
- **API**: Django REST Framework
- **Database**: PostgreSQL
- **Task Queue**: Celery + Redis
- **Storage**: AWS S3
- **PDF Generation**: WeasyPrint
- **Email**: Django Email Framework
- **API Docs**: drf-spectacular (Swagger/OpenAPI)

## Installation

### Prerequisites

- Python 3.11+
- PostgreSQL 12+
- Redis
- virtualenv (recommended)

### Setup

1. **Create virtual environment**:
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

4. **Database setup**:
   ```bash
   python manage.py migrate
   python manage.py createsuperuser
   ```

5. **Load initial data** (optional):
   ```bash
   python manage.py loaddata initial_data
   ```

## Running the Server

### Development

```bash
# Run Django development server
python manage.py runserver

# Run Celery worker (in separate terminal)
celery -A freelancermgmt worker -l info

# Run Celery beat (scheduled tasks)
celery -A freelancermgmt beat -l info
```

### Production

```bash
gunicorn freelancermgmt.wsgi:application --bind 0.0.0.0:8000
```

## API Documentation

- **Swagger UI**: http://localhost:8000/api/docs/
- **ReDoc**: http://localhost:8000/api/schema/
- **OpenAPI Schema**: http://localhost:8000/api/schema.json

## API Endpoints

### Authentication
- `POST /api/auth/register/` - Register new user
- `POST /api/auth/login/` - Login with email/password
- `POST /api/auth/logout/` - Logout
- `POST /api/auth/token/refresh/` - Refresh JWT token
- `POST /api/auth/social/google/` - Google OAuth login
- `POST /api/auth/social/github/` - GitHub OAuth login

### Customers
- `GET /api/customers/` - List customers
- `POST /api/customers/` - Create customer
- `GET /api/customers/{id}/` - Get customer details
- `PUT /api/customers/{id}/` - Update customer
- `DELETE /api/customers/{id}/` - Delete customer
- `POST /api/customers/{id}/upload_attachment/` - Upload attachment
- `GET /api/customers/{id}/attachments/` - List attachments
- `DELETE /api/attachments/{id}/` - Delete attachment

### Leads
- `GET /api/leads/` - List leads
- `POST /api/leads/` - Create lead
- `GET /api/leads/{id}/` - Get lead details
- `PATCH /api/leads/{id}/update_status/` - Update lead status
- `GET /api/leads/kanban_board/` - Get kanban board view
- `GET /api/leads/stats/` - Get pipeline statistics

### Projects
- `GET /api/projects/` - List projects
- `POST /api/projects/` - Create project
- `GET /api/projects/{id}/` - Get project details
- `PUT /api/projects/{id}/update_notes/` - Update Tiptap notes
- `GET /api/projects/by_customer/?customer_id=1` - Get projects for customer
- `GET /api/projects/active/` - Get active projects

### Finance
- `GET /api/finance/accounts/` - List bank accounts
- `POST /api/finance/accounts/` - Create bank account
- `POST /api/finance/accounts/{id}/sync/` - Sync transactions
- `GET /api/finance/transactions/` - List transactions
- `PATCH /api/finance/transactions/{id}/reconcile/` - Reconcile transaction
- `GET /api/finance/transactions/unreconciled/` - Get unreconciled transactions
- `GET /api/finance/transactions/dashboard/` - Financial dashboard

### Invoicing
- `GET /api/invoices/invoices/` - List invoices
- `POST /api/invoices/invoices/` - Create invoice
- `POST /api/invoices/invoices/{id}/generate_pdf/` - Generate PDF
- `POST /api/invoices/invoices/{id}/send_email/` - Send invoice email
- `PATCH /api/invoices/invoices/{id}/mark_paid/` - Mark invoice as paid
- `GET /api/invoices/invoices/overdue/` - Get overdue invoices
- `GET /api/invoices/invoices/stats/` - Invoice statistics
- `GET /api/invoices/estimates/` - List estimates
- `POST /api/invoices/estimates/` - Create estimate
- `POST /api/invoices/estimates/{id}/generate_pdf/` - Generate PDF
- `POST /api/invoices/estimates/{id}/send_email/` - Send estimate email
- `GET /api/invoices/estimates/expired/` - Get expired estimates

### AI Actions (OpenAI App Integration)
All endpoints live under `POST /api/ai-actions/...` and require an AI service token.

Context (read-only, scope `context:*`):
- `GET /api/ai-actions/context/` – Dashboard counts
- `GET /api/ai-actions/context/customers/` – Recent customers (`context:customers`)
- `GET /api/ai-actions/context/projects/` – Recent projects (`context:projects`)
- `GET /api/ai-actions/context/estimates/` – Recent estimates (`context:estimates`)
- `GET /api/ai-actions/context/invoices/` – Recent invoices (`context:invoices`)
- `GET /api/ai-actions/context/cras/` – Recent CRA summaries (`context:cras`)

Mutations (scope `actions:*`):
- `POST /api/ai-actions/actions/customers/` – Create customer (`actions:customers.create`)
- `POST /api/ai-actions/actions/estimates/` – Create estimate draft (`actions:estimates.create`)
- `POST /api/ai-actions/actions/invoices/` – Create invoice (`actions:invoices.create`)
- `POST /api/ai-actions/actions/cras/` – Create CRA (`actions:cra.create`)
- `POST /api/ai-actions/actions/import-customer/` – Approve import preview and create entities (`actions:customers.import`)

Token provisioning:
1. Create an `AIServiceToken` from Django admin (AI Actions → AI Service Tokens) or via shell.
2. Call `token.set_token(raw_value)` before saving; share the raw value with OpenAI once.
3. Assign only the scopes the OpenAI App should access (see list above). Tokens can be revoked or rotated at any time.

For OpenAI Apps, include the raw token in requests via `Authorization: Bearer <token>` or `X-AI-Service-Token: <token>`.

## Database Models

### Customers
- `Customer`: Client information
- `Attachment`: Files linked to customers

### Leads
- `Lead`: Potential client leads with pipeline status

### Projects
- `Project`: Client projects with rich text notes

### Finance
- `BankAccount`: Connected bank accounts
- `Transaction`: Bank transactions with reconciliation

### Invoicing
- `Invoice`: Client invoices
- `Estimate`: Client estimates/quotes

## Environment Variables

See `.env.example` for all available configuration options.

Key variables:
- `SECRET_KEY`: Django secret key (generate with `django-admin shell -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"`)
- `DEBUG`: Set to `False` in production
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `CELERY_BROKER_URL`: Redis URL for Celery
- `AWS_*`: AWS S3 credentials
- `OPENBANKING_*`: Open Banking API credentials
- `GOOGLE_OAUTH_*`: Google OAuth credentials
- `GITHUB_OAUTH_*`: GitHub OAuth credentials

## Development

### Create migrations
```bash
python manage.py makemigrations
python manage.py migrate
```

### Run tests
```bash
pytest
```

### Format code
```bash
black .
flake8 .
```

## Docker

See `docker-compose.yml` for containerized setup.

```bash
docker-compose -f docker-compose.yml up
```

## Troubleshooting

### Celery Tasks Not Running
- Ensure Redis is running: `redis-cli ping`
- Check Celery worker logs

### Database Connection Issues
- Verify PostgreSQL is running
- Check `DATABASE_URL` in `.env`
- Run migrations: `python manage.py migrate`

### S3 Upload Issues
- Verify AWS credentials in `.env`
- Check S3 bucket permissions
- Enable CORS for frontend domain

## Support

For issues or questions, please contact the development team.
