from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils.safestring import mark_safe
from .models import ImportedDocument, DocumentParseResult, ImportPreview, AIExtractionFeedback, AIModelVersion
from .services.ai_learning_service import AILearningService


@admin.register(ImportedDocument)
class ImportedDocumentAdmin(admin.ModelAdmin):
    list_display = ['file_name', 'user', 'document_type', 'status', 'uploaded_at', 'file_size']
    list_filter = ['status', 'document_type', 'uploaded_at']
    search_fields = ['file_name', 'user__username', 'user__email']
    readonly_fields = ['uploaded_at', 'processed_at', 'processing_time_seconds']


@admin.register(DocumentParseResult)
class DocumentParseResultAdmin(admin.ModelAdmin):
    list_display = ['document', 'overall_confidence', 'detected_language', 'created_at']
    list_filter = ['detected_language', 'created_at']
    search_fields = ['document__file_name']
    readonly_fields = ['created_at', 'raw_response', 'extracted_data']


@admin.register(ImportPreview)
class ImportPreviewAdmin(admin.ModelAdmin):
    list_display = ['document', 'status', 'customer_action', 'project_action', 'created_at']
    list_filter = ['status', 'customer_action', 'project_action']
    readonly_fields = ['created_at', 'reviewed_at', 'created_customer', 'created_project', 'created_invoice', 'created_estimate']


@admin.register(AIExtractionFeedback)
class AIExtractionFeedbackAdmin(admin.ModelAdmin):
    list_display = ['feedback_type', 'field_path', 'user_rating', 'edit_magnitude', 'was_used_for_training', 'created_at']
    list_filter = ['feedback_type', 'user_rating', 'edit_magnitude', 'was_used_for_training', 'was_edited']
    search_fields = ['field_path', 'user__username', 'preview__id']
    readonly_fields = ['created_at', 'original_data_display', 'corrected_data_display']
    date_hierarchy = 'created_at'
    list_per_page = 50

    def original_data_display(self, obj):
        import json
        return mark_safe(f'<pre>{json.dumps(obj.original_data, indent=2)}</pre>')
    original_data_display.short_description = 'Original Data'

    def corrected_data_display(self, obj):
        import json
        return mark_safe(f'<pre>{json.dumps(obj.corrected_data, indent=2)}</pre>')
    corrected_data_display.short_description = 'Corrected Data'


