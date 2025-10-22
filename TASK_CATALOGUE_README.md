# Task Catalogue System - Complete Guide

## Overview

The Task Catalogue is a powerful feature that learns from every AI-imported invoice/estimate and manual task creation to build an intelligent library of reusable task templates. This enables:

- **Accurate Time Estimates**: Leverages historical data to suggest realistic time estimates
- **Faster Estimate Creation**: Reuse common tasks instead of creating from scratch
- **Improved Pricing Consistency**: Track average rates and maintain consistent pricing
- **Learning Over Time**: System gets smarter with each project completed

---

## What's New

### Backend Enhancements

#### 1. **New Database Models**

**TaskTemplate Model** (`projects/models.py`)
- Stores reusable task templates with historical data
- Fields:
  - `name`, `description`, `category`, `tags`
  - `average_estimated_hours`, `min_hours`, `max_hours`, `average_actual_hours`
  - `average_hourly_rate`
  - `usage_count`, `last_used_at`
  - `confidence_score` (0-100, based on estimate accuracy)
  - `created_from` (manual, ai_import, task_conversion)

**TaskHistory Model** (`projects/models.py`)
- Tracks every task creation and completion
- Links tasks to templates for analytics
- Records variance between estimated and actual hours

**Enhanced Task Model**
- New field: `template` (FK to TaskTemplate)
- New property: `variance_percentage`
- Auto-updates template statistics when task is completed

#### 2. **AI Model Upgrade**

**GPT-5 Integration** (`.env` and `settings.py`)
- Upgraded from GPT-4o to GPT-5
- Better task extraction and time estimation
- New `reasoning_effort` parameter (minimal, low, medium, high)
- Increased max_tokens from 4000 to 6000 for better extraction

#### 3. **Enhanced AI Prompts**

**Document Parser** (`document_processing/services/openai_document_parser.py`)
- **REQUIRED time estimation**: AI must provide `estimated_hours` for every task
- **Intelligent inference**: Calculates hours from amounts if not explicitly stated
- **Task categorization**: Auto-categorizes tasks (development, design, testing, etc.)
- **Better hourly rate calculation**: Derives rates from TJM or reverse-calculates from amounts
- **Quality estimation tips**: 20% buffer, realistic rounding

#### 4. **Task Catalogue Service**

**New Service** (`projects/services/task_catalogue_service.py`)

Key Features:
- **Fuzzy Matching**: Finds similar tasks using fuzzywuzzy (80%+ match threshold)
- **Auto-Cataloguing**: Automatically saves AI-imported tasks to catalogue
- **Auto-Categorization**: Uses keyword matching to categorize tasks
- **Tag Extraction**: Extracts technology/domain tags from task descriptions
- **Template Suggestions**: Suggests relevant tasks based on project description
- **Analytics**: Provides insights into most used tasks, category distribution, etc.

Main Methods:
```python
service = TaskCatalogueService(user)

# Find similar templates
results = service.find_similar_templates(
    task_name="API integration",
    category="development",
    limit=5
)

# Create or update template
template, created = service.create_or_update_template_from_task(
    task_name="User authentication",
    estimated_hours=12,
    hourly_rate=75,
    category="development",
    tags=["react", "api"]
)

# Get suggestions for a project
suggestions = service.suggest_tasks_for_project(
    project_description="Build e-commerce platform with React and Django"
)
```

#### 5. **New API Endpoints**

