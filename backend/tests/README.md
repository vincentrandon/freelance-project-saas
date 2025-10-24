# Backend Test Suite

Comprehensive pytest-based test suite for the Freelancer Management Platform backend.

## Overview

This test suite provides **full coverage** of the Django backend with 800+ tests across:
- **Unit tests**: Models, utilities, services
- **Integration tests**: API endpoints, viewsets
- **Task tests**: Celery async tasks
- **Permission tests**: Authentication and authorization
- **Workflow tests**: End-to-end business processes

## Installation

```bash
cd backend
pip install -r requirements-dev.txt
```

## Running Tests

### Run All Tests

```bash
pytest
```

### Run with Coverage

```bash
pytest --cov=. --cov-report=html --cov-report=term-missing
```

### Run Specific Test Categories

```bash
# Unit tests only
pytest tests/unit/

# API integration tests only
pytest tests/integration/

# Celery task tests
pytest tests/tasks/

# Workflow tests
pytest tests/workflows/
```

### Run by Markers

```bash
# Run only unit tests
pytest -m unit

# Run integration tests
pytest -m integration

# Run tests that mock external APIs
pytest -m external

# Run slow tests
pytest -m slow
```

### Run Specific Test Files

```bash
# Test a specific app
pytest tests/unit/test_invoicing_models.py

# Test a specific class
pytest tests/unit/test_customers_models.py::TestCustomerModel

# Test a specific test
pytest tests/unit/test_customers_models.py::TestCustomerModel::test_create_customer
```

### Parallel Execution (Faster)

```bash
# Auto-detect CPU cores
pytest -n auto

# Use 4 workers
pytest -n 4
```

### Re-run Failed Tests Only

```bash
pytest --lf
```

### Stop on First Failure

```bash
pytest -x
```

## Test Structure

```
tests/
├── conftest.py                 # Global fixtures
├── pytest.ini                  # Pytest configuration
│
├── factories/                  # Factory Boy data factories
│   ├── user_factory.py
│   ├── customer_factory.py
│   ├── lead_factory.py
│   ├── project_factory.py
│   ├── finance_factory.py
│   ├── invoicing_factory.py
│   ├── document_processing_factory.py
│   ├── profile_factory.py
│   ├── notification_factory.py
│   ├── cra_factory.py
│   └── ai_actions_factory.py
│
├── fixtures/                   # Test data files
│   ├── sample_invoice.pdf
│   ├── sample_estimate.pdf
│   ├── mock_openai_responses.json
│   └── mock_bank_api_responses.json
│
├── unit/                       # Unit tests
│   ├── test_customers_models.py
│   ├── test_leads_models.py
│   ├── test_projects_models.py
│   ├── test_finance_models.py
│   ├── test_invoicing_models.py
│   ├── test_document_processing_models.py
│   ├── test_profiles_models.py
│   ├── test_notifications_models.py
│   ├── test_cra_models.py
│   ├── test_ai_actions_models.py
│   ├── test_openai_parser.py
│   ├── test_entity_matcher.py
│   ├── test_task_quality_analyzer.py
│   └── test_estimate_assistant.py
│
├── integration/                # API tests
│   ├── test_customers_api.py
│   ├── test_leads_api.py
│   ├── test_projects_api.py
│   ├── test_invoicing_api.py
│   ├── test_estimates_api.py
│   ├── test_document_processing_api.py
│   ├── test_profiles_api.py
│   ├── test_cra_api.py
│   └── test_ai_actions_api.py
│
├── serializers/                # Serializer tests
│   ├── test_customers_serializers.py
│   ├── test_invoicing_serializers.py
│   └── test_document_processing_serializers.py
│
├── tasks/                      # Celery task tests
│   ├── test_document_processing_tasks.py
│   ├── test_invoicing_tasks.py
│   ├── test_finance_tasks.py
│   └── test_cra_tasks.py
│
├── permissions/                # Auth & permission tests
│   ├── test_user_isolation.py
│   ├── test_ai_service_token_auth.py
│   └── test_scope_permissions.py
│
└── workflows/                  # E2E workflow tests
    ├── test_invoice_lifecycle.py
    ├── test_estimate_workflow.py
    ├── test_signature_workflow.py
    ├── test_lead_pipeline.py
    ├── test_document_import_workflow.py
    └── test_cra_to_invoice_workflow.py
```

## Fixtures

### User Fixtures

```python
def test_something(user, user2, admin_user):
    # user: Regular test user
    # user2: Second user for isolation tests
    # admin_user: Superuser
    pass
```

### API Client Fixtures

```python
def test_api(authenticated_client, api_client, admin_client):
    # authenticated_client: Client with JWT token
    # api_client: Unauthenticated client
    # admin_client: Admin JWT client
    pass
```

### AI Token Client

