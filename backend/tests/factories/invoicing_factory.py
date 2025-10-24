"""Factories for Invoice, Estimate, and SignatureRequest models."""

import factory
from decimal import Decimal
from factory.django import DjangoModelFactory
from factory.fuzzy import FuzzyChoice, FuzzyDecimal

from invoicing.models import Invoice, Estimate, SignatureRequest
from .user_factory import UserFactory
from .customer_factory import CustomerFactory
from .project_factory import ProjectFactory


class InvoiceFactory(DjangoModelFactory):
    """Factory for creating Invoice instances."""

    class Meta:
        model = Invoice

    user = factory.SubFactory(UserFactory)
    customer = factory.SubFactory(CustomerFactory, user=factory.SelfAttribute('..user'))
    project = None  # Set explicitly in tests if needed

    invoice_number = factory.Sequence(lambda n: f'INV-2025-{n:04d}')
    issue_date = factory.Faker('date_this_year')
    due_date = factory.Faker('future_date', end_date='+60d')
    status = FuzzyChoice(['draft', 'sent', 'paid', 'overdue', 'cancelled'])

    # Line items as JSON (field name is 'items' not 'line_items')
    items = factory.LazyFunction(lambda: [
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
    ])

    subtotal = Decimal('5500.00')
    tax_rate = Decimal('20.00')
    tax_amount = Decimal('1100.00')
    total = Decimal('6600.00')

    notes = factory.Faker('text', max_nb_chars=200)


class EstimateFactory(DjangoModelFactory):
    """Factory for creating Estimate instances."""

    class Meta:
        model = Estimate

    user = factory.SubFactory(UserFactory)
    customer = factory.SubFactory(CustomerFactory, user=factory.SelfAttribute('..user'))
    project = None  # Set explicitly in tests if needed

    # Draft UUID for drafts, estimate_number for finalized
    draft_uuid = factory.Faker('uuid4')
    estimate_number = None

    issue_date = factory.Faker('date_this_year')
    valid_until = factory.Faker('future_date', end_date='+60d')
    status = FuzzyChoice(['draft', 'sent', 'accepted', 'declined', 'expired', 'converted'])

    # Line items as JSON (field name is 'items' not 'line_items')
    items = factory.LazyFunction(lambda: [
        {
            'description': 'Project setup',
            'quantity': 8,
            'rate': 100,
            'amount': 800
        },
        {
            'description': 'Implementation',
            'quantity': 40,
            'rate': 100,
            'amount': 4000
        }
    ])

    subtotal_before_margin = Decimal('4800.00')
    security_margin_percentage = Decimal('10.00')
    security_margin_amount = Decimal('480.00')
    subtotal = Decimal('5280.00')
    tax_rate = Decimal('20.00')
    tax_amount = Decimal('1056.00')
    total = Decimal('6336.00')

    notes = factory.Faker('text', max_nb_chars=200)

    # TJM support (field name is tjm_used, total_days)
    tjm_used = factory.Faker('boolean', chance_of_getting_true=30)
    total_days = factory.Maybe(
        'tjm_used',
        yes_declaration=FuzzyDecimal(5.0, 60.0, precision=1),
        no_declaration=None
    )

    # Digital signature
    signature_status = FuzzyChoice(['none', 'requested', 'signed', 'declined'])

    # AI generation
    ai_generated = factory.Faker('boolean', chance_of_getting_true=20)


class SignatureRequestFactory(DjangoModelFactory):
    """Factory for creating SignatureRequest instances."""

    class Meta:
        model = SignatureRequest

    estimate = factory.SubFactory(EstimateFactory)
    token = factory.Faker('uuid4')
    signer_name = factory.Faker('name')
    signer_email = factory.Faker('email')
    signer_company = factory.Faker('company')
    status = FuzzyChoice(['pending', 'signed', 'expired', 'declined'])
    expires_at = factory.Faker('future_date', end_date='+30d')

    # Email tracking
    sent_at = factory.Faker('date_time_this_month')
    opened_count = factory.Faker('random_int', min=0, max=10)
    last_opened_at = factory.Maybe(
        factory.LazyAttribute(lambda o: o.opened_count > 0),
        yes_declaration=factory.Faker('date_time_this_month'),
        no_declaration=None
    )
