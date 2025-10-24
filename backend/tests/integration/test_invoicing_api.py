"""Integration tests for Invoice API endpoints."""

import pytest
from django.urls import reverse
from rest_framework import status
from unittest.mock import patch
from tests.factories import InvoiceFactory, CustomerFactory
from decimal import Decimal


@pytest.mark.integration
class TestInvoiceViewSet:
    def test_list_invoices(self, authenticated_client, user):
        InvoiceFactory.create_batch(3, user=user)
        response = authenticated_client.get(reverse('invoice-list'))
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 3

    def test_create_invoice(self, authenticated_client, user):
        customer = CustomerFactory(user=user)
        data = {
            'customer': customer.id,
            'invoice_number': 'INV-001',
            'issue_date': '2025-01-15',
            'due_date': '2025-02-15',
            'status': 'draft',
            'items': [],
            'subtotal': '0.00',
            'tax_rate': '20.00',
            'total': '0.00'
        }
        response = authenticated_client.post(reverse('invoice-list'), data, format='json')
        assert response.status_code == status.HTTP_201_CREATED

    @patch('invoicing.tasks.generate_invoice_pdf.delay')
    def test_generate_pdf(self, mock_task, authenticated_client, user):
        invoice = InvoiceFactory(user=user)
        url = reverse('invoice-generate-pdf', kwargs={'pk': invoice.id})
        response = authenticated_client.post(url)
        assert response.status_code == status.HTTP_200_OK
        mock_task.assert_called_once()

    @patch('invoicing.tasks.send_invoice_email.delay')
    def test_send_email(self, mock_task, authenticated_client, user):
        invoice = InvoiceFactory(user=user, status='sent')
        url = reverse('invoice-send-email', kwargs={'pk': invoice.id})
        response = authenticated_client.post(url)
        assert response.status_code == status.HTTP_200_OK

    def test_mark_paid(self, authenticated_client, user):
        invoice = InvoiceFactory(user=user, status='sent')
        url = reverse('invoice-mark-paid', kwargs={'pk': invoice.id})
        data = {
            'paid_amount': str(invoice.total),
            'payment_date': '2025-01-20'
        }
        response = authenticated_client.post(url, data, format='json')
        assert response.status_code == status.HTTP_200_OK

    def test_create_credit_note(self, authenticated_client, user):
        invoice = InvoiceFactory(user=user, status='paid')
        url = reverse('invoice-create-credit-note', kwargs={'pk': invoice.id})
        data = {'reason': 'Refund', 'amount': str(invoice.total)}
        response = authenticated_client.post(url, data, format='json')
        assert response.status_code == status.HTTP_201_CREATED

    def test_create_deposit_invoice(self, authenticated_client, user):
        invoice = InvoiceFactory(user=user, status='draft')
        url = reverse('invoice-create-deposit', kwargs={'pk': invoice.id})
        data = {'deposit_percentage': '30.00'}
        response = authenticated_client.post(url, data, format='json')
        assert response.status_code == status.HTTP_201_CREATED

    def test_filter_by_status(self, authenticated_client, user):
        InvoiceFactory.create_batch(2, user=user, status='draft')
        InvoiceFactory.create_batch(3, user=user, status='sent')
        response = authenticated_client.get(reverse('invoice-list'), {'status': 'draft'})
        assert len(response.data['results']) == 2

    def test_user_isolation(self, authenticated_client, user, user2):
        InvoiceFactory.create_batch(2, user=user)
        InvoiceFactory.create_batch(3, user=user2)
        response = authenticated_client.get(reverse('invoice-list'))
        assert len(response.data['results']) == 2
