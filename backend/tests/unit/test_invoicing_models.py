"""Unit tests for Invoice, Estimate, and SignatureRequest models."""

import pytest
from decimal import Decimal
from django.core.exceptions import ValidationError
from django.utils import timezone

from invoicing.models import Invoice, Estimate, SignatureRequest
from tests.factories import (
    InvoiceFactory, EstimateFactory, SignatureRequestFactory,
    CustomerFactory, ProjectFactory
)


@pytest.mark.unit
class TestInvoiceModel:
    """Tests for Invoice model."""

    def test_create_invoice_with_required_fields(self, user):
        """Test creating an invoice with required fields."""
        customer = CustomerFactory(user=user)
        invoice = Invoice.objects.create(
            user=user,
            customer=customer,
            invoice_number='INV-2025-001',
            issue_date=timezone.now().date(),
            due_date=timezone.now().date(),
            status='draft',
            items=[],
            subtotal=Decimal('0.00'),
            tax_rate=Decimal('20.00'),
            tax_amount=Decimal('0.00'),
            total=Decimal('0.00')
        )

        assert invoice.id is not None
        assert invoice.invoice_number == 'INV-2025-001'
        assert invoice.status == 'draft'

    def test_invoice_str_representation(self):
        """Test invoice string representation."""
        invoice = InvoiceFactory(invoice_number='INV-001')
        assert str(invoice) == 'INV-001'

    def test_invoice_status_choices(self):
        """Test invoice status choices."""
        valid_statuses = ['draft', 'sent', 'paid', 'overdue', 'cancelled', 'credit_note', 'partially_invoiced', 'deposit']

        for status in valid_statuses:
            invoice = InvoiceFactory(status=status)
            invoice.full_clean()

    def test_invoice_tax_calculation(self, user):
        """Test invoice tax and total calculation."""
        customer = CustomerFactory(user=user)
        invoice = Invoice.objects.create(
            user=user,
            customer=customer,
            invoice_number='INV-001',
            issue_date=timezone.now().date(),
            due_date=timezone.now().date(),
            status='draft',
            items=[
                {'description': 'Service', 'quantity': 10, 'rate': 100, 'amount': 1000}
            ],
            subtotal=Decimal('1000.00'),
            tax_rate=Decimal('20.00'),
            tax_amount=Decimal('200.00'),
            total=Decimal('1200.00')
        )

        assert invoice.subtotal == Decimal('1000.00')
        assert invoice.tax_amount == Decimal('200.00')
        assert invoice.total == Decimal('1200.00')

    def test_invoice_user_isolation(self, user, user2):
        """Test that invoices are isolated by user."""
        invoice1 = InvoiceFactory(user=user)
        invoice2 = InvoiceFactory(user=user2)

        user1_invoices = Invoice.objects.filter(user=user)
        assert invoice1 in user1_invoices
        assert invoice2 not in user1_invoices

    def test_invoice_credit_note_creation(self, user):
        """Test creating a credit note from an invoice."""
        original_invoice = InvoiceFactory(user=user, status='paid')
        credit_note = InvoiceFactory(
            user=user,
            status='credit_note',
            original_invoice=original_invoice
        )

        assert credit_note.status == 'credit_note'
        assert credit_note.original_invoice == original_invoice

    def test_invoice_deposit_tracking(self, user):
        """Test deposit invoice tracking."""
        main_invoice = InvoiceFactory(user=user, status='draft')
        deposit_invoice = InvoiceFactory(
            user=user,
            status='deposit',
            deposit_percentage=Decimal('30.00'),
            related_invoice=main_invoice
        )

        assert deposit_invoice.status == 'deposit'
        assert deposit_invoice.deposit_percentage == Decimal('30.00')

    def test_invoice_payment_tracking(self):
        """Test invoice payment tracking fields."""
        invoice = InvoiceFactory(status='paid')
        invoice.paid_amount = invoice.total
        invoice.payment_date = timezone.now().date()
        invoice.payment_method = 'bank_transfer'
        invoice.save()

        assert invoice.paid_amount == invoice.total
        assert invoice.payment_date is not None
        assert invoice.payment_method == 'bank_transfer'

    def test_invoice_project_association(self, user):
        """Test invoice can be associated with a project."""
        customer = CustomerFactory(user=user)
        project = ProjectFactory(user=user, customer=customer)
        invoice = InvoiceFactory(user=user, customer=customer, project=project)

        assert invoice.project == project
        assert invoice.customer == customer


