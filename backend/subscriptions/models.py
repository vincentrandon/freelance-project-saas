from django.db import models
from django.contrib.auth.models import User
from django.utils.translation import gettext_lazy as _
from django.utils import timezone
from datetime import timedelta


class SubscriptionTier(models.TextChoices):
    """Subscription tier choices"""
    FREE = 'FREE', _('Free')
    CORE = 'CORE', _('Core')
    ELITE = 'ELITE', _('Elite')


class SubscriptionStatus(models.TextChoices):
    """Subscription status choices"""
    ACTIVE = 'active', _('Active')
    TRIALING = 'trialing', _('Trialing')
    PAST_DUE = 'past_due', _('Past Due')
    CANCELLED = 'cancelled', _('Cancelled')
    INCOMPLETE = 'incomplete', _('Incomplete')


class BillingCycle(models.TextChoices):
    """Billing cycle choices"""
    MONTHLY = 'monthly', _('Monthly')
    YEARLY = 'yearly', _('Yearly')


class SubscriptionPlan(models.Model):
    """
    Available subscription plans with pricing and features.
    Pre-configured plans that users can subscribe to.
    """
    name = models.CharField(max_length=100, unique=True, help_text=_("Plan name (e.g., 'Core Plan', 'Elite Plan')"))
    tier = models.CharField(
        max_length=20,
        choices=SubscriptionTier.choices,
        unique=True,
        help_text=_("Tier level")
    )

    # Pricing
    price_monthly = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0.00,
        help_text=_("Monthly price in EUR")
    )
    price_yearly = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0.00,
        help_text=_("Yearly price in EUR (should include discount)")
    )

    # Stripe integration
    stripe_price_id_monthly = models.CharField(
        max_length=255,
        blank=True,
        help_text=_("Stripe Price ID for monthly billing")
    )
    stripe_price_id_yearly = models.CharField(
        max_length=255,
        blank=True,
        help_text=_("Stripe Price ID for yearly billing")
    )

    # Features and limits
    features = models.JSONField(
        default=dict,
        help_text=_("List of features available in this plan")
    )
    limits = models.JSONField(
        default=dict,
        help_text=_("Usage limits: {'invoice_creation': 25, 'estimate_creation': 25, 'document_import': 10}")
    )

    # Metadata
    is_active = models.BooleanField(default=True, help_text=_("Is this plan available for new subscriptions?"))
    display_order = models.IntegerField(default=0, help_text=_("Display order on pricing page"))
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Subscription Plan")
        verbose_name_plural = _("Subscription Plans")
        ordering = ['display_order', 'tier']

    def __str__(self):
        return f"{self.name} ({self.get_tier_display()})"

    def get_price_for_cycle(self, billing_cycle):
        """Get price for specific billing cycle"""
        if billing_cycle == BillingCycle.YEARLY:
            return self.price_yearly
        return self.price_monthly

    def get_stripe_price_id(self, billing_cycle):
        """Get Stripe price ID for specific billing cycle"""
        if billing_cycle == BillingCycle.YEARLY:
            return self.stripe_price_id_yearly
        return self.stripe_price_id_monthly


class Subscription(models.Model):
    """
    User subscription with payment and billing information.
    Tracks active subscription, billing cycle, and Stripe integration.
    """
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='subscription'
    )
    plan = models.ForeignKey(
        SubscriptionPlan,
        on_delete=models.PROTECT,
        related_name='subscriptions',
        null=True,
        blank=True,
        help_text=_("Current subscription plan")
    )

    # Tier and status
    tier = models.CharField(
        max_length=20,
        choices=SubscriptionTier.choices,
        default=SubscriptionTier.FREE,
        help_text=_("Current subscription tier")
    )
    status = models.CharField(
        max_length=20,
        choices=SubscriptionStatus.choices,
        default=SubscriptionStatus.ACTIVE,
        help_text=_("Subscription status")
    )

    # Billing
    billing_cycle = models.CharField(
        max_length=20,
        choices=BillingCycle.choices,
        blank=True,
        help_text=_("Billing cycle (monthly or yearly)")
    )

    # Period tracking
    current_period_start = models.DateTimeField(
        null=True,
        blank=True,
        help_text=_("Start of current billing period")
    )
    current_period_end = models.DateTimeField(
        null=True,
        blank=True,
        help_text=_("End of current billing period")
    )

    # Trial
    trial_ends_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text=_("When trial period ends")
    )

    # Cancellation
    cancelled_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text=_("When subscription was cancelled")
    )
    cancel_at_period_end = models.BooleanField(
        default=False,
        help_text=_("Cancel subscription at end of current period")
    )

    # Stripe integration
    stripe_customer_id = models.CharField(
        max_length=255,
        blank=True,
        help_text=_("Stripe customer ID")
    )
    stripe_subscription_id = models.CharField(
        max_length=255,
        blank=True,
        help_text=_("Stripe subscription ID")
    )

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Subscription")
        verbose_name_plural = _("Subscriptions")
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} - {self.get_tier_display()} ({self.get_status_display()})"

    def is_trial_active(self):
        """Check if trial is still active"""
        if not self.trial_ends_at:
            return False
        return timezone.now() < self.trial_ends_at and self.status == SubscriptionStatus.TRIALING

    def is_active_paid(self):
        """Check if subscription is active and paid (not trial, not free)"""
        return (
            self.status == SubscriptionStatus.ACTIVE and
            self.tier in [SubscriptionTier.CORE, SubscriptionTier.ELITE]
        )

    def days_until_trial_ends(self):
        """Calculate days remaining in trial"""
        if not self.is_trial_active():
            return 0
        delta = self.trial_ends_at - timezone.now()
        return max(0, delta.days)

    def get_effective_tier(self):
        """
        Get effective tier considering trial.
        During trial, user has access to trial tier features.
        """
        if self.is_trial_active():
            # During trial, user might have access to higher tier
            # Check if trial_tier was set during trial creation
            return self.tier
        return self.tier

    def has_tier_access(self, required_tier):
        """
        Check if user has access to features requiring specific tier.
        Tier hierarchy: ELITE > CORE > FREE
        """
        tier_levels = {
            SubscriptionTier.FREE: 1,
            SubscriptionTier.CORE: 2,
            SubscriptionTier.ELITE: 3,
        }

        current_tier = self.get_effective_tier()
        current_level = tier_levels.get(current_tier, 0)
        required_level = tier_levels.get(required_tier, 0)

        return current_level >= required_level


