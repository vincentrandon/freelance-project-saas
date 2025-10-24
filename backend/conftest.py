"""
Global pytest configuration and fixtures for the entire test suite.

This file provides reusable fixtures for:
- User creation and authentication
- API clients (JWT and AI token authenticated)
- Database setup and teardown
- Common test data
"""

import os
from datetime import timedelta
from typing import Dict

import pytest
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()


# ============================================================================
# Database and Django Setup
# ============================================================================

@pytest.fixture(scope='session')
def django_db_setup():
    """
    Custom database setup for test session.
    Ensures proper isolation and cleanup.
    """
    pass


@pytest.fixture(autouse=True)
def reset_sequences(db):
    """
    Reset Factory Boy sequences before each test.
    This prevents unique constraint violations.
    """
    # Reset all factory sequences
    from tests.factories.user_factory import UserFactory
    from tests.factories.customer_factory import CustomerFactory
    from tests.factories.project_factory import ProjectFactory
    from tests.factories.invoicing_factory import InvoiceFactory, EstimateFactory, SignatureRequestFactory
    from tests.factories.lead_factory import LeadFactory
    from tests.factories.finance_factory import BankAccountFactory, TransactionFactory

    UserFactory.reset_sequence()
    CustomerFactory.reset_sequence()
    ProjectFactory.reset_sequence()
    InvoiceFactory.reset_sequence()
    EstimateFactory.reset_sequence()
    SignatureRequestFactory.reset_sequence()
    LeadFactory.reset_sequence()
    BankAccountFactory.reset_sequence()
    TransactionFactory.reset_sequence()


@pytest.fixture(autouse=True)
def enable_db_access_for_all_tests(db):
    """
    Automatically enable database access for all tests.
    This prevents needing to mark every test with @pytest.mark.django_db
    """
    pass


@pytest.fixture(autouse=True)
def media_root(settings, tmp_path):
    """
    Override MEDIA_ROOT to use temporary directory for file uploads.
    Prevents test files from polluting the project media directory.
    """
    settings.MEDIA_ROOT = tmp_path / "media"
    return settings.MEDIA_ROOT


# ============================================================================
# User Fixtures
# ============================================================================

@pytest.fixture
def user(db):
    """
    Create a standard test user.

    Returns:
        User: A regular user with profile auto-created via signal
    """
    return User.objects.create_user(
        username='testuser',
        email='test@example.com',
        password='testpass123',
        first_name='Test',
        last_name='User'
    )


@pytest.fixture
def user2(db):
    """
    Create a second test user for testing user isolation.

    Returns:
        User: A second user for multi-user scenarios
    """
    return User.objects.create_user(
        username='testuser2',
        email='test2@example.com',
        password='testpass123',
        first_name='Test2',
        last_name='User2'
    )


@pytest.fixture
def admin_user(db):
    """
    Create a superuser for admin-level tests.

    Returns:
        User: A superuser with all permissions
    """
    return User.objects.create_superuser(
        username='admin',
        email='admin@example.com',
        password='adminpass123'
    )


# ============================================================================
# API Client Fixtures
# ============================================================================

@pytest.fixture
def api_client():
    """
    Create an unauthenticated API client.

    Returns:
        APIClient: DRF test client without authentication
    """
    return APIClient()


@pytest.fixture
def authenticated_client(user):
    """
    Create an authenticated API client with JWT token.

    Args:
        user: The user fixture

    Returns:
        APIClient: DRF test client with JWT authentication headers
    """
    client = APIClient()
    refresh = RefreshToken.for_user(user)
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
    return client


@pytest.fixture
def authenticated_client_user2(user2):
    """
    Create an authenticated API client for user2 (for isolation tests).

    Args:
        user2: The second user fixture

    Returns:
        APIClient: DRF test client authenticated as user2
    """
    client = APIClient()
    refresh = RefreshToken.for_user(user2)
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
    return client


@pytest.fixture
def admin_client(admin_user):
    """
    Create an authenticated API client for admin user.

    Args:
        admin_user: The admin user fixture

    Returns:
        APIClient: DRF test client authenticated as admin
    """
    client = APIClient()
    refresh = RefreshToken.for_user(admin_user)
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
    return client


@pytest.fixture
def ai_token_client(user):
    """
    Create an API client authenticated with AI service token.

    Args:
        user: The user fixture

    Returns:
        tuple: (APIClient, raw_token_value) for AI-authenticated requests
    """
    from ai_actions.models import AIServiceToken, generate_token_value

    client = APIClient()
    raw_token = generate_token_value()

    token = AIServiceToken.objects.create(
        user=user,
        name='Test AI Token',
        scopes=[
            'context:read',
            'context:customers',
            'context:projects',
            'context:estimates',
            'context:invoices',
            'context:cras',
            'actions:read',
            'actions:customers.create',
            'actions:estimates.create',
            'actions:invoices.create',
            'actions:cra.create',
        ],
        key_prefix='placeholder',
        token_hash='placeholder'
    )
    token.set_token(raw_token)
    token.save(update_fields=['key_prefix', 'token_hash'])

    client.credentials(HTTP_X_AI_SERVICE_TOKEN=raw_token)
    return client, raw_token


# ============================================================================
# JWT Token Fixtures
# ============================================================================