@admin.register(AIModelVersion)
class AIModelVersionAdmin(admin.ModelAdmin):
    list_display = [
        'version',
        'status_badge',
        'is_active',
        'accuracy_display',
        'training_started_at',
        'training_completed_at'
    ]
    list_filter = ['status', 'is_active', 'created_at']
    search_fields = ['version', 'base_model', 'fine_tune_job_id']

    change_list_template = 'admin/ai_model_version_changelist.html'
    readonly_fields = [
        'created_at',
        'updated_at',
        'training_started_at',
        'training_completed_at',
        'fine_tune_job_id',
        'fine_tuned_model',
        'accuracy_before',
        'accuracy_after',
        'improvements_display',
        'training_data_count',
        'training_cost_usd',
        'training_error_display'
    ]
    fieldsets = (
        ('Version Info', {
            'fields': ('version', 'base_model', 'status', 'is_active')
        }),
        ('Training Info', {
            'fields': (
                'training_data_count',
                'training_file_id',
                'fine_tune_job_id',
                'fine_tuned_model',
                'training_started_at',
                'training_completed_at',
                'training_cost_usd',
                'training_error_display'
            )
        }),
        ('Performance Metrics', {
            'fields': ('accuracy_before', 'accuracy_after', 'improvements_display')
        }),
        ('Activation Tracking', {
            'fields': ('activated_at', 'reactivated_at', 'deactivated_at', 'replaced_by')
        }),
        ('Rollback Info', {
            'fields': ('rollback_reason',)
        }),
        ('Admin Notes', {
            'fields': ('notes',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )
    actions = ['start_new_training', 'activate_selected', 'rollback_to_selected', 'check_training_status']

    def status_badge(self, obj):
        colors = {
            'training': 'orange',
            'evaluating': 'blue',
            'ready': 'green',
            'active': 'purple',
            'archived': 'gray',
            'failed': 'red',
        }
        color = colors.get(obj.status, 'gray')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; border-radius: 3px;">{}</span>',
            color,
            obj.get_status_display()
        )
    status_badge.short_description = 'Status'

    def accuracy_display(self, obj):
        if obj.accuracy_after:
            improvement = obj.accuracy_after - obj.accuracy_before
            arrow = '↑' if improvement > 0 else '↓' if improvement < 0 else '→'
            color = 'green' if improvement > 0 else 'red' if improvement < 0 else 'gray'
            return format_html(
                '{:.1f}% <span style="color: {};">{} {:.1f}%</span>',
                obj.accuracy_before,
                color,
                arrow,
                obj.accuracy_after
            )
        return format_html('{:.1f}%', obj.accuracy_before)
    accuracy_display.short_description = 'Accuracy'

    def improvements_display(self, obj):
        import json
        return mark_safe(f'<pre>{json.dumps(obj.improvements, indent=2)}</pre>')
    improvements_display.short_description = 'Detailed Improvements'

    def training_error_display(self, obj):
        if obj.training_error:
            return mark_safe(f'<pre style="color: red;">{obj.training_error}</pre>')
        return '-'
    training_error_display.short_description = 'Training Error'

    def start_new_training(self, request, queryset):
        """
        Admin action to start a new training job.
        Prepares training data from feedback and starts OpenAI fine-tuning.
        """
        # Step 1: Prepare training data
        self.message_user(request, 'Preparing training data from user feedback...')

        result = AILearningService.prepare_training_data(min_feedback_count=50)

        if not result['success']:
            self.message_user(
                request,
                f"Insufficient training data: {result.get('error')}. "
                f"Current: {result.get('current_count', 0)}, Required: {result.get('required_count', 50)}",
                level='ERROR'
            )
            return

        training_data = result['training_data']
        self.message_user(
            request,
            f"✓ Prepared {result['total_examples']} training examples from {result['total_feedback']} feedback items"
        )

        # Step 2: Create and upload training file
        self.message_user(request, 'Uploading training file to OpenAI...')

        file_result = AILearningService.create_fine_tuning_file(training_data)

        if not file_result['success']:
            self.message_user(request, f"Failed to upload training file: {file_result.get('error')}", level='ERROR')
            return

        self.message_user(request, f"✓ Uploaded training file: {file_result['file_id']}")

        # Step 3: Start fine-tuning job
        self.message_user(request, 'Starting OpenAI fine-tuning job...')

        training_result = AILearningService.start_fine_tuning(
            training_file_id=file_result['file_id'],
            hyperparameters={'n_epochs': 3}
        )

        if not training_result['success']:
            self.message_user(request, f"Failed to start training: {training_result.get('error')}", level='ERROR')
            return

        # Success!
        self.message_user(
            request,
            f"✓ Training started successfully! Model version: {training_result['version']}, "
            f"Job ID: {training_result['job_id']}. "
            f"Training will be monitored automatically every 10 minutes."
        )

        # Mark feedback as used for training
        from .models import AIExtractionFeedback
        feedback_count = AIExtractionFeedback.objects.filter(
            was_edited=True,
            user_rating__isnull=False,
            was_used_for_training=False
        ).update(
            was_used_for_training=True,
            training_batch_id=training_result['version']
        )

        self.message_user(request, f"✓ Marked {feedback_count} feedback items as used for training")

    start_new_training.short_description = '🚀 Start New AI Training Job'

    def activate_selected(self, request, queryset):
        """Admin action to activate a model version."""
        if queryset.count() != 1:
            self.message_user(request, 'Please select exactly one model to activate.', level='ERROR')
            return

        version = queryset.first()
        result = AILearningService.activate_model(version.id, force=True)

        if result['success']:
            self.message_user(request, f'Successfully activated {version.version}')
        else:
            self.message_user(request, f'Failed to activate: {result.get("error")}', level='ERROR')

    activate_selected.short_description = 'Activate selected model'

    def rollback_to_selected(self, request, queryset):
        """Admin action to rollback to a previous model."""
        if queryset.count() != 1:
            self.message_user(request, 'Please select exactly one model to rollback to.', level='ERROR')
            return

        version = queryset.first()
        result = AILearningService.activate_model(version.id, force=True)

        if result['success']:
            self.message_user(request, f'Successfully rolled back to {version.version}')
        else:
            self.message_user(request, f'Failed to rollback: {result.get("error")}', level='ERROR')

    rollback_to_selected.short_description = 'Rollback to selected model'

    def check_training_status(self, request, queryset):
        """Admin action to check training status for selected models."""
        for version in queryset:
            result = AILearningService.check_training_status(version.id)
            if result['success']:
                self.message_user(request, f'{version.version}: {result["status"]}')
            else:
                self.message_user(request, f'{version.version}: Error - {result.get("error")}', level='ERROR')

    check_training_status.short_description = 'Check training status'

    def changelist_view(self, request, extra_context=None):
        """Add training statistics to the changelist page."""
        from .models import AIExtractionFeedback

        # Get training statistics
        total_feedback = AIExtractionFeedback.objects.count()
        rated_feedback = AIExtractionFeedback.objects.filter(user_rating__isnull=False).count()
        unused_feedback = AIExtractionFeedback.objects.filter(
            was_edited=True,
            user_rating__isnull=False,
            was_used_for_training=False
        ).count()

        active_model = AIModelVersion.objects.filter(is_active=True).first()

        extra_context = extra_context or {}
        extra_context.update({
            'training_stats': {
                'total_feedback': total_feedback,
                'rated_feedback': rated_feedback,
                'unused_feedback': unused_feedback,
                'ready_for_training': unused_feedback >= 50,
                'min_required': 50,
            },
            'active_model': active_model,
        })

        return super().changelist_view(request, extra_context=extra_context)
