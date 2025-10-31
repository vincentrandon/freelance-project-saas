import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

/**
 * Upgrade prompt modal shown when user hits usage limit or tries to access restricted feature
 *
 * Props:
 * - isOpen: boolean - Whether modal is open
 * - onClose: function - Close modal handler
 * - type: 'usage_limit' | 'feature_restricted' - Type of restriction
 * - featureName: string - Name of restricted feature
 * - requiredTier: 'CORE' | 'ELITE' - Required tier for feature
 * - currentUsage: number - Current usage count (for usage limits)
 * - limit: number - Usage limit (for usage limits)
 */
export default function UpgradePrompt({
  isOpen,
  onClose,
  type = 'feature_restricted',
  featureName = '',
  requiredTier = 'CORE',
  currentUsage = 0,
  limit = 0,
}) {
  const { t } = useTranslation();

  if (!isOpen) return null;

  const tierNames = {
    CORE: t('subscription.tiers.core'),
    ELITE: t('subscription.tiers.elite'),
  };

  const requiredTierName = tierNames[requiredTier] || 'Core';

  const formatFeatureName = (name) => {
    return name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-gray-900/75 z-50 transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6 relative"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Icon */}
          <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 rounded-full bg-indigo-100 dark:bg-indigo-900/30">
            <svg className="w-6 h-6 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>

          {/* Content */}
          <div className="text-center">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {type === 'usage_limit'
                ? t('subscription.usageLimitReached')
                : t('subscription.upgradeRequired')}
            </h3>

            {type === 'usage_limit' ? (
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {t('subscription.usageLimitMessage', {
                  feature: formatFeatureName(featureName),
                  current: currentUsage,
                  limit: limit
                })}
              </p>
            ) : (
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {t('subscription.upgradeMessage', { tier: requiredTierName })}
              </p>
            )}

            {/* Feature comparison */}
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mb-6 text-left">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                {t('subscription.upgradeIncluded')}:
              </p>
              <ul className="space-y-2">
                {requiredTier === 'CORE' && (
                  <>
                    <li className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>{t('landing.pricing.core.features.0')}</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>{t('landing.pricing.core.features.3')}</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>{t('landing.pricing.core.features.4')}</span>
                    </li>
                  </>
                )}
                {requiredTier === 'ELITE' && (
                  <>
                    <li className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>{t('landing.pricing.elite.features.1')}</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>{t('landing.pricing.elite.features.2')}</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>{t('landing.pricing.elite.features.5')}</span>
                    </li>
                  </>
                )}
              </ul>
            </div>

            {/* CTA Buttons */}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
              >
                {t('common.cancel')}
              </button>
              <Link
                to="/settings/billing"
                className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition"
              >
                {t('subscription.upgradeNow')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
