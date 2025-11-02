import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from './client';

/**
 * Fetch current user's subscription with usage data
 */
export const useSubscription = (options = {}) => {
  return useQuery({
    queryKey: ['subscription'],
    queryFn: async () => {
      const { data } = await client.get('/subscriptions/subscriptions/current/');
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
    ...options,
  });
};

/**
 * Fetch current period usage statistics
 */
export const useUsage = (options = {}) => {
  return useQuery({
    queryKey: ['usage'],
    queryFn: async () => {
      const { data } = await client.get('/subscriptions/subscriptions/usage/');
      return data;
    },
    staleTime: 1 * 60 * 1000, // 1 minute
    ...options,
  });
};

/**
 * Fetch available subscription plans
 */
export const useSubscriptionPlans = () => {
  return useQuery({
    queryKey: ['subscription-plans'],
    queryFn: async () => {
      const { data } = await client.get('/subscriptions/plans/');
      return data;
    },
    staleTime: 60 * 60 * 1000, // 1 hour - plans don't change often
  });
};

/**
 * Create Stripe checkout session for subscription upgrade
 */
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
    onSuccess: (data) => {
      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      }
    },
  });
};

/**
 * Create Stripe Customer Portal session for managing subscription
 */
export const useCreatePortalSession = () => {
  return useMutation({
    mutationFn: async (returnUrl) => {
      const { data } = await client.post('/subscriptions/subscriptions/create_portal_session/', {
        return_url: returnUrl,
      });
      return data;
    },
    onSuccess: (data) => {
      // Redirect to Stripe Portal
      if (data.url) {
        window.location.href = data.url;
      }
    },
  });
};

/**
 * Cancel subscription (at end of period)
 */
export const useCancelSubscription = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (cancelImmediately = false) => {
      const { data } = await client.post('/subscriptions/subscriptions/cancel/', {
        cancel_immediately: cancelImmediately,
      });
      return data;
    },
    onSuccess: () => {
      // Invalidate subscription query to refresh data
      queryClient.invalidateQueries(['subscription']);
    },
  });
};

/**
 * Helper function to check if user has access to a tier
 */
export const hasTierAccess = (subscription, requiredTier) => {
  if (!subscription) return false;

  const tierLevels = {
    FREE: 1,
    CORE: 2,
    ELITE: 3,
  };

  const currentLevel = tierLevels[subscription.tier] || 0;
  const requiredLevel = tierLevels[requiredTier] || 0;

  return currentLevel >= requiredLevel;
};

/**
 * Helper function to check if user has access to a feature
 */
export const hasFeatureAccess = (subscription, featureName) => {
  if (!subscription) return false;

  // Feature to tier mapping
  const featureTiers = {
    invoice_creation: 'FREE',
    estimate_creation: 'FREE',
    document_import: 'FREE',
    customer_management: 'FREE',
    project_management: 'FREE',
    lead_pipeline: 'FREE',
    finance_dashboard: 'FREE',
    email_sending: 'CORE',
    signature_request: 'CORE',
    task_catalogue: 'CORE',
    ai_generation: 'ELITE',
    ai_suggestions: 'ELITE',
    cra_access: 'ELITE',
  };

  const requiredTier = featureTiers[featureName] || 'ELITE';
  return hasTierAccess(subscription, requiredTier);
};

/**
 * Helper function to check if user can perform an action (considering usage limits)
 */
export const canPerformAction = (usage, actionName) => {
  if (!usage || !usage.usage) return true; // If no usage data, allow (backend will handle)

  const actionUsage = usage.usage[actionName];
  if (!actionUsage) return true; // Feature not tracked

  // If no limit (unlimited), allow
  if (actionUsage.limit === null) return true;

  // Check if limit reached
  return !actionUsage.is_limit_reached;
};

/**
 * Get remaining usage for a feature
 */
export const getRemainingUsage = (usage, actionName) => {
  if (!usage || !usage.usage) return null;

  const actionUsage = usage.usage[actionName];
  if (!actionUsage) return null;

  return actionUsage.remaining;
};
