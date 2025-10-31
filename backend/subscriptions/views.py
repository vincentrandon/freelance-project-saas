from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from django.conf import settings
from django.views.decorators.csrf import csrf_exempt
from django.http import HttpResponse
from django.utils.translation import gettext as _
from django.db.models import Count, Sum, Q
from django.utils import timezone
from datetime import timedelta
import stripe
import json

from .models import Subscription, SubscriptionPlan, UsageCounter, SubscriptionHistory, SubscriptionTier
from .serializers import (
    SubscriptionSerializer, SubscriptionPlanSerializer, UsageCounterSerializer,
    SubscriptionHistorySerializer, CreateCheckoutSessionSerializer,
    SubscriptionWithUsageSerializer, UsageSummarySerializer
)
from .stripe_handlers import StripeService, StripeWebhookHandler
from .services.usage_tracker import get_usage_summary

stripe.api_key = getattr(settings, 'STRIPE_SECRET_KEY', '')


class SubscriptionPlanViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for subscription plans.
    Public read-only access to see available plans.
    """
    queryset = SubscriptionPlan.objects.filter(is_active=True)
    serializer_class = SubscriptionPlanSerializer
    permission_classes = []  # Public access

    def get_queryset(self):
        """Return only active plans, ordered by display order"""
        return super().get_queryset().order_by('display_order', 'tier')


class SubscriptionViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for user subscriptions"""
    serializer_class = SubscriptionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Users can only see their own subscription"""
        return Subscription.objects.filter(user=self.request.user)

    @action(detail=False, methods=['get'])
    def current(self, request):
        """Get current user's subscription with usage data"""
        try:
            subscription = Subscription.objects.get(user=request.user)
            serializer = SubscriptionWithUsageSerializer(subscription)
            return Response(serializer.data)
        except Subscription.DoesNotExist:
            return Response(
                {'error': _('No subscription found')},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=False, methods=['get'])
    def usage(self, request):
        """Get usage statistics for current period"""
        usage_summary = get_usage_summary(request.user)
        serializer = UsageSummarySerializer(usage_summary)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def create_checkout_session(self, request):
        """Create a Stripe checkout session for subscription upgrade"""
        serializer = CreateCheckoutSessionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        plan_id = serializer.validated_data['plan_id']
        billing_cycle = serializer.validated_data['billing_cycle']
        success_url = serializer.validated_data['success_url']
        cancel_url = serializer.validated_data['cancel_url']

        try:
            plan = SubscriptionPlan.objects.get(id=plan_id, is_active=True)

            # Create checkout session
            checkout_session = StripeService.create_checkout_session(
                user=request.user,
                plan=plan,
                billing_cycle=billing_cycle,
                success_url=success_url,
                cancel_url=cancel_url
            )

            return Response({
                'session_id': checkout_session.id,
                'url': checkout_session.url
            })

        except SubscriptionPlan.DoesNotExist:
            return Response(
                {'error': _('Plan not found')},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['post'])
    def create_portal_session(self, request):
        """Create a Stripe Customer Portal session for managing subscription"""
        return_url = request.data.get('return_url')

        if not return_url:
            return Response(
                {'error': _('return_url is required')},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            portal_session = StripeService.create_portal_session(
                user=request.user,
                return_url=return_url
            )

            return Response({
                'url': portal_session.url
            })

        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['post'])
    def cancel(self, request):
        """Cancel subscription (at end of period)"""
        cancel_immediately = request.data.get('cancel_immediately', False)

        try:
            stripe_subscription = StripeService.cancel_subscription(
                user=request.user,
                cancel_at_period_end=not cancel_immediately
            )

            subscription = Subscription.objects.get(user=request.user)
            subscription.cancel_at_period_end = stripe_subscription.cancel_at_period_end
            if cancel_immediately:
                subscription.cancelled_at = timezone.now()
            subscription.save()

            return Response({
                'message': _('Subscription cancelled successfully'),
                'cancel_at_period_end': subscription.cancel_at_period_end
            })

        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


@csrf_exempt
@api_view(['POST'])
@permission_classes([])
def stripe_webhook(request):
    """
    Handle Stripe webhook events.
    This endpoint is called by Stripe to notify us of subscription events.
    """
    payload = request.body
    sig_header = request.META.get('HTTP_STRIPE_SIGNATURE')
    webhook_secret = getattr(settings, 'STRIPE_WEBHOOK_SECRET', '')

    if not webhook_secret:
        return HttpResponse('Webhook secret not configured', status=400)

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, webhook_secret
        )
    except ValueError:
        return HttpResponse('Invalid payload', status=400)
    except stripe.error.SignatureVerificationError:
        return HttpResponse('Invalid signature', status=400)

    # Handle the event
    event_type = event['type']
    data_object = event['data']['object']

    try:
        if event_type == 'checkout.session.completed':
            StripeWebhookHandler.handle_checkout_completed(data_object)

        elif event_type == 'customer.subscription.updated':
            StripeWebhookHandler.handle_subscription_updated(data_object)

        elif event_type == 'customer.subscription.deleted':
            StripeWebhookHandler.handle_subscription_deleted(data_object)

        elif event_type == 'invoice.payment_succeeded':
            StripeWebhookHandler.handle_invoice_payment_succeeded(data_object)

        elif event_type == 'invoice.payment_failed':
            StripeWebhookHandler.handle_invoice_payment_failed(data_object)

    except Exception as e:
        # Log error but return 200 to Stripe to acknowledge receipt
        print(f"Webhook handler error: {str(e)}")

    return HttpResponse('Success', status=200)


