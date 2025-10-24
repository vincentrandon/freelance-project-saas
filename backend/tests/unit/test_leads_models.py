"""Unit tests for Lead model."""

import pytest
from decimal import Decimal
from django.core.exceptions import ValidationError

from leads.models import Lead
from tests.factories import LeadFactory, UserFactory


@pytest.mark.unit
class TestLeadModel:
    """Tests for Lead model."""

    def test_create_lead_with_required_fields(self, user):
        """Test creating a lead with minimum required fields."""
        lead = Lead.objects.create(
            user=user,
            name='John Doe',
            status='new'
        )

        assert lead.id is not None
        assert lead.name == 'John Doe'
        assert lead.status == 'new'
        assert lead.user == user

    def test_create_lead_with_all_fields(self):
        """Test creating a lead with all fields."""
        lead = LeadFactory(
            name='Jane Smith',
            email='jane@example.com',
            phone='+1234567890',
            company='Tech Corp',
            status='qualified',
            source='linkedin',
            value=Decimal('15000.00'),
            probability=75,
            notes='Hot lead from conference'
        )

        assert lead.name == 'Jane Smith'
        assert lead.email == 'jane@example.com'
        assert lead.status == 'qualified'
        assert lead.source == 'linkedin'
        assert lead.value == Decimal('15000.00')
        assert lead.probability == 75

    def test_lead_str_representation(self):
        """Test the string representation of a lead."""
        lead = LeadFactory(name='ACME Corp')
        assert str(lead) == 'ACME Corp'

    def test_lead_status_choices(self, user):
        """Test that only valid statuses are accepted."""
        valid_statuses = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost']

        for status in valid_statuses:
            lead = Lead(user=user, name='Test', status=status)
            lead.full_clean()  # Should not raise

        # Invalid status should raise
        lead = Lead(user=user, name='Test', status='invalid_status')
        with pytest.raises(ValidationError) as exc_info:
            lead.full_clean()
        assert 'status' in exc_info.value.message_dict

    def test_lead_source_choices(self, user):
        """Test that only valid sources are accepted."""
        valid_sources = ['website', 'referral', 'linkedin', 'cold_outreach', 'event', 'other']

        for source in valid_sources:
            lead = Lead(user=user, name='Test', status='new', source=source)
            lead.full_clean()  # Should not raise

    def test_lead_probability_validation(self, user):
        """Test probability field validation (0-100)."""
        # Valid probabilities
        for prob in [0, 50, 100]:
            lead = Lead(user=user, name='Test', status='new', probability=prob)
            lead.full_clean()

        # Invalid probabilities
        for prob in [-1, 101, 150]:
            lead = Lead(user=user, name='Test', status='new', probability=prob)
            with pytest.raises(ValidationError):
                lead.full_clean()

    def test_lead_value_can_be_null(self, user):
        """Test that value can be null."""
        lead = Lead.objects.create(user=user, name='Test', status='new', value=None)
        assert lead.value is None

    def test_lead_email_validation(self, user):
        """Test email field validation."""
        lead = Lead(user=user, name='Test', status='new', email='invalid-email')
        with pytest.raises(ValidationError) as exc_info:
            lead.full_clean()
        assert 'email' in exc_info.value.message_dict

    def test_lead_user_isolation(self, user, user2):
        """Test that leads are isolated by user."""
        lead1 = LeadFactory(user=user, name='User1 Lead')
        lead2 = LeadFactory(user=user2, name='User2 Lead')

        user1_leads = Lead.objects.filter(user=user)
        user2_leads = Lead.objects.filter(user=user2)

        assert lead1 in user1_leads
        assert lead1 not in user2_leads
        assert lead2 in user2_leads
        assert lead2 not in user1_leads

    def test_lead_expected_close_date_can_be_null(self, user):
        """Test that expected close date is optional."""
        lead = Lead.objects.create(user=user, name='Test', status='new', expected_close_date=None)
        assert lead.expected_close_date is None

    def test_lead_timestamps(self):
        """Test created_at and updated_at timestamps."""
        lead = LeadFactory()
        assert lead.created_at is not None
        assert lead.updated_at is not None
        assert lead.updated_at >= lead.created_at

    def test_lead_update_changes_updated_at(self):
        """Test that updating a lead changes updated_at."""
        lead = LeadFactory(status='new')
        original_updated_at = lead.updated_at

        lead.status = 'contacted'
        lead.save()

        assert lead.updated_at > original_updated_at

    def test_lead_conversion_workflow(self, user):
        """Test a typical lead conversion workflow."""
        lead = Lead.objects.create(user=user, name='Prospect Corp', status='new', value=Decimal('10000'))

        # Progress through pipeline
        lead.status = 'contacted'
        lead.save()
        assert lead.status == 'contacted'

        lead.status = 'qualified'
        lead.probability = 50
        lead.save()

        lead.status = 'proposal'
        lead.probability = 75
        lead.save()

        lead.status = 'won'
        lead.probability = 100
        lead.save()
        assert lead.status == 'won'
        assert lead.probability == 100
