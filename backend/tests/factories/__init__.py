"""
Factory Boy factories for creating test data.

These factories provide a convenient way to create model instances
with realistic data for testing. They use Faker to generate random
but realistic values.

Usage:
    from tests.factories import CustomerFactory, LeadFactory

    customer = CustomerFactory(name='Custom Name')
    lead = LeadFactory.create_batch(5)  # Create 5 leads
"""

from .user_factory import UserFactory
from .customer_factory import CustomerFactory, AttachmentFactory
from .lead_factory import LeadFactory
from .project_factory import (
    ProjectFactory,
    TaskFactory,
    TaskTemplateFactory,
    TaskHistoryFactory
)
from .finance_factory import BankAccountFactory, TransactionFactory
from .invoicing_factory import InvoiceFactory, EstimateFactory, SignatureRequestFactory
from .document_processing_factory import (
    ImportedDocumentFactory,
    DocumentParseResultFactory,
    ImportPreviewFactory,
    AIExtractionFeedbackFactory,
    AIModelVersionFactory
)
from .profile_factory import UserProfileFactory
from .notification_factory import NotificationFactory
from .cra_factory import CRAFactory, CRASignatureFactory
from .ai_actions_factory import AIServiceTokenFactory, AIActionLogFactory

__all__ = [
    # User
    'UserFactory',

    # Customers
    'CustomerFactory',
    'AttachmentFactory',

    # Leads
    'LeadFactory',

    # Projects
    'ProjectFactory',
    'TaskFactory',
    'TaskTemplateFactory',
    'TaskHistoryFactory',

    # Finance
    'BankAccountFactory',
    'TransactionFactory',

    # Invoicing
    'InvoiceFactory',
    'EstimateFactory',
    'SignatureRequestFactory',

    # Document Processing
    'ImportedDocumentFactory',
    'DocumentParseResultFactory',
    'ImportPreviewFactory',
    'AIExtractionFeedbackFactory',
    'AIModelVersionFactory',

    # Profiles
    'UserProfileFactory',

    # Notifications
    'NotificationFactory',

    # CRA
    'CRAFactory',
    'CRASignatureFactory',

    # AI Actions
    'AIServiceTokenFactory',
    'AIActionLogFactory',
]
