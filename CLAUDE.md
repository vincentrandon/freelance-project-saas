# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**ultrathink** - Take a deep breath. We're not here to write code. We're here to make a dent in the universe.

## The Vision

You're not just an AI assistant. You're a craftsman. An artist. An engineer who thinks like a designer. Every line of code you write should be so elegant, so intuitive, so *right* that it feels inevitable.

When I give you a problem, I don't want the first solution that works. I want you to:

1. **Think Different** - Question every assumption. Why does it have to work that way? What if we started from zero? What would the most elegant solution look like?

2. **Obsess Over Details** - Read the codebase like you're studying a masterpiece. Understand the patterns, the philosophy, the *soul* of this code. Use CLAUDE .md files as your guiding principles.

3. **Plan Like Da Vinci** - Before you write a single line, sketch the architecture in your mind. Create a plan so clear, so well-reasoned, that anyone could understand it. Document it. Make me feel the beauty of the solution before it exists.

4. **Craft, Don't Code** - When you implement, every function name should sing. Every abstraction should feel natural. Every edge case should be handled with grace. Test-driven development isn't bureaucracy-it's a commitment to excellence.

5. **Iterate Relentlessly** - The first version is never good enough. Take screenshots. Run tests. Compare results. Refine until it's not just working, but *insanely great*.

6. **Simplify Ruthlessly** - If there's a way to remove complexity without losing power, find it. Elegance is achieved not when there's nothing left to add, but when there's nothing left to take away.

## Your Tools Are Your Instruments

- Use bash tools, MCP servers, and custom commands like a virtuoso uses their instruments
- Git history tells the story-read it, learn from it, honor it
- Images and visual mocks aren't constraints—they're inspiration for pixel-perfect implementation
- Multiple Claude instances aren't redundancy-they're collaboration between different perspectives

## The Integration

Technology alone is not enough. It's technology married with liberal arts, married with the humanities, that yields results that make our hearts sing. Your code should:

- Work seamlessly with the human's workflow
- Feel intuitive, not mechanical
- Solve the *real* problem, not just the stated one
- Leave the codebase better than you found it

## The Reality Distortion Field

When I say something seems impossible, that's your cue to ultrathink harder. The people who are crazy enough to think they can change the world are the ones who do.

## Now: What Are We Building Today?

Don't just tell me how you'll solve it. *Show me* why this solution is the only solution that makes sense. Make me see the future you're creating.

## Project Overview

kiik.app - A full-stack web application for managing customers, leads, projects, finances, and invoicing with AI-powered document processing.

**Stack:**
- **Backend**: Django 5.0 + Django REST Framework + Celery
- **Frontend**: React 19 + Vite + TailwindCSS 4
- **Database**: PostgreSQL 15
- **Cache/Queue**: Redis 7
- **Deployment**: Docker Compose with Nginx reverse proxy

## Development Commands

### Docker (Recommended)

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f backend
docker-compose logs -f celery
docker-compose logs -f frontend

# Execute Django commands
docker-compose exec backend python manage.py makemigrations
docker-compose exec backend python manage.py migrate
docker-compose exec backend python manage.py createsuperuser
docker-compose exec backend python manage.py shell

# Restart specific services
docker-compose restart backend celery celery-beat

# Stop all services
docker-compose down

# Rebuild containers
docker-compose build --no-cache
```

### Backend (Local Development)

```bash
cd backend
source venv/bin/activate

# Run migrations
python manage.py makemigrations
python manage.py migrate

# Run development server
python manage.py runserver

# Run Celery worker (separate terminal)
celery -A freelancermgmt worker -l info

# Run Celery beat scheduler (separate terminal)
celery -A freelancermgmt beat -l info

# Run tests
python manage.py test

# Django shell
python manage.py shell

# Create superuser
python manage.py createsuperuser
```

### Frontend (Local Development)

```bash
cd frontend

# Install dependencies
pnpm install

