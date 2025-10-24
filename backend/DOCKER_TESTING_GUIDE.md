# Docker Testing Guide

Complete guide for running pytest tests in Docker environment.

## 🚀 Quick Start with Docker

### Step 1: Update Docker Compose

The test dependencies are already in `requirements-dev.txt`, so you need to install them in your Docker container.

**Option A: Add to Dockerfile (Recommended)**

Edit your `backend/Dockerfile` to include dev dependencies:

```dockerfile
# Install Python dependencies
COPY requirements.txt requirements-dev.txt ./
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install --no-cache-dir -r requirements-dev.txt  # Add this line
```

**Option B: Install in Running Container**

```bash
docker-compose exec backend pip install -r requirements-dev.txt
```

### Step 2: Rebuild Container (if using Option A)

```bash
docker-compose down
docker-compose build backend
docker-compose up -d
```

### Step 3: Run Tests

```bash
# Run all tests
docker-compose exec backend pytest

# Run with verbose output
docker-compose exec backend pytest -v

# Run with coverage
docker-compose exec backend pytest --cov=. --cov-report=html --cov-report=term-missing
```

## 📋 Common Docker Test Commands

### Basic Test Execution

```bash
# Run all tests
docker-compose exec backend pytest

# Run specific test file
docker-compose exec backend pytest tests/unit/test_customers_models.py

# Run specific test class
docker-compose exec backend pytest tests/unit/test_customers_models.py::TestCustomerModel

# Run specific test
docker-compose exec backend pytest tests/unit/test_customers_models.py::TestCustomerModel::test_create_customer
```

### Test Categories

```bash
# Run only unit tests
docker-compose exec backend pytest tests/unit/

# Run only API integration tests
docker-compose exec backend pytest tests/integration/

# Run only workflow tests
docker-compose exec backend pytest tests/workflows/

# Run only permission tests
docker-compose exec backend pytest tests/permissions/
```

### Using Markers

```bash
# Run only unit tests
docker-compose exec backend pytest -m unit

# Run only integration tests
docker-compose exec backend pytest -m integration

# Run only workflow tests
docker-compose exec backend pytest -m workflow

# Run tests that mock external APIs
docker-compose exec backend pytest -m external
```

### Coverage Reports

```bash
# Generate coverage report
docker-compose exec backend pytest --cov=. --cov-report=html --cov-report=term-missing

# View coverage in terminal
docker-compose exec backend pytest --cov=. --cov-report=term

# Copy HTML report to local machine
docker cp $(docker-compose ps -q backend):/app/htmlcov ./htmlcov
# Then open htmlcov/index.html in browser
```

### Debugging

```bash
# Stop on first failure
docker-compose exec backend pytest -x

# Show local variables on failure
docker-compose exec backend pytest -l

# Re-run only failed tests
docker-compose exec backend pytest --lf

# More verbose output
docker-compose exec backend pytest -vv

# Show print statements
docker-compose exec backend pytest -s
```

### Parallel Execution (Faster)

```bash
# Auto-detect CPU cores
docker-compose exec backend pytest -n auto

# Use 4 workers
docker-compose exec backend pytest -n 4
```

## 🔧 Docker Compose Service for Testing

You can add a dedicated test service to your `docker-compose.yml`:

```yaml
services:
  # ... existing services ...

  backend-test:
    build:
      context: ./backend
      dockerfile: Dockerfile
    command: pytest -v --cov=. --cov-report=term-missing
    env_file:
      - ./backend/.env
    environment:
      - DJANGO_SETTINGS_MODULE=freelancermgmt.settings
      - CELERY_TASK_ALWAYS_EAGER=True
      - EMAIL_BACKEND=django.core.mail.backends.locmem.EmailBackend
    depends_on:
      - db
      - redis
    volumes:
      - ./backend:/app
```

Then run tests with:

```bash
docker-compose run --rm backend-test
```

## 🐳 Alternative: Docker Run Command

If you don't want to modify docker-compose:

```bash
# Run tests in existing backend container
docker-compose exec backend bash -c "pip install -r requirements-dev.txt && pytest -v"
```

## 📊 Viewing Coverage Reports

### Option 1: Copy HTML Report to Host

```bash
# Generate coverage report
docker-compose exec backend pytest --cov=. --cov-report=html

# Copy to host machine
docker cp $(docker-compose ps -q backend):/app/htmlcov ./htmlcov

# Open in browser (macOS)
open htmlcov/index.html

# Open in browser (Linux)
xdg-open htmlcov/index.html
```

### Option 2: View in Terminal

```bash
docker-compose exec backend pytest --cov=. --cov-report=term-missing
```

## 🔍 Interactive Testing

### Enter Container Shell

