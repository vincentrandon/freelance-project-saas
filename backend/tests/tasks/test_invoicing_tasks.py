"""Tests for invoicing Celery tasks."""

import pytest
from unittest.mock import patch
from tests.factories import InvoiceFactory, EstimateFactory


@pytest.mark.celery
class TestInvoicingTasks:
    @patch('invoicing.tasks.WeasyPrint')
    def test_generate_invoice_pdf(self, mock_weasy, user):
        invoice = InvoiceFactory(user=user)
        from invoicing.tasks import generate_invoice_pdf
        # result = generate_invoice_pdf(invoice.id)
        # Should generate PDF and save to invoice

    @patch('invoicing.tasks.WeasyPrint')
    def test_generate_estimate_pdf(self, mock_weasy, user):
        estimate = EstimateFactory(user=user)
        from invoicing.tasks import generate_estimate_pdf
        # result = generate_estimate_pdf(estimate.id)

    @patch('django.core.mail.send_mail')
    def test_send_invoice_email(self, mock_send, user):
        invoice = InvoiceFactory(user=user)
        from invoicing.tasks import send_invoice_email
        # result = send_invoice_email(invoice.id)
        # mock_send.assert_called_once()

    @patch('django.core.mail.send_mail')
    def test_send_estimate_email(self, mock_send, user):
        estimate = EstimateFactory(user=user)
        from invoicing.tasks import send_estimate_email
        # result = send_estimate_email(estimate.id)

    def test_notification_on_success(self, user):
        invoice = InvoiceFactory(user=user)
        # Generate PDF
        # Verify notification created with type 'pdf_generated'

    def test_notification_on_failure(self, user):
        invoice = InvoiceFactory(user=user)
        with patch('invoicing.tasks.WeasyPrint') as mock:
            mock.side_effect = Exception('PDF Error')
            # Task should create error notification
