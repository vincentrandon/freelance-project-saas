"""Integration tests for Estimate API endpoints."""

import pytest
from django.urls import reverse
from rest_framework import status
from unittest.mock import patch
from tests.factories import EstimateFactory, CustomerFactory


@pytest.mark.integration
class TestEstimateViewSet:
    def test_list_estimates(self, authenticated_client, user):
        EstimateFactory.create_batch(3, user=user)
        response = authenticated_client.get(reverse('estimate-list'))
        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 3

    def test_create_draft_estimate(self, authenticated_client, user):
        customer = CustomerFactory(user=user)
        data = {
            'customer': customer.id,
            'draft_uuid': 'test-uuid-123',
            'issue_date': '2025-01-15',
            'valid_until': '2025-02-15',
            'status': 'draft',
            'items': [],
            'subtotal': '0.00',
            'tax_rate': '20.00',
            'total': '0.00'
        }
        response = authenticated_client.post(reverse('estimate-list'), data, format='json')
        assert response.status_code == status.HTTP_201_CREATED

    @patch('invoicing.tasks.generate_estimate_pdf.delay')
    def test_generate_pdf(self, mock_task, authenticated_client, user):
        estimate = EstimateFactory(user=user)
        url = reverse('estimate-generate-pdf', kwargs={'pk': estimate.id})
        response = authenticated_client.post(url)
        assert response.status_code == status.HTTP_200_OK

    def test_create_version(self, authenticated_client, user):
        estimate = EstimateFactory(user=user, estimate_number='EST-001')
        url = reverse('estimate-create-version', kwargs={'pk': estimate.id})
        response = authenticated_client.post(url)
        assert response.status_code == status.HTTP_201_CREATED

    def test_convert_to_invoice(self, authenticated_client, user):
        estimate = EstimateFactory(user=user, status='accepted')
        url = reverse('estimate-convert-to-invoice', kwargs={'pk': estimate.id})
        response = authenticated_client.post(url)
        assert response.status_code == status.HTTP_201_CREATED

    def test_user_isolation(self, authenticated_client, user, user2):
        EstimateFactory.create_batch(2, user=user)
        EstimateFactory.create_batch(3, user=user2)
        response = authenticated_client.get(reverse('estimate-list'))
        assert len(response.data['results']) == 2