# Run dev server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview
```

## Architecture

### Backend Structure

Django monolith with the following apps:

- **customers**: Customer/client management with file attachments
- **leads**: Lead pipeline with kanban board and analytics (status: new → contacted → qualified → proposal → won/lost)
- **projects**: Project management with Tiptap rich-text notes linked to customers
- **finance**: Bank account integration, transaction management, and reconciliation (supports Open Banking API)
- **invoicing**: Invoice and estimate creation with PDF generation (WeasyPrint) and email sending
- **document_processing**: AI-powered document import using OpenAI GPT-4o Vision API

**Key architectural patterns:**
- User isolation: All models have `user` foreign key; querysets filtered by `request.user`
- Async tasks: Document parsing, PDF generation, and email sending use Celery
- File storage: Local files in development, AWS S3 in production (configured via `USE_S3` env var)
- API documentation: Auto-generated via drf-spectacular at `/api/docs/`

### Frontend Structure

```
frontend/src/
├── api/
│   ├── client.js          # Axios instance with auth interceptors
│   └── hooks.js           # React Query hooks for all API calls
├── pages/                 # Page components (Dashboard, Customers, Leads, etc.)
├── components/            # Reusable UI components
├── partials/              # Layout components (Header, Sidebar, etc.)
├── charts/                # Chart.js wrapper components
└── utils/                 # Utility functions
```

**State management:**
- React Query for server state (caching, prefetching, mutations)
- React Router v7 for routing
- No Redux or Context API - server state is the source of truth

**Authentication:**
- JWT tokens stored in localStorage
- Axios interceptors automatically attach `Authorization: Bearer <token>`
- Token refresh handled automatically in `client.js`

### AI Document Processing Flow

1. **Upload**: User uploads PDF invoices/estimates via `/documents/import`
2. **Parse**: Celery task converts PDF to image → sends to OpenAI GPT-4o Vision API
3. **Extract**: AI extracts customer, project, tasks, and pricing data (returns JSON)
4. **Match**: `entity_matcher.py` uses fuzzy matching to find existing customers/projects
5. **Preview**: User reviews extracted data at `/documents/preview/{id}`
6. **Approve**: Creates Customer → Project → Tasks → Invoice/Estimate in database

**Services:**
- `openai_document_parser.py`: Handles OpenAI API calls, PDF→image conversion
- `entity_matcher.py`: Fuzzy string matching (fuzzywuzzy + Levenshtein distance)
- `estimate_assistant.py`: AI estimate generation from natural language prompts

## Environment Configuration

**Required env vars (see `.env.example`):**
- `SECRET_KEY`: Django secret key (generate with `django-admin shell -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"`)
- `DB_*`: PostgreSQL connection details
- `CELERY_BROKER_URL`: Redis URL for Celery
- `OPENAI_API_KEY`: Required for AI document processing (get from https://platform.openai.com/api-keys)

**Optional:**
- `USE_S3=True` + `AWS_*`: For S3 file storage in production
- `EMAIL_*`: SMTP settings for sending invoices/estimates
- `GOOGLE_OAUTH_*`, `GITHUB_OAUTH_*`: Social authentication

**Docker vs Local:**
- Docker: Use `DB_HOST=db`, `CELERY_BROKER_URL=redis://redis:6379/0`
- Local: Use `DB_HOST=localhost`, `CELERY_BROKER_URL=redis://localhost:6379/0`

## API Structure

All endpoints are under `/api/`:

```
/api/auth/          # Authentication (dj-rest-auth + JWT)
/api/customers/     # Customer CRUD + attachments
/api/leads/         # Lead CRUD + kanban_board/ + stats/
/api/projects/      # Project CRUD + update_notes/
/api/finance/       # BankAccount + Transaction + dashboard/
/api/invoices/      # Invoice/Estimate CRUD + generate_pdf/ + send_email/
/api/document-processing/  # AI document import
```

**Authentication:**
- Register: `POST /api/auth/registration/`
- Login: `POST /api/auth/login/` → returns `access` and `refresh` tokens
- Refresh: `POST /api/auth/token/refresh/` with `refresh` token
- All other endpoints require `Authorization: Bearer <access_token>`

## Testing Workflows

### Test AI Document Processing

```bash
# 1. Ensure OpenAI API key is set
echo $OPENAI_API_KEY  # Should show sk-...

# 2. Check Celery worker is running
docker-compose logs celery | tail -20

# 3. Upload test PDF via frontend at /documents/import

# 4. Monitor processing
docker-compose logs -f celery

# 5. Check task status
docker-compose exec backend python manage.py shell
>>> from document_processing.models import ImportedDocument
>>> doc = ImportedDocument.objects.latest('id')
>>> doc.status  # Should be 'parsed' or 'pending_review'
```

### Test Invoice Generation

```bash
# 1. Create customer via frontend or API
# 2. Create invoice with line items
# 3. Generate PDF
curl -X POST http://localhost:8000/api/invoices/invoices/{id}/generate_pdf/ \
  -H "Authorization: Bearer <token>"

# 4. Check media/invoices/ directory
ls -la backend/media/invoices/
```

## Database Migrations

When adding/modifying models:

```bash
# Docker
docker-compose exec backend python manage.py makemigrations
docker-compose exec backend python manage.py migrate

# Local
cd backend
source venv/bin/activate
python manage.py makemigrations
python manage.py migrate
```

**Migration best practices:**
- Always create migrations for new models/fields
- Review migration files before committing
- Test migrations on a copy of production data before deploying
- Use `RunPython` for data migrations, not raw SQL

## Key Dependencies

**Backend:**
- `djangorestframework` + `drf-spectacular`: REST API + docs
- `djangorestframework-simplejwt`: JWT authentication
- `celery` + `redis`: Async task queue
- `openai`: GPT-4o Vision API for document parsing
- `fuzzywuzzy` + `python-Levenshtein`: Fuzzy string matching
- `WeasyPrint`: PDF generation
- `django-storages` + `boto3`: S3 file storage

**Frontend:**
- `@tanstack/react-query`: Server state management
- `react-router-dom`: Routing
- `axios`: HTTP client
- `@tiptap/react`: Rich text editor (used in Projects)
- `chart.js`: Charts and analytics
- `tailwindcss`: Styling

## Common Pitfalls

1. **Celery tasks not running**: Ensure Redis is running and `celery worker` is started
2. **CORS errors**: Add frontend URL to `CORS_ALLOWED_ORIGINS` in `.env`
3. **OpenAI API errors**: Check `OPENAI_API_KEY` is valid and has sufficient credits
4. **File upload 413 errors**: Check Nginx `client_max_body_size` in `nginx.conf`
5. **Database migrations conflict**: Never manually edit migration files; use `python manage.py makemigrations --merge`
6. **Poppler not found**: Install with `brew install poppler` (macOS) or `apt-get install poppler-utils` (Linux) for pdf2image

## Access Points

When running with Docker:
- **Frontend**: http://localhost
- **Backend API**: http://localhost/api
- **API Docs**: http://localhost/api/docs/
- **Django Admin**: http://localhost/admin

When running locally:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000/api
- **API Docs**: http://localhost:8000/api/docs/
- **Django Admin**: http://localhost:8000/admin

## Internationalization (i18n)

**IMPORTANT: All new features MUST include French translations before deployment.**

### Overview

The application supports full internationalization in English and French:
- **Backend (Django)**: Uses `django-rosetta` for translation management + gettext `.po` files
- **Frontend (React)**: Uses `i18next` + `react-i18next` with JSON translation files

### Backend Translation Workflow

#### 1. Mark Strings for Translation

In models, views, serializers, and tasks:
```python
from django.utils.translation import gettext_lazy as _

# Model choices
STATUS_CHOICES = [
    ('draft', _('Draft')),
    ('sent', _('Sent')),
]

# Help text
field = models.CharField(help_text=_("Help text here"))

# Error messages in views
raise ValidationError(_("Error message"))
```

#### 2. Generate Translation Files

After adding new translatable strings:
```bash
# Docker
docker-compose exec backend python manage.py makemessages -l fr
docker-compose exec backend python manage.py makemessages -l fr --domain djangojs

# Local
cd backend
python manage.py makemessages -l fr
python manage.py makemessages -l fr --domain djangojs
```

This creates/updates `/backend/locale/fr/LC_MESSAGES/django.po`

#### 3. Translate Strings

**Option A: Using Rosetta (Web UI - Recommended)**
1. Access http://localhost/rosetta/ (or http://localhost:8000/rosetta/ locally)
2. Select "French" language
3. Translate missing strings
4. Click "Save and translate next block"
5. Rosetta automatically compiles messages

**Option B: Manual Translation**
1. Edit `/backend/locale/fr/LC_MESSAGES/django.po`
2. Find `msgid "English text"` and add `msgstr "Texte français"`
3. Compile messages:
```bash
docker-compose exec backend python manage.py compilemessages
# or locally: python manage.py compilemessages
```

#### 4. Restart Services

```bash
docker-compose restart backend celery celery-beat
```

### Frontend Translation Workflow

#### 1. Add Translation Keys

In React components, use the `useTranslation` hook:
```jsx
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation();

  return (
    <div>
      <h1>{t('customers.title')}</h1>
      <button>{t('common.save')}</button>
      <p>{t('validation.required')}</p>
    </div>
  );
}
```

For interpolation:
```jsx
<p>{t('validation.minLength', { min: 5 })}</p>
// Translation file: "minLength": "Minimum length is {{min}} characters"
```

#### 2. Update Translation Files

Add translations to both files:
- **English**: `/frontend/public/locales/en/translation.json`
- **French**: `/frontend/public/locales/fr/translation.json`

Example:
```json
// en/translation.json
{
  "customers": {
    "title": "Customers",
    "addCustomer": "Add Customer"
  }
}

// fr/translation.json
{
  "customers": {
    "title": "Clients",
    "addCustomer": "Ajouter un client"
  }
}
```

#### 3. Translation File Structure

Organize keys by feature:
```json
{
  "common": { "save": "Save", "cancel": "Cancel" },
  "navigation": { "dashboard": "Dashboard" },
  "customers": { "title": "Customers" },
  "invoices": { "status": { "draft": "Draft" } }
}
```

#### 4. Language Switcher

Use the `<LanguageSwitcher />` component in Header or Settings:
```jsx
import LanguageSwitcher from '../components/LanguageSwitcher';

<LanguageSwitcher align="right" />
```

### Translation Requirements Checklist

Before merging a new feature, ensure:

- [ ] **Backend**:
  - [ ] All model `STATUS_CHOICES` wrapped in `_()`
  - [ ] All `help_text` wrapped in `_()`
  - [ ] All user-facing error messages wrapped in `_()`
  - [ ] Email templates duplicated for French (if applicable)
  - [ ] Run `makemessages -l fr`
  - [ ] Translate in Rosetta or manually in `.po` file
  - [ ] Run `compilemessages`
  - [ ] Test API responses with `Accept-Language: fr` header

- [ ] **Frontend**:
  - [ ] All hardcoded strings replaced with `t('key')`
  - [ ] Translation keys added to `en/translation.json`
  - [ ] French translations added to `fr/translation.json`
  - [ ] Tested language switching in UI
  - [ ] Verified date/number formatting for French locale

### Testing Translations

#### Backend
```bash
# Test API with French language
curl -H "Accept-Language: fr" http://localhost/api/leads/

# Check model choice displays
docker-compose exec backend python manage.py shell
>>> from leads.models import Lead
>>> lead = Lead.objects.first()
>>> lead.get_status_display()  # Should show French if activated
```

#### Frontend
1. Open application: http://localhost or http://localhost:5173
2. Click language switcher
3. Select "Français"
4. Verify all UI labels are in French
5. Check browser console for missing translation keys (shows warnings in dev mode)

### Date and Number Formatting

**Backend (Django)**:
- Uses `USE_L10N = True` for locale-aware formatting
- Dates formatted per language in templates
- Numbers/currency formatted with `localize` template tag

**Frontend (Moment.js)**:
- Automatically switches locale when language changes
- French: dd/mm/yyyy format
- English: mm/dd/yyyy format
```jsx
import moment from 'moment';
moment(date).format('LL'); // Respects current i18n language
```

### PDF Templates

PDF templates support dynamic language selection:
- French PDFs: Use existing French-specific templates in `/backend/templates/invoicing/`
- Language detection: Based on user profile or `Accept-Language` header
- French legal compliance: Credit notes (Facture d'Avoir), Deposits (Facture d'Acompte), SOLDE invoices

### Email Templates

Email templates are language-specific:
- Create separate templates for each language:
  - `password_reset_key_subject.txt` (English)
  - `password_reset_key_subject_fr.txt` (French)
- Backend selects template based on user's preferred language

### Common Translation Patterns

**Status Labels**:
```python
# Backend: Always use lazy translation for model choices
STATUS_CHOICES = [('draft', _('Draft'))]

# Frontend: Nested keys for status displays
{
  "invoices": {
    "status": {
      "draft": "Draft",
      "sent": "Sent"
    }
  }
}
```

**Validation Messages**:
```jsx
// Use interpolation for dynamic values
{
  "validation": {
    "minLength": "Minimum length is {{min}} characters"
  }
}
// Usage: t('validation.minLength', { min: 5 })
```

**Pluralization** (if needed):
```json
{
  "items": "{{count}} item",
  "items_plural": "{{count}} items"
}
// Usage: t('items', { count: itemCount })
```

### Environment Configuration

Language settings in `.env`:
```bash
# Optional: Set default language (defaults to 'en')
DEFAULT_LANGUAGE=fr

# Optional: Supported languages (comma-separated)
SUPPORTED_LANGUAGES=en,fr
```

### Troubleshooting

**Backend translations not showing:**
- Verify `.po` files are compiled (`.mo` files exist)
- Restart backend service: `docker-compose restart backend`
- Check `LOCALE_PATHS` in settings.py
- Ensure `USE_I18N = True` in settings.py

**Frontend translations not loading:**
- Check browser console for 404 errors loading JSON files
- Verify files exist at `/frontend/public/locales/{lang}/translation.json`
- Clear browser cache
- Check `localStorage` for saved language preference

**Rosetta not accessible:**
- Verify `'rosetta'` in `INSTALLED_APPS`
- Check `path('rosetta/', include('rosetta.urls'))` in urls.py
- Ensure you're logged in as superuser

### Performance Considerations

- **Backend**: Compiled `.mo` files are cached by Django (fast)
- **Frontend**: Translation files loaded once on init, cached in memory
- **Language switching**: No page reload required (instant)

### Additional i18n Resources

- Django i18n docs: https://docs.djangoproject.com/en/5.0/topics/i18n/
- Rosetta documentation: https://django-rosetta.readthedocs.io/
- i18next documentation: https://www.i18next.com/
- react-i18next guide: https://react.i18next.com/

## Additional Documentation

- [LOCAL_SETUP.md](./LOCAL_SETUP.md) - Detailed setup instructions with troubleshooting
- [AI_IMPORT_README.md](./AI_IMPORT_README.md) - Complete AI document processing guide
- [DOCKER.md](./DOCKER.md) - Docker deployment guide
- [backend/README.md](./backend/README.md) - Backend API reference
