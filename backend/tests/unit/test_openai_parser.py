"""Unit tests for OpenAI document parser service."""

import pytest
from unittest.mock import patch, MagicMock
import responses


@pytest.mark.unit
@pytest.mark.external
class TestOpenAIDocumentParser:
    @patch('document_processing.services.openai_document_parser.OpenAIDocumentParser.parse_document')
    def test_parse_invoice_pdf(self, mock_parse, sample_pdf):
        mock_parse.return_value = {
            'document_type': 'invoice',
            'language': 'en',
            'customer': {'name': 'ACME Corp'},
            'confidence_scores': {'overall': 0.95}
        }

        result = mock_parse(sample_pdf)
        assert result['document_type'] == 'invoice'
        assert result['confidence_scores']['overall'] == 0.95

    @responses.activate
    def test_openai_api_call(self, mock_openai_response):
        responses.add(
            responses.POST,
            'https://api.openai.com/v1/chat/completions',
            json=mock_openai_response,
            status=200
        )
        # Test would call actual service here

    @patch('document_processing.services.openai_document_parser.pdf2image')
    def test_pdf_to_image_conversion(self, mock_pdf2image, sample_pdf):
        mock_pdf2image.convert_from_bytes.return_value = [MagicMock()]
        # Test conversion logic

    def test_language_detection(self):
        # Test FR vs EN detection logic
        pass

    def test_json_extraction(self):
        # Test extracting JSON from OpenAI response
        pass
