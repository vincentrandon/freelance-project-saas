"""Factories for document processing models."""

import factory
from decimal import Decimal
from datetime import timedelta
from django.utils import timezone
from django.core.files.base import ContentFile
from factory.django import DjangoModelFactory
from factory.fuzzy import FuzzyChoice, FuzzyDecimal

from document_processing.models import (
    ImportedDocument,
    DocumentParseResult,
    ImportPreview,
    AIExtractionFeedback,
    AIModelVersion
)
from .user_factory import UserFactory
from .customer_factory import CustomerFactory
from .project_factory import ProjectFactory


class ImportedDocumentFactory(DjangoModelFactory):
    """Factory for creating ImportedDocument instances."""

    class Meta:
        model = ImportedDocument

    user = factory.SubFactory(UserFactory)
    file = factory.LazyAttribute(
        lambda _: ContentFile(b'%PDF-1.4 fake pdf', name='test_doc.pdf')
    )
    file_name = factory.Faker('file_name', extension='pdf')
    file_size = factory.Faker('random_int', min=10000, max=5000000)
    status = FuzzyChoice(['uploaded', 'processing', 'parsed', 'approved', 'rejected', 'error'])
    document_type = FuzzyChoice(['invoice', 'estimate', 'unknown'])
    error_message = factory.Maybe(
        factory.LazyAttribute(lambda o: o.status == 'error'),
        yes_declaration=factory.Faker('sentence'),
        no_declaration=None
    )


class DocumentParseResultFactory(DjangoModelFactory):
    """Factory for creating DocumentParseResult instances."""

    class Meta:
        model = DocumentParseResult

    document = factory.SubFactory(ImportedDocumentFactory)
    raw_response = factory.LazyFunction(lambda: {
        'model': 'gpt-4-vision-preview',
        'usage': {'total_tokens': 1500}
    })

    extracted_data = factory.LazyFunction(lambda: {
        'document_type': 'invoice',
        'language': 'en',
        'customer': {
            'name': 'ACME Corp',
            'email': 'billing@acme.com',
            'company': 'ACME Corporation'
        },
        'project': {
            'name': 'Website Development'
        },
        'tasks': [
            {
                'description': 'Frontend development',
                'quantity': 40,
                'unit': 'hours',
                'rate': 100
            }
        ],
        'invoice_data': {
            'invoice_number': 'INV-001',
            'issue_date': '2025-01-15',
            'due_date': '2025-02-15'
        }
    })

    overall_confidence = factory.Faker('random_int', min=70, max=100)
    customer_confidence = factory.Faker('random_int', min=70, max=100)
    project_confidence = factory.Faker('random_int', min=70, max=100)
    tasks_confidence = factory.Faker('random_int', min=70, max=100)
    pricing_confidence = factory.Faker('random_int', min=70, max=100)
    detected_language = FuzzyChoice(['en', 'fr'])


class ImportPreviewFactory(DjangoModelFactory):
    """Factory for creating ImportPreview instances."""

    class Meta:
        model = ImportPreview

    document = factory.SubFactory(ImportedDocumentFactory)
    parse_result = factory.SubFactory(
        DocumentParseResultFactory,
        document=factory.SelfAttribute('..document')
    )

    status = FuzzyChoice(['pending_review', 'needs_clarification', 'approved', 'rejected'])

    customer_data = factory.LazyFunction(lambda: {
        'name': 'ACME Corp',
        'email': 'billing@acme.com',
        'company': 'ACME Corporation'
    })

    project_data = factory.LazyFunction(lambda: {
        'name': 'Website Development',
        'description': 'Full website redesign'
    })

    tasks_data = factory.LazyFunction(lambda: [
        {
            'name': 'Frontend development',
            'description': 'Build responsive UI',
            'estimated_hours': 40,
            'hourly_rate': 100,
            'category': 'development'
        }
    ])

    invoice_estimate_data = factory.LazyFunction(lambda: {
        'type': 'invoice',
        'invoice_number': 'INV-001',
        'issue_date': '2025-01-15',
        'due_date': '2025-02-15',
        'tax_rate': 20
    })

    # Entity matching
    matched_customer = None
    customer_match_confidence = factory.Faker('random_int', min=0, max=100)
    customer_action = FuzzyChoice(['create_new', 'use_existing', 'merge'])
    matched_project = None
    project_match_confidence = factory.Faker('random_int', min=0, max=100)
    project_action = FuzzyChoice(['create_new', 'use_existing', 'merge'])

    # Task quality
    task_quality_scores = factory.LazyFunction(lambda: {
        '0': {
            'clarity_score': 0.9,
            'completeness_score': 0.85,
            'needs_clarification': False
        }
    })
    overall_task_quality_score = factory.Faker('random_int', min=60, max=100)
    needs_clarification = factory.Faker('boolean', chance_of_getting_true=20)
    auto_approve_eligible = factory.Faker('boolean', chance_of_getting_true=60)


