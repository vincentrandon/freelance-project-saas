"""Factory for UserProfile model."""

import factory
from decimal import Decimal
from factory.django import DjangoModelFactory
from factory.fuzzy import FuzzyChoice, FuzzyDecimal

from profiles.models import UserProfile
from .user_factory import UserFactory


class UserProfileFactory(DjangoModelFactory):
    """Factory for creating UserProfile instances."""

    class Meta:
        model = UserProfile

    user = factory.SubFactory(UserFactory)

    # Company information
    company_name = factory.Faker('company')
    company_address = factory.Faker('street_address')
    company_city = factory.Faker('city')
    company_postal_code = factory.Faker('postcode')
    company_country = factory.Faker('country')
    company_phone = factory.Faker('phone_number')
    company_website = factory.Faker('url')

    # Legal information
    tax_id = factory.Faker('ean13')
    siret_siren = factory.Sequence(lambda n: f'{n:014d}')

    # Bank details
    iban = factory.Faker('iban')
    bic = factory.Faker('swift')
    bank_name = factory.Faker('company')

    # Pricing settings
    tjm_default = FuzzyDecimal(400.0, 1000.0, precision=2)
    tjm_hours_per_day = Decimal('7.00')
    hourly_rate_default = factory.LazyAttribute(
        lambda o: o.tjm_default / o.tjm_hours_per_day if o.tjm_default else Decimal('100.00')
    )
    tjm_rates = factory.LazyFunction(lambda: {
        'development': 600,
        'consulting': 800,
        'training': 500
    })

    # Security margin settings
    default_security_margin = Decimal('10.00')
    show_security_margin_on_pdf = factory.Faker('boolean', chance_of_getting_true=50)

    # Payment settings
    payment_terms_days = 30
    default_tax_rate = Decimal('20.00')
    currency = FuzzyChoice(['EUR', 'USD', 'GBP'])

    # PDF customization
    footer_text = factory.Faker('sentence')
    primary_color = '#0066CC'
    show_logo = True

    # Digital signature
    signature_enabled = factory.Faker('boolean', chance_of_getting_true=30)

    # Terms
    estimate_terms = factory.Faker('text', max_nb_chars=500)
    invoice_terms = factory.Faker('text', max_nb_chars=500)

    # Onboarding
    onboarding_completed = factory.Faker('boolean', chance_of_getting_true=80)
    onboarding_step = factory.Faker('random_int', min=0, max=5)

    # Language
    language = FuzzyChoice(['en', 'fr'])
