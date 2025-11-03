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

    # Clarification history (preserves user refinements across reparses)
    clarification_history = models.JSONField(
        default=dict,
        blank=True,
        help_text=_("Stores user-refined task data to preserve across reparses. Structure: {task_identifier: {refined_data, timestamp, version}}")
    )
    preserve_clarifications_on_reparse = models.BooleanField(
        default=True,
        help_text=_("If True, merge previous clarifications when reparsing; if False, start fresh")
    )

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
        ('needs_clarification', _('Needs Clarification')),
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

    # Task quality analysis (NEW)
    task_quality_scores = models.JSONField(
        default=dict,
        blank=True,
        help_text=_("Per-task quality analysis results: {task_index: {score, clarity_level, issues, ...}}")
    )
    needs_clarification = models.BooleanField(
        default=False,
        help_text=_("True if any task has clarity score <80% and needs user clarification")
    )
    clarification_completed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text=_("Timestamp when user completed task clarification flow")
    )
    overall_task_quality_score = models.IntegerField(
        default=100,
        help_text=_("Average task quality score across all tasks (0-100)")
    )

    # Auto-approve eligibility (NEW)
    auto_approve_eligible = models.BooleanField(
        default=False,
        help_text=_("True if import meets criteria for automatic approval (>90% confidence, no conflicts)")
    )

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
"""
AI Learning models for capturing user feedback and managing model versions.
Enables continuous improvement of AI extraction through user corrections.
"""

from django.db import models
from django.contrib.auth.models import User
from django.utils.translation import gettext_lazy as _
from django.utils import timezone


class AIExtractionFeedback(models.Model):
    """
    Stores user corrections and ratings for AI learning.
    Captures the difference between AI extraction and user-corrected data.
    """

    FEEDBACK_TYPE_CHOICES = [
        ('task_clarification', _('Task Clarification')),
        ('manual_edit', _('Manual Edit')),
        ('implicit_positive', _('Implicit Positive')),  # Approved without edits
        ('field_correction', _('Field Correction')),
    ]

    USER_RATING_CHOICES = [
        ('poor', _('👎 Poor')),
        ('needs_improvement', _('😐 Needs Improvement')),
        ('good', _('😊 Good')),
        ('excellent', _('👍 Excellent')),
    ]

    EDIT_MAGNITUDE_CHOICES = [
        ('none', _('No Changes')),
        ('minor', _('Minor Tweaks')),
        ('moderate', _('Moderate Changes')),
        ('major', _('Complete Rewrite')),
    ]

    # Relations
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='ai_feedback'
    )
    document = models.ForeignKey(
        'ImportedDocument',
        on_delete=models.CASCADE,
        related_name='feedback'
    )
    preview = models.ForeignKey(
        'ImportPreview',
        on_delete=models.CASCADE,
        related_name='feedback'
    )

    # Feedback metadata
    feedback_type = models.CharField(
        max_length=30,
        choices=FEEDBACK_TYPE_CHOICES,
        help_text=_("Type of feedback captured")
    )

    # Original AI extraction
    original_data = models.JSONField(
        help_text=_("What AI originally extracted")
    )

    # User correction
    corrected_data = models.JSONField(
        help_text=_("What user changed it to")
    )

    # Context
    field_path = models.CharField(
        max_length=255,
        help_text=_("Field path, e.g., 'tasks[2].name', 'customer.email'")
    )

    # Quality metrics
    original_confidence = models.IntegerField(
        default=0,
        help_text=_("AI's original confidence score (0-100)")
    )

    was_edited = models.BooleanField(
        default=False,
        help_text=_("Whether user made changes")
    )

    edit_magnitude = models.CharField(
        max_length=20,
        choices=EDIT_MAGNITUDE_CHOICES,
        default='none',
        help_text=_("Severity of the correction")
    )

    # User rating system
    user_rating = models.CharField(
        max_length=20,
        choices=USER_RATING_CHOICES,
        null=True,
        blank=True,
        help_text=_("User's rating of AI extraction quality")
    )

    rating_comment = models.TextField(
        null=True,
        blank=True,
        help_text=_("Optional user comment about what could be improved")
    )

    # Learning metadata
    was_used_for_training = models.BooleanField(
        default=False,
        help_text=_("Whether this feedback was used in model training")
    )

    training_batch_id = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        help_text=_("OpenAI fine-tuning job ID")
    )

    model_version_used = models.ForeignKey(
        'AIModelVersion',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='feedback_received',
        help_text=_("Model version that produced the original extraction")
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['feedback_type']),
            models.Index(fields=['user_rating']),
            models.Index(fields=['was_used_for_training']),
            models.Index(fields=['edit_magnitude']),
        ]
        verbose_name = _("AI Extraction Feedback")
        verbose_name_plural = _("AI Extraction Feedback")

    def __str__(self):
        rating_display = f" ({self.get_user_rating_display()})" if self.user_rating else ""
        return f"{self.get_feedback_type_display()} - {self.field_path}{rating_display}"

    @property
    def rating_score(self):
        """Convert rating to numeric score (1-4)"""
        rating_map = {
            'poor': 1,
            'needs_improvement': 2,
            'good': 3,
            'excellent': 4
        }
        return rating_map.get(self.user_rating, 0)

    @property
    def is_high_value(self):
        """Determine if this feedback is valuable for training"""
        return (
            self.edit_magnitude in ['moderate', 'major'] and
            self.user_rating in ['good', 'excellent']
        )


