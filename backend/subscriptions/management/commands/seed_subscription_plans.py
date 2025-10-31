from django.core.management.base import BaseCommand
from subscriptions.models import SubscriptionPlan, SubscriptionTier


class Command(BaseCommand):
    help = 'Seed subscription plans with default data'

    def handle(self, *args, **options):
        self.stdout.write('Seeding subscription plans...')

        # Create FREE plan
        free_plan, created = SubscriptionPlan.objects.get_or_create(
            tier=SubscriptionTier.FREE,
            defaults={
                'name': 'Free Plan',
                'price_monthly': 0,
                'price_yearly': 0,
                'features': {
                    'invoice_creation': True,
                    'estimate_creation': True,
                    'document_import': True,
                    'customer_management': True,
                    'project_management': True,
                    'lead_pipeline': True,
                    'finance_dashboard': True,
                },
                'limits': {
                    'invoice_creation': 25,
                    'estimate_creation': 25,
                    'document_import': 10,
                },
                'display_order': 1,
                'is_active': True
            }
        )
        if created:
            self.stdout.write(self.style.SUCCESS('✓ Created FREE plan'))
        else:
            self.stdout.write('  FREE plan already exists')

        # Create CORE plan
        core_plan, created = SubscriptionPlan.objects.get_or_create(
            tier=SubscriptionTier.CORE,
            defaults={
                'name': 'Core Plan',
                'price_monthly': 10.00,
                'price_yearly': 96.00,  # 20% discount (10 * 12 * 0.8)
                'stripe_price_id_monthly': '',  # To be filled with real Stripe price IDs
                'stripe_price_id_yearly': '',
                'features': {
                    'invoice_creation': True,
                    'estimate_creation': True,
                    'document_import': True,
                    'email_sending': True,
                    'signature_request': True,
                    'task_catalogue': True,
                    'customer_management': True,
                    'project_management': True,
                    'lead_pipeline': True,
                    'finance_dashboard': True,
                },
                'limits': {},  # Unlimited
                'display_order': 2,
                'is_active': True
            }
        )
        if created:
            self.stdout.write(self.style.SUCCESS('✓ Created CORE plan'))
        else:
            self.stdout.write('  CORE plan already exists')

        # Create ELITE plan
        elite_plan, created = SubscriptionPlan.objects.get_or_create(
            tier=SubscriptionTier.ELITE,
            defaults={
                'name': 'Elite Plan',
                'price_monthly': 20.00,
                'price_yearly': 192.00,  # 20% discount (20 * 12 * 0.8)
                'stripe_price_id_monthly': '',  # To be filled with real Stripe price IDs
                'stripe_price_id_yearly': '',
                'features': {
                    'invoice_creation': True,
                    'estimate_creation': True,
                    'document_import': True,
                    'email_sending': True,
                    'signature_request': True,
                    'task_catalogue': True,
                    'ai_generation': True,
                    'ai_suggestions': True,
                    'cra_access': True,
                    'customer_management': True,
                    'project_management': True,
                    'lead_pipeline': True,
                    'finance_dashboard': True,
                    'priority_support': True,
                },
                'limits': {},  # Unlimited
                'display_order': 3,
                'is_active': True
            }
        )
        if created:
            self.stdout.write(self.style.SUCCESS('✓ Created ELITE plan'))
        else:
            self.stdout.write('  ELITE plan already exists')

        self.stdout.write(self.style.SUCCESS('\n✅ Subscription plans seeded successfully!'))
        self.stdout.write('\n📝 Next steps:')
        self.stdout.write('   1. Create products in Stripe Dashboard')
        self.stdout.write('   2. Update plans with Stripe price IDs:')
        self.stdout.write('      python manage.py shell')
        self.stdout.write('      >>> from subscriptions.models import SubscriptionPlan, SubscriptionTier')
        self.stdout.write('      >>> core = SubscriptionPlan.objects.get(tier=SubscriptionTier.CORE)')
        self.stdout.write('      >>> core.stripe_price_id_monthly = "price_xxx"')
        self.stdout.write('      >>> core.stripe_price_id_yearly = "price_yyy"')
        self.stdout.write('      >>> core.save()')
