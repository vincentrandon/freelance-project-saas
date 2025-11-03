from django.db import models
from django.contrib.auth.models import User
from django.utils.translation import gettext_lazy as _
from customers.models import Customer
from projects.models import Project
import uuid


class Invoice(models.Model):
    """Model for invoices"""

    STATUS_CHOICES = [
        ('draft', _('Draft')),
        ('sent', _('Sent')),
        ('paid', _('Paid')),
        ('overdue', _('Overdue')),
        ('cancelled', _('Cancelled')),
        ('credit_note', _('Credit Note')),
        ('partially_invoiced', _('Partially Invoiced')),
        ('deposit', _('Deposit Invoice')),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='invoices')
    customer = models.ForeignKey(Customer, on_delete=models.PROTECT, related_name='invoices')
    project = models.ForeignKey(Project, on_delete=models.SET_NULL, null=True, blank=True, related_name='invoices')
    invoice_number = models.CharField(max_length=50, unique=True)
    issue_date = models.DateField()
    due_date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    items = models.JSONField(default=list, help_text=_("Line items: [{description, quantity, unit, rate, amount}]"))
    subtotal = models.DecimalField(max_digits=12, decimal_places=2)
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0, help_text=_("Tax rate as percentage"))
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3, default='EUR')
    notes = models.TextField(blank=True)
    pdf_file = models.FileField(upload_to='invoices/%Y/%m/', blank=True, null=True)

    # Credit Note fields (Facture d'Avoir - French law compliance)
    is_credit_note = models.BooleanField(default=False, help_text=_("Is this a credit note (facture d'avoir)?"))
    original_invoice = models.ForeignKey(
        'self',
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='credit_notes',
        help_text=_("Original invoice if this is a credit note")
    )
    credit_note_reason = models.TextField(blank=True, help_text=_("Reason for cancellation/credit note"))

    # Payment tracking fields
    paid_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        help_text=_("Amount already paid")
    )
    payment_date = models.DateField(null=True, blank=True, help_text=_("Date of (last) payment"))
    payment_method = models.CharField(
        max_length=50,
        blank=True,
        help_text=_("Payment method (bank_transfer, check, cash, credit_card, paypal, other)")
    )

    # Link to source estimate (if converted)
    source_estimate = models.ForeignKey(
        'Estimate',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='converted_invoices',
        help_text=_("Source estimate if this invoice was converted from an estimate")
    )

    # Link to source CRA (if generated from activity report)
    source_cra = models.ForeignKey(
        'cra.CRA',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='generated_invoices',
        help_text=_("Source CRA if this invoice was generated from an activity report")
    )

    # Deposit invoice fields (Facture d'Acompte - French law)
    is_deposit_invoice = models.BooleanField(
        default=False,
        help_text=_("Is this a deposit invoice (facture d'acompte)?")
    )
    parent_invoice = models.ForeignKey(
        'self',
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='deposit_invoices',
        help_text=_("Parent invoice if this is a deposit invoice")
    )
    deposit_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        help_text=_("Percentage of total for this deposit (e.g., 30.00 for 30%)")
    )

    # Final balance invoice fields (SOLDE)
    is_final_balance_invoice = models.BooleanField(
        default=False,
        help_text=_("Is this a final balance invoice (SOLDE) consolidating all deposits?")
    )
    # Note: parent_invoice field (above) is reused for SOLDE invoices to link back to original

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-issue_date', '-created_at']
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['customer']),
            models.Index(fields=['invoice_number']),
            models.Index(fields=['due_date']),
        ]

    def __str__(self):
        return f"Invoice {self.invoice_number} - {self.customer.name}"

    @property
    def total_deposits_amount(self):
        """Calculate total amount of deposit invoices issued for this invoice"""
        from django.db.models import Sum
        from decimal import Decimal
        total = self.deposit_invoices.aggregate(Sum('total'))['total__sum']
        return total if total is not None else Decimal('0')

    @property
    def remaining_balance(self):
        """Calculate remaining balance after deposits"""
        return self.total - self.total_deposits_amount

    def save(self, *args, **kwargs):
        # Auto-calculate totals
        self.tax_amount = (self.subtotal * self.tax_rate) / 100
        self.total = self.subtotal + self.tax_amount
        super().save(*args, **kwargs)


