# Subscription System Implementation Status

## ✅ COMPLETED - Backend Infrastructure

### 1. Subscriptions App Created
- ✅ `/backend/subscriptions/models.py` - Complete data models:
  - `SubscriptionPlan` - Plan configuration with Stripe integration
  - `Subscription` - User subscription tracking
  - `UsageCounter` - Feature usage tracking with monthly reset
  - `SubscriptionHistory` - Audit log
  - Tier enum: FREE, CORE, ELITE

- ✅ `/backend/subscriptions/permissions.py` - Permission classes:
  - `HasTierAccess` - Check tier requirements
  - `RequireCoreOrElite` - CORE+ only
  - `RequireElite` - ELITE only
  - `HasFeatureAccess` - Feature-based access control

- ✅ `/backend/subscriptions/decorators.py` - View decorators:
  - `@require_tier(tier)` - Enforce tier requirement
  - `@check_usage_limit(feature)` - Enforce and track usage limits
  - `@check_usage_limit_method(feature)` - For DRF ViewSet actions
  - `@require_feature(feature)` - Feature-based requirement

- ✅ `/backend/subscriptions/services/usage_tracker.py` - Usage tracking service:
  - `UsageTracker` class with methods:
    - `get_current_period()` - Calendar month tracking
    - `get_or_create_counter()` - Auto-create counters
    - `is_limit_reached()` - Check limits
    - `increment()` - Increment usage
    - `get_all_usage()` - Get user's usage summary

- ✅ `/backend/subscriptions/stripe_handlers.py` - Stripe integration:
  - `StripeService` class:
    - `create_customer()`
    - `create_checkout_session()`
    - `create_portal_session()`
    - `cancel_subscription()`
  - `StripeWebhookHandler` class:
    - `handle_checkout_completed()`
    - `handle_subscription_updated()`
    - `handle_subscription_deleted()`
    - `handle_invoice_payment_succeeded()`
    - `handle_invoice_payment_failed()`

- ✅ `/backend/subscriptions/serializers.py` - API serializers
- ✅ `/backend/subscriptions/views.py` - API endpoints
- ✅ `/backend/subscriptions/urls.py` - URL routing
- ✅ `/backend/subscriptions/admin.py` - Django admin interface
- ✅ `/backend/subscriptions/signals.py` - Auto-create subscription on user creation
- ✅ `/backend/subscriptions/tasks.py` - Celery tasks:
  - `check_trial_expirations()` - Daily trial checks
  - `send_trial_ending_reminders()` - 3-day reminder
  - `sync_stripe_subscriptions()` - Hourly sync
  - `reset_usage_counters()` - Monthly reset trigger

### 2. Configuration Updates
- ✅ `backend/profiles/models.py` - Added subscription fields to UserProfile:
  - `subscription_tier` (denormalized for performance)
  - `stripe_customer_id` (denormalized)
  - `trial_ends_at` (denormalized)

- ✅ `backend/freelancermgmt/settings.py` - Added settings:
  - Stripe keys (STRIPE_PUBLISHABLE_KEY, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET)
  - Trial settings (FREE_TRIAL_DAYS=7, FREE_TRIAL_TIER=CORE)
  - Usage limits (FREE_INVOICE_LIMIT=25, FREE_ESTIMATE_LIMIT=25, FREE_IMPORT_LIMIT=10)
  - Celery Beat schedule for subscription tasks
  - Added 'subscriptions' to INSTALLED_APPS

- ✅ `backend/freelancermgmt/urls.py` - Added subscriptions URLs
- ✅ `backend/requirements.txt` - Added `stripe==11.3.0`
- ✅ `backend/.env.example` - Documented new environment variables

### 3. API Endpoints Created

#### Public Endpoints
- `GET /api/subscriptions/plans/` - List available plans

