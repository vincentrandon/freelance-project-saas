from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Subscription, SubscriptionPlan, UsageCounter, SubscriptionHistory


class SubscriptionPlanSerializer(serializers.ModelSerializer):
    """Serializer for subscription plans"""

    discount_percentage = serializers.SerializerMethodField()
    monthly_savings = serializers.SerializerMethodField()

    class Meta:
        model = SubscriptionPlan
        fields = [
            'id', 'name', 'tier', 'price_monthly', 'price_yearly',
            'discount_percentage', 'monthly_savings',
            'features', 'limits', 'is_active', 'display_order'
        ]

    def get_discount_percentage(self, obj):
        """Calculate discount percentage for yearly billing"""
        if obj.price_monthly == 0 or obj.price_yearly == 0:
            return 0
        yearly_if_monthly = obj.price_monthly * 12
        discount = ((yearly_if_monthly - obj.price_yearly) / yearly_if_monthly) * 100
        return round(discount, 1)

    def get_monthly_savings(self, obj):
        """Calculate monthly savings with yearly plan"""
        if obj.price_monthly == 0 or obj.price_yearly == 0:
            return 0
        monthly_equivalent = obj.price_yearly / 12
        return round(float(obj.price_monthly - monthly_equivalent), 2)


class UsageCounterSerializer(serializers.ModelSerializer):
    """Serializer for usage counters"""

    feature_display = serializers.CharField(source='get_feature_display', read_only=True)
    remaining = serializers.IntegerField(source='remaining', read_only=True)
    is_limit_reached = serializers.BooleanField(source='is_limit_reached', read_only=True)
    usage_percentage = serializers.SerializerMethodField()

    class Meta:
        model = UsageCounter
        fields = [
            'id', 'feature', 'feature_display',
            'count', 'limit', 'remaining', 'is_limit_reached',
            'usage_percentage', 'period_start', 'period_end'
        ]

    def get_usage_percentage(self, obj):
        """Calculate usage percentage"""
        if obj.limit is None or obj.limit == 0:
            return 0
        return round((obj.count / obj.limit) * 100, 1)


class SubscriptionSerializer(serializers.ModelSerializer):
    """Serializer for user subscriptions"""

    user_email = serializers.EmailField(source='user.email', read_only=True)
    plan_details = SubscriptionPlanSerializer(source='plan', read_only=True)
    tier_display = serializers.CharField(source='get_tier_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    billing_cycle_display = serializers.CharField(source='get_billing_cycle_display', read_only=True)
    is_trial = serializers.BooleanField(source='is_trial_active', read_only=True)
    days_until_trial_ends = serializers.IntegerField(read_only=True)
    is_active = serializers.BooleanField(source='is_active_paid', read_only=True)

    class Meta:
        model = Subscription
        fields = [
            'id', 'user_email', 'plan_details', 'tier', 'tier_display',
            'status', 'status_display', 'billing_cycle', 'billing_cycle_display',
            'current_period_start', 'current_period_end',
            'trial_ends_at', 'is_trial', 'days_until_trial_ends',
            'cancelled_at', 'cancel_at_period_end', 'is_active',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'stripe_customer_id', 'stripe_subscription_id',
            'current_period_start', 'current_period_end',
            'cancelled_at', 'created_at', 'updated_at'
        ]


class SubscriptionWithUsageSerializer(SubscriptionSerializer):
    """Subscription serializer with usage data included"""

    usage = serializers.SerializerMethodField()

    class Meta(SubscriptionSerializer.Meta):
        fields = SubscriptionSerializer.Meta.fields + ['usage']

    def get_usage(self, obj):
        """Get usage counters for current period"""
        from .services.usage_tracker import get_usage_summary
        usage_summary = get_usage_summary(obj.user)
        return usage_summary.get('usage', {})


class SubscriptionHistorySerializer(serializers.ModelSerializer):
    """Serializer for subscription history"""

    user_email = serializers.EmailField(source='user.email', read_only=True)
    action_display = serializers.CharField(source='get_action_display', read_only=True)
    old_tier_display = serializers.SerializerMethodField()
    new_tier_display = serializers.SerializerMethodField()

    class Meta:
        model = SubscriptionHistory
        fields = [
            'id', 'user_email', 'action', 'action_display',
            'old_tier', 'old_tier_display', 'new_tier', 'new_tier_display',
            'reason', 'amount', 'timestamp'
        ]

    def get_old_tier_display(self, obj):
        if obj.old_tier:
            return dict(obj._meta.get_field('old_tier').choices).get(obj.old_tier, obj.old_tier)
        return None

    def get_new_tier_display(self, obj):
        if obj.new_tier:
            return dict(obj._meta.get_field('new_tier').choices).get(obj.new_tier, obj.new_tier)
        return None


class CreateCheckoutSessionSerializer(serializers.Serializer):
    """Serializer for creating Stripe checkout session"""

    plan_id = serializers.IntegerField(required=True)
    billing_cycle = serializers.ChoiceField(choices=['monthly', 'yearly'], required=True)
    success_url = serializers.URLField(required=True)
    cancel_url = serializers.URLField(required=True)


class UsageSummarySerializer(serializers.Serializer):
    """Serializer for usage summary response"""

    subscription_tier = serializers.CharField()
    is_trial = serializers.BooleanField()
    usage = serializers.DictField()
