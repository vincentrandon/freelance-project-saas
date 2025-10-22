from django.db import models
from django.contrib.auth.models import User
from django.utils.translation import gettext_lazy as _


class Lead(models.Model):
    """Model representing a potential customer lead"""

    STATUS_CHOICES = [
        ('new', _('New')),
        ('contacted', _('Contacted')),
        ('qualified', _('Qualified')),
        ('proposal', _('Proposal Sent')),
        ('negotiation', _('Negotiation')),
        ('won', _('Won')),
        ('lost', _('Lost')),
    ]

    SOURCE_CHOICES = [
        ('website', _('Website')),
        ('referral', _('Referral')),
        ('linkedin', _('LinkedIn')),
        ('cold_outreach', _('Cold Outreach')),
        ('event', _('Event')),
        ('other', _('Other')),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='leads')
    name = models.CharField(max_length=255)
    email = models.EmailField()
    phone = models.CharField(max_length=50, blank=True)
    company = models.CharField(max_length=255, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='new')
    value = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True, help_text=_("Estimated deal value"))
    probability = models.IntegerField(default=0, help_text=_("Win probability (0-100)"))
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES, default='other')
    notes = models.TextField(blank=True)
    expected_close_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['expected_close_date']),
        ]

    def __str__(self):
        return f"{self.name} - {self.company} ({self.get_status_display()})"