#### User Endpoints
- `GET /api/subscriptions/subscriptions/current/` - Get current subscription with usage
- `GET /api/subscriptions/subscriptions/usage/` - Get usage statistics
- `POST /api/subscriptions/subscriptions/create_checkout_session/` - Create Stripe checkout
- `POST /api/subscriptions/subscriptions/create_portal_session/` - Manage subscription
- `POST /api/subscriptions/subscriptions/cancel/` - Cancel subscription
- `POST /api/subscriptions/webhook/` - Stripe webhook handler (public, no auth)

#### Admin Endpoints
- `GET /api/subscriptions/admin/subscriptions/` - List all subscriptions
- `GET /api/subscriptions/admin/subscriptions/stats/` - Subscription statistics
- `PATCH /api/subscriptions/admin/subscriptions/{id}/change_tier/` - Manually change tier
- `POST /api/subscriptions/admin/subscriptions/{id}/extend_trial/` - Extend trial
- `GET /api/subscriptions/admin/subscriptions/revenue/` - Revenue analytics
- `GET /api/subscriptions/admin/usage/user_usage/?user_id={id}` - User's usage details

---

## ⚠️ TODO - Feature Gating in Existing Apps

### 1. Invoicing App (`backend/invoicing/views.py`)

**Need to add decorators to:**

```python
from subscriptions.decorators import check_usage_limit_method, require_feature

class InvoiceViewSet(viewsets.ModelViewSet):
    # ...

    @check_usage_limit_method('invoice_creation')
    def create(self, request, *args, **kwargs):
        # Existing code
        pass

    @action(detail=True, methods=['post'])
    @require_feature('email_sending')  # CORE tier required
    def send_email(self, request, pk=None):
        # Existing code
        pass

    @action(detail=True, methods=['post'])
    def generate_pdf(self, request, pk=None):
        # No restriction - all tiers can generate PDFs
        pass


class EstimateViewSet(viewsets.ModelViewSet):
    # ...

    @check_usage_limit_method('estimate_creation')
    def create(self, request, *args, **kwargs):
        # Existing code
        pass

    @action(detail=True, methods=['post'])
    @require_feature('email_sending')  # CORE tier required
    def send_email(self, request, pk=None):
        # Existing code
        pass

    @action(detail=True, methods=['post'])
    @require_feature('ai_generation')  # ELITE tier required
    def ai_generate(self, request, pk=None):
        # Existing code
        pass

    @action(detail=True, methods=['post'])
    @require_feature('ai_suggestions')  # ELITE tier required
    def suggest_items(self, request, pk=None):
        # Existing code
        pass

    @action(detail=True, methods=['post'])
    @require_feature('ai_suggestions')  # ELITE tier required
    def suggest_pricing(self, request, pk=None):
        # Existing code
        pass

    @action(detail=True, methods=['post'])
    @require_feature('signature_request')  # CORE tier required
    def request_signature(self, request, pk=None):
        # Existing code
        pass
```

### 2. Document Processing App (`backend/document_processing/views.py`)

```python
from subscriptions.decorators import check_usage_limit_method, require_feature
from subscriptions.permissions import RequireElite

class ImportedDocumentViewSet(viewsets.ModelViewSet):
    # Add ELITE requirement as permission class
    permission_classes = [IsAuthenticated, RequireElite]

    @check_usage_limit_method('document_import')
    def create(self, request, *args, **kwargs):
        # Existing code - upload documents
        pass

    # All other document processing actions require ELITE
```

### 3. CRA App (`backend/cra/views.py`)

```python
from subscriptions.permissions import RequireElite

class CRAViewSet(viewsets.ModelViewSet):
    # Add ELITE requirement to entire viewset
    permission_classes = [IsAuthenticated, RequireElite]

    # All CRA actions require ELITE tier
```

### 4. Projects App - Task Catalogue

**Find task-related endpoints and add:**
```python
from subscriptions.permissions import RequireCoreOrElite

class TaskViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, RequireCoreOrElite]
    # Task catalogue requires CORE or ELITE
```

---

## ⚠️ TODO - Frontend Implementation

