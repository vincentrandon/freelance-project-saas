from django.db import models
from django.contrib.auth.models import User
from django.utils.translation import gettext_lazy as _
from customers.models import Customer
from projects.models import Project
from invoicing.models import Invoice, Estimate


class ImportedDocument(models.Model):
    """Stores uploaded PDF documents for processing"""

    STATUS_CHOICES = [
        ('uploaded', _('Uploaded')),
        ('processing', _('Processing')),
        ('parsed', _('Parsed')),
        ('approved', _('Approved')),
        ('rejected', _('Rejected')),
        ('error', _('Error')),
    ]

    DOCUMENT_TYPE_CHOICES = [
        ('invoice', _('Invoice')),
        ('estimate', _('Estimate')),
        ('unknown', _('Unknown')),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='imported_documents')
    file = models.FileField(upload_to='imported_documents/%Y/%m/%d/')
    file_name = models.CharField(max_length=255)
    file_size = models.IntegerField()

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='uploaded')
    document_type = models.CharField(max_length=20, choices=DOCUMENT_TYPE_CHOICES, default='unknown')

    uploaded_at = models.DateTimeField(auto_now_add=True)
    processed_at = models.DateTimeField(null=True, blank=True)

    # Processing metadata
    error_message = models.TextField(null=True, blank=True)
    processing_time_seconds = models.FloatField(null=True, blank=True)

    class Meta:
        ordering = ['-uploaded_at']
        indexes = [
            models.Index(fields=['user', '-uploaded_at']),
            models.Index(fields=['status']),
        ]

    def __str__(self):
        return f"{self.file_name} - {self.status}"


class DocumentParseResult(models.Model):
    """Stores AI extraction results from document parsing"""

    document = models.OneToOneField(ImportedDocument, on_delete=models.CASCADE, related_name='parse_result')

    # Raw AI response
    raw_response = models.JSONField(help_text=_("Complete JSON response from OpenAI"))

    # Extracted structured data
    extracted_data = models.JSONField(help_text=_("Structured extraction: customer, project, tasks, etc."))

    # Confidence scores (0-100)
    overall_confidence = models.IntegerField(default=0)
    customer_confidence = models.IntegerField(default=0)
    project_confidence = models.IntegerField(default=0)
    tasks_confidence = models.IntegerField(default=0)
    pricing_confidence = models.IntegerField(default=0)

    # Language detection
    detected_language = models.CharField(max_length=10, default='en')  # 'en' or 'fr'

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Parse result for {self.document.file_name} ({self.overall_confidence}% confidence)"


class ImportPreview(models.Model):
    """Staged data for user review before creating actual entities"""

    STATUS_CHOICES = [
        ('pending_review', _('Pending Review')),
        ('approved', _('Approved')),
        ('rejected', _('Rejected')),
    ]

    MATCH_ACTION_CHOICES = [
        ('create_new', _('Create New')),
        ('use_existing', _('Use Existing')),
        ('merge', _('Merge')),
    ]

    document = models.OneToOneField(ImportedDocument, on_delete=models.CASCADE, related_name='preview')
    parse_result = models.ForeignKey(DocumentParseResult, on_delete=models.CASCADE, related_name='previews')

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending_review')

    # Staged data (editable by user before approval)
    customer_data = models.JSONField(help_text="Customer fields: name, email, company, etc.")
    project_data = models.JSONField(help_text="Project fields: name, description, dates, etc.")
    tasks_data = models.JSONField(help_text="Array of task objects")
    invoice_estimate_data = models.JSONField(help_text="Invoice or estimate fields")

    # Matching results
    matched_customer = models.ForeignKey(Customer, on_delete=models.SET_NULL, null=True, blank=True)
    customer_match_confidence = models.IntegerField(default=0)
    customer_action = models.CharField(max_length=20, choices=MATCH_ACTION_CHOICES, default='create_new')

    matched_project = models.ForeignKey(Project, on_delete=models.SET_NULL, null=True, blank=True)
    project_match_confidence = models.IntegerField(default=0)
    project_action = models.CharField(max_length=20, choices=MATCH_ACTION_CHOICES, default='create_new')

    # Conflicts and warnings
    conflicts = models.JSONField(default=list, help_text="Array of conflict descriptions")
    warnings = models.JSONField(default=list, help_text="Array of warning messages")

    # Created entities (after approval)
    created_customer = models.ForeignKey(Customer, on_delete=models.SET_NULL, null=True, blank=True, related_name='created_from_preview')
    created_project = models.ForeignKey(Project, on_delete=models.SET_NULL, null=True, blank=True, related_name='created_from_preview')
    created_invoice = models.ForeignKey(Invoice, on_delete=models.SET_NULL, null=True, blank=True, related_name='created_from_preview')
    created_estimate = models.ForeignKey(Estimate, on_delete=models.SET_NULL, null=True, blank=True, related_name='created_from_preview')

    created_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Preview for {self.document.file_name} - {self.status}"