class Estimate(models.Model):
    """Model for estimates/quotes with TJM, margins, versioning, and signature support"""

    STATUS_CHOICES = [
        ('draft', _('Draft')),
        ('sent', _('Sent')),
        ('accepted', _('Accepted')),
        ('declined', _('Declined')),
        ('expired', _('Expired')),
        ('converted', _('Converted to Invoice')),
    ]

    SIGNATURE_STATUS_CHOICES = [
        ('none', _('None')),
        ('requested', _('Requested')),
        ('signed', _('Signed')),
        ('declined', _('Declined')),
    ]

    # Basic Fields
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='estimates')
    customer = models.ForeignKey(Customer, on_delete=models.PROTECT, related_name='estimates', null=True, blank=True)
    project = models.ForeignKey(Project, on_delete=models.SET_NULL, null=True, blank=True, related_name='estimates')

    # Draft and Final Number fields
    draft_uuid = models.UUIDField(unique=True, null=True, blank=True, db_index=True, help_text=_("Temporary UUID for drafts before finalization"))
    estimate_number = models.CharField(max_length=50, unique=True, null=True, blank=True, help_text=_("Final estimate number (DEVIS-YYYY-NNNN)"))

    issue_date = models.DateField()
    valid_until = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')

    # Line Items
    items = models.JSONField(default=list, help_text=_("Line items: [{description, quantity, unit, rate, amount}]"))

    # Pricing & Margins
    subtotal_before_margin = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        help_text=_("Subtotal before security margin is applied")
    )
    security_margin_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0,
        verbose_name=_("Security margin (%)"),
        help_text=_("Security margin percentage (e.g., 10.00 for 10%)")
    )
    security_margin_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        verbose_name=_("Margin amount"),
        help_text=_("Calculated security margin amount")
    )
    subtotal = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text=_("Subtotal after margin (subtotal_before_margin + security_margin_amount)")
    )
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0, help_text=_("Tax rate as percentage"))
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3, default='EUR')

    # TJM Settings (snapshot at estimate creation)
    tjm_used = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="TJM utilisé",
        help_text="TJM rate used for this estimate (snapshot for historical tracking)"
    )
    total_days = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Total number of days if using TJM-based pricing"
    )

    # Versioning
    version = models.IntegerField(
        default=1,
        help_text="Version number for tracking estimate revisions"
    )
    parent_estimate = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='revisions',
        help_text="Links to original estimate for revisions"
    )

    # AI Metadata
    ai_generated = models.BooleanField(
        default=False,
        help_text="Whether this estimate was generated with AI assistance"
    )
    ai_metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text="AI generation metadata (suggestions, confidence, historical context)"
    )

    # Digital Signature
    signature_status = models.CharField(
        max_length=20,
        choices=SIGNATURE_STATUS_CHOICES,
        default='none',
        verbose_name="Statut de signature"
    )
    signature_requested_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Date de demande de signature"
    )
    signature_completed_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Date de signature"
    )
    signed_pdf_file = models.FileField(
        upload_to='estimates/signed/%Y/%m/',
        blank=True,
        null=True,
        verbose_name="PDF signé",
        help_text="Signed version of the estimate PDF"
    )
    signature_data = models.JSONField(
        default=dict,
        blank=True,
        help_text="Signature metadata (IP, timestamp, certificate info, method)"
    )

    # Other Fields
    notes = models.TextField(blank=True)
    terms = models.TextField(
        blank=True,
        verbose_name="Conditions générales",
        help_text="Terms and conditions for this specific estimate"
    )
    pdf_file = models.FileField(upload_to='estimates/%Y/%m/', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-issue_date', '-created_at']
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['customer']),
            models.Index(fields=['estimate_number']),
            models.Index(fields=['valid_until']),
            models.Index(fields=['signature_status']),
            models.Index(fields=['version']),
        ]

    def __str__(self):
        display_num = self.estimate_number or f"DRAFT-{str(self.draft_uuid)[:8]}"
        customer_name = self.customer.name if self.customer else "No customer"
        return f"Estimate {display_num} - {customer_name} (v{self.version})"

    @property
    def display_number(self):
        """Get display number for frontend (final number or draft UUID)"""
        if self.estimate_number:
            return self.estimate_number
        return f"DRAFT-{str(self.draft_uuid)[:8]}" if self.draft_uuid else "UNSAVED"

    @property
    def is_draft(self):
        """Check if this is still a draft (has UUID, no final number)"""
        return self.draft_uuid is not None and self.estimate_number is None

    def save(self, *args, **kwargs):
        """Auto-calculate totals with security margin"""
        # Calculate security margin amount
        self.security_margin_amount = (self.subtotal_before_margin * self.security_margin_percentage) / 100

        # Calculate subtotal (before tax, after margin)
        self.subtotal = self.subtotal_before_margin + self.security_margin_amount

        # Calculate tax amount
        self.tax_amount = (self.subtotal * self.tax_rate) / 100

        # Calculate total
        self.total = self.subtotal + self.tax_amount

        super().save(*args, **kwargs)

    @property
    def is_signed(self):
        """Check if estimate has been signed"""
        return self.signature_status == 'signed'

    @property
    def is_expired(self):
        """Check if estimate has expired"""
        from django.utils import timezone
        return self.valid_until < timezone.now().date() and self.status not in ['accepted', 'declined']

    @property
    def margin_percentage_display(self):
        """Get margin as a display percentage"""
        if self.subtotal_before_margin > 0:
            return (self.security_margin_amount / self.subtotal_before_margin) * 100
        return 0


