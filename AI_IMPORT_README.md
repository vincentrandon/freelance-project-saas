# AI-Powered Document Import Feature

## Overview

This feature enables **automatic extraction and import of invoices and estimates** (factures and devis) using OpenAI's GPT-4o Vision API. It intelligently creates or matches customers, projects, and tasks, dramatically reducing manual data entry.

### Key Features

✅ **Batch Upload** - Upload up to 20 PDF documents simultaneously
✅ **AI Extraction** - Automatically extracts all relevant data from documents
✅ **Smart Matching** - Fuzzy matching to find existing customers and projects
✅ **Bilingual Support** - Handles both French (devis/facture) and English documents
✅ **User Review** - Preview and edit extracted data before importing
✅ **Conflict Detection** - Warns about duplicates and mismatches
✅ **AI Estimate Assistant** - Generate new estimates from natural language descriptions
✅ **Historical Analysis** - AI suggests pricing based on your past projects

---

## Architecture

### Backend Components

```
backend/
└── document_processing/
    ├── models.py                      # ImportedDocument, DocumentParseResult, ImportPreview
    ├── views.py                       # API endpoints
    ├── serializers.py                 # DRF serializers
    ├── tasks.py                       # Celery async tasks
    ├── services/
    │   ├── openai_document_parser.py  # OpenAI Vision API integration
    │   ├── entity_matcher.py          # Fuzzy matching engine
    │   └── estimate_assistant.py      # AI estimate generation
    └── urls.py                        # API routing
```

### Frontend Components

```
frontend/src/
├── api/hooks.js                       # React Query hooks
└── pages/documents/
    ├── DocumentImport.jsx             # Upload interface
    └── ImportPreview.jsx              # Review & approve screen
```

---

## Setup Instructions

### 1. Backend Setup

#### Install Dependencies

The required packages are already added to `requirements.txt`:

```bash
cd backend
pip install -r requirements.txt
```

Packages added:
- `openai==1.58.0` - OpenAI API client
- `PyPDF2==3.0.1` - PDF parsing
- `pdf2image==1.17.0` - PDF to image conversion
- `python-magic==0.4.27` - File type detection
- `fuzzywuzzy==0.18.0` - Fuzzy string matching
- `python-Levenshtein==0.25.0` - Fast string comparison

#### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp backend/.env.example backend/.env
```

**Required Variables:**

```env
# OpenAI API Key (REQUIRED)
OPENAI_API_KEY=sk-your-openai-api-key-here
OPENAI_MODEL=gpt-4o
OPENAI_MAX_TOKENS=4000
OPENAI_TEMPERATURE=0.1
```

Get your OpenAI API key from: https://platform.openai.com/api-keys

**Optional (for production):**

```env
# AWS S3 for file storage
USE_S3=True
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_STORAGE_BUCKET_NAME=your-bucket
```

#### Run Migrations

```bash
python manage.py makemigrations document_processing
python manage.py migrate
```

#### System Dependencies (for pdf2image)

**macOS:**
```bash
brew install poppler
```

**Ubuntu/Debian:**
```bash
sudo apt-get install poppler-utils
```

**Windows:**
Download Poppler from: https://github.com/oschwartz10612/poppler-windows/releases

---

### 2. Frontend Setup

No additional dependencies needed! The hooks are already integrated in `src/api/hooks.js`.

---

## API Endpoints

### Document Processing

#### Upload Documents
```http
POST /api/document-processing/documents/upload/
Content-Type: multipart/form-data

files[]: [file1.pdf, file2.pdf, ...]
```

**Response:**
```json
{
  "message": "2 document(s) uploaded successfully",
  "documents": [
    {
      "id": 1,
      "file_name": "invoice_2024.pdf",
      "status": "uploaded",
      "uploaded_at": "2024-10-20T10:00:00Z"
    }
  ]
}
```

#### Get Document Preview
```http
GET /api/document-processing/documents/{id}/preview/
```

**Response:**
```json
{
  "id": 1,
  "status": "pending_review",
  "customer_data": {
    "name": "John Doe",
    "email": "john@example.com",
    "company": "Acme Corp"
  },
  "project_data": {
    "name": "Website Redesign",
    "description": "..."
  },
  "tasks_data": [
    {
      "name": "Design mockups",
      "estimated_hours": 20,
      "hourly_rate": 100,
      "amount": 2000
    }
  ],
  "customer_match_confidence": 95,
  "customer_action": "use_existing",
  "conflicts": [],
  "warnings": []
}
```

#### Approve Import
```http
POST /api/document-processing/previews/{id}/approve/
```

Creates Customer, Project, Tasks, and Invoice/Estimate.

#### Reject Import
```http
POST /api/document-processing/previews/{id}/reject/
```

---

### AI Assistant

#### Generate Estimate from Prompt
```http
POST /api/document-processing/ai-assist/generate-from-prompt/
Content-Type: application/json