### 1. Subscription Context (`frontend/src/utils/SubscriptionContext.jsx`)

```jsx
import React, { createContext, useContext } from 'react';
import { useSubscription, useUsage } from '../api/subscriptionHooks';

const SubscriptionContext = createContext();

export const useSubscriptionContext = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscriptionContext must be used within SubscriptionProvider');
  }
  return context;
};

export const SubscriptionProvider = ({ children }) => {
  const { data: subscription, isLoading } = useSubscription();
  const { data: usage } = useUsage();

  const canUseFeature = (feature) => {
    // Check if user has access to feature
    // Based on subscription tier
  };

  const canPerformAction = (action) => {
    // Check if user has remaining quota for action
    // Based on usage limits
  };

  const value = {
    subscription,
    usage,
    isLoading,
    canUseFeature,
    canPerformAction,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};
```

### 2. Subscription Hooks (`frontend/src/api/subscriptionHooks.js`)

```jsx
import { useQuery, useMutation } from '@tanstack/react-query';
import client from './client';

export const useSubscription = () => {
  return useQuery({
    queryKey: ['subscription'],
    queryFn: async () => {
      const { data } = await client.get('/subscriptions/subscriptions/current/');
      return data;
    },
  });
};

export const useUsage = () => {
  return useQuery({
    queryKey: ['usage'],
    queryFn: async () => {
      const { data } = await client.get('/subscriptions/subscriptions/usage/');
      return data;
    },
  });
};

export const useSubscriptionPlans = () => {
  return useQuery({
    queryKey: ['subscription-plans'],
    queryFn: async () => {
      const { data } = await client.get('/subscriptions/plans/');
      return data;
    },
  });
};

export const useCreateCheckout = () => {
  return useMutation({
    mutationFn: async ({ planId, billingCycle, successUrl, cancelUrl }) => {
      const { data } = await client.post('/subscriptions/subscriptions/create_checkout_session/', {
        plan_id: planId,
        billing_cycle: billingCycle,
        success_url: successUrl,
        cancel_url: cancelUrl,
      });
      return data;
    },
  });
};

export const useCreatePortalSession = () => {
  return useMutation({
    mutationFn: async (returnUrl) => {
      const { data } = await client.post('/subscriptions/subscriptions/create_portal_session/', {
        return_url: returnUrl,
      });
      return data;
    },
  });
};
```

### 3. UpgradePrompt Component (`frontend/src/components/UpgradePrompt.jsx`)

Modal component shown when user hits limit or tries restricted feature.

### 4. Landing Page Pricing (`frontend/src/components/landing/Pricing.jsx`)

3-column pricing table with:
- FREE (left)
- CORE (middle)
- ELITE (right, highlighted as "Most Popular")
- Monthly/Yearly toggle with 20% discount badge
- Feature comparison with checkmarks/X marks
- CTA buttons for each plan

### 5. Billing Settings Panel (`frontend/src/partials/settings/BillingPanel.jsx`)

Shows:
- Current plan and status
- Usage statistics with progress bars
- Upgrade/downgrade buttons
- "Manage Subscription" button (opens Stripe Portal)
- Billing history table

### 6. Usage Indicators

- Header: Add usage bar for FREE tier users (e.g., "8/25 invoices this month")
- Dashboard: Add subscription status card with trial countdown or usage summary

---

## ⚠️ TODO - Translations (i18n)

### Backend Translations

**Run these commands:**
```bash
# Generate translation files
docker-compose exec backend python manage.py makemessages -l fr

# Translate in Rosetta
# Visit http://localhost/rosetta/ and translate all subscription-related strings

# Compile translations
docker-compose exec backend python manage.py compilemessages

# Restart services
docker-compose restart backend celery celery-beat
```

### Frontend Translations

