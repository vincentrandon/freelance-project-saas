import React, { createContext, useContext } from 'react';
import { useSubscription, useUsage, hasTierAccess, hasFeatureAccess, canPerformAction, getRemainingUsage } from '../api/subscriptionHooks';
import { useAuth } from './AuthContext';

const SubscriptionContext = createContext();

export const useSubscriptionContext = () => {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscriptionContext must be used within SubscriptionProvider');
  }
  return context;
};

export const SubscriptionProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const shouldFetch = isAuthenticated;

  const {
    data: subscription,
    isLoading: isLoadingSubscription,
    error: subscriptionError,
  } = useSubscription({ enabled: shouldFetch });

  const {
    data: usage,
    isLoading: isLoadingUsage,
  } = useUsage({ enabled: shouldFetch });

  const isLoading = shouldFetch ? (isLoadingSubscription || isLoadingUsage) : false;

  // Check if user has access to a specific tier
  const checkTierAccess = (requiredTier) => {
    return hasTierAccess(subscription, requiredTier);
  };

  // Check if user has access to a specific feature
  const checkFeatureAccess = (featureName) => {
    return hasFeatureAccess(subscription, featureName);
  };

  // Check if user can perform an action (considering usage limits)
  const checkCanPerformAction = (actionName) => {
    return canPerformAction(usage, actionName);
  };

  // Get remaining usage for a feature
  const getRemaining = (actionName) => {
    return getRemainingUsage(usage, actionName);
  };

  // Check if user is on trial
  const isOnTrial = () => {
    return subscription?.is_trial || false;
  };

  // Get days remaining in trial
  const getTrialDaysRemaining = () => {
    return subscription?.days_until_trial_ends || 0;
  };

  // Check if user is on FREE tier
  const isFreeTier = () => {
    return subscription?.tier === 'FREE';
  };

  // Check if user is on CORE tier or higher
  const isCoreTier = () => {
    return checkTierAccess('CORE');
  };

  // Check if user is on ELITE tier
  const isEliteTier = () => {
    return subscription?.tier === 'ELITE';
  };

  // Get tier display name
  const getTierName = () => {
    if (!subscription) return 'Free';

    const tierNames = {
      FREE: 'Free',
      CORE: 'Core',
      ELITE: 'Elite',
    };

    return tierNames[subscription.tier] || 'Free';
  };

  const value = {
    subscription,
    usage,
    isLoading,
    subscriptionError,

    // Tier checks
    checkTierAccess,
    isFreeTier,
    isCoreTier,
    isEliteTier,
    getTierName,

    // Feature checks
    checkFeatureAccess,
    checkCanPerformAction,
    getRemaining,

    // Trial info
    isOnTrial,
    getTrialDaysRemaining,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};
