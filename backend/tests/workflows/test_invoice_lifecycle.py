"""End-to-end workflow tests for invoice lifecycle."""

import pytest
from decimal import Decimal
from django.core import mail
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from unittest.mock import patch

from invoicing.models import Invoice
from tests.factories import InvoiceFactory, CustomerFactory, ProjectFactory


@pytest.mark.workflow
class TestInvoiceLifecycle:
    """Test complete invoice lifecycle from creation to payment."""

    def test_complete_invoice_workflow(self, authenticated_client, user):
        """Test full invoice workflow: create → send → pay."""
        # Step 1: Create customer and project
        customer = CustomerFactory(user=user)
        project = ProjectFactory(user=user, customer=customer)

        # Step 2: Create draft invoice
        url = reverse('invoice-list')
        invoice_data = {
            'customer': customer.id,
            'project': project.id,
            'invoice_number': 'INV-2025-001',
            'issue_date': '2025-01-15',
            'due_date': '2025-02-15',
            'status': 'draft',
            'items': [
                {
                    'description': 'Development services',
                    'quantity': 40,
                    'rate': 100,
                    'amount': 4000
                },
                {
                    'description': 'Consulting',
                    'quantity': 10,
                    'rate': 150,
                    'amount': 1500
                }
            ],
            'subtotal': '5500.00',
            'tax_rate': '20.00',
            'tax_amount': '1100.00',
            'total': '6600.00'
        }

        response = authenticated_client.post(url, invoice_data, format='json')
        assert response.status_code == status.HTTP_201_CREATED
        invoice_id = response.data['id']

        # Verify invoice created
        invoice = Invoice.objects.get(id=invoice_id)
        assert invoice.status == 'draft'
        assert invoice.total == Decimal('6600.00')

        # Step 3: Generate PDF
        with patch('invoicing.tasks.generate_invoice_pdf.delay') as mock_task:
            pdf_url = reverse('invoice-generate-pdf', kwargs={'pk': invoice_id})
            response = authenticated_client.post(pdf_url)

            assert response.status_code == status.HTTP_200_OK
            mock_task.assert_called_once_with(invoice_id)

        # Step 4: Send email to customer
        with patch('invoicing.tasks.send_invoice_email.delay') as mock_email_task:
            email_url = reverse('invoice-send-email', kwargs={'pk': invoice_id})
            response = authenticated_client.post(email_url)

            assert response.status_code == status.HTTP_200_OK
            mock_email_task.assert_called_once()

        # Update status to sent
        invoice.status = 'sent'
        invoice.save()

        # Step 5: Mark as paid
        payment_url = reverse('invoice-mark-paid', kwargs={'pk': invoice_id})
        payment_data = {
            'paid_amount': '6600.00',
            'payment_date': '2025-01-20',
            'payment_method': 'bank_transfer'
        }

        response = authenticated_client.post(payment_url, payment_data, format='json')

        assert response.status_code == status.HTTP_200_OK

        # Verify invoice is marked paid
        invoice.refresh_from_db()
        assert invoice.status == 'paid'
        assert invoice.paid_amount == Decimal('6600.00')
        assert invoice.payment_method == 'bank_transfer'

    @patch('invoicing.tasks.generate_invoice_pdf.delay')
    def test_create_credit_note_from_paid_invoice(self, mock_pdf_task, authenticated_client, user):
        """Test creating a credit note from a paid invoice."""
        # Create paid invoice
        invoice = InvoiceFactory(
            user=user,
            status='paid',
            total=Decimal('1000.00'),
            paid_amount=Decimal('1000.00')
        )

        # Create credit note
        credit_note_url = reverse('invoice-create-credit-note', kwargs={'pk': invoice.id})
        credit_note_data = {
            'reason': 'Customer returned product',
            'amount': '1000.00'
        }

        response = authenticated_client.post(credit_note_url, credit_note_data, format='json')

        assert response.status_code == status.HTTP_201_CREATED

        # Verify credit note created
        credit_note = Invoice.objects.get(id=response.data['id'])
        assert credit_note.status == 'credit_note'
        assert credit_note.original_invoice == invoice
        assert credit_note.total == Decimal('-1000.00')  # Negative amount

    def test_create_deposit_invoice_workflow(self, authenticated_client, user):
        """Test creating a deposit invoice (30%) followed by final invoice."""
        customer = CustomerFactory(user=user)
        project = ProjectFactory(user=user, customer=customer)

        # Step 1: Create main invoice (draft)
        main_invoice = InvoiceFactory(
            user=user,
            customer=customer,
            project=project,
            status='draft',
            total=Decimal('10000.00')
        )

        # Step 2: Create deposit invoice (30%)
        deposit_url = reverse('invoice-create-deposit', kwargs={'pk': main_invoice.id})
        deposit_data = {
            'deposit_percentage': '30.00'
        }

        response = authenticated_client.post(deposit_url, deposit_data, format='json')

        assert response.status_code == status.HTTP_201_CREATED

        # Verify deposit invoice
        deposit_invoice = Invoice.objects.get(id=response.data['id'])
        assert deposit_invoice.status == 'deposit'
        assert deposit_invoice.deposit_percentage == Decimal('30.00')
        assert deposit_invoice.total == Decimal('3000.00')  # 30% of 10000
        assert deposit_invoice.related_invoice == main_invoice

        # Step 3: Mark deposit as paid
        deposit_invoice.status = 'paid'
        deposit_invoice.paid_amount = Decimal('3000.00')
        deposit_invoice.save()

        # Step 4: Create final balance invoice (70%)
        balance_url = reverse('invoice-create-deposit', kwargs={'pk': main_invoice.id})
        balance_data = {
            'deposit_percentage': '70.00'
        }

        response = authenticated_client.post(balance_url, balance_data, format='json')

        balance_invoice = Invoice.objects.get(id=response.data['id'])
        assert balance_invoice.total == Decimal('7000.00')  # Remaining 70%

    def test_invoice_overdue_handling(self, authenticated_client, user):
        """Test handling overdue invoices."""
        # Create sent invoice with past due date
        invoice = InvoiceFactory(
            user=user,
            status='sent',
            due_date=timezone.now().date() - timezone.timedelta(days=10)
        )

        # Verify invoice is overdue
        is_overdue = invoice.due_date < timezone.now().date()
        assert is_overdue is True

        # Update status to overdue
        url = reverse('invoice-detail', kwargs={'pk': invoice.id})
        response = authenticated_client.patch(url, {'status': 'overdue'}, format='json')

        assert response.status_code == status.HTTP_200_OK

        invoice.refresh_from_db()
        assert invoice.status == 'overdue'

    def test_partial_payment_tracking(self, authenticated_client, user):
        """Test tracking partial payments on an invoice."""
        invoice = InvoiceFactory(
            user=user,
            status='sent',
            total=Decimal('5000.00')
        )

        # Record partial payment
        payment_url = reverse('invoice-mark-paid', kwargs={'pk': invoice.id})
        partial_payment = {
            'paid_amount': '2000.00',
            'payment_date': '2025-01-15',
            'payment_method': 'bank_transfer'
        }

        response = authenticated_client.post(payment_url, partial_payment, format='json')

        invoice.refresh_from_db()
        assert invoice.paid_amount == Decimal('2000.00')
        assert invoice.status == 'partially_invoiced'

        # Remaining balance
        remaining = invoice.total - invoice.paid_amount
        assert remaining == Decimal('3000.00')

    def test_invoice_cancellation(self, authenticated_client, user):
        """Test canceling a draft or sent invoice."""
        invoice = InvoiceFactory(user=user, status='sent')

        url = reverse('invoice-detail', kwargs={'pk': invoice.id})
        response = authenticated_client.patch(url, {'status': 'cancelled'}, format='json')

        assert response.status_code == status.HTTP_200_OK

        invoice.refresh_from_db()
        assert invoice.status == 'cancelled'

    def test_cannot_modify_paid_invoice(self, authenticated_client, user):
        """Test that paid invoices cannot be modified."""
        invoice = InvoiceFactory(
            user=user,
            status='paid',
            paid_amount=Decimal('1000.00')
        )

        url = reverse('invoice-detail', kwargs={'pk': invoice.id})
        response = authenticated_client.patch(
            url,
            {'items': [{'description': 'New item', 'quantity': 1, 'rate': 100}]},
            format='json'
        )

        # Should either be forbidden or validation error
        assert response.status_code in [status.HTTP_400_BAD_REQUEST, status.HTTP_403_FORBIDDEN]

    @patch('invoicing.tasks.send_invoice_email.delay')
    def test_email_notification_sent(self, mock_email_task, authenticated_client, user):
        """Test that email notification is sent when invoice is emailed."""
        invoice = InvoiceFactory(user=user, status='sent')

        email_url = reverse('invoice-send-email', kwargs={'pk': invoice.id})
        response = authenticated_client.post(email_url)

        assert response.status_code == status.HTTP_200_OK
        mock_email_task.assert_called_once()

    def test_invoice_with_multiple_line_items(self, authenticated_client, user):
        """Test invoice with complex line items."""
        customer = CustomerFactory(user=user)

        url = reverse('invoice-list')
        invoice_data = {
            'customer': customer.id,
            'invoice_number': 'INV-2025-002',
            'issue_date': '2025-01-15',
            'due_date': '2025-02-15',
            'status': 'draft',
            'items': [
                {'description': 'Frontend Dev', 'quantity': 40, 'rate': 100, 'amount': 4000},
                {'description': 'Backend Dev', 'quantity': 60, 'rate': 120, 'amount': 7200},
                {'description': 'Design', 'quantity': 20, 'rate': 80, 'amount': 1600},
                {'description': 'Testing', 'quantity': 15, 'rate': 90, 'amount': 1350},
            ],
            'subtotal': '14150.00',
            'tax_rate': '20.00',
            'tax_amount': '2830.00',
            'total': '16980.00'
        }

        response = authenticated_client.post(url, invoice_data, format='json')

        assert response.status_code == status.HTTP_201_CREATED
        assert len(response.data['items']) == 4
        assert response.data['total'] == '16980.00'