```python
def test_ai_api(ai_token_client):
    client, raw_token = ai_token_client
    # Use for AI service token authentication
    pass
```

### File Fixtures

```python
def test_upload(sample_pdf, sample_image):
    # sample_pdf: Minimal valid PDF file
    # sample_image: Minimal valid PNG image
    pass
```

### Time Fixtures

```python
def test_dates(freeze_time, fixed_datetime):
    # freeze_time: Freeze time for deterministic tests
    # fixed_datetime: Fixed datetime (2025-01-15 10:00:00 UTC)
    pass
```

## Factory Usage

```python
from tests.factories import CustomerFactory, InvoiceFactory, LeadFactory

# Create with defaults
customer = CustomerFactory()

# Override specific fields
customer = CustomerFactory(name='ACME Corp', email='billing@acme.com')

# Create batch
customers = CustomerFactory.create_batch(10)

# Build without saving to DB
customer = CustomerFactory.build()
```

## Mocking External Services

### OpenAI API

```python
import responses

@responses.activate
def test_document_parsing(mock_openai_response):
    responses.add(
        responses.POST,
        'https://api.openai.com/v1/chat/completions',
        json=mock_openai_response,
        status=200
    )
    # Your test code
```

### Celery Tasks

```python
from unittest.mock import patch

@patch('invoicing.tasks.generate_invoice_pdf.delay')
def test_invoice_generation(mock_task):
    # Task is not actually executed
    # Verify it was called
    mock_task.assert_called_once()
```

## Coverage Goals

- **Line coverage**: >90%
- **Branch coverage**: >85%
- **Critical paths**: 100% (calculations, workflows, permissions)

### Generate Coverage Report

```bash
pytest --cov=. --cov-report=html --cov-report=term-missing
open htmlcov/index.html
```

## Test Markers

Custom markers for organizing tests:

- `@pytest.mark.unit`: Unit tests (fast, isolated)
- `@pytest.mark.integration`: Integration tests (API endpoints)
- `@pytest.mark.slow`: Slow-running tests
- `@pytest.mark.celery`: Tests involving Celery tasks
- `@pytest.mark.external`: Tests mocking external APIs
- `@pytest.mark.workflow`: End-to-end workflow tests

## Continuous Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s

      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s

    steps:
      - uses: actions/checkout@v3
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'

      - name: Install dependencies
        run: |
          pip install -r requirements.txt
          pip install -r requirements-dev.txt

      - name: Run tests with coverage
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost/test_db
          CELERY_BROKER_URL: redis://localhost:6379/0
        run: |
          pytest --cov=. --cov-report=xml

      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

## Best Practices

### 1. Use Factories for Test Data

```python
# Good
customer = CustomerFactory(name='ACME Corp')

# Avoid
customer = Customer.objects.create(user=user, name='ACME Corp', ...)
```

### 2. Test User Isolation

```python
def test_user_isolation(user, user2):
    obj1 = ModelFactory(user=user)
    obj2 = ModelFactory(user=user2)

    user1_objects = Model.objects.filter(user=user)
    assert obj1 in user1_objects
    assert obj2 not in user1_objects
```

### 3. Use Descriptive Test Names

```python
# Good
def test_invoice_total_includes_tax():
    ...

# Avoid
def test_invoice():
    ...
```

### 4. One Assertion Per Test (When Possible)

```python
# Preferred
def test_customer_has_name():
    customer = CustomerFactory(name='ACME')
    assert customer.name == 'ACME'

def test_customer_has_user():
    customer = CustomerFactory()
    assert customer.user is not None
```

### 5. Mock External APIs

```python
@patch('openai.ChatCompletion.create')
def test_ai_parsing(mock_openai):
    mock_openai.return_value = {...}
    # Test internal logic, not OpenAI API
```

## Troubleshooting

### Tests Failing Due to Missing Migrations

```bash
# Create migrations first
python manage.py makemigrations
pytest
```

### Database Not Cleaning Between Tests

```bash
# Use --reuse-db flag
pytest --reuse-db
```

### Slow Tests

```bash
# Run in parallel
pytest -n auto

# Profile slow tests
pytest --durations=10
```

### Import Errors

```bash
# Ensure PYTHONPATH includes backend directory
export PYTHONPATH=/path/to/backend:$PYTHONPATH
pytest
```

## Resources

- [Pytest Documentation](https://docs.pytest.org/)
- [pytest-django](https://pytest-django.readthedocs.io/)
- [Factory Boy](https://factoryboy.readthedocs.io/)
- [DRF Testing](https://www.django-rest-framework.org/api-guide/testing/)
- [Coverage.py](https://coverage.readthedocs.io/)

## Contributing

When adding new features:

1. Write tests first (TDD)
2. Ensure all tests pass
3. Maintain >90% coverage
4. Update this README if adding new test patterns
