from django.utils import timezone
from django.contrib.auth.models import User

from .stripe_client import stripe
from .models import Subscription, SubscriptionHistory, SubscriptionTier, SubscriptionStatus, BillingCycle, SubscriptionPlan


class StripeService:
    """Service for handling Stripe API operations"""

    @staticmethod
    def create_customer(user):
        """Create a Stripe customer for the user"""
        try:
            customer = stripe.Customer.create(
                email=user.email,
                metadata={
                    'user_id': user.id,
                    'username': user.username
                }
            )
            return customer
        except stripe.error.StripeError as e:
            raise Exception(f"Failed to create Stripe customer: {str(e)}")

    @staticmethod
    def create_checkout_session(user, plan, billing_cycle, success_url, cancel_url):
        """
        Create a Stripe Checkout session for subscription.

        Args:
            user: Django User instance
            plan: SubscriptionPlan instance
            billing_cycle: 'monthly' or 'yearly'
            success_url: URL to redirect after successful payment
            cancel_url: URL to redirect if payment cancelled
        """
        # Get or create Stripe customer
        subscription = Subscription.objects.get(user=user)

        if not subscription.stripe_customer_id:
            customer = StripeService.create_customer(user)
            subscription.stripe_customer_id = customer.id
            subscription.save(update_fields=['stripe_customer_id'])

        # Get appropriate price ID
        price_id = plan.get_stripe_price_id(billing_cycle)

        if not price_id:
            raise Exception(f"No Stripe price ID configured for {plan.name} ({billing_cycle})")

        try:
            # Create checkout session
            checkout_session = stripe.checkout.Session.create(
                customer=subscription.stripe_customer_id,
                payment_method_types=['card'],
                line_items=[{
                    'price': price_id,
                    'quantity': 1,
                }],
                mode='subscription',
                success_url=success_url,
                cancel_url=cancel_url,
                metadata={
                    'user_id': user.id,
                    'plan_tier': plan.tier,
                    'billing_cycle': billing_cycle,
                },
                subscription_data={
                    'metadata': {
                        'user_id': user.id,
                        'plan_tier': plan.tier,
                    }
                }
            )
            return checkout_session
        except stripe.error.StripeError as e:
            raise Exception(f"Failed to create checkout session: {str(e)}")

    @staticmethod
    def create_portal_session(user, return_url):
        """Create a Stripe Customer Portal session for managing subscription"""
        subscription = Subscription.objects.get(user=user)

        if not subscription.stripe_customer_id:
            raise Exception("No Stripe customer ID found for user")

        try:
            portal_session = stripe.billing_portal.Session.create(
                customer=subscription.stripe_customer_id,
                return_url=return_url,
            )
            return portal_session
        except stripe.error.StripeError as e:
            raise Exception(f"Failed to create portal session: {str(e)}")

    @staticmethod
    def cancel_subscription(user, cancel_at_period_end=True):
        """Cancel user's Stripe subscription"""
        subscription = Subscription.objects.get(user=user)

        if not subscription.stripe_subscription_id:
            raise Exception("No active Stripe subscription found")

        try:
            if cancel_at_period_end:
                # Cancel at end of current period
                stripe_subscription = stripe.Subscription.modify(
                    subscription.stripe_subscription_id,
                    cancel_at_period_end=True
                )
            else:
                # Cancel immediately
                stripe_subscription = stripe.Subscription.delete(
                    subscription.stripe_subscription_id
                )

            return stripe_subscription
        except stripe.error.StripeError as e:
            raise Exception(f"Failed to cancel subscription: {str(e)}")


