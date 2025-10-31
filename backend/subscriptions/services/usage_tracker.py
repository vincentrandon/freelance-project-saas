from django.conf import settings
from django.utils import timezone
from datetime import date
from calendar import monthrange
from ..models import UsageCounter, SubscriptionTier


class UsageTracker:
    """
    Service to track and enforce usage limits for subscription features.
    Usage limits reset on the 1st of each month.
    """

    # Default limits for FREE tier
    DEFAULT_LIMITS = {
        'invoice_creation': getattr(settings, 'FREE_INVOICE_LIMIT', 25),
        'estimate_creation': getattr(settings, 'FREE_ESTIMATE_LIMIT', 25),
        'document_import': getattr(settings, 'FREE_IMPORT_LIMIT', 10),
        'email_sending': 0,  # Not available in FREE
        'signature_request': 0,  # Not available in FREE
        'cra_creation': 0,  # Not available in FREE
    }

    def __init__(self, user):
        self.user = user
        self.subscription = getattr(user, 'subscription', None)

    def get_current_period(self):
        """Get current billing period (1st to last day of current month)"""
        today = timezone.now().date()
        period_start = date(today.year, today.month, 1)
        last_day = monthrange(today.year, today.month)[1]
        period_end = date(today.year, today.month, last_day)
        return period_start, period_end

    def get_or_create_counter(self, feature):
        """Get or create usage counter for current period"""
        period_start, period_end = self.get_current_period()

        counter, created = UsageCounter.objects.get_or_create(
            user=self.user,
            feature=feature,
            period_start=period_start,
            defaults={
                'period_end': period_end,
                'count': 0,
                'limit': self._get_limit_for_feature(feature)
            }
        )

        return counter

    def _get_limit_for_feature(self, feature):
        """
        Get usage limit for feature based on user's subscription tier.
        Returns None for unlimited, integer for limited.
        """
        if not self.subscription:
            return self.DEFAULT_LIMITS.get(feature, 0)

        tier = self.subscription.get_effective_tier()

        # ELITE and CORE: unlimited for most features
        if tier in [SubscriptionTier.CORE, SubscriptionTier.ELITE]:
            return None  # Unlimited

        # FREE tier: apply limits
        return self.DEFAULT_LIMITS.get(feature, 0)

    def get_limit(self, feature):
        """Get usage limit for a feature"""
        counter = self.get_or_create_counter(feature)
        return counter.limit

    def get_current_count(self, feature):
        """Get current usage count for a feature"""
        counter = self.get_or_create_counter(feature)
        return counter.count

    def get_remaining(self, feature):
        """Get remaining usage for a feature"""
        counter = self.get_or_create_counter(feature)
        return counter.remaining()

    def is_limit_reached(self, feature):
        """Check if usage limit has been reached for a feature"""
        counter = self.get_or_create_counter(feature)
        return counter.is_limit_reached()

    def increment(self, feature):
        """Increment usage counter for a feature"""
        counter = self.get_or_create_counter(feature)
        counter.increment()
        return counter

    def get_all_usage(self):
        """
        Get usage statistics for all tracked features in current period.
        Returns dict with feature usage data.
        """
        period_start, period_end = self.get_current_period()

        counters = UsageCounter.objects.filter(
            user=self.user,
            period_start=period_start
        )

        usage_data = {}
        for counter in counters:
            usage_data[counter.feature] = {
                'count': counter.count,
                'limit': counter.limit,
                'remaining': counter.remaining(),
                'is_limit_reached': counter.is_limit_reached(),
                'period_start': counter.period_start,
                'period_end': counter.period_end,
            }

        return usage_data

    @staticmethod
    def reset_monthly_counters():
        """
        Reset all usage counters for new month.
        This should be called by a Celery Beat task on 1st of each month.
        """
        # This is handled by creating new counters with get_or_create_counter
        # Old counters are kept for historical tracking
        pass


def get_usage_summary(user):
    """
    Helper function to get formatted usage summary for user.
    """
    tracker = UsageTracker(user)
    usage = tracker.get_all_usage()

    summary = {
        'subscription_tier': tracker.subscription.tier if tracker.subscription else 'FREE',
        'is_trial': tracker.subscription.is_trial_active() if tracker.subscription else False,
        'usage': usage,
    }

    return summary