class UsageCounter(models.Model):
    """
    Track usage of features with limits (e.g., invoices, estimates, imports).
    Counters reset monthly (on 1st of each month).
    """
    FEATURE_CHOICES = [
        ('invoice_creation', _('Invoice Creation')),
        ('estimate_creation', _('Estimate Creation')),
        ('document_import', _('Document Import')),
        ('email_sending', _('Email Sending')),
        ('signature_request', _('Signature Request')),
        ('cra_creation', _('CRA Creation')),
    ]

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='usage_counters'
    )
    feature = models.CharField(
        max_length=50,
        choices=FEATURE_CHOICES,
        help_text=_("Feature being tracked")
    )

    # Period tracking
    period_start = models.DateField(help_text=_("Start of tracking period (1st of month)"))
    period_end = models.DateField(help_text=_("End of tracking period (last day of month)"))

    # Usage tracking
    count = models.IntegerField(default=0, help_text=_("Current usage count"))
    limit = models.IntegerField(
        null=True,
        blank=True,
        help_text=_("Usage limit for this period (null = unlimited)")
    )

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("Usage Counter")
        verbose_name_plural = _("Usage Counters")
        unique_together = ['user', 'feature', 'period_start']
        ordering = ['-period_start', 'feature']
        indexes = [
            models.Index(fields=['user', 'feature', 'period_start']),
        ]

    def __str__(self):
        limit_str = str(self.limit) if self.limit else "unlimited"
        return f"{self.user.username} - {self.get_feature_display()}: {self.count}/{limit_str}"

    def is_limit_reached(self):
        """Check if usage limit has been reached"""
        if self.limit is None:
            return False
        return self.count >= self.limit

    def remaining(self):
        """Get remaining usage in current period"""
        if self.limit is None:
            return None  # Unlimited
        return max(0, self.limit - self.count)

    def increment(self):
        """Increment usage counter"""
        self.count += 1
        self.save(update_fields=['count', 'updated_at'])


class SubscriptionHistory(models.Model):
    """
    Audit log for subscription changes.
    Tracks upgrades, downgrades, cancellations, etc.
    """
    ACTION_CHOICES = [
        ('created', _('Created')),
        ('upgraded', _('Upgraded')),
        ('downgraded', _('Downgraded')),
        ('cancelled', _('Cancelled')),
        ('reactivated', _('Reactivated')),
        ('trial_started', _('Trial Started')),
        ('trial_ended', _('Trial Ended')),
        ('payment_failed', _('Payment Failed')),
        ('payment_succeeded', _('Payment Succeeded')),
    ]

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='subscription_history'
    )
    action = models.CharField(
        max_length=50,
        choices=ACTION_CHOICES,
        help_text=_("Action performed")
    )

    # Tier tracking
    old_tier = models.CharField(
        max_length=20,
        choices=SubscriptionTier.choices,
        blank=True,
        help_text=_("Previous tier")
    )
    new_tier = models.CharField(
        max_length=20,
        choices=SubscriptionTier.choices,
        blank=True,
        help_text=_("New tier")
    )

    # Additional context
    reason = models.TextField(blank=True, help_text=_("Reason for action or additional notes"))
    stripe_invoice_id = models.CharField(max_length=255, blank=True)
    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text=_("Amount charged (if applicable)")
    )

    # Metadata
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _("Subscription History")
        verbose_name_plural = _("Subscription Histories")
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['user', '-timestamp']),
        ]

    def __str__(self):
        return f"{self.user.username} - {self.get_action_display()} at {self.timestamp}"