class AIExtractionFeedbackFactory(DjangoModelFactory):
    """Factory for creating AIExtractionFeedback instances."""

    class Meta:
        model = AIExtractionFeedback

    user = factory.SubFactory(UserFactory)
    preview = factory.SubFactory(ImportPreviewFactory)
    document = factory.LazyAttribute(lambda o: o.preview.document)
    feedback_type = FuzzyChoice([
        'task_clarification',
        'manual_edit',
        'implicit_positive',
        'field_correction'
    ])

    original_data = factory.LazyFunction(lambda: {
        'description': 'Dev work',
        'quantity': 40
    })

    corrected_data = factory.LazyFunction(lambda: {
        'description': 'Frontend development services',
        'quantity': 40,
        'category': 'development'
    })

    field_path = 'tasks.0.description'
    edit_magnitude = FuzzyChoice(['none', 'minor', 'moderate', 'major'])
    user_rating = FuzzyChoice(['poor', 'needs_improvement', 'good', 'excellent'])
    rating_comment = factory.Faker('text', max_nb_chars=200)
    original_confidence = factory.Faker('random_int', min=50, max=100)
    was_edited = factory.Faker('boolean', chance_of_getting_true=70)
    was_used_for_training = factory.Faker('boolean', chance_of_getting_true=20)
    training_batch_id = None


class AIModelVersionFactory(DjangoModelFactory):
    """Factory for creating AIModelVersion instances."""

    class Meta:
        model = AIModelVersion

    version = factory.Sequence(lambda n: f'v1.{n}')
    base_model = FuzzyChoice(['gpt-4o-mini', 'gpt-4o', 'gpt-4.1'])
    status = FuzzyChoice(['training', 'evaluating', 'ready', 'active', 'archived', 'failed'])

    training_data_count = factory.Faker('random_int', min=50, max=1000)
    training_file_id = factory.Faker('uuid4')
    fine_tune_job_id = factory.Faker('uuid4')
    fine_tuned_model = factory.Maybe(
        factory.LazyAttribute(lambda o: o.status in ['ready', 'active', 'archived']),
        yes_declaration=factory.Sequence(lambda n: f'gpt-4o-ft-{n:04d}'),
        no_declaration=None
    )
    training_started_at = factory.LazyFunction(lambda: timezone.now() - timedelta(days=14))
    training_completed_at = factory.LazyFunction(lambda: timezone.now() - timedelta(days=7))
    accuracy_before = FuzzyDecimal(60.0, 85.0, precision=2)
    accuracy_after = FuzzyDecimal(70.0, 95.0, precision=2)
    improvements = factory.LazyFunction(lambda: {
        'customer_extraction': 12.5,
        'task_parsing': 8.3
    })
    is_active = factory.Faker('boolean', chance_of_getting_true=20)
    activated_at = factory.Maybe(
        factory.LazyAttribute(lambda o: o.is_active),
        yes_declaration=timezone.now,
        no_declaration=None
    )
    training_cost_usd = FuzzyDecimal(10.0, 150.0, precision=2)
    notes = factory.Faker('sentence')