class AIModelVersion(models.Model):
    """
    Tracks different versions of the AI model and their performance.
    Manages model lifecycle: training → evaluation → activation → monitoring.
    """

    STATUS_CHOICES = [
        ('training', _('Training')),
        ('evaluating', _('Evaluating')),
        ('ready', _('Ready')),
        ('active', _('Active')),
        ('archived', _('Archived')),
        ('failed', _('Failed')),
    ]

    # Version info
    version = models.CharField(
        max_length=50,
        unique=True,
        help_text=_("Version number, e.g., 'v1.0', 'v2.1'")
    )

    base_model = models.CharField(
        max_length=100,
        help_text=_("OpenAI model name, e.g., 'gpt-4o', 'gpt-4o-ft-abc123'")
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='training'
    )

    # Training info
    training_data_count = models.IntegerField(
        default=0,
        help_text=_("Number of feedback samples used for training")
    )

    training_file_id = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        help_text=_("OpenAI file ID for training data")
    )

    fine_tune_job_id = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        help_text=_("OpenAI fine-tuning job ID")
    )

    fine_tuned_model = models.CharField(
        max_length=200,
        null=True,
        blank=True,
        help_text=_("Name of the fine-tuned model from OpenAI")
    )

    training_error = models.TextField(
        null=True,
        blank=True,
        help_text=_("Error message if training failed")
    )

    training_started_at = models.DateTimeField(
        null=True,
        blank=True
    )

    training_completed_at = models.DateTimeField(
        null=True,
        blank=True
    )

    # Performance metrics
    accuracy_before = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0,
        help_text=_("Baseline accuracy before training (%)")
    )

    accuracy_after = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        help_text=_("Accuracy after training (%)")
    )

    improvements = models.JSONField(
        default=dict,
        blank=True,
        help_text=_("Per-field accuracy improvements: {'task_name': 15.5, ...}")
    )

    # Activation tracking
    is_active = models.BooleanField(
        default=False,
        help_text=_("Whether this is the currently used model")
    )

    activated_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text=_("When this version was first activated")
    )

    reactivated_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text=_("When this version was restored after rollback")
    )

    deactivated_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text=_("When this version was deactivated")
    )

    # Rollback tracking
    rollback_reason = models.TextField(
        null=True,
        blank=True,
        help_text=_("Reason for rollback if applicable")
    )

    replaced_by = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='replaced_versions',
        help_text=_("Version that replaced this one")
    )

    # Cost tracking
    training_cost_usd = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text=_("Estimated training cost in USD")
    )

    # Admin notes
    notes = models.TextField(
        blank=True,
        help_text=_("Admin notes about this version")
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-version']
        indexes = [
            models.Index(fields=['is_active']),
            models.Index(fields=['status']),
            models.Index(fields=['-created_at']),
        ]
        verbose_name = _("AI Model Version")
        verbose_name_plural = _("AI Model Versions")

    def __str__(self):
        status_indicator = "✅" if self.is_active else ""
        return f"{status_indicator} {self.version} - {self.get_status_display()}"

    @property
    def accuracy_improvement(self):
        """Calculate accuracy improvement percentage"""
        if self.accuracy_after and self.accuracy_before:
            return float(self.accuracy_after) - float(self.accuracy_before)
        return None

    @property
    def training_duration(self):
        """Calculate training duration in minutes"""
        if self.training_started_at and self.training_completed_at:
            delta = self.training_completed_at - self.training_started_at
            return delta.total_seconds() / 60
        return None

    @property
    def is_better_than_current(self):
        """Check if this version is better than currently active one"""
        if not self.accuracy_after:
            return False

        current_active = AIModelVersion.objects.filter(is_active=True).first()
        if not current_active:
            return True

        # Better if accuracy improved by at least 0.5%
        return float(self.accuracy_after) > float(current_active.accuracy_after or 0) + 0.5

    def activate(self):
        """Activate this version and deactivate others"""
        # Deactivate all other versions
        AIModelVersion.objects.filter(is_active=True).update(
            is_active=False,
            deactivated_at=timezone.now()
        )

        # Activate this version
        self.is_active = True
        self.status = 'active'
        if not self.activated_at:
            self.activated_at = timezone.now()
        else:
            self.reactivated_at = timezone.now()
        self.save()

    def deactivate(self, reason=None):
        """Deactivate this version"""
        self.is_active = False
        self.status = 'archived'
        self.deactivated_at = timezone.now()
        if reason:
            self.rollback_reason = reason
        self.save()