class StripeWebhookHandler:
    """Handle Stripe webhook events"""

    @staticmethod
    def handle_checkout_completed(session):
        """Handle checkout.session.completed event"""
        user_id = session.metadata.get('user_id')
        plan_tier = session.metadata.get('plan_tier')
        billing_cycle = session.metadata.get('billing_cycle')

        if not user_id:
            return

        try:
            user = User.objects.get(id=user_id)
            subscription = Subscription.objects.get(user=user)
            plan = SubscriptionPlan.objects.get(tier=plan_tier)

            old_tier = subscription.tier

            # Update subscription
            subscription.plan = plan
            subscription.tier = plan_tier
            subscription.status = SubscriptionStatus.ACTIVE
            subscription.billing_cycle = billing_cycle
            subscription.stripe_subscription_id = session.subscription
            subscription.trial_ends_at = None  # End trial
            subscription.save()

            # Update denormalized fields in UserProfile
            if hasattr(user, 'profile'):
                user.profile.subscription_tier = plan_tier
                user.profile.trial_ends_at = None
                user.profile.save(update_fields=['subscription_tier', 'trial_ends_at'])

            # Log history
            SubscriptionHistory.objects.create(
                user=user,
                action='upgraded' if plan_tier != old_tier else 'created',
                old_tier=old_tier,
                new_tier=plan_tier,
                reason='Checkout completed',
                amount=session.amount_total / 100 if session.amount_total else None
            )

        except (User.DoesNotExist, Subscription.DoesNotExist, SubscriptionPlan.DoesNotExist):
            pass

    @staticmethod
    def handle_subscription_updated(stripe_subscription):
        """Handle customer.subscription.updated event"""
        customer_id = stripe_subscription.customer

        try:
            subscription = Subscription.objects.get(stripe_customer_id=customer_id)
            user = subscription.user

            # Update subscription status
            subscription.status = stripe_subscription.status
            subscription.cancel_at_period_end = stripe_subscription.cancel_at_period_end

            # Update period
            subscription.current_period_start = timezone.datetime.fromtimestamp(
                stripe_subscription.current_period_start,
                tz=timezone.utc
            )
            subscription.current_period_end = timezone.datetime.fromtimestamp(
                stripe_subscription.current_period_end,
                tz=timezone.utc
            )

            # Handle cancellation
            if stripe_subscription.cancel_at_period_end:
                subscription.cancelled_at = timezone.now()
                SubscriptionHistory.objects.create(
                    user=user,
                    action='cancelled',
                    old_tier=subscription.tier,
                    new_tier=subscription.tier,
                    reason='Subscription cancelled (will end at period end)'
                )

            subscription.save()

        except Subscription.DoesNotExist:
            pass

    @staticmethod
    def handle_subscription_deleted(stripe_subscription):
        """Handle customer.subscription.deleted event"""
        customer_id = stripe_subscription.customer

        try:
            subscription = Subscription.objects.get(stripe_customer_id=customer_id)
            user = subscription.user
            old_tier = subscription.tier

            # Downgrade to FREE
            subscription.tier = SubscriptionTier.FREE
            subscription.status = SubscriptionStatus.CANCELLED
            subscription.plan = None
            subscription.stripe_subscription_id = ''
            subscription.cancelled_at = timezone.now()
            subscription.save()

            # Update denormalized fields in UserProfile
            if hasattr(user, 'profile'):
                user.profile.subscription_tier = SubscriptionTier.FREE
                user.profile.save(update_fields=['subscription_tier'])

            # Log history
            SubscriptionHistory.objects.create(
                user=user,
                action='downgraded',
                old_tier=old_tier,
                new_tier=SubscriptionTier.FREE,
                reason='Subscription cancelled/ended'
            )

        except Subscription.DoesNotExist:
            pass

    @staticmethod
    def handle_invoice_payment_succeeded(invoice):
        """Handle invoice.payment_succeeded event"""
        customer_id = invoice.customer
        subscription_id = invoice.subscription

        try:
            subscription = Subscription.objects.get(stripe_customer_id=customer_id)
            user = subscription.user

            # Log payment
            SubscriptionHistory.objects.create(
                user=user,
                action='payment_succeeded',
                old_tier=subscription.tier,
                new_tier=subscription.tier,
                reason='Payment successful',
                stripe_invoice_id=invoice.id,
                amount=invoice.amount_paid / 100 if invoice.amount_paid else None
            )

        except Subscription.DoesNotExist:
            pass

    @staticmethod
    def handle_invoice_payment_failed(invoice):
        """Handle invoice.payment_failed event"""
        customer_id = invoice.customer

        try:
            subscription = Subscription.objects.get(stripe_customer_id=customer_id)
            user = subscription.user

            # Update status
            subscription.status = SubscriptionStatus.PAST_DUE
            subscription.save(update_fields=['status'])

            # Log failed payment
            SubscriptionHistory.objects.create(
                user=user,
                action='payment_failed',
                old_tier=subscription.tier,
                new_tier=subscription.tier,
                reason='Payment failed',
                stripe_invoice_id=invoice.id,
                amount=invoice.amount_due / 100 if invoice.amount_due else None
            )

        except Subscription.DoesNotExist:
            pass
