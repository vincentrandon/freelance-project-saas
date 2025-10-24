# Complete Test Suite Specification

This document outlines the **complete** pytest test suite for full backend coverage. Each file listed below should contain 10-50 tests for comprehensive coverage.

## Test Infrastructure ✅ COMPLETED

- [x] `pytest.ini` - Pytest configuration
- [x] `conftest.py` - Global fixtures (users, clients, mocking)
- [x] `requirements-dev.txt` - Test dependencies
- [x] `tests/README.md` - Test suite documentation

## Factories ✅ COMPLETED

All Factory Boy factories for test data generation:

- [x] `tests/factories/__init__.py`
- [x] `tests/factories/user_factory.py`
- [x] `tests/factories/customer_factory.py`
- [x] `tests/factories/lead_factory.py`
- [x] `tests/factories/project_factory.py`
- [x] `tests/factories/finance_factory.py`
- [x] `tests/factories/invoicing_factory.py`
- [x] `tests/factories/document_processing_factory.py`
- [x] `tests/factories/profile_factory.py`
- [x] `tests/factories/notification_factory.py`
- [x] `tests/factories/cra_factory.py`
- [x] `tests/factories/ai_actions_factory.py`

## Unit Tests - Models ✅ PARTIALLY COMPLETED

Test all model methods, properties, validations, and business logic:

- [x] `tests/unit/test_customers_models.py` (~20 tests)
  - Customer CRUD, validation, user isolation
  - Attachment file handling, relationships

- [x] `tests/unit/test_leads_models.py` (~15 tests)
  - Lead status workflow
  - Probability validation
  - Source tracking

- [ ] `tests/unit/test_projects_models.py` (~40 tests)
  - Project CRUD, status transitions
  - Task creation, completion, template linkage
  - TaskTemplate statistics updates
  - TaskHistory tracking
  - Calculated properties (total_estimated_hours, profit_margin)

- [ ] `tests/unit/test_finance_models.py` (~20 tests)
  - BankAccount creation, sync tracking
  - Transaction categorization
  - Reconciliation logic

- [x] `tests/unit/test_invoicing_models.py` (~50 tests)
  - Invoice tax calculations, status workflow
  - Credit note creation
  - Deposit invoice tracking
  - Estimate security margin calculations
  - TJM pricing support
  - Versioning, digital signatures
  - SignatureRequest lifecycle

- [ ] `tests/unit/test_document_processing_models.py` (~45 tests)
  - ImportedDocument status workflow
  - DocumentParseResult confidence scores
  - ImportPreview entity matching
  - Task quality scoring
  - AIExtractionFeedback capture
  - AIModelVersion activation/rollback

- [ ] `tests/unit/test_profiles_models.py` (~30 tests)
  - UserProfile auto-creation signal
  - TJM calculations (hourly_rate from TJM)
  - Profile completeness percentage
  - Missing required fields detection
  - Pricing settings (default rates, security margin)

- [ ] `tests/unit/test_notifications_models.py` (~10 tests)
  - Notification creation
  - Generic foreign key relationships
  - Read/unread status
  - Success/error type detection

- [ ] `tests/unit/test_cra_models.py` (~25 tests)
  - CRA creation, period validation
  - Task association (ManyToMany)
  - Total calculations (days × daily_rate)
  - Status workflow (draft → validated)
  - CRASignature token-based access

- [ ] `tests/unit/test_ai_actions_models.py` (~20 tests)
  - AIServiceToken hashing and validation
  - Token prefix lookup performance
  - Scope checking (has_scopes method)
  - Token expiration
  - AIActionLog audit trail

## Unit Tests - Services/Utilities ⚠️ TO BE CREATED

Test business logic and utility functions:

- [ ] `tests/unit/test_openai_parser.py` (~25 tests)
  - PDF to image conversion
  - OpenAI API call mocking
  - JSON extraction validation
  - Language detection
  - Error handling (API failures, invalid PDFs)

- [ ] `tests/unit/test_entity_matcher.py` (~20 tests)
  - Fuzzy customer name matching
  - Levenshtein distance calculations
  - Confidence score generation
  - Multiple match handling
  - Edge cases (empty strings, special characters)

- [ ] `tests/unit/test_task_quality_analyzer.py` (~20 tests)
  - Clarity scoring
  - Completeness validation
  - Contradiction detection
  - Estimated hours reasonableness
  - Needs clarification flag

