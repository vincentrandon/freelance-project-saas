from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth.models import User
from django.conf import settings
from datetime import timedelta
from django.utils import timezone

from .models import Subscription, SubscriptionTier, SubscriptionStatus


@receiver(post_save, sender=User)
def create_user_subscription(sender, instance, created, **kwargs):
    """
    Automatically create Subscription when a new User is created.
    New users get FREE tier with 7-day CORE trial.
    """
    if created:
        trial_days = getattr(settings, 'FREE_TRIAL_DAYS', 7)
        trial_tier = getattr(settings, 'FREE_TRIAL_TIER', 'CORE')

        trial_ends_at = timezone.now() + timedelta(days=trial_days)

        Subscription.objects.create(
            user=instance,
            tier=trial_tier,  # Start with CORE tier during trial
            status=SubscriptionStatus.TRIALING,
            trial_ends_at=trial_ends_at,
            current_period_start=timezone.now(),
            current_period_end=trial_ends_at
        )
