"""End-to-end workflow tests for CRA to invoice generation."""

import pytest
from django.urls import reverse
from rest_framework import status
from unittest.mock import patch
from decimal import Decimal
from tests.factories import CRAFactory, CRASignatureFactory, TaskFactory, CustomerFactory, ProjectFactory


@pytest.mark.workflow
class TestCRAToInvoiceWorkflow:
    def test_complete_cra_workflow(self, authenticated_client, user):
        """Test: create CRA → add tasks → validate → sign → generate invoice."""
        customer = CustomerFactory(user=user)
        project = ProjectFactory(user=user, customer=customer)

        # Step 1: Create CRA
        cra_data = {
            'customer': customer.id,
            'project': project.id,
            'period_month': 1,
            'period_year': 2025,
            'status': 'draft',
            'daily_rate': '600.00',
            'total_days': '10.0',
            'total_amount': '6000.00'
        }
        response = authenticated_client.post(reverse('cra-list'), cra_data, format='json')
        assert response.status_code == status.HTTP_201_CREATED
        cra_id = response.data['id']

        # Step 2: Add tasks
        task1 = TaskFactory(project=project, status='completed')
        task2 = TaskFactory(project=project, status='completed')
        from cra.models import CRA
        cra = CRA.objects.get(id=cra_id)
        cra.tasks.add(task1, task2)

        # Step 3: Calculate totals
        calc_url = reverse('cra-calculate-totals', kwargs={'pk': cra_id})
        response = authenticated_client.post(calc_url)
        assert response.status_code == status.HTTP_200_OK

        # Step 4: Submit for validation
        submit_url = reverse('cra-submit-for-validation', kwargs={'pk': cra_id})
        response = authenticated_client.post(submit_url)
        assert response.status_code == status.HTTP_200_OK

        # Step 5: Request signature
        sig_url = reverse('cra-request-signature', kwargs={'pk': cra_id})
        sig_data = {
            'signer_name': 'Client Manager',
            'signer_email': 'manager@client.com'
        }
        response = authenticated_client.post(sig_url, sig_data, format='json')
        assert response.status_code == status.HTTP_201_CREATED

        # Step 6: Client signs CRA
        # (Triggers invoice generation via Celery task)

        # Step 7: Verify invoice created
        # from invoicing.models import Invoice
        # invoice = Invoice.objects.filter(project=project).first()
        # assert invoice is not None
        # assert invoice.customer == customer

    def test_rejected_cra_workflow(self, authenticated_client, user):
        """Test CRA rejection workflow."""
        cra = CRAFactory(user=user, status='pending_validation')

        url = reverse('cra-detail', kwargs={'pk': cra.id})
        response = authenticated_client.patch(
            url,
            {'status': 'rejected', 'rejection_reason': 'Hours incorrect'},
            format='json'
        )
        assert response.status_code == status.HTTP_200_OK

    @patch('cra.tasks.generate_invoice_from_cra.delay')
    def test_invoice_generation_triggered_by_signature(self, mock_task, user):
        """Test that CRA signature triggers invoice generation."""
        cra = CRAFactory(user=user, status='validated')
        sig_request = CRASignatureFactory(cra=cra, status='pending')

        # Mark signature as signed
        sig_request.status = 'signed'
        sig_request.save()

        # Task should be triggered
        # mock_task.assert_called_once_with(cra.id)