**Add to `/frontend/public/locales/en/translation.json`:**
```json
{
  "subscription": {
    "tiers": {
      "free": "Free",
      "core": "Core",
      "elite": "Elite"
    },
    "upgradeRequired": "Upgrade Required",
    "upgradeMessage": "This feature requires {tier} plan or higher",
    "usageLimitReached": "Usage Limit Reached",
    "usageLimitMessage": "You've reached your monthly limit for {feature}",
    "upgradeNow": "Upgrade Now",
    "manageSubscription": "Manage Subscription"
  },
  "landing": {
    "pricing": {
      "badge": "Pricing Plans",
      "title": "Choose the perfect plan for your freelance business",
      "subtitle": "Start with a 7-day Core trial. Upgrade or cancel anytime.",
      "monthly": "Monthly",
      "yearly": "Yearly",
      "save": "Save 20%",
      "free": {
        "name": "Free",
        "price": "€0",
        "priceYearly": "€0",
        "period": "/month",
        "description": "Perfect for trying out the platform",
        "cta": "Get Started",
        "features": [
          "Up to 10 document imports/month",
          "Up to 25 invoices/month",
          "Up to 25 estimates/month",
          "Customer & project management",
          "Lead pipeline",
          "Financial dashboard"
        ]
      },
      "core": {
        "name": "Core",
        "price": "€10",
        "priceYearly": "€8",
        "period": "/month",
        "periodYearly": "/month, billed annually",
        "description": "Essential features for growing freelancers",
        "cta": "Start Free Trial",
        "features": [
          "Everything in Free",
          "Unlimited invoices & estimates",
          "Unlimited document imports",
          "Email invoices & estimates",
          "Digital signature for estimates",
          "Task catalogue"
        ]
      },
      "elite": {
        "name": "Elite",
        "popularBadge": "Most Popular",
        "price": "€20",
        "priceYearly": "€16",
        "period": "/month",
        "periodYearly": "/month, billed annually",
        "description": "Full power with AI automation",
        "cta": "Start Free Trial",
        "features": [
          "Everything in Core",
          "AI document processing",
          "AI estimate generation",
          "AI task suggestions",
          "AI pricing suggestions",
          "CRA (Activity Reports)",
          "Priority support"
        ]
      }
    }
  }
}
```

**Add French translations to `/frontend/public/locales/fr/translation.json`**

---

## ⚠️ TODO - Database Migrations & Seed Data

### 1. Create Migrations

```bash
docker-compose exec backend python manage.py makemigrations subscriptions
docker-compose exec backend python manage.py makemigrations profiles
docker-compose exec backend python manage.py migrate
```

### 2. Seed Subscription Plans

Create a Django management command or run in shell:

```python
docker-compose exec backend python manage.py shell

from subscriptions.models import SubscriptionPlan, SubscriptionTier

# Create FREE plan
SubscriptionPlan.objects.create(
    name="Free Plan",
    tier=SubscriptionTier.FREE,
    price_monthly=0,
    price_yearly=0,
    features={
        'invoice_creation': True,
        'estimate_creation': True,
        'document_import': True,
        'customer_management': True,
        'project_management': True,
        'lead_pipeline': True,
        'finance_dashboard': True,
    },
    limits={
        'invoice_creation': 25,
        'estimate_creation': 25,
        'document_import': 10,
    },
    display_order=1,
    is_active=True
)

# Create CORE plan
SubscriptionPlan.objects.create(
    name="Core Plan",
    tier=SubscriptionTier.CORE,
    price_monthly=10.00,
    price_yearly=96.00,  # 20% discount
    stripe_price_id_monthly='price_xxx',  # Add real Stripe price IDs
    stripe_price_id_yearly='price_yyy',
    features={
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
    limits={},  # Unlimited
    display_order=2,
    is_active=True
)

# Create ELITE plan
SubscriptionPlan.objects.create(
    name="Elite Plan",
    tier=SubscriptionTier.ELITE,
    price_monthly=20.00,
    price_yearly=192.00,  # 20% discount
    stripe_price_id_monthly='price_zzz',  # Add real Stripe price IDs
    stripe_price_id_yearly='price_aaa',
    features={
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
    },
    limits={},  # Unlimited
    display_order=3,
    is_active=True
)
```

