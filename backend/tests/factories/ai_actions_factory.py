"""Factories for AI Actions models."""

import factory
from factory.django import DjangoModelFactory
from factory.fuzzy import FuzzyChoice

from ai_actions.models import AIServiceToken, AIActionLog, generate_token_value
from .user_factory import UserFactory


class AIServiceTokenFactory(DjangoModelFactory):
    """Factory for creating AIServiceToken instances."""

    class Meta:
        model = AIServiceToken

    user = factory.SubFactory(UserFactory)
    name = factory.Sequence(lambda n: f'AI Token {n}')

    scopes = factory.LazyFunction(lambda: [
        'context:read',
        'context:customers',
        'actions:customers.create'
    ])

    key_prefix = 'temp'
    token_hash = 'temp'

    allowed_origins = factory.Maybe(
        factory.Faker('boolean', chance_of_getting_true=30),
        yes_declaration=factory.LazyFunction(lambda: ['https://app.example.com']),
        no_declaration=factory.LazyFunction(list)
    )

    expires_at = factory.Faker('future_date', end_date='+365d')
    is_active = True
    last_used_at = None

    @factory.post_generation
    def set_real_token(obj, create, extracted, **kwargs):
        """Set a real hashed token after creation."""
        if not create:
            return

        raw_token = extracted if extracted else generate_token_value()
        obj.set_token(raw_token)
        obj.save(update_fields=['key_prefix', 'token_hash'])

        # Store raw token as an attribute for testing (not saved to DB)
        obj._raw_token = raw_token


class AIActionLogFactory(DjangoModelFactory):
    """Factory for creating AIActionLog instances."""

    class Meta:
        model = AIActionLog

    token = factory.SubFactory(AIServiceTokenFactory)
    user = factory.SelfAttribute('token.user')
    action_type = FuzzyChoice(
        [
            'context:customers',
            'actions:customers.create',
            'actions:estimates.create',
            'actions:invoices.create',
        ]
    )
    path = factory.Faker('uri_path')
    method = FuzzyChoice(['GET', 'POST', 'PUT'])
    status = FuzzyChoice(['success', 'error', 'denied'])

    request_payload = factory.LazyFunction(
        lambda: {
            'name': 'Test Company',
            'email': 'test@example.com',
        }
    )

    response_payload = factory.Maybe(
        factory.LazyAttribute(lambda o: o.status == 'success'),
        yes_declaration=factory.LazyFunction(
            lambda: {
                'id': 123,
                'created_at': '2025-01-15T10:00:00Z',
            }
        ),
        no_declaration=factory.LazyFunction(dict),
    )

    error_message = factory.Maybe(
        factory.LazyAttribute(lambda o: o.status in ['error', 'denied']),
        yes_declaration=factory.Faker('sentence'),
        no_declaration=''
    )

    metadata = factory.LazyFunction(
        lambda: {
            'ip_address': '192.168.1.1',
            'user_agent': 'Mozilla/5.0',
        }
    )
