"""Factory for Lead model."""

import factory
from factory.django import DjangoModelFactory
from factory.fuzzy import FuzzyChoice, FuzzyDecimal

from leads.models import Lead
from .user_factory import UserFactory


class LeadFactory(DjangoModelFactory):
    """Factory for creating Lead instances."""

    class Meta:
        model = Lead

    user = factory.SubFactory(UserFactory)
    name = factory.Faker('name')
    email = factory.Faker('email')
    phone = factory.Faker('phone_number')
    company = factory.Faker('company')
    status = FuzzyChoice(['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost'])
    source = FuzzyChoice(['website', 'referral', 'linkedin', 'cold_outreach', 'event', 'other'])
    value = FuzzyDecimal(1000.0, 50000.0, precision=2)
    probability = factory.Faker('random_int', min=0, max=100)
    notes = factory.Faker('text', max_nb_chars=500)
    expected_close_date = factory.Faker('future_date', end_date='+90d')
