# Task Catalogue - Quick Start Guide 🚀

## What You Just Got

A complete intelligent task management and estimation system that learns from every project! Here's what's new:

### 🎯 Core Features

1. **Task Catalogue** - Reusable task library with historical time estimates
2. **AI-Powered Suggestions** - Smart task recommendations based on project descriptions
3. **Auto-Learning** - System gets smarter with every AI import
4. **Estimate Integration** - One-click task addition to estimates
5. **Confidence Scoring** - Know which estimates are reliable (75%+ = high confidence)

---

## Quick Start (3 Steps)

### Step 1: Start the System

```bash
# Make sure Docker is running, then:
docker-compose up -d

# Or restart if already running:
docker-compose restart backend celery frontend
```

**Access Points:**
- Frontend: http://localhost (or http://localhost:5173 if dev mode)
- Backend API: http://localhost/api
- Admin Panel: http://localhost/admin

### Step 2: Import Your First Invoice

1. Navigate to **AI Import** in the sidebar
2. Upload a PDF invoice or estimate
3. Wait for GPT-5 to extract tasks (30-60 seconds)
4. Review the extracted data
5. Click **Approve**

**What Happens Automatically:**
- ✅ Tasks are extracted with time estimates
- ✅ Tasks are auto-categorized (development, design, etc.)
- ✅ Each task is saved to your Task Catalogue
- ✅ Historical data starts building

### Step 3: Use Task Catalogue in Estimates

1. Go to **Invoicing** → Create New Estimate
2. Fill in customer & project details
3. Scroll to **Line Items** section
4. See the **💡 Task Suggestions** widget below
5. Search for tasks or let AI suggest based on your project description
6. Click **+ Add** to insert tasks into your estimate

**Magic!** Tasks come pre-filled with:
- Average estimated hours (from historical data)
- Average hourly rate
- Confidence score
- Total amount automatically calculated

---

## Navigation

### New Menu Items

**Sidebar → Task Catalogue**
- Browse all your task templates
- Search and filter by category
- View analytics (total templates, usage, confidence)
- See most-used tasks

**Estimate Creation → Task Suggestions Widget**
- Appears automatically when creating estimates
- Search task catalogue in real-time
- Get AI-powered suggestions based on project description
- One-click add to line items

---

## How It Works

### The Learning Loop

```
1. Upload Invoice/Estimate (AI Import)
   ↓
2. GPT-5 Extracts Tasks
   - Name: "API Integration"
   - Category: "development"
   - Estimated Hours: 16
   - Hourly Rate: €75
   ↓
3. Auto-Saved to Catalogue
   - Fuzzy match against existing templates
   - If >90% similar → Update stats
   - If <90% similar → Create new template
   ↓
4. Used in Future Estimates
   - Search: "API" → Shows "API Integration"
   - Usage: 5 times
   - Avg Time: 14.5h (improved from 16h initial)
   - Confidence: 85% (high)
   ↓
5. Task Completed
   - Actual time logged
   - Confidence score updated
   - Future estimates improve
```

### Confidence Scoring

- **High (75-100%)**: Trust this estimate! Based on accurate historical data
- **Medium (50-75%)**: Good baseline, may need adjustment
- **Low (0-50%)**: Use with caution, add buffer

Confidence improves over time as you complete more tasks and log actual hours.

---

## Key Workflows

### Workflow 1: Build Your Catalogue from Scratch

```bash
# Option A: Import Past Invoices
1. Go to AI Import
2. Upload 10-20 past invoices/estimates
3. Approve each one
4. → Instant catalogue of 100+ tasks!

# Option B: Manual Creation
1. Go to Task Catalogue
2. (Future feature: Manual add button)
3. Or use API directly:
   POST /api/projects/task-catalogue/from_task/
   {
     "task_name": "Database Migration",
     "estimated_hours": 8,
     "hourly_rate": 70,
     "category": "development"
   }
```

### Workflow 2: Create Estimate with Catalogue

```bash
1. Invoicing → Create Estimate
2. Select Customer & Project
3. In "Notes" field, describe the project:
   "Build React dashboard with user management and analytics"
4. Scroll to Task Suggestions widget
5. Click "🪄 Get AI Suggestions"
6. AI suggests relevant tasks:
   - React Dashboard UI (24h, €75/h, 78% match)
   - User Authentication (12h, €75/h, 65% match)
   - Analytics Charts (16h, €70/h, 72% match)
7. Click "+ Add" on each task
8. Tasks auto-populate line items!
9. Adjust if needed, add security margin
10. Generate PDF & send
```