# Admin-only endpoints
class AdminSubscriptionViewSet(viewsets.ReadOnlyModelViewSet):
    """Admin-only viewset for managing all subscriptions"""
    queryset = Subscription.objects.all().select_related('user', 'plan')
    serializer_class = SubscriptionSerializer
    permission_classes = [IsAdminUser]

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get subscription statistics"""
        total_users = Subscription.objects.count()
        active_subscriptions = Subscription.objects.filter(
            status='active',
            tier__in=[SubscriptionTier.CORE, SubscriptionTier.ELITE]
        ).count()

        # Count by tier
        tier_counts = Subscription.objects.values('tier').annotate(count=Count('id'))
        tier_breakdown = {tier['tier']: tier['count'] for tier in tier_counts}

        # Count by status
        status_counts = Subscription.objects.values('status').annotate(count=Count('id'))
        status_breakdown = {status['status']: status['count'] for status in status_counts}

        # Trial statistics
        active_trials = Subscription.objects.filter(
            status='trialing',
            trial_ends_at__gte=timezone.now()
        ).count()

        # Revenue estimation (simplified)
        core_count = tier_breakdown.get(SubscriptionTier.CORE, 0)
        elite_count = tier_breakdown.get(SubscriptionTier.ELITE, 0)

        try:
            core_plan = SubscriptionPlan.objects.get(tier=SubscriptionTier.CORE)
            elite_plan = SubscriptionPlan.objects.get(tier=SubscriptionTier.ELITE)
            mrr = (core_count * float(core_plan.price_monthly)) + (elite_count * float(elite_plan.price_monthly))
        except:
            mrr = 0

        return Response({
            'total_users': total_users,
            'active_subscriptions': active_subscriptions,
            'tier_breakdown': tier_breakdown,
            'status_breakdown': status_breakdown,
            'active_trials': active_trials,
            'mrr': round(mrr, 2),
        })

    @action(detail=True, methods=['patch'])
    def change_tier(self, request, pk=None):
        """Manually change user's subscription tier"""
        subscription = self.get_object()
        new_tier = request.data.get('tier')

        if new_tier not in dict(SubscriptionTier.choices):
            return Response(
                {'error': _('Invalid tier')},
                status=status.HTTP_400_BAD_REQUEST
            )

        old_tier = subscription.tier
        subscription.tier = new_tier
        subscription.save()

        # Update denormalized field
        if hasattr(subscription.user, 'profile'):
            subscription.user.profile.subscription_tier = new_tier
            subscription.user.profile.save(update_fields=['subscription_tier'])

        # Log history
        SubscriptionHistory.objects.create(
            user=subscription.user,
            action='upgraded' if new_tier > old_tier else 'downgraded',
            old_tier=old_tier,
            new_tier=new_tier,
            reason='Manual change by admin'
        )

        return Response({'message': _('Tier updated successfully')})

    @action(detail=True, methods=['post'])
    def extend_trial(self, request, pk=None):
        """Extend trial period by specified days"""
        subscription = self.get_object()
        days = request.data.get('days', 7)

        if not subscription.trial_ends_at:
            subscription.trial_ends_at = timezone.now()

        subscription.trial_ends_at += timedelta(days=days)
        subscription.save()

        # Update denormalized field
        if hasattr(subscription.user, 'profile'):
            subscription.user.profile.trial_ends_at = subscription.trial_ends_at
            subscription.user.profile.save(update_fields=['trial_ends_at'])

        return Response({
            'message': _('Trial extended by %s days') % days,
            'trial_ends_at': subscription.trial_ends_at
        })

    @action(detail=False, methods=['get'])
    def revenue(self, request):
        """Get revenue analytics"""
        # Get date range from query params
        days = int(request.query_params.get('days', 30))
        start_date = timezone.now() - timedelta(days=days)

        # Get successful payments
        payments = SubscriptionHistory.objects.filter(
            action='payment_succeeded',
            timestamp__gte=start_date
        ).values('timestamp__date').annotate(
            total=Sum('amount')
        ).order_by('timestamp__date')

        return Response({
            'payments': list(payments),
            'total_revenue': sum(p['total'] or 0 for p in payments)
        })


class UsageCounterViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for usage counters (admin only)"""
    queryset = UsageCounter.objects.all()
    serializer_class = UsageCounterSerializer
    permission_classes = [IsAdminUser]

    @action(detail=False, methods=['get'])
    def user_usage(self, request):
        """Get usage for specific user"""
        user_id = request.query_params.get('user_id')

        if not user_id:
            return Response(
                {'error': _('user_id parameter required')},
                status=status.HTTP_400_BAD_REQUEST
            )

        counters = UsageCounter.objects.filter(user_id=user_id)
        serializer = self.get_serializer(counters, many=True)
        return Response(serializer.data)
