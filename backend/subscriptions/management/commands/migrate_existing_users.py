from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta
from subscriptions.models import Subscription, SubscriptionTier, SubscriptionStatus


class Command(BaseCommand):
    help = 'Create subscriptions for existing users without one'

    def add_arguments(self, parser):
        parser.add_argument(
            '--trial-days',
            type=int,
            default=7,
            help='Number of trial days to give (default: 7)',
        )
        parser.add_argument(
            '--trial-tier',
            type=str,
            default='CORE',
            choices=['FREE', 'CORE', 'ELITE'],
            help='Trial tier (default: CORE)',
        )

    def handle(self, *args, **options):
        trial_days = options['trial_days']
        trial_tier = options['trial_tier']

        self.stdout.write(f'Migrating existing users...')
        self.stdout.write(f'  Trial: {trial_days} days of {trial_tier}')

        # Find users without subscriptions
        users_without_subscription = User.objects.filter(subscription__isnull=True)
        count = users_without_subscription.count()

        if count == 0:
            self.stdout.write(self.style.SUCCESS('\n✅ All users already have subscriptions!'))
            return

        self.stdout.write(f'\n  Found {count} users without subscriptions')

        # Create subscriptions
        created = 0
        trial_ends_at = timezone.now() + timedelta(days=trial_days)

        for user in users_without_subscription:
            # Create subscription
            Subscription.objects.create(
                user=user,
                tier=trial_tier,
                status=SubscriptionStatus.TRIALING,
                trial_ends_at=trial_ends_at,
                current_period_start=timezone.now(),
                current_period_end=trial_ends_at
            )

            # Update profile denormalized fields
            if hasattr(user, 'profile'):
                user.profile.subscription_tier = trial_tier
                user.profile.trial_ends_at = trial_ends_at
                user.profile.save(update_fields=['subscription_tier', 'trial_ends_at'])

            created += 1
            self.stdout.write(f'  ✓ Created subscription for {user.username} ({user.email})')

        self.stdout.write(self.style.SUCCESS(f'\n✅ Created {created} subscriptions!'))
        self.stdout.write(f'  All users now have a {trial_days}-day {trial_tier} trial')