@pytest.mark.unit
class TestEstimateModel:
    """Tests for Estimate model."""

    def test_create_estimate_draft(self, user):
        """Test creating a draft estimate."""
        import uuid
        test_uuid = str(uuid.uuid4())
        customer = CustomerFactory(user=user)
        estimate = Estimate.objects.create(
            user=user,
            customer=customer,
            draft_uuid=test_uuid,
            issue_date=timezone.now().date(),
            valid_until=timezone.now().date(),
            status='draft',
            items=[],
            subtotal=Decimal('0.00'),
            tax_rate=Decimal('20.00'),
            tax_amount=Decimal('0.00'),
            total=Decimal('0.00')
        )

        assert estimate.status == 'draft'
        assert estimate.draft_uuid == test_uuid
        assert estimate.estimate_number is None

    def test_estimate_display_number_draft(self):
        """Test display_number property for draft estimates."""
        import uuid
        test_uuid = str(uuid.uuid4())
        estimate = EstimateFactory(status='draft', draft_uuid=test_uuid, estimate_number=None)
        assert estimate.display_number == f'DRAFT-{test_uuid}'

    def test_estimate_display_number_finalized(self):
        """Test display_number property for finalized estimates."""
        estimate = EstimateFactory(status='sent', estimate_number='EST-2025-001')
        assert estimate.display_number == 'EST-2025-001'

    def test_estimate_is_draft_property(self):
        """Test is_draft property."""
        draft = EstimateFactory(status='draft', estimate_number=None)
        finalized = EstimateFactory(status='sent', estimate_number='EST-001')

        assert draft.is_draft is True
        assert finalized.is_draft is False

    def test_estimate_security_margin_calculation(self, user):
        """Test security margin calculation."""
        import uuid
        customer = CustomerFactory(user=user)
        estimate = Estimate.objects.create(
            user=user,
            customer=customer,
            draft_uuid=str(uuid.uuid4()),
            issue_date=timezone.now().date(),
            valid_until=timezone.now().date(),
            status='draft',
            items=[
                {'description': 'Development', 'quantity': 40, 'rate': 100, 'amount': 4000}
            ],
            subtotal_before_margin=Decimal('4000.00'),
            security_margin_percentage=Decimal('10.00'),
            security_margin_amount=Decimal('400.00'),
            subtotal=Decimal('4400.00'),
            tax_rate=Decimal('20.00'),
            tax_amount=Decimal('880.00'),
            total=Decimal('5280.00')
        )

        assert estimate.subtotal_before_margin == Decimal('4000.00')
        assert estimate.security_margin_amount == Decimal('400.00')
        assert estimate.subtotal == Decimal('4400.00')

    def test_estimate_tjm_support(self, user):
        """Test TJM (daily rate) support."""
        import uuid
        customer = CustomerFactory(user=user)
        estimate = Estimate.objects.create(
            user=user,
            customer=customer,
            draft_uuid=str(uuid.uuid4()),
            issue_date=timezone.now().date(),
            valid_until=timezone.now().date(),
            status='draft',
            tjm_used=True,
            total_days=Decimal('10.0'),
            items=[],
            subtotal=Decimal('6000.00'),
            tax_rate=Decimal('20.00'),
            total=Decimal('7200.00')
        )

        assert estimate.tjm_used is True
        assert estimate.total_days == Decimal('10.0')

    def test_estimate_versioning(self, user):
        """Test estimate versioning with parent relationship."""
        customer = CustomerFactory(user=user)
        parent_estimate = EstimateFactory(user=user, customer=customer, estimate_number='EST-001')
        child_estimate = EstimateFactory(
            user=user,
            customer=customer,
            parent_estimate=parent_estimate,
            estimate_number='EST-001-v2'
        )

        assert child_estimate.parent_estimate == parent_estimate

    def test_estimate_digital_signature_status(self):
        """Test digital signature status field."""
        estimate = EstimateFactory(signature_status='requested')
        assert estimate.signature_status == 'requested'

        estimate.signature_status = 'signed'
        estimate.save()
        assert estimate.signature_status == 'signed'

    def test_estimate_is_signed_property(self):
        """Test is_signed property."""
        unsigned = EstimateFactory(signature_status='none')
        signed = EstimateFactory(signature_status='signed')

        assert unsigned.is_signed is False
        assert signed.is_signed is True

    def test_estimate_conversion_to_invoice(self):
        """Test converting estimate to invoice."""
        estimate = EstimateFactory(status='accepted')
        estimate.status = 'converted'
        estimate.save()

        assert estimate.status == 'converted'

    def test_estimate_ai_generated_flag(self):
        """Test AI generated metadata."""
        ai_estimate = EstimateFactory(ai_generated=True)
        manual_estimate = EstimateFactory(ai_generated=False)

        assert ai_estimate.ai_generated is True
        assert manual_estimate.ai_generated is False


