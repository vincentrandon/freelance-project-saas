from celery import shared_task
from django.utils import timezone
from django.contrib.auth.models import User
from .models import Subscription, SubscriptionStatus, SubscriptionTier, SubscriptionHistory
from .stripe_client import stripe
from .services.usage_tracker import UsageTracker


@shared_task
def check_trial_expirations():
    """
    Check for expired trials and downgrade users to FREE tier.
    Run daily via Celery Beat.
    """
    now = timezone.now()

    # Find subscriptions with expired trials
    expired_trials = Subscription.objects.filter(
        status=SubscriptionStatus.TRIALING,
        trial_ends_at__lte=now
    )

    count = 0
    for subscription in expired_trials:
        old_tier = subscription.tier

        # Downgrade to FREE
        subscription.tier = SubscriptionTier.FREE
        subscription.status = SubscriptionStatus.ACTIVE
        subscription.save()

        # Update denormalized field in UserProfile
        if hasattr(subscription.user, 'profile'):
            subscription.user.profile.subscription_tier = SubscriptionTier.FREE
            subscription.user.profile.trial_ends_at = None
            subscription.user.profile.save(update_fields=['subscription_tier', 'trial_ends_at'])

        # Log history
        SubscriptionHistory.objects.create(
            user=subscription.user,
            action='trial_ended',
            old_tier=old_tier,
            new_tier=SubscriptionTier.FREE,
            reason='Trial period ended'
        )

        count += 1

    return f"Processed {count} expired trials"


@shared_task
def reset_usage_counters():
    """
    Reset usage counters for new month.
    This doesn't actually delete old counters (kept for history),
    but new counters will be created by UsageTracker.get_or_create_counter()
    when users perform actions in the new month.

    Run on 1st of each month via Celery Beat.
    """
    # Nothing to do - new counters are auto-created by UsageTracker
    # Old counters remain in database for historical tracking
    return "Usage counter reset triggered (new counters will be auto-created on first use)"


@shared_task
def sync_stripe_subscriptions():
    """
    Sync subscription status with Stripe.
    Run periodically to catch any missed webhook events.
    """
    # Get all subscriptions with Stripe IDs
    subscriptions = Subscription.objects.filter(
        stripe_subscription_id__isnull=False
    ).exclude(stripe_subscription_id='')

    synced = 0
    errors = 0

    for subscription in subscriptions:
        try:
            # Fetch from Stripe
            stripe_sub = stripe.Subscription.retrieve(subscription.stripe_subscription_id)

            # Update status if different
            if subscription.status != stripe_sub.status:
                subscription.status = stripe_sub.status
                subscription.save(update_fields=['status'])
                synced += 1

        except stripe.error.StripeError as e:
            errors += 1
            continue

    return f"Synced {synced} subscriptions, {errors} errors"


@shared_task
def send_trial_ending_reminders():
    """
    Send email reminders to users whose trials are ending soon (3 days before).
    Run daily via Celery Beat.
    """
    from datetime import timedelta
    from django.core.mail import send_mail
    from django.conf import settings
    from django.template.loader import render_to_string

    three_days_from_now = timezone.now() + timedelta(days=3)
    end_of_day = three_days_from_now.replace(hour=23, minute=59, second=59)

    # Find trials ending in 3 days
    ending_trials = Subscription.objects.filter(
        status=SubscriptionStatus.TRIALING,
        trial_ends_at__lte=end_of_day,
        trial_ends_at__gte=timezone.now()
    )

    sent = 0
    for subscription in ending_trials:
        user = subscription.user

        # Check if we already sent reminder (to avoid duplicate emails)
        # You could add a 'reminder_sent' field to Subscription model
        # For now, we'll just send the email

        subject = "Your trial is ending soon"
        message = f"""
        Hi {user.first_name or user.username},

        Your {subscription.get_tier_display()} trial will end in approximately 3 days.

        To continue enjoying unlimited features, upgrade to a paid plan:
        {settings.FRONTEND_URL}/settings/billing

        If you don't upgrade, you'll be moved to the FREE plan with limited features.

        Thank you for trying kiik.app!
        """

        try:
            send_mail(
                subject,
                message,
                settings.DEFAULT_FROM_EMAIL,
                [user.email],
                fail_silently=True
            )
            sent += 1
        except:
            continue

    return f"Sent {sent} trial ending reminders"
