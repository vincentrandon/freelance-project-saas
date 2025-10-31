from functools import wraps
from django.utils.translation import gettext as _
from rest_framework.response import Response
from rest_framework import status
from .models import SubscriptionTier
from .services.usage_tracker import UsageTracker


def require_tier(required_tier):
    """
    Decorator to check if user has required subscription tier.

    Usage:
    @require_tier(SubscriptionTier.CORE)
    def my_view(request):
        ...
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapped_view(request, *args, **kwargs):
            if not request.user or not request.user.is_authenticated:
                return Response(
                    {'error': _('Authentication required')},
                    status=status.HTTP_401_UNAUTHORIZED
                )

            if not hasattr(request.user, 'subscription'):
                return Response(
                    {'error': _('Subscription not found')},
                    status=status.HTTP_403_FORBIDDEN
                )

            subscription = request.user.subscription
            if not subscription.has_tier_access(required_tier):
                tier_names = {
                    SubscriptionTier.FREE: _('Free'),
                    SubscriptionTier.CORE: _('Core'),
                    SubscriptionTier.ELITE: _('Elite'),
                }
                return Response(
                    {
                        'error': _('This feature requires {tier} plan or higher').format(
                            tier=tier_names.get(required_tier, required_tier)
                        ),
                        'required_tier': required_tier,
                        'current_tier': subscription.tier,
                        'upgrade_required': True
                    },
                    status=status.HTTP_403_FORBIDDEN
                )

            return view_func(request, *args, **kwargs)
        return wrapped_view
    return decorator


def check_usage_limit(feature_name):
    """
    Decorator to check and enforce usage limits for a feature.
    Automatically increments counter after successful action.

    Usage:
    @check_usage_limit('invoice_creation')
    def create_invoice(request):
        ...
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapped_view(request, *args, **kwargs):
            if not request.user or not request.user.is_authenticated:
                return Response(
                    {'error': _('Authentication required')},
                    status=status.HTTP_401_UNAUTHORIZED
                )

            usage_tracker = UsageTracker(request.user)

            # Check if limit would be exceeded
            if usage_tracker.is_limit_reached(feature_name):
                limit = usage_tracker.get_limit(feature_name)
                remaining = usage_tracker.get_remaining(feature_name)

                return Response(
                    {
                        'error': _('Usage limit exceeded for {feature}').format(
                            feature=feature_name.replace('_', ' ').title()
                        ),
                        'feature': feature_name,
                        'limit': limit,
                        'remaining': remaining,
                        'upgrade_required': True,
                        'message': _('Upgrade to Core or Elite plan for unlimited access.')
                    },
                    status=status.HTTP_429_TOO_MANY_REQUESTS
                )

            # Execute view
            response = view_func(request, *args, **kwargs)

            # Increment counter only if request was successful (2xx status)
            if response.status_code >= 200 and response.status_code < 300:
                usage_tracker.increment(feature_name)

            return response
        return wrapped_view
    return decorator


def check_usage_limit_method(feature_name):
    """
    Method decorator for DRF ViewSet actions.
    Checks usage limit before allowing action.

    Usage (in ViewSet):
    @action(detail=False, methods=['post'])
    @check_usage_limit_method('invoice_creation')
    def create(self, request):
        ...
    """
    def decorator(method):
        @wraps(method)
        def wrapped_method(self, request, *args, **kwargs):
            if not request.user or not request.user.is_authenticated:
                return Response(
                    {'error': _('Authentication required')},
                    status=status.HTTP_401_UNAUTHORIZED
                )

            usage_tracker = UsageTracker(request.user)

            # Check if limit would be exceeded
            if usage_tracker.is_limit_reached(feature_name):
                limit = usage_tracker.get_limit(feature_name)
                current = usage_tracker.get_current_count(feature_name)

                return Response(
                    {
                        'error': _('Usage limit exceeded for {feature}').format(
                            feature=feature_name.replace('_', ' ').title()
                        ),
                        'feature': feature_name,
                        'limit': limit,
                        'current': current,
                        'upgrade_required': True,
                        'message': _('Upgrade to Core or Elite plan for unlimited access.')
                    },
                    status=status.HTTP_429_TOO_MANY_REQUESTS
                )

            # Execute method
            response = method(self, request, *args, **kwargs)

            # Increment counter only if request was successful (2xx status)
            if response.status_code >= 200 and response.status_code < 300:
                usage_tracker.increment(feature_name)

            return response
        return wrapped_method
    return decorator


def require_feature(feature_name):
    """
    Decorator to check if user has access to specific feature.

    Usage:
    @require_feature('ai_generation')
    def ai_generate_estimate(request):
        ...
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapped_view(request, *args, **kwargs):
            if not request.user or not request.user.is_authenticated:
                return Response(
                    {'error': _('Authentication required')},
                    status=status.HTTP_401_UNAUTHORIZED
                )

            if not hasattr(request.user, 'subscription'):
                return Response(
                    {'error': _('Subscription not found')},
                    status=status.HTTP_403_FORBIDDEN
                )

            subscription = request.user.subscription

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

            if not subscription.has_tier_access(required_tier):
                tier_names = {
                    SubscriptionTier.FREE: _('Free'),
                    SubscriptionTier.CORE: _('Core'),
                    SubscriptionTier.ELITE: _('Elite'),
                }
                return Response(
                    {
                        'error': _('This feature requires {tier} plan or higher').format(
                            tier=tier_names.get(required_tier, required_tier)
                        ),
                        'feature': feature_name,
                        'required_tier': required_tier,
                        'current_tier': subscription.tier,
                        'upgrade_required': True
                    },
                    status=status.HTTP_403_FORBIDDEN
                )

            return view_func(request, *args, **kwargs)
        return wrapped_view
    return decorator