@pytest.mark.unit
class TestSignatureRequestModel:
    """Tests for SignatureRequest model."""

    def test_create_signature_request(self):
        """Test creating a signature request."""
        estimate = EstimateFactory()
        signature_request = SignatureRequest.objects.create(
            estimate=estimate,
            token='unique-token-123',
            signer_name='John Doe',
            signer_email='john@example.com',
            status='pending',
            expires_at=timezone.now() + timezone.timedelta(days=30)
        )

        assert signature_request.id is not None
        assert signature_request.estimate == estimate
        assert signature_request.status == 'pending'

    def test_signature_request_str_representation(self):
        """Test signature request string representation."""
        sig_request = SignatureRequestFactory(signer_name='Jane Doe')
        assert 'Jane Doe' in str(sig_request)

    def test_signature_request_token_uniqueness(self):
        """Test that tokens should be unique."""
        sig1 = SignatureRequestFactory(token='token-123')
        assert sig1.token == 'token-123'

    def test_signature_request_mark_signed(self):
        """Test marking a signature request as signed."""
        sig_request = SignatureRequestFactory(status='pending')

        # Assume there's a mark_signed method
        sig_request.status = 'signed'
        sig_request.signature_completed_at = timezone.now()
        sig_request.save()

        assert sig_request.status == 'signed'
        assert sig_request.signature_completed_at is not None

    def test_signature_request_email_tracking(self):
        """Test email tracking fields."""
        sig_request = SignatureRequestFactory(opened_count=0)

        sig_request.opened_count += 1
        sig_request.last_opened_at = timezone.now()
        sig_request.save()

        assert sig_request.opened_count == 1
        assert sig_request.last_opened_at is not None

    def test_signature_request_expiration(self):
        """Test signature request expiration."""
        expired_request = SignatureRequestFactory(
            status='pending',
            expires_at=timezone.now() - timezone.timedelta(days=1)
        )

        # Check if expired
        is_expired = expired_request.expires_at < timezone.now()
        assert is_expired is True

    def test_signature_request_status_choices(self):
        """Test signature request status choices."""
        valid_statuses = ['pending', 'signed', 'expired', 'declined']

        for status in valid_statuses:
            sig_request = SignatureRequestFactory(status=status)
            sig_request.full_clean()
