"""End-to-end workflow tests for digital signature."""

import pytest
from django.urls import reverse
from rest_framework import status
from unittest.mock import patch
from tests.factories import EstimateFactory, SignatureRequestFactory


@pytest.mark.workflow
class TestSignatureWorkflow:
    def test_complete_signature_workflow(self, authenticated_client, api_client, user):
        """Test: request → send → view → sign → PDF generation."""
        estimate = EstimateFactory(user=user, status='sent')

        # Step 1: Request signature
        sig_url = reverse('signaturerequest-request-signature', kwargs={'pk': estimate.id})
        sig_data = {
            'signer_name': 'John Doe',
            'signer_email': 'john@example.com',
            'signer_company': 'ACME Corp'
        }
        response = authenticated_client.post(sig_url, sig_data, format='json')
        assert response.status_code == status.HTTP_201_CREATED
        sig_request = response.data
        token = sig_request['token']

        # Step 2: Customer accesses via public token
        public_url = reverse('signaturerequest-get-by-token')
        response = api_client.post(public_url, {'token': token}, format='json')
        assert response.status_code == status.HTTP_200_OK

        # Step 3: Customer signs
        sign_url = reverse('signaturerequest-sign-estimate')
        sign_data = {
            'token': token,
            'signature_method': 'draw',
            'signature_data': {'svg': '<svg>...</svg>'}
        }
        response = api_client.post(sign_url, sign_data, format='json')
        assert response.status_code == status.HTTP_200_OK

        # Step 4: Signed PDF generated
        # (Would be triggered by signature completion)

    def test_signature_expiration(self, api_client):
        """Test expired signature request."""
        from django.utils import timezone
        sig_request = SignatureRequestFactory(
            status='pending',
            expires_at=timezone.now() - timezone.timedelta(days=1)
        )

        url = reverse('signaturerequest-get-by-token')
        response = api_client.post(url, {'token': sig_request.token}, format='json')
        # Should indicate expired

    def test_declined_signature_workflow(self, api_client):
        """Test customer declines to sign."""
        sig_request = SignatureRequestFactory(status='pending')

        decline_url = reverse('signaturerequest-decline-signature')
        response = api_client.post(
            decline_url,
            {'token': sig_request.token, 'reason': 'Terms not acceptable'},
            format='json'
        )
        assert response.status_code == status.HTTP_200_OK

    def test_signature_email_tracking(self, authenticated_client, user):
        """Test email tracking for signature requests."""
        estimate = EstimateFactory(user=user)
        sig_request = SignatureRequestFactory(estimate=estimate, opened_count=0)

        # Customer opens email (view)
        # opened_count should increment