- [ ] `tests/unit/test_estimate_assistant.py` (~25 tests)
  - Natural language to estimate conversion
  - TJM-based pricing
  - Security margin application
  - Historical task pattern learning
  - AI metadata generation

- [ ] `tests/unit/test_ai_learning_service.py` (~20 tests)
  - Feedback aggregation
  - Fine-tuning data preparation
  - Model performance tracking
  - Training data validation

- [ ] `tests/unit/test_task_catalogue_service.py` (~20 tests)
  - Template creation from completed tasks
  - Statistics updates (averages, min/max)
  - Confidence score calculation
  - Search and filtering
  - Recommendation engine

- [ ] `tests/unit/test_invoice_generator.py` (~15 tests)
  - CRA to invoice conversion
  - Line item generation from tasks
  - Tax calculation
  - Invoice numbering

- [ ] `tests/unit/test_batch_processor.py` (~10 tests)
  - Batch document processing
  - Parallel processing management
  - Error handling in batch

## Integration Tests - API Endpoints ✅ PARTIALLY COMPLETED

Test all ViewSet CRUD operations and custom actions:

- [x] `tests/integration/test_customers_api.py` (~20 tests)
  - List, retrieve, create, update, delete
  - User isolation
  - Filtering (name, email, company)
  - Ordering
  - upload_attachment action
  - attachments list action

- [ ] `tests/integration/test_leads_api.py` (~20 tests)
  - Full CRUD
  - User isolation
  - stats action (pipeline analytics)
  - Filtering by status and source
  - Ordering by value, created_at

- [ ] `tests/integration/test_projects_api.py` (~25 tests)
  - Project CRUD
  - User isolation, customer relationship
  - Custom actions (if any)
  - Filtering by status, customer
  - Statistics endpoints

- [ ] `tests/integration/test_tasks_api.py` (~20 tests)
  - Task CRUD within projects
  - Reordering tasks
  - Template linkage
  - Status updates (todo → in_progress → completed)
  - Worked dates tracking

- [ ] `tests/integration/test_task_templates_api.py` (~15 tests)
  - Template CRUD
  - Category filtering
  - Statistics display
  - Usage tracking

- [ ] `tests/integration/test_finance_api.py` (~20 tests)
  - BankAccount CRUD
  - Connection/disconnection actions
  - Transaction list (read-only)
  - Reconciliation endpoints
  - Filtering by category, date range

- [ ] `tests/integration/test_invoicing_api.py` (~40 tests)
  - Invoice CRUD
  - generate_pdf action
  - send_email action
  - mark_paid action
  - create_credit_note action
  - create_deposit_invoice action
  - list_deposits action
  - User isolation
  - Filtering by status, customer, project

- [ ] `tests/integration/test_estimates_api.py` (~40 tests)
  - Estimate CRUD
  - Draft vs finalized handling
  - generate_pdf action
  - send_email action (with signature request)
  - create_version action (versioning)
  - convert_to_invoice action
  - User isolation
  - TJM pricing validation

- [ ] `tests/integration/test_signatures_api.py` (~15 tests)
  - get_by_token action (public access)
  - sign_estimate action
  - decline_signature action
  - Token validation
  - Expiration handling

- [ ] `tests/integration/test_document_processing_api.py` (~35 tests)
  - import_document action (file upload)
  - get_preview action
  - approve action (creates entities)
  - reject action
  - update_preview_data action
  - clarify_tasks action
  - User isolation
  - Status workflow

- [ ] `tests/integration/test_profiles_api.py` (~20 tests)
  - Profile retrieve/update
  - get_profile_completeness action
  - upload_logo action
  - get_default_pricing action
  - Validation of required fields

- [ ] `tests/integration/test_notifications_api.py` (~10 tests)
  - List notifications
  - mark_as_read action
  - User isolation
  - Filtering by type, read status

- [ ] `tests/integration/test_cra_api.py` (~30 tests)
  - CRA CRUD
  - generate_pdf action
  - submit_for_validation action
  - request_signature action
  - calculate_totals action
  - Task association
  - Period validation (no duplicates)

- [ ] `tests/integration/test_ai_actions_api.py` (~30 tests)
  - Token CRUD
  - generate_token action
  - revoke action
  - rotate action
  - test_token action
  - AI context endpoints (customers, projects, etc.)
  - AI action endpoints (create customer, estimate, invoice, CRA)
  - Scope-based permissions
  - Origin restriction

- [ ] `tests/integration/test_authentication.py` (~20 tests)
  - JWT login/logout
  - Token refresh
  - Registration
  - Password reset
  - Social auth (Google, GitHub) - if enabled
  - Token expiration