### Workflow 3: Search & Reuse Tasks

```bash
1. Creating estimate
2. In Task Suggestions widget, type "auth"
3. See matching templates:
   - "User authentication with OAuth" (12.5h, €75, 82% confidence)
   - "Authentication API endpoints" (8h, €70, 68% confidence)
4. Click "+ Add" → Instantly added to estimate
5. Done!
```

---

## AI Configuration

### GPT-5 Settings

The system is configured to use **GPT-5** with:
- **Model**: `gpt-5` (best quality) or `gpt-5-mini` (faster/cheaper)
- **Reasoning Effort**: `medium` (balanced)
- **Max Tokens**: 6000 (increased from 4000)
- **Temperature**: 0.1 (precise, low creativity)

**To Change Model** (in `.env`):
```bash
# Best quality (default)
OPENAI_MODEL=gpt-5

# Faster & cheaper
OPENAI_MODEL=gpt-5-mini

# Fallback to GPT-4o
OPENAI_MODEL=gpt-4o

# Adjust reasoning effort (GPT-5 only)
OPENAI_REASONING_EFFORT=medium  # minimal, low, medium, high
```

### Cost Optimization

- **GPT-5**: ~$0.10-0.15 per document (best accuracy)
- **GPT-5-mini**: ~$0.02-0.05 per document (80% accuracy, 3x faster)
- **GPT-4o**: ~$0.08-0.12 per document (good fallback)

**Tip**: Use `gpt-5` for important client estimates, `gpt-5-mini` for internal/quick estimates.

---

## Task Categories

Auto-categorization uses keywords:

| Category | Keywords |
|----------|----------|
| **Development** | develop, code, api, backend, frontend, feature, bug |
| **Design** | design, ui, ux, mockup, wireframe, logo |
| **Testing** | test, qa, validation, debug |
| **Deployment** | deploy, release, production, hosting |
| **Consulting** | consult, strategy, meeting, planning |
| **Documentation** | document, manual, guide, wiki |
| **Maintenance** | maintain, update, support, monitoring |
| **Research** | research, investigation, poc, analysis |
| **Other** | Everything else |

**Custom Categories**: Can be added in backend `TaskTemplate.CATEGORY_CHOICES`

---

## API Reference (Quick)

### Task Catalogue Endpoints

```bash
# List all templates
GET /api/projects/task-catalogue/
?category=development&is_active=true

# Search with fuzzy matching
GET /api/projects/task-catalogue/search/
?q=authentication&limit=5

# AI-powered suggestions
POST /api/projects/task-catalogue/suggest/
{
  "project_description": "Build e-commerce platform",
  "limit": 10
}

# Get analytics
GET /api/projects/task-catalogue/analytics/

# Create template from task
POST /api/projects/task-catalogue/from_task/
{
  "task_name": "API Integration",
  "estimated_hours": 16,
  "hourly_rate": 75,
  "category": "development"
}

# Use template in project
POST /api/projects/task-catalogue/{id}/use_template/
{
  "project_id": 123,
  "adjust_hours": 14,
  "adjust_rate": 80
}
```

### React Query Hooks (Frontend)

```javascript
import {
  useTaskCatalogue,
  useSearchTaskCatalogue,
  useSuggestTasks,
  useTaskCatalogueAnalytics,
  useUseTaskTemplate,
} from '../api/hooks';

// List templates
const { data: templates } = useTaskCatalogue({ category: 'development' });

// Search
const searchMutation = useSearchTaskCatalogue();
const results = await searchMutation.mutateAsync({ query: 'api', limit: 5 });

// Get suggestions
const suggestMutation = useSuggestTasks();
const suggestions = await suggestMutation.mutateAsync({
  project_description: 'Build dashboard',
  limit: 10
});

// Use template
const useMutation = useUseTaskTemplate();
await useMutation.mutateAsync({
  templateId: 42,
  project_id: 15,
  adjust_hours: 12
});
```

---

## Troubleshooting

### Issue: No tasks in catalogue

**Solution:**
1. Import at least one invoice via AI Import
2. Or create templates manually via API
3. Check admin panel: `/admin` → Task Templates

