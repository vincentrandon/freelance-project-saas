"""Unit tests for CRA models."""

import uuid
from datetime import timedelta

import pytest
from decimal import Decimal
from django.utils import timezone

from cra.models import CRA, CRASignature
from tests.factories import CRAFactory, CRASignatureFactory, TaskFactory


@pytest.mark.unit
class TestCRAModel:
    def test_create_cra(self, user):
        from tests.factories import CustomerFactory, ProjectFactory
        customer = CustomerFactory(user=user)
        project = ProjectFactory(user=user, customer=customer)
        cra = CRA.objects.create(
            user=user,
            customer=customer,
            project=project,
            period_month=1,
            period_year=2025,
            status='draft',
            daily_rate=Decimal('600.00'),
            total_days=Decimal('10.0'),
            total_amount=Decimal('6000.00')
        )
        assert cra.id is not None

    def test_cra_status_choices(self):
        for status in ['draft', 'pending_validation', 'validated', 'rejected']:
            cra = CRAFactory(status=status)
            cra.full_clean()

    def test_total_calculation(self):
        cra = CRAFactory(
            daily_rate=Decimal('500.00'),
            total_days=Decimal('12.0')
        )
        expected = (Decimal('500.00') * Decimal('12.0')).quantize(Decimal('0.01'))
        assert cra.total_amount == expected

    def test_period_display(self):
        cra = CRAFactory(period_month=1, period_year=2025)
        assert cra.period_display == 'Janvier 2025'

    def test_user_isolation(self, user, user2):
        cra1 = CRAFactory(user=user)
        cra2 = CRAFactory(user=user2)
        assert cra1 not in CRA.objects.filter(user=user2)


@pytest.mark.unit
class TestCRASignatureModel:
    def test_create_signature(self):
        cra = CRAFactory()
        sig = CRASignature.objects.create(
            cra=cra,
            token=uuid.uuid4(),
            signer_name='John Doe',
            signer_email='john@example.com',
            status='pending',
            expires_at=timezone.now() + timedelta(days=7),
            signature_method=''
        )
        assert sig.id is not None

    def test_signature_status_choices(self):
        for status in ['pending', 'signed', 'expired', 'declined']:
            sig = CRASignatureFactory(status=status)
            sig.full_clean()

    def test_mark_signed(self):
        sig = CRASignatureFactory(status='pending')
        sig.status = 'signed'
        sig.save()
        assert sig.status == 'signed'
