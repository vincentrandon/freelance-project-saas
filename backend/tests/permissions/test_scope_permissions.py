"""Tests for scope-based permissions."""

import pytest
from django.urls import reverse
from rest_framework import status
from tests.factories import CustomerFactory


@pytest.mark.permissions
class TestScopePermissions:
    def test_context_read_scope(self, ai_token_client, user):
        client, token = ai_token_client
        CustomerFactory.create_batch(2, user=user)

        response = client.get(reverse('ai-context-customers'))
        assert response.status_code == status.HTTP_200_OK

    def test_action_create_scope(self, ai_token_client):
        client, token = ai_token_client
        data = {'name': 'New Customer', 'email': 'test@example.com'}

        response = client.post(reverse('ai-actions-customers'), data, format='json')
        assert response.status_code == status.HTTP_201_CREATED

    def test_missing_scope_denied(self, api_client, user):
        from ai_actions.models import AIServiceToken, generate_token_value
        raw_token = generate_token_value()
        token = AIServiceToken.objects.create(
            user=user,
            name='Limited Token',
            scopes=['context:read'],  # No create scope
            key_prefix='temp',
            token_hash='temp'
        )
        token.set_token(raw_token)
        token.save()

        api_client.credentials(HTTP_X_AI_SERVICE_TOKEN=raw_token)
        data = {'name': 'Customer'}

        response = api_client.post(reverse('ai-actions-customers'), data, format='json')
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_scope_wildcards(self):
        # Test wildcard scope matching if implemented
        pass

    def test_scope_inheritance(self):
        # Test if scopes can inherit from parent scopes
        pass