```bash
# Enter backend container
docker-compose exec backend bash

# Now you're inside the container
pytest -v
pytest tests/unit/test_customers_models.py
exit
```

### Run Django Shell with Test Factories

```bash
docker-compose exec backend python manage.py shell
```

```python
from tests.factories import CustomerFactory, InvoiceFactory, LeadFactory

# Create test data
customer = CustomerFactory(name='ACME Corp')
leads = LeadFactory.create_batch(10)
invoice = InvoiceFactory(customer=customer)
```

## 🚨 Troubleshooting

### Tests Not Found

```bash
# Make sure you're in the right directory
docker-compose exec backend pwd
# Should show /app or your backend directory

# Verify tests directory exists
docker-compose exec backend ls -la tests/
```

### Module Import Errors

```bash
# Check PYTHONPATH
docker-compose exec backend python -c "import sys; print('\n'.join(sys.path))"

# Ensure Django settings are loaded
docker-compose exec backend python manage.py check
```

### Database Errors

```bash
# Run migrations first
docker-compose exec backend python manage.py migrate

# Verify database connection
docker-compose exec backend python manage.py dbshell
```

### Permission Errors

```bash
# Fix ownership (if needed)
docker-compose exec backend chown -R $(whoami):$(whoami) /app/htmlcov
```

### Requirements Not Installed

```bash
# Verify pytest is installed
docker-compose exec backend pip list | grep pytest

# Install if missing
docker-compose exec backend pip install -r requirements-dev.txt
```

## 📝 Creating a Test Script

Create `backend/run_tests.sh`:

```bash
#!/bin/bash
set -e

echo "Installing test dependencies..."
pip install -r requirements-dev.txt

echo "Running migrations..."
python manage.py migrate --noinput

echo "Running tests..."
pytest -v --cov=. --cov-report=html --cov-report=term-missing

echo "Tests complete! Coverage report generated in htmlcov/"
```

Make it executable:

```bash
chmod +x backend/run_tests.sh
```

Run in Docker:

```bash
docker-compose exec backend ./run_tests.sh
```

## 🔄 CI/CD with Docker

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Build Docker images
        run: docker-compose build

      - name: Run migrations
        run: docker-compose run --rm backend python manage.py migrate

      - name: Run tests with coverage
        run: docker-compose run --rm backend pytest --cov=. --cov-report=xml

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./backend/coverage.xml
```

## 📦 Docker Compose Override for Testing

Create `docker-compose.test.yml`:

```yaml
version: '3.8'

services:
  backend:
    command: pytest -v --cov=. --cov-report=term-missing
    environment:
      - CELERY_TASK_ALWAYS_EAGER=True
      - EMAIL_BACKEND=django.core.mail.backends.locmem.EmailBackend
```

Run tests with:

```bash
docker-compose -f docker-compose.yml -f docker-compose.test.yml up --abort-on-container-exit
```

## 🎯 Best Practices

1. **Always rebuild after changing requirements**:
   ```bash
   docker-compose down
   docker-compose build backend
   docker-compose up -d
   ```

2. **Use volume mounts for development**:
   - Code changes are immediately reflected
   - No need to rebuild for test changes

3. **Run tests before committing**:
   ```bash
   docker-compose exec backend pytest
   ```

4. **Keep test database separate** (optional):
   - Tests use temporary database by default
   - No cleanup needed

5. **Use parallel execution for large test suites**:
   ```bash
   docker-compose exec backend pytest -n auto
   ```

## 🚀 Quick Reference

```bash
# Most common commands
docker-compose exec backend pytest                                    # Run all tests
docker-compose exec backend pytest -v                                 # Verbose
docker-compose exec backend pytest -m unit                           # Unit tests only
docker-compose exec backend pytest --cov=. --cov-report=term         # With coverage
docker-compose exec backend pytest tests/unit/test_customers_models.py  # Specific file
docker-compose exec backend pytest -x                                 # Stop on first failure
docker-compose exec backend pytest --lf                               # Rerun failed
docker-compose exec backend pytest -n auto                            # Parallel execution
```

## 📖 Additional Resources

- [pytest documentation](https://docs.pytest.org/)
- [pytest-django documentation](https://pytest-django.readthedocs.io/)
- [Docker Compose documentation](https://docs.docker.com/compose/)
- [Coverage.py documentation](https://coverage.readthedocs.io/)

---

**Pro Tip**: Create an alias in your shell for faster testing:

```bash
# Add to ~/.bashrc or ~/.zshrc
alias dtest='docker-compose exec backend pytest'
alias dtest-cov='docker-compose exec backend pytest --cov=. --cov-report=term-missing'

# Usage
dtest -v
dtest-cov
```
