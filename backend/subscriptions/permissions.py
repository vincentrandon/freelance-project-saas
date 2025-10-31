from rest_framework import permissions
from django.utils.translation import gettext_lazy as _
from .models import SubscriptionTier


class HasTierAccess(permissions.BasePermission):
    """
    Permission class to check if user has required subscription tier.
    Usage: permission_classes = [HasTierAccess]
    Set required_tier attribute on view.
    """
    message = _("This feature requires a higher subscription tier.")

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        # Get required tier from view attribute
        required_tier = getattr(view, 'required_tier', None)
        if not required_tier:
            return True  # No tier requirement

        # Check if user has subscription
        if not hasattr(request.user, 'subscription'):
            return False

        subscription = request.user.subscription
        return subscription.has_tier_access(required_tier)


class RequireCoreOrElite(permissions.BasePermission):
    """Permission to require CORE or ELITE tier"""
    message = _("This feature requires Core or Elite plan.")

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        if not hasattr(request.user, 'subscription'):
            return False

        subscription = request.user.subscription
        return subscription.has_tier_access(SubscriptionTier.CORE)


class RequireElite(permissions.BasePermission):
    """Permission to require ELITE tier only"""
    message = _("This feature is only available in the Elite plan.")

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        if not hasattr(request.user, 'subscription'):
            return False

        subscription = request.user.subscription
        return subscription.has_tier_access(SubscriptionTier.ELITE)


class HasFeatureAccess(permissions.BasePermission):
    """
    Permission class to check if user has access to specific feature.
    Usage: Set feature_name attribute on view.
    """
    message = _("You don't have access to this feature in your current plan.")

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False

        feature_name = getattr(view, 'feature_name', None)
        if not feature_name:
            return True  # No feature restriction

        if not hasattr(request.user, 'subscription'):
            return False

        subscription = request.user.subscription

        # Check if feature is available in user's plan
        if subscription.plan and subscription.plan.features:
            return feature_name in subscription.plan.features

        # Default feature availability by tier
        FEATURE_TIERS = {
            'invoice_creation': SubscriptionTier.FREE,
            'estimate_creation': SubscriptionTier.FREE,
            'document_import': SubscriptionTier.FREE,
            'email_sending': SubscriptionTier.CORE,
            'signature_request': SubscriptionTier.CORE,
            'task_catalogue': SubscriptionTier.CORE,
            'cra_access': SubscriptionTier.ELITE,
            'ai_generation': SubscriptionTier.ELITE,
            'ai_suggestions': SubscriptionTier.ELITE,
        }

        required_tier = FEATURE_TIERS.get(feature_name, SubscriptionTier.ELITE)
        return subscription.has_tier_access(required_tier)
