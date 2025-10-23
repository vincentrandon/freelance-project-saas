from django.db import models
from django.contrib.auth.models import User
from django.utils.translation import gettext_lazy as _
from customers.models import Customer
from projects.models import Project, Task
import uuid


class CRA(models.Model):
    """
    Compte Rendu d'Activité (Activity Report) - Monthly activity report for freelancers.
    One CRA per client per month. Used to validate work before invoicing.
    """

    STATUS_CHOICES = [
        ('draft', _('Draft')),
        ('pending_validation', _('Pending Validation')),
        ('validated', _('Validated')),
        ('rejected', _('Rejected')),
    ]

    # Relations
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='cras',
        verbose_name=_("User")
    )
    customer = models.ForeignKey(
        Customer,
        on_delete=models.PROTECT,
        related_name='cras',
        verbose_name=_("Customer")
    )
    project = models.ForeignKey(
        Project,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='cras',
        verbose_name=_("Project")
    )

    # Period
    period_month = models.IntegerField(
        verbose_name=_("Month"),
        help_text=_("Month number (1-12)")
    )
    period_year = models.IntegerField(
        verbose_name=_("Year"),
        help_text=_("Year (YYYY)")
    )

    # Status
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='draft',
        verbose_name=_("Status")
    )

    # Tasks
    tasks = models.ManyToManyField(
        Task,
        related_name='cras',
        blank=True,
        verbose_name=_("Tasks"),
        help_text=_("Tasks included in this activity report")
    )

    # Pricing (TJM = Taux Journalier Moyen / Daily Rate)
    daily_rate = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        verbose_name=_("Daily Rate (TJM)"),
        help_text=_("Daily rate in currency")
    )
    total_days = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        default=0,
        verbose_name=_("Total Days"),
        help_text=_("Total days worked (calculated from tasks)")
    )
    total_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        verbose_name=_("Total Amount"),
        help_text=_("Total amount HT (total_days * daily_rate)")
    )
    currency = models.CharField(
        max_length=3,
        default='EUR',
        verbose_name=_("Currency")
    )

    # Work dates
    selected_work_dates = models.JSONField(
        default=list,
        blank=True,
        verbose_name=_("Selected Work Dates"),
        help_text=_("All dates marked as worked in the calendar for this period (e.g., ['2025-10-01', '2025-10-05'])")
    )

    # Notes
    notes = models.TextField(
        blank=True,
        verbose_name=_("Notes"),
        help_text=_("Additional notes or comments")
    )

    # PDF
    pdf_file = models.FileField(
        upload_to='cra/%Y/%m/',
        blank=True,
        null=True,
        verbose_name=_("PDF File")
    )

    # Timestamps
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name=_("Created At")
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name=_("Updated At")
    )
    submitted_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name=_("Submitted At"),
        help_text=_("When CRA was sent for validation")
    )
    validated_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name=_("Validated At"),
        help_text=_("When CRA was validated by client")
    )
    rejected_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name=_("Rejected At"),
        help_text=_("When CRA was rejected by client")
    )

    # Rejection reason
    rejection_reason = models.TextField(
        blank=True,
        verbose_name=_("Rejection Reason"),
        help_text=_("Reason for rejection if applicable")
    )

    class Meta:
        ordering = ['-period_year', '-period_month', '-created_at']
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['customer']),
            models.Index(fields=['period_year', 'period_month']),
            models.Index(fields=['user', 'period_year', 'period_month']),
        ]
        unique_together = [['user', 'customer', 'period_month', 'period_year']]
        verbose_name = _("Activity Report (CRA)")
        verbose_name_plural = _("Activity Reports (CRA)")

    def __str__(self):
        return f"CRA {self.period_month:02d}/{self.period_year} - {self.customer.name} ({self.get_status_display()})"

    @property
    def period_display(self):
        """Display period in French format: Janvier 2025"""
        from datetime import date
        months_fr = [
            'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
            'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
        ]
        return f"{months_fr[self.period_month - 1]} {self.period_year}"

    def calculate_totals(self):
        """Calculate total days and amount from associated tasks"""
        tasks = self.tasks.all()
        self.total_days = sum(task.worked_days or 0 for task in tasks)
        self.total_amount = self.total_days * self.daily_rate
        self.save()

    def can_edit(self):
        """Check if CRA can be edited (only drafts can be edited)"""
        return self.status == 'draft'

    def can_delete(self):
        """Check if CRA can be deleted (only drafts can be deleted)"""
        return self.status == 'draft'