class SignatureRequest(models.Model):
    """Model for tracking estimate signature requests"""

    STATUS_CHOICES = [
        ('pending', _('Pending')),
        ('signed', _('Signed')),
        ('expired', _('Expired')),
        ('declined', _('Declined')),
    ]

    SIGNATURE_METHOD_CHOICES = [
        ('draw', _('Drawn Signature')),
        ('upload', _('Uploaded Image')),
        ('type', _('Typed Name')),
        ('digital', _('Digital Certificate')),
    ]

    estimate = models.ForeignKey(
        Estimate,
        on_delete=models.CASCADE,
        related_name='signature_requests',
        verbose_name="Devis"
    )

    # Signer Information
    signer_name = models.CharField(
        max_length=255,
        verbose_name="Nom du signataire"
    )
    signer_email = models.EmailField(
        verbose_name="Email du signataire"
    )
    signer_company = models.CharField(
        max_length=255,
        blank=True,
        verbose_name="Société du signataire"
    )

    # Token for secure access
    token = models.UUIDField(
        default=uuid.uuid4,
        unique=True,
        editable=False,
        verbose_name="Token d'accès"
    )

    # Status
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending',
        verbose_name="Statut"
    )

    # Timestamps
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Date de création"
    )
    expires_at = models.DateTimeField(
        verbose_name="Date d'expiration"
    )
    signed_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Date de signature"
    )
    viewed_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Date de première consultation"
    )

    # Audit Trail
    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
        verbose_name="Adresse IP"
    )
    user_agent = models.TextField(
        blank=True,
        verbose_name="User Agent"
    )

    # Signature Data
    signature_method = models.CharField(
        max_length=20,
        choices=SIGNATURE_METHOD_CHOICES,
        blank=True,
        verbose_name="Méthode de signature"
    )
    signature_image = models.FileField(
        upload_to='signatures/%Y/%m/',
        null=True,
        blank=True,
        verbose_name="Image de signature"
    )
    signature_metadata = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Métadonnées de signature",
        help_text="Additional signature data (typed name, certificate info, etc.)"
    )

    # Decline reason
    decline_reason = models.TextField(
        blank=True,
        verbose_name="Raison du refus"
    )

    # Email tracking
    email_sent_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="Email envoyé le"
    )
    email_opened_count = models.IntegerField(
        default=0,
        verbose_name="Nombre d'ouvertures email"
    )

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['token']),
            models.Index(fields=['status']),
            models.Index(fields=['estimate']),
            models.Index(fields=['expires_at']),
        ]
        verbose_name = "Demande de signature"
        verbose_name_plural = "Demandes de signature"

    def __str__(self):
        return f"Signature Request for {self.estimate.estimate_number} - {self.signer_name} ({self.status})"

    @property
    def is_expired(self):
        """Check if signature request has expired"""
        from django.utils import timezone
        return self.expires_at < timezone.now() and self.status == 'pending'

    @property
    def signature_url(self):
        """Get the public signature URL"""
        from django.conf import settings
        frontend_url = settings.FRONTEND_URL
        return f"{frontend_url}/sign/{self.token}"

    def mark_viewed(self, ip_address=None, user_agent=None):
        """Mark signature request as viewed"""
        from django.utils import timezone
        if not self.viewed_at:
            self.viewed_at = timezone.now()
            if ip_address:
                self.ip_address = ip_address
            if user_agent:
                self.user_agent = user_agent
            self.save()

    def mark_signed(self, signature_method, signature_data=None, ip_address=None, user_agent=None):
        """Mark signature request as signed"""
        from django.utils import timezone
        self.status = 'signed'
        self.signed_at = timezone.now()
        self.signature_method = signature_method
        if signature_data:
            self.signature_metadata = signature_data
        if ip_address:
            self.ip_address = ip_address
        if user_agent:
            self.user_agent = user_agent
        self.save()

        # Update estimate
        self.estimate.signature_status = 'signed'
        self.estimate.signature_completed_at = timezone.now()
        self.estimate.signature_data = {
            'signer_name': self.signer_name,
            'signer_email': self.signer_email,
            'signer_company': self.signer_company,
            'signed_at': self.signed_at.isoformat(),
            'method': signature_method,
            'ip_address': str(ip_address) if ip_address else None,
        }
        self.estimate.save()

        # Trigger signed PDF generation asynchronously
        from .tasks import generate_signed_pdf
        generate_signed_pdf.delay(self.estimate.id)

    def mark_declined(self, reason=''):
        """Mark signature request as declined"""
        from django.utils import timezone
        self.status = 'declined'
        self.signed_at = timezone.now()
        self.decline_reason = reason
        self.save()

        # Update estimate
        self.estimate.signature_status = 'declined'
        self.estimate.save()