**Task Catalogue API** (`/api/projects/task-catalogue/`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/projects/task-catalogue/` | GET | List all task templates |
| `/api/projects/task-catalogue/` | POST | Create new template manually |
| `/api/projects/task-catalogue/{id}/` | GET/PUT/PATCH/DELETE | CRUD operations |
| `/api/projects/task-catalogue/search/` | GET | Search with fuzzy matching (`?q=api&category=development`) |
| `/api/projects/task-catalogue/suggest/` | POST | Get task suggestions for a project |
| `/api/projects/task-catalogue/analytics/` | GET | Get catalogue statistics |
| `/api/projects/task-catalogue/from_task/` | POST | Create template from task data |
| `/api/projects/task-catalogue/{id}/use_template/` | POST | Create task from template |
| `/api/projects/task-catalogue/{id}/deactivate/` | DELETE | Soft delete template |
| `/api/projects/task-catalogue/{id}/activate/` | POST | Reactivate template |

**Task History API** (`/api/projects/task-history/`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/projects/task-history/` | GET | List task history |
| `/api/projects/task-history/accuracy_report/` | GET | Get estimation accuracy report |

#### 6. **Automatic Catalogue Population**

**AI Import Enhancement** (`document_processing/tasks.py`)

When you import an invoice/estimate:
1. AI extracts tasks with time estimates and categories
2. Each task is automatically:
   - Matched against existing templates (fuzzy matching)
   - If similar template exists (90%+ match): Updates template statistics
   - If new: Creates new template in catalogue
   - Linked to the template via `task.template` field
   - History entry created for tracking

**Benefits**:
- No manual work required
- Catalogue grows automatically with every import
- Time estimates improve over time
- Consistent categorization and tagging

---

## How It Works

### Workflow: AI Import → Catalogue → Reuse

```
1. Upload Invoice/Estimate PDF
   ↓
2. GPT-5 Extracts Tasks
   - Name: "API Integration"
   - Category: "development"
   - Estimated Hours: 16
   - Hourly Rate: €75
   ↓
3. Task Catalogue Service
   - Fuzzy match against existing templates
   - If match ≥90%: Update template stats
   - If match <90%: Create new template
   ↓
4. Template Saved
   - TaskTemplate created with historical data
   - TaskHistory entry logged
   - Task linked to template
   ↓
5. Next Time You Create Estimate
   - Search: "API" → Shows "API Integration" template
   - Usage: 5 times
   - Avg Time: 14.5 hours
   - Confidence: 85%
   - Click to add to estimate!
```

### Confidence Scoring

Templates build confidence over time:
- **Initial**: 50% (new template, no data)
- **After completion**: Accuracy-based scoring
  - If estimated=10h, actual=11h → 90% accuracy → Confidence increases
  - If estimated=10h, actual=20h → 50% accuracy → Confidence decreases
- **Formula**: Weighted average (70% existing + 30% new data)

**High Confidence (75%+)**: Trust these estimates
**Medium Confidence (50-75%)**: Good baseline, adjust if needed
**Low Confidence (<50%)**: Use with caution, may need buffer

---

## Task Categories

The system auto-categorizes tasks based on keywords:

| Category | Keywords |
|----------|----------|
| **Development** | develop, code, program, implement, api, backend, frontend, feature, bug, fix |
| **Design** | design, ui, ux, mockup, wireframe, prototype, graphic, logo, branding |
| **Testing** | test, qa, quality, validation, verify, debug |
| **Deployment** | deploy, release, publish, launch, production, server, hosting |
| **Consulting** | consult, advice, strategy, plan, meeting, review, analysis |
| **Documentation** | document, doc, write, manual, guide, readme, wiki |
| **Maintenance** | maintain, update, upgrade, patch, support, monitoring |
| **Research** | research, investigate, explore, study, analysis, poc |
| **Other** | Everything else |

---

## Usage Examples

### Example 1: Search for Similar Tasks

**API Request:**
```bash
GET /api/projects/task-catalogue/search/?q=authentication&limit=5
```

**Response:**
```json
{
  "query": "authentication",
  "results": [
    {
      "id": 42,
      "name": "User authentication with OAuth",
      "category": "development",
      "average_estimated_hours": 12.5,
      "average_hourly_rate": 75.0,
      "usage_count": 8,
      "confidence_score": 82.5,
      "match_score": 95,
      "match_type": "exact"
    },
    {
      "id": 51,
      "name": "Authentication API endpoints",
      "category": "development",
      "average_estimated_hours": 8.0,
      "average_hourly_rate": 70.0,
      "usage_count": 3,
      "confidence_score": 68.0,
      "match_score": 87,
      "match_type": "fuzzy"
    }
  ],
  "count": 2
}
```

### Example 2: Get Project Suggestions

**API Request:**
```bash
POST /api/projects/task-catalogue/suggest/
Content-Type: application/json

{
  "project_description": "Build a React dashboard with user management, analytics, and reporting features",
  "limit": 5
}
```

**Response:**
```json
{
  "project_description": "Build a React dashboard with user management...",
  "suggestions": [
    {
      "id": 12,
      "name": "React Dashboard UI",
      "average_estimated_hours": 24.0,
      "relevance_score": 78,
      "matching_keywords": ["react", "dashboard", "ui"]
    },
    {
      "id": 42,
      "name": "User authentication with OAuth",
      "average_estimated_hours": 12.5,
      "relevance_score": 65,
      "matching_keywords": ["user", "management"]
    },
    {
      "id": 67,
      "name": "Analytics data visualization",
      "average_estimated_hours": 16.0,
      "relevance_score": 72,
      "matching_keywords": ["analytics", "reporting"]
    }
  ],
  "count": 3
}
```

### Example 3: Create Template Manually

**API Request:**
```bash
POST /api/projects/task-catalogue/from_task/
Content-Type: application/json

{
  "task_name": "Database migration script",
  "task_description": "Write Python script to migrate data from MySQL to PostgreSQL",
  "estimated_hours": 8,
  "hourly_rate": 70,
  "category": "development",
  "tags": ["python", "database", "migration"]
}
```

**Response:**
```json
{
  "template": {
    "id": 89,
    "name": "Database migration script",
    "description": "Write Python script to migrate data from MySQL to PostgreSQL",
    "category": "development",
    "tags": ["python", "database", "migration"],
    "average_estimated_hours": 8.0,
    "average_hourly_rate": 70.0,
    "usage_count": 1,
    "confidence_score": 50.0,
    "created_from": "manual"
  },
  "created": true,
  "message": "Template created successfully"
}
```

### Example 4: Use Template in Estimate

**API Request:**
```bash
POST /api/projects/task-catalogue/89/use_template/
Content-Type: application/json

{
  "project_id": 15,
  "adjust_hours": 10,
  "adjust_rate": 75
}
```

**Response:**
```json
{
  "task": {
    "id": 456,
    "project": 15,
    "template": 89,
    "name": "Database migration script",
    "estimated_hours": 10.0,
    "hourly_rate": 75.0,
    "status": "todo"
  },
  "message": "Task created from template successfully"
}
```

---

## Analytics & Insights

### Catalogue Analytics Endpoint

**API Request:**
```bash
GET /api/projects/task-catalogue/analytics/
```

**Response:**
```json
{
  "total_templates": 156,
  "total_usage": 842,
  "average_confidence": 71.5,
  "high_confidence_templates": 64,
  "category_distribution": [
    {
      "category": "development",
      "count": 89,
      "avg_hours": 15.2,
      "avg_rate": 72.5
    },
    {
      "category": "design",
      "count": 34,
      "avg_hours": 8.5,
      "avg_rate": 65.0
    }
  ],
  "most_used_templates": [
    {
      "name": "API Integration",
      "usage_count": 42,
      "average_estimated_hours": 14.5,
      "confidence_score": 85.2
    }
  ],
  "recent_templates": [...]
}
```

### Accuracy Report

**API Request:**
```bash
GET /api/projects/task-history/accuracy_report/
```

**Response:**
```json
{
  "statistics": {
    "total_completed_tasks": 215,
    "average_variance": 12.5,
    "underestimated_count": 98,
    "overestimated_count": 87,
    "accurate_count": 30
  },
  "worst_estimates": [
    {
      "task_name": "Complex integration",
      "estimated_hours": 10,
      "actual_hours": 25,
      "variance_percentage": 150.0
    }
  ],
  "best_estimates": [...]
}
```

---

## Configuration

### Environment Variables

Update your `.env` file:

```bash
# OpenAI Settings - GPT-5 Configuration
OPENAI_API_KEY=sk-your-api-key-here
OPENAI_MODEL=gpt-5                    # Or gpt-5-mini for faster/cheaper
OPENAI_MAX_TOKENS=6000                # Increased from 4000
OPENAI_TEMPERATURE=0.1
OPENAI_REASONING_EFFORT=medium        # minimal, low, medium, high
```

**Model Options:**
- `gpt-5`: Best quality, slower, more expensive
- `gpt-5-mini`: Fast and cheap, good for simple tasks
- `gpt-4o`: Fallback if GPT-5 is unavailable

**Reasoning Effort** (GPT-5 only):
- `minimal`: Fastest, basic reasoning
- `low`: Good balance
- `medium`: Recommended (default)
- `high`: Thorough analysis, slower

---

## Database Migrations

Already applied! But if you need to re-run:

```bash
docker-compose exec backend python manage.py makemigrations projects
docker-compose exec backend python manage.py migrate projects
```

**Migration includes:**
- TaskTemplate model
- TaskHistory model
- Task.template field (nullable FK)
- Indexes for performance
- Unique constraint on (user, name) for templates

---

## Admin Interface

New admin panels available at `/admin`:

- **Task Templates**: View/edit/delete templates
  - Filter by category, source, active status
  - Search by name, description, tags
  - View usage statistics and confidence scores

- **Task History**: Track all task creations
  - Filter by source type, template
  - Search by task name, project, customer
  - View variance analysis

- **Enhanced Tasks**: Now shows template linkage

---

## Best Practices

### 1. **Let the System Learn**
- Import all past invoices/estimates to build historical data
- Don't delete templates unless truly irrelevant
- Complete tasks with actual hours for better accuracy

### 2. **Use Consistent Naming**
- "API Integration" not "api int" or "Api Integration"
- Helps fuzzy matching work better
- System learns your naming conventions

### 3. **Review Suggestions**
- AI suggestions are smart but not perfect
- Adjust time estimates based on project specifics
- System learns from your adjustments

### 4. **Categorize Properly**
- Auto-categorization is good, but manual review helps
- Consistent categories improve search and analytics

### 5. **Monitor Confidence Scores**
- High confidence (>75%): Trust these estimates
- Low confidence (<50%): Add extra buffer or revise

---

## Roadmap / Future Enhancements

Potential additions (not yet implemented):

- [ ] **Smart Task Bundling**: Recognize common task patterns (e.g., "E-commerce project" → suggest 15 typical tasks)
- [ ] **Machine Learning**: Use ML to predict time based on task text
- [ ] **Team Sharing**: Share templates across team members
- [ ] **Industry Templates**: Import standard task libraries
- [ ] **Seasonal Adjustments**: Factor in time of year, team size, etc.
- [ ] **Client-Specific Templates**: Track which tasks are common for specific clients
- [ ] **Dependency Tracking**: Link tasks that typically go together

---

## Troubleshooting

### Issue: Tasks not appearing in catalogue after AI import

**Solution:**
1. Check Celery worker is running: `docker-compose logs celery`
2. Check for errors in task creation
3. Verify template was created: Check `/admin` → Task Templates

### Issue: GPT-5 API errors

**Solution:**
1. Verify API key is valid
2. Check OpenAI credits
3. Fallback to GPT-4o: Change `OPENAI_MODEL=gpt-4o` in `.env`

### Issue: Fuzzy matching not working well

**Solution:**
1. Check threshold: Default is 80%, can be adjusted in `task_catalogue_service.py`
2. Use more consistent naming conventions
3. Manual cleanup: Merge similar templates in admin

### Issue: Confidence scores seem wrong

**Solution:**
1. Ensure tasks are being marked as "completed" with actual hours
2. Check variance calculations in `/admin` → Task History
3. System needs at least 3-5 completions per template for accurate confidence

---

## API Reference Summary

### Task Catalogue Endpoints

```
GET    /api/projects/task-catalogue/                     # List templates
POST   /api/projects/task-catalogue/                     # Create template
GET    /api/projects/task-catalogue/{id}/                # Get template
PUT    /api/projects/task-catalogue/{id}/                # Update template
DELETE /api/projects/task-catalogue/{id}/                # Delete template

GET    /api/projects/task-catalogue/search/              # Search with fuzzy match
       ?q=keyword&category=development&limit=10

POST   /api/projects/task-catalogue/suggest/             # Get suggestions
       Body: { "project_description": "...", "limit": 10 }

GET    /api/projects/task-catalogue/analytics/           # Get statistics

POST   /api/projects/task-catalogue/from_task/           # Create from task data
       Body: { "task_name": "...", "estimated_hours": 10, ... }

POST   /api/projects/task-catalogue/{id}/use_template/   # Use template
       Body: { "project_id": 123, "adjust_hours": 12 }

DELETE /api/projects/task-catalogue/{id}/deactivate/     # Soft delete
POST   /api/projects/task-catalogue/{id}/activate/       # Reactivate
```

### Task History Endpoints

```
GET    /api/projects/task-history/                       # List history
GET    /api/projects/task-history/accuracy_report/       # Accuracy stats
```

---

## Credits

**AI Model**: OpenAI GPT-5 (released August 2025)
**Fuzzy Matching**: fuzzywuzzy + Levenshtein distance
**Backend**: Django 5.0 + Django REST Framework
**Task Queue**: Celery for async processing

---

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review `/api/docs/` for full API documentation
3. Check Docker logs: `docker-compose logs backend celery`
4. Report bugs via GitHub issues

---

**Happy Estimating! 🚀**

The Task Catalogue system gets smarter with every project you complete. Start importing your past invoices today to build your historical knowledge base!
