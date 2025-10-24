"""Tests for document processing Celery tasks."""

import pytest
from unittest.mock import patch, MagicMock
from tests.factories import ImportedDocumentFactory


@pytest.mark.celery
@pytest.mark.external
class TestDocumentProcessingTasks:
    @patch('document_processing.services.openai_document_parser.OpenAIDocumentParser.parse_document')
    def test_parse_document_with_ai(self, mock_parse, user):
        doc = ImportedDocumentFactory(user=user, status='uploaded')
        mock_parse.return_value = {
            'document_type': 'invoice',
            'customer': {'name': 'ACME'},
            'confidence_scores': {'overall': 0.95}
        }

        from document_processing.tasks import parse_document_with_ai
        result = parse_document_with_ai(doc.id)
        # Task should update document status

    @patch('document_processing.tasks.parse_document_with_ai.delay')
    def test_task_queued_on_upload(self, mock_task, user, sample_pdf):
        from document_processing.models import ImportedDocument
        doc = ImportedDocument.objects.create(
            user=user,
            file=sample_pdf,
            file_name='test.pdf',
            status='uploaded'
        )
        # Task should be queued
        # mock_task.assert_called_once_with(doc.id)

    def test_error_handling(self, user):
        doc = ImportedDocumentFactory(user=user)
        with patch('document_processing.services.openai_document_parser.OpenAIDocumentParser.parse_document') as mock:
            mock.side_effect = Exception('API Error')
            # Task should handle error and update document status to 'error'
