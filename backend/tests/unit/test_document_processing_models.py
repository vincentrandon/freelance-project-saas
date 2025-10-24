"""Unit tests for document processing models."""

import pytest
from document_processing.models import (
    ImportedDocument,
    DocumentParseResult,
    ImportPreview,
    AIExtractionFeedback,
    AIModelVersion,
)
from tests.factories import (
    ImportedDocumentFactory,
    DocumentParseResultFactory,
    ImportPreviewFactory,
    AIExtractionFeedbackFactory,
    AIModelVersionFactory,
)


@pytest.mark.unit
class TestImportedDocumentModel:
    def test_create_document(self, user, sample_pdf):
        doc = ImportedDocument.objects.create(
            user=user,
            file=sample_pdf,
            file_name='test.pdf',
            file_size=1024,
            status='uploaded'
        )
        assert doc.id is not None

    def test_status_choices(self):
        for status in ['uploaded', 'processing', 'parsed', 'approved', 'rejected', 'error']:
            doc = ImportedDocumentFactory(status=status)
            doc.full_clean()

    def test_document_type_choices(self):
        for dtype in ['invoice', 'estimate', 'unknown']:
            doc = ImportedDocumentFactory(document_type=dtype)
            doc.full_clean()


@pytest.mark.unit
class TestDocumentParseResultModel:
    def test_create_parse_result(self):
        doc = ImportedDocumentFactory()
        result = DocumentParseResult.objects.create(
            document=doc,
            raw_response={},
            extracted_data={},
            overall_confidence=95,
            detected_language='en'
        )
        assert result.id is not None

    def test_confidence_scores(self):
        result = DocumentParseResultFactory(
            overall_confidence=95,
            customer_confidence=98,
            project_confidence=92
        )
        assert result.overall_confidence == 95


@pytest.mark.unit
class TestImportPreviewModel:
    def test_create_preview(self, user):
        doc = ImportedDocumentFactory(user=user)
        result = DocumentParseResultFactory(document=doc)
        preview = ImportPreview.objects.create(
            document=doc,
            parse_result=result,
            status='pending_review',
            customer_data={},
            project_data={},
            tasks_data=[],
            invoice_estimate_data={}
        )
        assert preview.id is not None

    def test_preview_status_choices(self):
        for status in ['pending_review', 'needs_clarification', 'approved', 'rejected']:
            preview = ImportPreviewFactory(status=status)
            preview.full_clean()

    def test_customer_action_choices(self):
        for action in ['create_new', 'use_existing', 'merge']:
            preview = ImportPreviewFactory(customer_action=action)
            preview.full_clean()


@pytest.mark.unit
class TestAIExtractionFeedbackModel:
    def test_create_feedback(self, user):
        preview = ImportPreviewFactory()
        preview.document.user = user
        preview.document.save(update_fields=['user'])
        feedback = AIExtractionFeedback.objects.create(
            user=user,
            document=preview.document,
            preview=preview,
            feedback_type='field_correction',
            original_data={},
            corrected_data={},
            field_path='customer.name'
        )
        assert feedback.id is not None

    def test_feedback_type_choices(self):
        for ftype in ['task_clarification', 'manual_edit', 'implicit_positive', 'field_correction']:
            feedback = AIExtractionFeedbackFactory(feedback_type=ftype)
            feedback.full_clean()


@pytest.mark.unit
class TestAIModelVersionModel:
    def test_create_model_version(self):
        version = AIModelVersion.objects.create(
            version='v1.0',
            base_model='gpt-4o',
            status='ready'
        )
        assert version.id is not None

    def test_status_choices(self):
        for status in ['training', 'evaluating', 'ready', 'active', 'archived', 'failed']:
            version = AIModelVersionFactory(status=status)
            version.full_clean()