## Serializer Tests ⚠️ TO BE CREATED

Test serializer validation and data transformation:

- [ ] `tests/serializers/test_customers_serializers.py` (~15 tests)
  - Field validation (email format, required fields)
  - Nested attachment serializers
  - Read-only fields

- [ ] `tests/serializers/test_leads_serializers.py` (~15 tests)
  - Status/source choice validation
  - Probability range validation (0-100)
  - Email validation

- [ ] `tests/serializers/test_projects_serializers.py` (~20 tests)
  - Task nested serialization
  - Calculated field serialization (totals, margins)
  - Date validation

- [ ] `tests/serializers/test_invoicing_serializers.py` (~30 tests)
  - Invoice tax calculation validation
  - Estimate security margin validation
  - TJM pricing validation
  - Line items JSON validation
  - Status transition validation

- [ ] `tests/serializers/test_document_processing_serializers.py` (~25 tests)
  - Confidence score validation
  - Entity matching data validation
  - Task quality scores validation
  - Extracted data structure validation

- [ ] `tests/serializers/test_profiles_serializers.py` (~20 tests)
  - TJM calculation validation
  - IBAN/BIC format validation
  - Required field validation for invoicing
  - Pricing settings validation

- [ ] `tests/serializers/test_cra_serializers.py` (~15 tests)
  - Period validation (month/year)
  - Total calculation validation
  - Task relationship serialization
  - Work dates validation

- [ ] `tests/serializers/test_ai_actions_serializers.py` (~15 tests)
  - Scope validation
  - Token masking in responses
  - Origin URL validation

## Celery Task Tests ⚠️ TO BE CREATED

Test async tasks with mocking:

- [ ] `tests/tasks/test_document_processing_tasks.py` (~20 tests)
  - parse_document_with_ai task
  - Mock OpenAI API calls
  - Error handling and notifications
  - Task chaining (parse → match → preview)

- [ ] `tests/tasks/test_invoicing_tasks.py` (~25 tests)
  - generate_invoice_pdf task
  - generate_estimate_pdf task
  - generate_signed_pdf task
  - send_invoice_email task
  - send_estimate_email task
  - Mock WeasyPrint PDF generation
  - Mock email sending
  - Notification emission on success/failure

- [ ] `tests/tasks/test_finance_tasks.py` (~15 tests)
  - sync_all_bank_accounts task
  - sync_bank_account task
  - Mock bank API calls
  - Error handling for API failures

- [ ] `tests/tasks/test_cra_tasks.py` (~15 tests)
  - generate_invoice_from_cra task
  - Triggered after CRA signature
  - Invoice creation from tasks
  - Line item generation

## Permission & Authentication Tests ⚠️ TO BE CREATED

Test security and access control:

- [ ] `tests/permissions/test_user_isolation.py` (~30 tests)
  - Test user isolation for ALL models
  - Verify queryset filtering by request.user
  - Ensure users cannot access other users' data
  - Test for all ViewSets

- [ ] `tests/permissions/test_ai_service_token_auth.py` (~20 tests)
  - AIServiceTokenAuthentication class
  - Token hashing and validation
  - Token prefix lookup
  - Origin/hostname restriction
  - Token expiration
  - Usage tracking (last_used_at)

- [ ] `tests/permissions/test_scope_permissions.py` (~25 tests)
  - HasAIScopes permission class
  - Scope-based access control
  - Context scopes (read, customers, projects, etc.)
  - Action scopes (create, update, delete)
  - Scope inheritance and wildcards

## Workflow Tests (End-to-End) ⚠️ TO BE CREATED

Test complete business processes:

- [ ] `tests/workflows/test_invoice_lifecycle.py` (~25 tests)
  - Create invoice (draft)
  - Generate PDF
  - Send email to customer
  - Mark as paid
  - Payment tracking
  - Create credit note from paid invoice
  - Create deposit invoice
  - Create final balance invoice

- [ ] `tests/workflows/test_estimate_workflow.py` (~30 tests)
  - Create estimate (draft)
  - Finalize estimate (assign number)
  - Generate PDF
  - Send estimate with signature request
  - Customer signs estimate
  - Signed PDF generation
  - Convert accepted estimate to invoice
  - Versioning workflow (create new version)

