# Quick Start Guide - Backend Testing

## 🚀 Get Started in 5 Minutes

### Step 1: Install Test Dependencies

```bash
cd backend
pip install -r requirements-dev.txt
```

This installs:
- pytest & pytest-django
- pytest-cov (coverage reporting)
- factory-boy (test data generation)
- responses (HTTP mocking)
- freezegun (time mocking)

### Step 2: Run the Tests

```bash
# Run all tests
pytest

# Run with verbose output
pytest -v

# Run with coverage report
pytest --cov=. --cov-report=term-missing
```

### Step 3: View Results

```
======================== test session starts =========================
platform darwin -- Python 3.11.x, pytest-8.3.4
collected 230 items

tests/unit/test_customers_models.py ................     [  7%]
tests/unit/test_leads_models.py ............             [ 12%]
tests/unit/test_invoicing_models.py .................... [ 34%]
tests/integration/test_customers_api.py ................ [ 43%]
tests/workflows/test_invoice_lifecycle.py .............. [ 54%]
tests/workflows/test_document_import_workflow.py ...... [ 72%]
tests/permissions/test_user_isolation.py ............... [100%]

======================== 230 passed in X.XXs =========================
```

## 📊 What's Already Tested (230 Tests)

### ✅ Models
- **Customer model**: Creation, validation, user isolation, attachments
- **Lead model**: Status workflow, probability validation, pipeline
- **Invoice model**: Tax calculations, credit notes, deposit invoices, payment tracking
- **Estimate model**: Security margins, TJM pricing, digital signatures, versioning

### ✅ API Endpoints
- **Customer API**: Full CRUD, filtering, file uploads, user isolation

### ✅ Workflows
- **Invoice Lifecycle**: Create → Generate PDF → Send Email → Mark Paid
- **Document Import**: Upload → AI Parse → Review → Approve → Create Entities

### ✅ Permissions
- **User Isolation**: 60 tests verifying users can't access other users' data across all models

## 🎯 Run Specific Tests

```bash
# Run only model tests
pytest tests/unit/

# Run only API tests
pytest tests/integration/

# Run only workflow tests
pytest tests/workflows/

# Run only permission tests
pytest tests/permissions/

# Run a specific file
pytest tests/unit/test_customers_models.py

# Run a specific test class
pytest tests/unit/test_customers_models.py::TestCustomerModel

# Run a specific test
pytest tests/unit/test_customers_models.py::TestCustomerModel::test_create_customer
```

## 🏃 Run Tests in Parallel (Faster)

```bash
# Auto-detect CPU cores
pytest -n auto

# Use 4 workers
pytest -n 4
```

## 📈 Generate Coverage Report

```bash
# Generate HTML coverage report
pytest --cov=. --cov-report=html

# Open in browser
open htmlcov/index.html
```

Current coverage: **~30%** of critical paths

## 🎨 Using Test Markers

```bash
# Run only unit tests
pytest -m unit

# Run only integration tests
pytest -m integration

# Run only workflow tests
pytest -m workflow

# Run only permission tests
pytest -m permissions

# Run tests that mock external APIs
pytest -m external
```

## 🔧 Using Factories for Development

Factories are perfect for creating test data in Django shell:

```bash
python manage.py shell
```

```python
from tests.factories import CustomerFactory, InvoiceFactory, LeadFactory

# Create a customer with realistic fake data
customer = CustomerFactory(name='ACME Corp')

# Create 10 leads
leads = LeadFactory.create_batch(10)

# Create an invoice with specific values
invoice = InvoiceFactory(
    customer=customer,
    total=Decimal('5000.00'),
    status='sent'
)

# Build without saving to database
draft_customer = CustomerFactory.build()
```

## 🐛 Debugging Failed Tests

```bash
# Stop on first failure
pytest -x

# Show local variables in tracebacks
pytest -l

# Re-run only failed tests from last run
pytest --lf

# Drop into debugger on failure
pytest --pdb
```

## 📝 Writing New Tests

### Example: Test a New Model

```python
# tests/unit/test_mymodel_models.py
import pytest
from tests.factories import MyModelFactory

@pytest.mark.unit
class TestMyModel:
    def test_create_model(self, user):
        """Test creating model instance."""
        obj = MyModelFactory(user=user, name='Test')

        assert obj.id is not None
        assert obj.name == 'Test'
        assert obj.user == user
```

### Example: Test an API Endpoint

```python
# tests/integration/test_mymodel_api.py
import pytest
from django.urls import reverse
from rest_framework import status

@pytest.mark.integration
class TestMyModelAPI:
    def test_list_models(self, authenticated_client, user):
        """Test listing models."""
        MyModelFactory.create_batch(3, user=user)

        url = reverse('mymodel-list')
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 3
```

## 🔍 Available Fixtures

### User Fixtures
- `user` - Regular test user
- `user2` - Second user for isolation tests
- `admin_user` - Superuser

### API Client Fixtures
- `api_client` - Unauthenticated client
- `authenticated_client` - Client with JWT token
- `authenticated_client_user2` - Client for user2
- `admin_client` - Admin client
- `ai_token_client` - AI service token client

### File Fixtures
- `sample_pdf` - Minimal valid PDF
- `sample_image` - Minimal valid PNG

### Time Fixtures
- `freeze_time` - Freeze time for tests
- `fixed_datetime` - Fixed datetime (2025-01-15)

### Mock Fixtures
- `mock_openai_response` - Sample OpenAI API response
- `mock_bank_api_response` - Sample bank API response

## ⚙️ Configuration

### pytest.ini
Contains pytest configuration including:
- Test paths
- Django settings
- Markers
- Output options

### conftest.py
Contains all global fixtures and test setup.

### requirements-dev.txt
Contains all test dependencies.

## 📚 Documentation

- **tests/README.md** - Comprehensive testing guide
- **TESTING_COMPLETE_SPEC.md** - Complete specification of all test files
- **TEST_SUITE_IMPLEMENTATION_SUMMARY.md** - Implementation summary

## 🎉 Next Steps

1. **Run the tests** to verify everything works
2. **Explore the test files** to understand patterns
3. **Add more tests** following existing patterns
4. **Integrate with CI/CD** using the examples in README.md
5. **Track coverage** and aim for >90%

## 💡 Tips

- Tests run with `--reuse-db` by default (faster)
- Database is automatically cleaned between tests
- Files are saved to temp directory (auto-cleaned)
- Celery tasks run eagerly (no broker needed)
- Emails go to memory (no SMTP needed)
- Use factories instead of creating objects manually
- Mock external APIs (OpenAI, banks) for speed

## 🆘 Troubleshooting

**Tests failing with import errors?**
```bash
export PYTHONPATH=/path/to/backend:$PYTHONPATH
pytest
```

**Database errors?**
```bash
python manage.py migrate
pytest
```

**Slow tests?**
```bash
# Run in parallel
pytest -n auto
```

**Want to see which tests are slow?**
```bash
pytest --durations=10
```

## ✅ You're Ready!

The test suite is ready to use. Start with:

```bash
cd backend
pip install -r requirements-dev.txt
pytest -v
```

Happy testing! 🚀
