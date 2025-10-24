"""End-to-end workflow tests for estimate lifecycle."""

import pytest
from django.urls import reverse
from rest_framework import status
from unittest.mock import patch
from decimal import Decimal
from tests.factories import EstimateFactory, CustomerFactory, SignatureRequestFactory


@pytest.mark.workflow
class TestEstimateWorkflow:
    def test_complete_estimate_workflow(self, authenticated_client, user):
        """Test: create draft → finalize → send → sign → convert to invoice."""
        customer = CustomerFactory(user=user)

        # Step 1: Create draft estimate
        data = {
            'customer': customer.id,
            'draft_uuid': 'draft-123',
            'issue_date': '2025-01-15',
            'valid_until': '2025-02-15',
            'status': 'draft',
            'items': [
                {'description': 'Development', 'quantity': 40, 'rate': 100, 'amount': 4000}
            ],
            'subtotal_before_margin': '4000.00',
            'security_margin_percentage': '10.00',
            'security_margin_amount': '400.00',
            'subtotal': '4400.00',
            'tax_rate': '20.00',
            'tax_amount': '880.00',
            'total': '5280.00'
        }
        response = authenticated_client.post(reverse('estimate-list'), data, format='json')
        assert response.status_code == status.HTTP_201_CREATED
        estimate_id = response.data['id']

        # Step 2: Finalize estimate (assign number)
        estimate_url = reverse('estimate-detail', kwargs={'pk': estimate_id})
        response = authenticated_client.patch(
            estimate_url,
            {'status': 'sent', 'estimate_number': 'EST-2025-001'},
            format='json'
        )
        assert response.status_code == status.HTTP_200_OK

        # Step 3: Generate PDF
        with patch('invoicing.tasks.generate_estimate_pdf.delay') as mock_pdf:
            pdf_url = reverse('estimate-generate-pdf', kwargs={'pk': estimate_id})
            response = authenticated_client.post(pdf_url)
            assert response.status_code == status.HTTP_200_OK
            mock_pdf.assert_called_once()

        # Step 4: Send with signature request
        with patch('invoicing.tasks.send_estimate_email.delay') as mock_email:
            email_url = reverse('estimate-send-email', kwargs={'pk': estimate_id})
            response = authenticated_client.post(email_url)
            mock_email.assert_called_once()

        # Step 5: Customer signs (via signature request)
        # (This would be done via public token URL)

        # Step 6: Convert to invoice
        convert_url = reverse('estimate-convert-to-invoice', kwargs={'pk': estimate_id})
        response = authenticated_client.post(convert_url)
        assert response.status_code == status.HTTP_201_CREATED
        invoice = response.data
        assert invoice['customer'] == customer.id
        assert invoice['total'] == '5280.00'

    def test_estimate_versioning_workflow(self, authenticated_client, user):
        """Test creating estimate versions."""
        estimate = EstimateFactory(user=user, estimate_number='EST-001')

        version_url = reverse('estimate-create-version', kwargs={'pk': estimate.id})
        response = authenticated_client.post(version_url)

        assert response.status_code == status.HTTP_201_CREATED
        new_version = response.data
        assert new_version['parent_estimate'] == estimate.id

    def test_estimate_with_tjm_pricing(self, authenticated_client, user):
        """Test estimate using TJM (daily rate) pricing."""
        customer = CustomerFactory(user=user)

        data = {
            'customer': customer.id,
            'draft_uuid': 'draft-tjm-123',
            'issue_date': '2025-01-15',
            'valid_until': '2025-02-15',
            'status': 'draft',
            'use_tjm': True,
            'tjm_rate': '600.00',
            'tjm_days': '10.0',
            'items': [],
            'subtotal': '6000.00',
            'tax_rate': '20.00',
            'total': '7200.00'
        }
        response = authenticated_client.post(reverse('estimate-list'), data, format='json')
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['use_tjm'] is True
        assert response.data['tjm_rate'] == '600.00'

    def test_declined_estimate_workflow(self, authenticated_client, user):
        """Test estimate declined by customer."""
        estimate = EstimateFactory(user=user, status='sent')

        url = reverse('estimate-detail', kwargs={'pk': estimate.id})
        response = authenticated_client.patch(url, {'status': 'declined'}, format='json')

        assert response.status_code == status.HTTP_200_OK
        estimate.refresh_from_db()
        assert estimate.status == 'declined'