### Issue: GPT-5 errors

**Symptoms:** "Model not found" or API errors

**Solution:**
```bash
# Check your OpenAI API key
echo $OPENAI_API_KEY

# If GPT-5 not available in your region, fallback:
# Edit .env:
OPENAI_MODEL=gpt-4o

# Restart:
docker-compose restart backend celery
```

### Issue: Tasks not appearing in estimates

**Symptom:** Task Suggestion Widget shows "No suggestions"

**Possible Causes:**
1. Empty catalogue → Import some invoices first
2. No project description → Add project details in "Notes" field
3. Frontend not restarted → Reload page

**Solution:**
```bash
# Check catalogue has data
curl http://localhost/api/projects/task-catalogue/ \
  -H "Authorization: Bearer YOUR_TOKEN"

# Should return array of templates
```

### Issue: Suggestions not relevant

**Why:** AI needs better context

**Solution:**
1. Write more detailed project description in Notes field
2. Include keywords like "React", "dashboard", "API"
3. After a few imports, suggestions improve as catalogue grows

---

## Best Practices

### 1. Start with Historical Data
Import 10-20 past invoices to bootstrap your catalogue

### 2. Use Consistent Naming
- ✅ "API Integration" (always)
- ❌ "api int", "Api Integration", "API development"
→ Helps fuzzy matching work better

### 3. Log Actual Hours
When tasks are completed, update actual hours
→ Improves confidence scores and future estimates

### 4. Review Auto-Categories
AI auto-categorizes, but double-check in admin panel
→ Better categories = better search results

### 5. Use Tags
Tags are auto-extracted (react, python, api, etc.)
→ Makes searching easier

---

## What's Next

### Immediate (You Can Do Now)
1. ✅ Import past invoices to build catalogue
2. ✅ Create your first estimate with task suggestions
3. ✅ Browse catalogue in sidebar
4. ✅ Check analytics

### Coming Soon (Not Yet Implemented)
- [ ] Manual template creation UI
- [ ] Task bundling (e.g., "E-commerce Starter Pack")
- [ ] Team sharing (share templates with team)
- [ ] Export/import catalogues
- [ ] ML-based time prediction

---

## Support & Documentation

**Full Documentation:**
- Backend API: http://localhost/api/docs/
- Task Catalogue README: `./TASK_CATALOGUE_README.md`
- Local Setup: `./LOCAL_SETUP.md`

**Admin Panel:**
- URL: http://localhost/admin
- View/edit templates, history, tasks

**Logs:**
```bash
# Backend logs
docker-compose logs backend | tail -50

# Celery (AI processing)
docker-compose logs celery | tail -50

# Frontend
docker-compose logs frontend | tail -50
```

**Need Help?**
- Check logs for errors
- Review API docs at `/api/docs/`
- Check backend migrations: `docker-compose exec backend python manage.py showmigrations projects`

---

## Quick Tips

💡 **Search is Fuzzy**: Type "auth" to find "Authentication", "OAuth", "Authorize", etc.

💡 **Confidence Builds Over Time**: First few tasks = 50% confidence. After 5+ uses = 80%+

💡 **Tags are Smart**: AI extracts "react", "python", "api" automatically from descriptions

💡 **Categories Matter**: Filter by category for faster search

💡 **Usage Count Shows Popularity**: High usage = proven, reliable tasks

---

## Success Metrics

Track your catalogue growth:

```bash
# View analytics
curl http://localhost/api/projects/task-catalogue/analytics/ \
  -H "Authorization: Bearer YOUR_TOKEN"

# Returns:
{
  "total_templates": 156,
  "total_usage": 842,
  "average_confidence": 71.5,
  "high_confidence_templates": 64
}
```

**Goals:**
- Week 1: 50+ templates (import past work)
- Month 1: 100+ templates, 50%+ confidence
- Month 3: 200+ templates, 70%+ confidence, 80+ high-confidence tasks

---

## That's It! 🎉

You now have an intelligent task estimation system that:
- ✅ Learns from every project
- ✅ Suggests tasks automatically
- ✅ Improves accuracy over time
- ✅ Saves hours on estimate creation

**Start by importing your past invoices and watch your catalogue grow!**

For detailed API docs and advanced features, see `TASK_CATALOGUE_README.md`.

---

**Happy Estimating!** 📊✨
