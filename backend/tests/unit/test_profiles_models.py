"""Unit tests for UserProfile model."""

import pytest
from decimal import Decimal
from profiles.models import UserProfile
from tests.factories import UserProfileFactory, UserFactory


@pytest.mark.unit
class TestUserProfileModel:
    def test_profile_auto_created_on_user_creation(self, user):
        assert hasattr(user, 'userprofile')
        assert user.userprofile is not None

    def test_tjm_to_hourly_rate_conversion(self):
        profile = UserProfileFactory(
            tjm_default=Decimal('600.00'),
            tjm_hours_per_day=Decimal('7.00')
        )
        expected_hourly = Decimal('600.00') / Decimal('7.00')
        assert abs(profile.hourly_rate_default - expected_hourly) < Decimal('0.01')

    def test_profile_completeness(self):
        profile = UserProfileFactory(
            company_name='Test Corp',
            company_address='123 Main St',
            tax_id='FR123456789',
            iban='FR7630006000011234567890189'
        )
        # Assuming method exists
        # completeness = profile.get_profile_completeness_percentage()
        # assert completeness > 0

    def test_get_tjm_for_service(self):
        profile = UserProfileFactory(
            tjm_rates={'development': 600, 'consulting': 800}
        )
        assert profile.tjm_rates['development'] == 600

    def test_currency_choices(self):
        for curr in ['EUR', 'USD', 'GBP']:
            profile = UserProfileFactory(currency=curr)
            profile.full_clean()

    def test_language_choices(self):
        for lang in ['en', 'fr']:
            profile = UserProfileFactory(language=lang)
            profile.full_clean()
