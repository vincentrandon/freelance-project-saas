import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSubscription, useCreateCheckout, useCreatePortalSession, useSubscriptionPlans } from '../../api/subscriptionHooks';
import UpgradePrompt from '../../components/UpgradePrompt';

function SubscriptionPanel() {
  const { t } = useTranslation();
  const { data: subscription, isLoading: isLoadingSubscription } = useSubscription();
  const { data: usage } = useSubscription().data?.usage || {};
  const { data: plans, isLoading: isLoadingPlans } = useSubscriptionPlans();
  const createCheckout = useCreateCheckout();
  const createPortalSession = useCreatePortalSession();

  const [selectedPlan, setSelectedPlan] = useState(null);
  const [selectedBillingCycle, setSelectedBillingCycle] = useState('monthly');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  if (isLoadingSubscription || isLoadingPlans) {
    return (
      <div className="grow">
        <div className="p-6">
          <div className="text-center">{t('common.loading')}</div>
        </div>
      </div>
    );
  }

  const currentTier = subscription?.tier || 'FREE';
  const isTrialing = subscription?.is_trial || false;
  const trialDays = subscription?.days_until_trial_ends || 0;

  const handleUpgrade = (plan) => {
    setSelectedPlan(plan);
    setShowUpgradeModal(true);
  };

  const handleConfirmUpgrade = async () => {
    if (!selectedPlan) return;

    const successUrl = `${window.location.origin}/settings/subscription?success=true`;
    const cancelUrl = `${window.location.origin}/settings/subscription?cancelled=true`;

    await createCheckout.mutateAsync({
      planId: selectedPlan.id,
      billingCycle: selectedBillingCycle,
      successUrl,
      cancelUrl,
    });
  };

  const handleManageSubscription = async () => {
    const returnUrl = `${window.location.origin}/settings/subscription`;
    await createPortalSession.mutateAsync(returnUrl);
  };

  const getTierBadgeColor = (tier) => {
    const colors = {
      FREE: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
      CORE: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      ELITE: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
    };
    return colors[tier] || colors.FREE;
  };

  return (
    <div className="grow">
      {/* Panel body */}
      <div className="p-6 space-y-6">
        <div>
          <h2 className="text-2xl text-gray-800 dark:text-gray-100 font-bold mb-1">
            {t('subscription.currentPlan')}
          </h2>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Manage your subscription and billing
          </div>
        </div>

        {/* Current Subscription Card */}
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {subscription?.tier_display || 'Free'}
                </h3>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTierBadgeColor(currentTier)}`}>
                  {subscription?.status_display || 'Active'}
                </span>
              </div>
              {isTrialing && trialDays > 0 && (
                <p className="text-sm text-orange-600 dark:text-orange-400">
                  {t('subscription.trialEndsIn', { days: trialDays })}
                </p>
              )}
            </div>
            {currentTier !== 'FREE' && subscription?.stripe_subscription_id && (
              <button
                onClick={handleManageSubscription}
                className="btn bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-800 dark:text-gray-300"
              >
                {t('subscription.manageSubscription')}
              </button>
            )}
          </div>

          {subscription?.current_period_end && (
            <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {t('subscription.nextBillingDate')}: {new Date(subscription.current_period_end).toLocaleDateString()}
            </div>
          )}

          {/* Usage Statistics */}
          {subscription?.usage && (
            <div className="mt-6">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                {t('subscription.usageThisMonth')}
              </h4>
              <div className="space-y-3">
                {Object.entries(subscription.usage).map(([feature, data]) => {
                  const percentage = data.limit ? (data.count / data.limit) * 100 : 0;
                  const isUnlimited = data.limit === null;

                  return (
                    <div key={feature}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600 dark:text-gray-400 capitalize">
                          {feature.replace(/_/g, ' ')}
                        </span>
                        <span className="text-gray-900 dark:text-white font-medium">
                          {isUnlimited ? (
                            <span className="text-green-600 dark:text-green-400">
                              {t('subscription.unlimited')}
                            </span>
                          ) : (
                            `${data.count} / ${data.limit}`
                          )}
                        </span>
                      </div>
                      {!isUnlimited && (
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              percentage >= 100 ? 'bg-red-500' :
                              percentage >= 80 ? 'bg-orange-500' :
                              'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(percentage, 100)}%` }}
                          ></div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Available Plans */}
        {currentTier === 'FREE' && plans && (
          <div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Upgrade Your Plan
            </h3>

            {/* Billing Cycle Toggle */}
            <div className="flex items-center justify-center gap-4 mb-6">
              <button
                onClick={() => setSelectedBillingCycle('monthly')}
                className={`text-sm font-medium transition ${
                  selectedBillingCycle === 'monthly'
                    ? 'text-indigo-600 dark:text-indigo-400'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                Monthly
              </button>
              <div
                onClick={() => setSelectedBillingCycle(selectedBillingCycle === 'monthly' ? 'yearly' : 'monthly')}
                className="relative inline-flex h-6 w-11 cursor-pointer items-center rounded-full bg-gray-300 dark:bg-gray-600 transition"
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                    selectedBillingCycle === 'yearly' ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </div>
              <button
                onClick={() => setSelectedBillingCycle('yearly')}
                className={`text-sm font-medium transition ${
                  selectedBillingCycle === 'yearly'
                    ? 'text-indigo-600 dark:text-indigo-400'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                Yearly
              </button>
              {selectedBillingCycle === 'yearly' && (
                <span className="ml-2 inline-flex rounded-full bg-green-100 dark:bg-green-900/30 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:text-green-300">
                  Save 20%
                </span>
              )}
            </div>

            {/* Plan Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {plans.filter(plan => plan.tier !== 'FREE').map((plan) => (
                <div
                  key={plan.id}
                  className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:border-indigo-500 dark:hover:border-indigo-500 transition"
                >
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {plan.name}
                  </h4>
                  <div className="mb-4">
                    <span className="text-3xl font-bold text-gray-900 dark:text-white">
                      €{selectedBillingCycle === 'yearly' ? (plan.price_yearly / 12).toFixed(0) : plan.price_monthly}
                    </span>
                    <span className="text-gray-600 dark:text-gray-400">/month</span>
                    {selectedBillingCycle === 'yearly' && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Billed annually (€{plan.price_yearly})
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleUpgrade(plan)}
                    className="w-full btn bg-indigo-600 hover:bg-indigo-700 text-white mb-4"
                  >
                    Upgrade to {plan.name}
                  </button>
                  <ul className="space-y-2">
                    {plan.features && Object.entries(plan.features).map(([key, value]) => (
                      value && (
                        <li key={key} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                          <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <span className="capitalize">{key.replace(/_/g, ' ')}</span>
                        </li>
                      )
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Upgrade Confirmation Modal */}
      {showUpgradeModal && selectedPlan && (
        <div className="fixed inset-0 bg-gray-900/75 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Confirm Upgrade
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              You're about to upgrade to <strong>{selectedPlan.name}</strong> (billed {selectedBillingCycle}).
              You'll be redirected to Stripe to complete the payment.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="flex-1 btn bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-800 dark:text-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmUpgrade}
                disabled={createCheckout.isPending}
                className="flex-1 btn bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50"
              >
                {createCheckout.isPending ? 'Processing...' : 'Continue'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SubscriptionPanel;