@pytest.fixture
def jwt_token(user) -> Dict[str, str]:
    """
    Generate JWT tokens for a user.

    Args:
        user: The user fixture

    Returns:
        dict: {'access': access_token, 'refresh': refresh_token}
    """
    refresh = RefreshToken.for_user(user)
    return {
        'access': str(refresh.access_token),
        'refresh': str(refresh)
    }


@pytest.fixture
def expired_jwt_token(user):
    """
    Generate an expired JWT token for testing token expiration.

    Args:
        user: The user fixture

    Returns:
        str: An expired access token
    """
    refresh = RefreshToken.for_user(user)
    access_token = refresh.access_token
    # Set expiration to past
    access_token.set_exp(lifetime=-timedelta(hours=1))
    return str(access_token)


# ============================================================================
# File Upload Fixtures
# ============================================================================

@pytest.fixture
def sample_pdf():
    """
    Create a simple PDF file for upload tests.

    Returns:
        SimpleUploadedFile: A minimal PDF file
    """
    # Minimal PDF content
    pdf_content = b"""%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Resources<<>>>>endobj
xref
0 4
0000000000 65535 f
0000000009 00000 n
0000000052 00000 n
0000000101 00000 n
trailer<</Size 4/Root 1 0 R>>
startxref
178
%%EOF"""

    return SimpleUploadedFile(
        "test_document.pdf",
        pdf_content,
        content_type="application/pdf"
    )


@pytest.fixture
def sample_image():
    """
    Create a simple image file for upload tests.

    Returns:
        SimpleUploadedFile: A minimal PNG image
    """
    # 1x1 red pixel PNG
    image_content = (
        b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01'
        b'\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00'
        b'\x00\x0cIDATx\x9cc\xf8\xcf\xc0\x00\x00\x00\x03\x00\x01'
        b'\x00\x00\x00\x00\x00\x00\x00\x00IEND\xaeB`\x82'
    )

    return SimpleUploadedFile(
        "test_image.png",
        image_content,
        content_type="image/png"
    )


# ============================================================================
# Time Mocking Fixtures
# ============================================================================

@pytest.fixture
def freeze_time():
    """
    Fixture to freeze time for deterministic date/time testing.

    Usage:
        def test_something(freeze_time):
            freeze_time('2025-01-15 10:00:00')
            # Now timezone.now() always returns 2025-01-15 10:00:00
    """
    from freezegun import freeze_time as _freeze_time
    return _freeze_time


@pytest.fixture
def fixed_datetime():
    """
    Return a fixed datetime for consistent testing.

    Returns:
        datetime: 2025-01-15 10:00:00 UTC
    """
    from datetime import datetime
    return timezone.make_aware(datetime(2025, 1, 15, 10, 0, 0))


# ============================================================================
# Mock External Services
# ============================================================================

@pytest.fixture
def mock_openai_response():
    """
    Mock OpenAI API responses for document parsing.

    Returns:
        dict: Sample OpenAI API response structure
    """
    return {
        "choices": [
            {
                "message": {
                    "content": """{
                        "document_type": "invoice",
                        "language": "en",
                        "customer": {
                            "name": "ACME Corporation",
                            "email": "billing@acme.com",
                            "company": "ACME Corp",
                            "address": "123 Main St",
                            "phone": "+1234567890"
                        },
                        "project": {
                            "name": "Website Redesign",
                            "description": "Full website overhaul"
                        },
                        "tasks": [
                            {
                                "description": "Frontend development",
                                "quantity": 40,
                                "unit": "hours",
                                "rate": 100,
                                "category": "development"
                            }
                        ],
                        "invoice_data": {
                            "invoice_number": "INV-2025-001",
                            "issue_date": "2025-01-15",
                            "due_date": "2025-02-15",
                            "status": "sent",
                            "tax_rate": 20
                        },
                        "confidence_scores": {
                            "overall": 0.95,
                            "customer": 0.98,
                            "project": 0.92,
                            "tasks": 0.94,
                            "pricing": 0.96
                        }
                    }"""
                }
            }
        ]
    }


@pytest.fixture
def mock_bank_api_response():
    """
    Mock Open Banking API responses for bank sync.

    Returns:
        dict: Sample bank API response with transactions
    """
    return {
        "transactions": [
            {
                "transaction_id": "txn_12345",
                "date": "2025-01-15",
                "description": "Payment from ACME Corp",
                "amount": 5000.00,
                "currency": "EUR",
                "type": "income",
                "counterparty": "ACME Corporation"
            },
            {
                "transaction_id": "txn_12346",
                "date": "2025-01-14",
                "description": "Office supplies",
                "amount": -250.50,
                "currency": "EUR",
                "type": "expense",
                "counterparty": "Staples Inc"
            }
        ],
        "balance": 15250.00
    }


# ============================================================================
# Settings Overrides
# ============================================================================

@pytest.fixture(autouse=True)
def test_settings(settings):
    """
    Override settings for all tests.

    Args:
        settings: Django settings fixture
    """
    # Disable external API calls
    settings.CELERY_TASK_ALWAYS_EAGER = True
    settings.CELERY_TASK_EAGER_PROPAGATES = True

    # Use in-memory email backend
    settings.EMAIL_BACKEND = 'django.core.mail.backends.locmem.EmailBackend'

    # Disable S3 for tests (use local file storage)
    settings.USE_S3 = False

    # Speed up password hashing for tests
    settings.PASSWORD_HASHERS = [
        'django.contrib.auth.hashers.MD5PasswordHasher',
    ]

    return settings