{
  "project_description": "Build a mobile app for food delivery with iOS and Android support",
  "customer_name": "Restaurant Chain Inc",
  "additional_context": "They need MVP in 3 months"
}
```

**Response:**
```json
{
  "project_name": "Food Delivery Mobile App",
  "estimated_duration_days": 90,
  "tasks": [
    {
      "name": "iOS App Development",
      "estimated_hours": 200,
      "hourly_rate": 100,
      "amount": 20000
    },
    {
      "name": "Android App Development",
      "estimated_hours": 180,
      "hourly_rate": 100,
      "amount": 18000
    }
  ],
  "total": 38000,
  "assumptions": ["Based on MVP scope", "Excludes payment gateway integration"],
  "risks": ["Timeline may extend if requirements change"]
}
```

#### Suggest Pricing for Tasks
```http
POST /api/document-processing/ai-assist/suggest-pricing/
Content-Type: application/json

{
  "tasks": [
    {"name": "Database design", "description": "PostgreSQL schema"},
    {"name": "API development", "description": "REST API with Django"}
  ],
  "project_context": "E-commerce platform"
}
```

#### Expand Task into Subtasks
```http
POST /api/document-processing/ai-assist/expand-task/
Content-Type: application/json

{
  "task_name": "Build authentication system",
  "task_description": "JWT-based auth with OAuth"
}
```

#### Get Historical Analysis
```http
POST /api/document-processing/ai-assist/historical-analysis/
```

Returns:
- Average hourly rate
- Common task patterns
- Project duration statistics
- Revenue metrics

---

## Usage Guide

### 1. Import Documents

1. Navigate to `/documents/import`
2. Drag and drop PDF files or click to upload
3. Upload up to 20 invoices/estimates at once
4. Wait for AI processing (usually 10-30 seconds per document)

### 2. Review Extracted Data

1. Click "Review →" on parsed documents
2. Check extracted information:
   - **Customer**: Name, email, company, address
   - **Project**: Name, description, dates
   - **Tasks**: Line items with hours and pricing
   - **Invoice/Estimate**: Numbers, dates, totals

3. Review confidence scores:
   - **Green (90-100%)**: High confidence, likely accurate
   - **Yellow (70-89%)**: Medium confidence, review carefully
   - **Red (<70%)**: Low confidence, verify all fields

### 3. Handle Conflicts

The system will warn you about:
- **Duplicate customers**: Email/name matches
- **Existing projects**: Similar project names
- **Budget mismatches**: Different totals from existing projects
- **Missing data**: No contact info or time estimates

Actions available:
- **Create New**: Always create new entity
- **Use Existing**: Link to matched entity
- **Merge**: Update existing entity with new data

### 4. Approve or Reject

- **Approve**: Creates all entities (Customer → Project → Tasks → Invoice/Estimate)
- **Reject**: Discards the import

### 5. Use AI Estimate Assistant

Generate estimates from descriptions:

```javascript
import { useGenerateEstimateFromPrompt } from '../../api/hooks';

const generateMutation = useGenerateEstimateFromPrompt();

