"""Tests for AI service token authentication."""

import pytest
from django.urls import reverse
from rest_framework import status
from ai_actions.models import AIServiceToken, generate_token_value
from django.utils import timezone

from tests.factories import AIServiceTokenFactory


@pytest.mark.permissions
class TestAIServiceTokenAuthentication:
    def test_valid_token_authenticates(self, api_client, user):
        raw_token = generate_token_value()
        token = AIServiceTokenFactory(user=user)
        token.set_token(raw_token)
        token.save()

        api_client.credentials(HTTP_X_AI_SERVICE_TOKEN=raw_token)
        response = api_client.get(reverse('ai-context-customers'))
        assert response.status_code == status.HTTP_200_OK

    def test_invalid_token_fails(self, api_client):
        api_client.credentials(HTTP_X_AI_SERVICE_TOKEN='invalid-token')
        response = api_client.get(reverse('ai-context-customers'))
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_expired_token_fails(self, api_client, user):
        from datetime import timedelta
        token = AIServiceTokenFactory(user=user, expires_at=timezone.now() - timedelta(days=1))
        raw_token = token._raw_token

        api_client.credentials(HTTP_X_AI_SERVICE_TOKEN=raw_token)
        response = api_client.get(reverse('ai-context-customers'))

        assert response.status_code == status.HTTP_403_FORBIDDEN
        assert 'expired' in response.data['detail'].lower()

    def test_token_usage_tracking(self, api_client, user):
        token = AIServiceTokenFactory(user=user)
        raw_token = token._raw_token

        assert token.last_used_at is None
        api_client.credentials(HTTP_X_AI_SERVICE_TOKEN=raw_token)
        api_client.get(reverse('ai-context-customers'))

        token.refresh_from_db()
        assert token.last_used_at is not None

    def test_origin_restriction(self, api_client, user):
        token = AIServiceTokenFactory(user=user, allowed_origins=['https://app.example.com'])
        raw_token = token._raw_token

        api_client.credentials(HTTP_X_AI_SERVICE_TOKEN=raw_token, HTTP_ORIGIN='https://other.example.com')
        response = api_client.get(reverse('ai-context-customers'))

        assert response.status_code == status.HTTP_200_OK

    def test_token_prefix_lookup_performance(self, user):
        token = AIServiceTokenFactory(user=user)
        prefix = token.key_prefix

        resolved = AIServiceToken.objects.get(key_prefix=prefix)
        assert resolved == token
