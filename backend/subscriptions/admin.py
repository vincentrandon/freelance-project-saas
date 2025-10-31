from django.contrib import admin
from django.utils.translation import gettext_lazy as _
from django.utils.html import format_html
from .models import Subscription, SubscriptionPlan, UsageCounter, SubscriptionHistory


@admin.register(SubscriptionPlan)
class SubscriptionPlanAdmin(admin.ModelAdmin):
    list_display = ['name', 'tier', 'price_monthly', 'price_yearly', 'is_active', 'display_order']
    list_filter = ['tier', 'is_active']
    search_fields = ['name']
    ordering = ['display_order', 'tier']

    fieldsets = (
        (_('Basic Information'), {
            'fields': ('name', 'tier', 'is_active', 'display_order')
        }),
        (_('Pricing'), {
            'fields': ('price_monthly', 'price_yearly')
        }),
        (_('Stripe Integration'), {
            'fields': ('stripe_price_id_monthly', 'stripe_price_id_yearly')
        }),
        (_('Features & Limits'), {
            'fields': ('features', 'limits'),
            'classes': ('collapse',)
        }),
    )


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = [
        'user', 'tier_badge', 'status_badge', 'billing_cycle',
        'trial_status', 'current_period_end', 'created_at'
    ]
    list_filter = ['tier', 'status', 'billing_cycle', 'cancel_at_period_end']
    search_fields = ['user__username', 'user__email', 'stripe_customer_id', 'stripe_subscription_id']
    readonly_fields = [
        'stripe_customer_id', 'stripe_subscription_id',
        'current_period_start', 'current_period_end',
        'created_at', 'updated_at'
    ]

    fieldsets = (
        (_('User & Plan'), {
            'fields': ('user', 'plan', 'tier', 'status')
        }),
        (_('Billing'), {
            'fields': ('billing_cycle', 'current_period_start', 'current_period_end')
        }),
        (_('Trial'), {
            'fields': ('trial_ends_at',)
        }),
        (_('Cancellation'), {
            'fields': ('cancel_at_period_end', 'cancelled_at')
        }),
        (_('Stripe Integration'), {
            'fields': ('stripe_customer_id', 'stripe_subscription_id'),
            'classes': ('collapse',)
        }),
        (_('Metadata'), {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    actions = ['upgrade_to_core', 'upgrade_to_elite', 'downgrade_to_free', 'extend_trial']

    def tier_badge(self, obj):
        colors = {
            'FREE': '#6B7280',
            'CORE': '#3B82F6',
            'ELITE': '#8B5CF6',
        }
        color = colors.get(obj.tier, '#6B7280')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 8px; border-radius: 3px; font-weight: bold;">{}</span>',
            color, obj.get_tier_display()
        )
    tier_badge.short_description = _('Tier')

    def status_badge(self, obj):
        colors = {
            'active': '#10B981',
            'trialing': '#F59E0B',
            'past_due': '#EF4444',
            'cancelled': '#6B7280',
            'incomplete': '#EF4444',
        }
        color = colors.get(obj.status, '#6B7280')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 8px; border-radius: 3px;">{}</span>',
            color, obj.get_status_display()
        )
    status_badge.short_description = _('Status')

    def trial_status(self, obj):
        if obj.is_trial_active():
            days = obj.days_until_trial_ends()
            return format_html(
                '<span style="color: #F59E0B;">Trial: {} days left</span>',
                days
            )
        elif obj.trial_ends_at:
            return format_html('<span style="color: #6B7280;">Trial ended</span>')
        return '-'
    trial_status.short_description = _('Trial')

    def upgrade_to_core(self, request, queryset):
        from .models import SubscriptionTier, SubscriptionStatus
        count = queryset.update(tier=SubscriptionTier.CORE, status=SubscriptionStatus.ACTIVE)
        self.message_user(request, _('%s subscriptions upgraded to CORE') % count)
    upgrade_to_core.short_description = _('Upgrade to CORE')

    def upgrade_to_elite(self, request, queryset):
        from .models import SubscriptionTier, SubscriptionStatus
        count = queryset.update(tier=SubscriptionTier.ELITE, status=SubscriptionStatus.ACTIVE)
        self.message_user(request, _('%s subscriptions upgraded to ELITE') % count)
    upgrade_to_elite.short_description = _('Upgrade to ELITE')

    def downgrade_to_free(self, request, queryset):
        from .models import SubscriptionTier, SubscriptionStatus
        count = queryset.update(tier=SubscriptionTier.FREE, status=SubscriptionStatus.ACTIVE)
        self.message_user(request, _('%s subscriptions downgraded to FREE') % count)
    downgrade_to_free.short_description = _('Downgrade to FREE')

    def extend_trial(self, request, queryset):
        from django.utils import timezone
        from datetime import timedelta
        count = queryset.count()
        for subscription in queryset:
            if subscription.trial_ends_at:
                subscription.trial_ends_at += timedelta(days=7)
                subscription.save()
        self.message_user(request, _('Extended trial by 7 days for %s subscriptions') % count)
    extend_trial.short_description = _('Extend trial by 7 days')


@admin.register(UsageCounter)
class UsageCounterAdmin(admin.ModelAdmin):
    list_display = ['user', 'feature', 'count', 'limit', 'usage_percentage', 'period_start', 'period_end']
    list_filter = ['feature', 'period_start']
    search_fields = ['user__username', 'user__email']
    readonly_fields = ['created_at', 'updated_at']

    def usage_percentage(self, obj):
        if obj.limit is None:
            return format_html('<span style="color: #10B981;">Unlimited</span>')
        if obj.limit == 0:
            return '0%'
        percentage = (obj.count / obj.limit) * 100
        color = '#EF4444' if percentage >= 100 else '#F59E0B' if percentage >= 80 else '#10B981'
        return format_html(
            '<span style="color: {};">{:.0f}%</span>',
            color, percentage
        )
    usage_percentage.short_description = _('Usage %')


@admin.register(SubscriptionHistory)
class SubscriptionHistoryAdmin(admin.ModelAdmin):
    list_display = ['user', 'action', 'old_tier', 'new_tier', 'amount', 'timestamp']
    list_filter = ['action', 'old_tier', 'new_tier', 'timestamp']
    search_fields = ['user__username', 'user__email', 'stripe_invoice_id', 'reason']
    readonly_fields = ['user', 'action', 'old_tier', 'new_tier', 'reason', 'stripe_invoice_id', 'amount', 'timestamp']
    date_hierarchy = 'timestamp'

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
