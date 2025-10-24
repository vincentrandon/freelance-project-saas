"""Factories for CRA and CRASignature models."""

import factory
from decimal import Decimal
from datetime import timedelta
from factory.django import DjangoModelFactory
from factory.fuzzy import FuzzyChoice, FuzzyDecimal
from django.utils import timezone

from cra.models import CRA, CRASignature
from .user_factory import UserFactory
from .customer_factory import CustomerFactory
from .project_factory import ProjectFactory, TaskFactory


class CRAFactory(DjangoModelFactory):
    """Factory for creating CRA instances."""

    class Meta:
        model = CRA

    user = factory.SubFactory(UserFactory)
    customer = factory.SubFactory(CustomerFactory, user=factory.SelfAttribute('..user'))
    project = factory.SubFactory(
        ProjectFactory,
        user=factory.SelfAttribute('..user'),
        customer=factory.SelfAttribute('..customer')
    )

    period_month = factory.Faker('pyint', min_value=1, max_value=12)
    period_year = factory.Faker('pyint', min_value=2020, max_value=2035)
    status = FuzzyChoice(['draft', 'pending_validation', 'validated', 'rejected'])

    # Pricing
    daily_rate = FuzzyDecimal(400.0, 1000.0, precision=2)
    total_days = FuzzyDecimal(5.0, 22.0, precision=1)
    total_amount = factory.LazyAttribute(
        lambda o: (Decimal(o.daily_rate) * Decimal(o.total_days)).quantize(Decimal('0.01'))
    )

    # Work dates
    selected_work_dates = factory.LazyFunction(lambda: [
        '2025-01-10',
        '2025-01-11',
        '2025-01-12',
        '2025-01-13',
        '2025-01-14'
    ])

    notes = factory.Faker('text', max_nb_chars=500)

    # Rejection tracking
    rejection_reason = factory.Maybe(
        factory.LazyAttribute(lambda o: o.status == 'rejected'),
        yes_declaration=factory.Faker('sentence'),
        no_declaration=''
    )

    @factory.post_generation
    def tasks(self, create, extracted, **kwargs):
        """Add tasks to the CRA."""
        if not create:
            return

        if extracted:
            for task in extracted:
                self.tasks.add(task)


class CRASignatureFactory(DjangoModelFactory):
    """Factory for creating CRASignature instances."""

    class Meta:
        model = CRASignature

    cra = factory.SubFactory(CRAFactory)
    token = factory.Faker('uuid4')
    signer_name = factory.Faker('name')
    signer_email = factory.Faker('email')
    signer_company = factory.Faker('company')
    status = FuzzyChoice(['pending', 'signed', 'expired', 'declined'])
    expires_at = factory.LazyFunction(lambda: timezone.now() + timedelta(days=7))

    # Email tracking
    email_sent_at = factory.LazyFunction(lambda: timezone.now())
    email_opened_count = factory.Faker('random_int', min=0, max=10)

    # Signature data
    signature_method = factory.Maybe(
        factory.LazyAttribute(lambda o: o.status == 'signed'),
        yes_declaration=FuzzyChoice(['draw', 'upload', 'type', 'digital']),
        no_declaration=''
    )
    signature_metadata = factory.LazyFunction(dict)