class CRASignature(models.Model):
    """
    Signature tracking for CRA validation.
    Similar to estimate signature workflow.
    """

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

    # Relations
    cra = models.ForeignKey(
        CRA,
        on_delete=models.CASCADE,
        related_name='signature_requests',
        verbose_name=_("CRA")
    )

    # Signer Information (Client)
    signer_name = models.CharField(
        max_length=255,
        verbose_name=_("Signer Name")
    )
    signer_email = models.EmailField(
        verbose_name=_("Signer Email")
    )
    signer_company = models.CharField(
        max_length=255,
        blank=True,
        verbose_name=_("Signer Company")
    )

    # Token for secure access
    token = models.UUIDField(
        default=uuid.uuid4,
        unique=True,
        editable=False,
        verbose_name=_("Access Token")
    )

    # Status
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending',
        verbose_name=_("Status")
    )

    # Timestamps
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name=_("Created At")
    )
    expires_at = models.DateTimeField(
        verbose_name=_("Expires At")
    )
    signed_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name=_("Signed At")
    )
    viewed_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name=_("Viewed At")
    )

    # Audit Trail
    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
        verbose_name=_("IP Address")
    )
    user_agent = models.TextField(
        blank=True,
        verbose_name=_("User Agent")
    )

    # Signature Data
    signature_method = models.CharField(
        max_length=20,
        choices=SIGNATURE_METHOD_CHOICES,
        blank=True,
        verbose_name=_("Signature Method")
    )
    signature_image = models.FileField(
        upload_to='signatures/cra/%Y/%m/',
        null=True,
        blank=True,
        verbose_name=_("Signature Image")
    )
    signature_metadata = models.JSONField(
        default=dict,
        blank=True,
        verbose_name=_("Signature Metadata"),
        help_text=_("Additional signature data")
    )

    # Decline reason
    decline_reason = models.TextField(
        blank=True,
        verbose_name=_("Decline Reason")
    )

    # Email tracking
    email_sent_at = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name=_("Email Sent At")
    )
    email_opened_count = models.IntegerField(
        default=0,
        verbose_name=_("Email Opened Count")
    )

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['token']),
            models.Index(fields=['status']),
            models.Index(fields=['cra']),
            models.Index(fields=['expires_at']),
        ]
        verbose_name = _("CRA Signature Request")
        verbose_name_plural = _("CRA Signature Requests")

    def __str__(self):
        return f"Signature Request for CRA {self.cra.period_month:02d}/{self.cra.period_year} - {self.signer_name} ({self.status})"

    @property
    def is_expired(self):
        """Check if signature request has expired"""
        from django.utils import timezone
        return self.expires_at < timezone.now() and self.status == 'pending'

    @property
    def signature_url(self):
        """Get the public signature URL"""
        from django.conf import settings
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
        return f"{frontend_url}/cra/sign/{self.token}"

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
        """Mark signature request as signed and update CRA status"""
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

        # Update CRA status
        self.cra.status = 'validated'
        self.cra.validated_at = timezone.now()
        self.cra.save()

        # Trigger invoice auto-generation
        from .tasks import generate_invoice_from_cra
        generate_invoice_from_cra.delay(self.cra.id)

    def mark_declined(self, reason=''):
        """Mark signature request as declined"""
        from django.utils import timezone
        self.status = 'declined'
        self.signed_at = timezone.now()
        self.decline_reason = reason
        self.save()

        # Update CRA status
        self.cra.status = 'rejected'
        self.cra.rejected_at = timezone.now()
        self.cra.rejection_reason = reason
        self.cra.save()