- [ ] `tests/workflows/test_signature_workflow.py` (~20 tests)
  - Request signature (generate token)
  - Send signature request email
  - Public access via token
  - Customer views estimate
  - Customer signs (multiple methods: draw, upload, type)
  - Signature completion triggers PDF generation
  - Expired signature handling
  - Declined signature handling

- [ ] `tests/workflows/test_lead_pipeline.py` (~20 tests)
  - Create new lead
  - Progress through statuses (new → contacted → qualified → proposal → won)
  - Update probability at each stage
  - Convert won lead to customer
  - Convert won lead to project
  - Lead analytics and stats calculation

- [ ] `tests/workflows/test_document_import_workflow.py` (~40 tests)
  - Upload PDF invoice/estimate
  - Trigger AI parsing (Celery task)
  - Parse document with OpenAI
  - Extract customer, project, tasks, pricing
  - Fuzzy match existing entities
  - Calculate confidence scores
  - Analyze task quality
  - User reviews preview
  - User edits extracted data
  - User clarifies ambiguous tasks
  - Approve import
  - Auto-create customer, project, tasks, invoice/estimate
  - Capture user corrections as feedback
  - Reject import workflow

- [ ] `tests/workflows/test_cra_to_invoice_workflow.py` (~25 tests)
  - Create CRA with tasks
  - Select work dates
  - Calculate totals (days × TJM)
  - Submit for validation
  - Request signature from client
  - Client signs CRA
  - Signature triggers invoice generation (Celery)
  - Auto-generated invoice from CRA tasks
  - Link CRA to invoice
  - Rejection workflow

- [ ] `tests/workflows/test_task_template_learning.py` (~20 tests)
  - Create task manually
  - Complete task
  - Task completion triggers template statistics update
  - Template average hours updated
  - Confidence score recalculated
  - Use template for new task
  - TaskHistory created
  - Historical variance tracking
  - Recommendation based on category

## Test Fixtures ⚠️ TO BE CREATED

Sample files for testing:

- [ ] `tests/fixtures/sample_invoice.pdf` - Real invoice PDF for parsing tests
- [ ] `tests/fixtures/sample_estimate.pdf` - Real estimate PDF
- [ ] `tests/fixtures/sample_invoice_fr.pdf` - French invoice
- [ ] `tests/fixtures/invalid_document.pdf` - Corrupted PDF for error testing
- [ ] `tests/fixtures/mock_openai_responses.json` - Sample OpenAI API responses
- [ ] `tests/fixtures/mock_bank_api_responses.json` - Sample bank API responses

## Summary Statistics

### Completed
- ✅ Test infrastructure (4 files)
- ✅ Factory Boy factories (12 files)
- ✅ Unit tests for models (3/10 files)
- ✅ Integration tests (1/14 files)

### Remaining
- ⚠️ Unit tests for models (7/10 files)
- ⚠️ Unit tests for services (0/8 files)
- ⚠️ Integration tests (13/14 files)
- ⚠️ Serializer tests (0/8 files)
- ⚠️ Celery task tests (0/4 files)
- ⚠️ Permission tests (0/3 files)
- ⚠️ Workflow tests (0/7 files)
- ⚠️ Test fixtures (0/6 files)

### Total Test Files
- **Completed**: 20 files (~150 tests)
- **Remaining**: 46 files (~650 tests)
- **Grand Total**: 66 files (**~800+ tests** for full coverage)

## Next Steps

To complete the test suite:

1. **Create remaining unit tests** for:
   - Projects (models, task templates, task history)
   - Finance (bank accounts, transactions)
   - Document processing (all models)
   - Profiles, Notifications, CRA, AI Actions

2. **Create service/utility tests** for:
   - OpenAI parser, entity matcher, task quality analyzer
   - Estimate assistant, AI learning service
   - Task catalogue service, invoice generator

3. **Create integration tests** for all API endpoints

4. **Create serializer tests** for validation logic

5. **Create Celery task tests** with proper mocking

6. **Create permission tests** for authentication and scopes

7. **Create workflow tests** for end-to-end business processes

8. **Create test fixtures** (PDF files, JSON mock responses)

## Running the Complete Suite

Once all tests are created:

```bash
# Run everything
pytest

# With coverage (should achieve >90%)
pytest --cov=. --cov-report=html --cov-report=term-missing

# Parallel execution (faster)
pytest -n auto

# Generate coverage badge
pytest --cov=. --cov-report=term-missing --cov-report=html
```

Expected results:
- **800+ tests** passing
- **>90% line coverage**
- **>85% branch coverage**
- **100% coverage** on critical paths (calculations, workflows, permissions)