await generateMutation.mutateAsync({
  project_description: "Build a blog website with CMS",
  customer_name: "Tech Startup",
  additional_context: "Budget around $5000"
});
```

---

## Data Models

### ImportedDocument
```python
{
  "id": int,
  "user": ForeignKey(User),
  "file": FileField,
  "file_name": str,
  "file_size": int,
  "status": "uploaded" | "processing" | "parsed" | "approved" | "rejected" | "error",
  "document_type": "invoice" | "estimate" | "unknown",
  "uploaded_at": datetime,
  "processed_at": datetime,
  "error_message": str
}
```

### DocumentParseResult
```python
{
  "id": int,
  "document": OneToOne(ImportedDocument),
  "raw_response": JSONField,  # Complete OpenAI response
  "extracted_data": JSONField,  # Structured data
  "overall_confidence": 0-100,
  "customer_confidence": 0-100,
  "project_confidence": 0-100,
  "tasks_confidence": 0-100,
  "pricing_confidence": 0-100,
  "detected_language": "en" | "fr"
}
```

### ImportPreview
```python
{
  "id": int,
  "document": OneToOne(ImportedDocument),
  "parse_result": ForeignKey(DocumentParseResult),
  "status": "pending_review" | "approved" | "rejected",

  # Staged data (editable)
  "customer_data": JSONField,
  "project_data": JSONField,
  "tasks_data": JSONField,
  "invoice_estimate_data": JSONField,

  # Matching results
  "matched_customer": ForeignKey(Customer),
  "customer_match_confidence": 0-100,
  "customer_action": "create_new" | "use_existing" | "merge",

  "matched_project": ForeignKey(Project),
  "project_match_confidence": 0-100,
  "project_action": "create_new" | "merge",

  # Created entities (after approval)
  "created_customer": ForeignKey(Customer),
  "created_project": ForeignKey(Project),
  "created_invoice": ForeignKey(Invoice),
  "created_estimate": ForeignKey(Estimate)
}
```

---

## Matching Logic

### Customer Matching

1. **Exact Email Match (100% confidence)**
   - Email address matches exactly → Use existing

2. **Fuzzy Name/Company Match (85%+ = use existing, 70-84% = suggest merge)**
   - Uses Levenshtein distance
   - Compares both name and company
   - Weighted: 60% name + 40% company

3. **No Match**
   - Create new customer

### Project Matching

1. **Project Name Similarity (80%+ = merge tasks)**
   - Only searches within matched customer's projects
   - Uses token sort ratio (handles word order)
   - Merges tasks into existing project if high match

2. **Low Match (60-79% = create new, but warn)**
3. **No Match** - Create new project

### Task Handling

- **Always creates new tasks** (never merges task descriptions)
- Appends to matched project or creates with new project
- Preserves order from document

---

## Cost Estimation

### OpenAI API Costs (as of Oct 2024)

**GPT-4o Vision:**
- Input: $2.50 per 1M tokens
- Output: $10.00 per 1M tokens

**Per Document:**
- Average: 2,000-3,000 input tokens (PDF image)
- Average: 500-800 output tokens (JSON)
- **Cost per document: ~$0.008-0.015 (less than 2 cents)**

**For 100 documents/month:**
- Estimated cost: **$0.80 - $1.50/month**

**For 1000 documents/month:**
- Estimated cost: **$8 - $15/month**

### Performance

- **Single document**: 10-30 seconds
- **Batch (20 documents)**: 30-90 seconds (parallel processing)
- **Concurrent limit**: 5 documents at once (configurable)

---

## Troubleshooting

### Common Issues

#### 1. "OpenAI API error: Invalid API key"
**Solution:** Check your `.env` file has correct `OPENAI_API_KEY`

```bash
echo $OPENAI_API_KEY  # Should show sk-...
```

#### 2. "pdf2image error: Unable to find poppler"
**Solution:** Install poppler:

```bash
# macOS
brew install poppler

# Ubuntu
sudo apt-get install poppler-utils
```

#### 3. "Document stuck in 'processing' status"
**Solution:** Check Celery worker is running:

```bash
docker-compose logs celery_worker
celery -A freelancermgmt inspect active
```

#### 4. "Low confidence scores (<70%)"
**Causes:**
- Poor quality PDF scan
- Unusual document format
- Missing critical information

**Solution:**
- Use higher quality PDFs
- Manually edit preview data before approving
- Re-upload with better scan

#### 5. "ImportError: No module named 'openai'"
**Solution:** Rebuild Docker container:

```bash
docker-compose down
docker-compose build
docker-compose up
```

---

## Future Enhancements

### Planned Features

- [ ] **OCR for scanned images** - Handle image-only PDFs
- [ ] **Multi-page document support** - Process invoices with multiple pages
- [ ] **Custom extraction templates** - Train on your specific invoice format
- [ ] **Bulk edit mode** - Edit multiple previews at once
- [ ] **Auto-categorization** - AI suggests project categories
- [ ] **Email import** - Forward invoices to import@yourdomain.com
- [ ] **AI contract analysis** - Extract terms and deadlines
- [ ] **Time tracking integration** - Auto-log hours from invoices

### Potential Integrations

- **Accounting software**: QuickBooks, Xero export
- **CRM systems**: Salesforce, HubSpot sync
- **Payment gateways**: Stripe, PayPal reconciliation
- **Cloud storage**: Google Drive, Dropbox auto-import

---

## Best Practices

### For Best Extraction Results

1. **Use high-quality PDFs** (not photos or scans when possible)
2. **Include complete information** in invoices:
   - Clear customer details with email
   - Itemized line items with descriptions
   - Hours/quantities and rates
   - Dates and invoice numbers

3. **Standardize your invoice format** across customers
4. **Review low-confidence extractions** (<80%) carefully
5. **Test with a few documents first** before bulk import

### Data Privacy

- **PDFs are stored securely** (S3 with private ACL in production)
- **OpenAI doesn't train on your data** (per API terms)
- **All data isolated by user** (multi-tenant architecture)
- **Consider GDPR compliance** if handling EU customer data

---

## Support & Contact

For issues or questions:
1. Check logs: `docker-compose logs backend celery_worker`
2. Review Celery tasks: `/admin/` → Celery Task Results
3. Check OpenAI usage: https://platform.openai.com/usage

---

## License

Part of Freelancer Management System - Proprietary
