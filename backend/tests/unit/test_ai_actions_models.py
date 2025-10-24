"""Unit tests for AI Actions models."""

import pytest
from ai_actions.models import AIServiceToken, AIActionLog, generate_token_value
from tests.factories import AIServiceTokenFactory, AIActionLogFactory


@pytest.mark.unit
class TestAIServiceTokenModel:
    def test_create_token(self, user):
        raw_token = generate_token_value()
        token = AIServiceToken.objects.create(
            user=user,
            name='Test Token',
            scopes=['context:read'],
            key_prefix='temp',
            token_hash='temp'
        )
        token.set_token(raw_token)
        token.save()
        assert token.id is not None
        assert token.check_token(raw_token) is True

    def test_token_scopes(self):
        token = AIServiceTokenFactory()
        assert isinstance(token.scopes, list)

    def test_has_scopes(self):
        token = AIServiceTokenFactory(scopes=['context:read', 'actions:customers.create'])
        assert token.has_scopes(['context:read']) is True
        assert token.has_scopes(['context:read', 'actions:customers.create']) is True
        assert token.has_scopes(['missing:scope']) is False

    def test_token_expiration(self):
        from django.utils import timezone
        from datetime import timedelta
        token = AIServiceTokenFactory(expires_at=timezone.now() - timedelta(days=1))
        assert token.is_expired() is True

    def test_user_isolation(self, user, user2):
        token1 = AIServiceTokenFactory(user=user)
        token2 = AIServiceTokenFactory(user=user2)
        assert token1 not in AIServiceToken.objects.filter(user=user2)


@pytest.mark.unit
class TestAIActionLogModel:
    def test_create_log(self):
        token = AIServiceTokenFactory()
        log = AIActionLog.objects.create(
            token=token,
            user=token.user,
            action_type='actions:customers.create',
            path='/api/ai-actions/customers/',
            method='POST',
            status='success',
            request_payload={},
        )
        assert log.id is not None

    def test_log_status_choices(self):
        for status in ['success', 'error', 'denied']:
            log = AIActionLogFactory(status=status)
            log.full_clean()

    def test_error_tracking(self):
        log = AIActionLogFactory(status='error', error_message='API error')
        assert log.error_message == 'API error'
