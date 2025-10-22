from django.db import models
from django.contrib.auth.models import User
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.utils.translation import gettext_lazy as _


class Notification(models.Model):
    """
    Generic notification model for alerting users about system events.
    """

    NOTIFICATION_TYPES = [
        ('pdf_generated', _('PDF Generated')),
        ('pdf_failed', _('PDF Generation Failed')),
        ('import_completed', _('Import Completed')),
        ('import_failed', _('Import Failed')),
        ('email_sent', _('Email Sent')),
        ('email_failed', _('Email Send Failed')),
        ('entity_created', _('Entity Created')),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    notification_type = models.CharField(max_length=50, choices=NOTIFICATION_TYPES)
    title = models.CharField(max_length=255)
    message = models.TextField()
    link = models.CharField(max_length=500, null=True, blank=True, help_text=_("Optional link for navigation"))

    # Generic relation to any model
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE, null=True, blank=True)
    object_id = models.PositiveIntegerField(null=True, blank=True)
    content_object = GenericForeignKey('content_type', 'object_id')

    read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'read', '-created_at']),
        ]

    def __str__(self):
        return f"{self.user.username} - {self.title} ({self.notification_type})"

    def mark_as_read(self):
        """Mark this notification as read."""
        from django.utils import timezone
        if not self.read:
            self.read = True
            self.read_at = timezone.now()
            self.save(update_fields=['read', 'read_at'])

    @property
    def is_success(self):
        """Check if notification is a success type."""
        return self.notification_type in ['pdf_generated', 'import_completed', 'email_sent', 'entity_created']

    @property
    def is_error(self):
        """Check if notification is an error type."""
        return self.notification_type in ['pdf_failed', 'import_failed', 'email_failed']