### 3. Migrate Existing Users

```python
docker-compose exec backend python manage.py shell

from django.contrib.auth.models import User
from subscriptions.models import Subscription, SubscriptionTier, SubscriptionStatus
from django.utils import timezone
from datetime import timedelta

# Create subscriptions for existing users without one
for user in User.objects.all():
    if not hasattr(user, 'subscription'):
        # Give 7-day CORE trial
        Subscription.objects.create(
            user=user,
            tier=SubscriptionTier.CORE,
            status=SubscriptionStatus.TRIALING,
            trial_ends_at=timezone.now() + timedelta(days=7),
            current_period_start=timezone.now(),
            current_period_end=timezone.now() + timedelta(days=7)
        )

        # Update profile
        if hasattr(user, 'profile'):
            user.profile.subscription_tier = SubscriptionTier.CORE
            user.profile.trial_ends_at = timezone.now() + timedelta(days=7)
            user.profile.save()
```

---

## ⚠️ TODO - Stripe Setup

### 1. Create Products in Stripe Dashboard

1. Go to https://dashboard.stripe.com/test/products
2. Create products:
   - **Core Plan**
     - Monthly price: €10
     - Yearly price: €96 (20% discount)
   - **Elite Plan**
     - Monthly price: €20
     - Yearly price: €192 (20% discount)

3. Copy price IDs (e.g., `price_1234...`) and add to seed data above

### 2. Configure Webhook

1. Go to https://dashboard.stripe.com/test/webhooks
2. Add endpoint: `https://yourdomain.com/api/subscriptions/webhook/`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copy webhook signing secret and add to `.env` as `STRIPE_WEBHOOK_SECRET`

---

## 📝 Testing Checklist

### Backend Tests
- [ ] User signup creates subscription with 7-day trial
- [ ] Trial expiration downgrades to FREE
- [ ] Usage counters enforce limits for FREE tier
- [ ] Usage counters are unlimited for CORE/ELITE
- [ ] Stripe checkout creates subscription
- [ ] Stripe webhooks update subscription status
- [ ] Admin can manually change tiers
- [ ] Admin can extend trials
- [ ] Celery tasks run successfully

### Frontend Tests
- [ ] Pricing page displays correctly with monthly/yearly toggle
- [ ] Upgrade prompt shows when limit reached
- [ ] Billing panel displays subscription and usage
- [ ] Stripe checkout redirects correctly
- [ ] Features are gated in UI based on tier
- [ ] CRA menu hidden for FREE/CORE users
- [ ] Trial countdown displays correctly

---

## 🚀 Deployment Steps

1. **Install dependencies:**
   ```bash
   docker-compose exec backend pip install -r requirements.txt
   docker-compose exec frontend pnpm install
   ```

2. **Run migrations:**
   ```bash
   docker-compose exec backend python manage.py makemigrations
   docker-compose exec backend python manage.py migrate
   ```

3. **Seed subscription plans** (see above)

4. **Migrate existing users** (see above)

5. **Configure Stripe** (add real keys to `.env`)

6. **Set up webhook endpoint** in Stripe Dashboard

7. **Test in Stripe test mode** before going live

8. **Restart services:**
   ```bash
   docker-compose restart backend celery celery-beat frontend
   ```

---

## 📖 Next Steps for You

1. **Add feature gating decorators** to existing viewsets (see TODO section above)
2. **Build frontend components** (SubscriptionContext, Pricing, UpgradePrompt, BillingPanel)
3. **Add translations** (English and French)
4. **Run migrations and seed data**
5. **Test end-to-end** in local environment
6. **Configure Stripe** in test mode
7. **Deploy to production** when ready

The backend infrastructure is **95% complete**. The main remaining work is:
- Feature gating in existing apps (30 minutes)
- Frontend implementation (4-6 hours)
- Translations (1 hour)
- Testing (2 hours)

Total estimated time remaining: **1-2 days**
