import React from 'react';
import { useTranslation } from 'react-i18next';

function ComingSoon({
  title,
  description,
  icon: Icon,
  features = []
}) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="max-w-2xl w-full mx-auto text-center px-6">
        {/* Icon */}
        <div className="mb-8 flex justify-center">
          <div className="relative">
            <div className="w-24 h-24 bg-gradient-to-br from-violet-500/20 to-purple-500/20 rounded-2xl flex items-center justify-center border border-violet-500/30">
              {Icon ? (
                <Icon className="w-12 h-12 text-violet-400" />
              ) : (
                <svg
                  className="w-12 h-12 text-violet-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
              )}
            </div>
            {/* Pulse animation */}
            <div className="absolute inset-0 w-24 h-24 bg-violet-500/20 rounded-2xl animate-ping"></div>
          </div>
        </div>

        {/* Title */}
        <h2 className="text-3xl md:text-4xl font-bold text-gray-100 mb-4">
          {title}
        </h2>

        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-violet-500/10 border border-violet-500/30 rounded-full mb-6">
          <div className="w-2 h-2 bg-violet-400 rounded-full animate-pulse"></div>
          <span className="text-sm font-medium text-violet-400">
            {t('comingSoon.badge')}
          </span>
        </div>

        {/* Description */}
        {description && (
          <p className="text-lg text-gray-400 mb-8 max-w-xl mx-auto">
            {description}
          </p>
        )}

        {/* Features list */}
        {features.length > 0 && (
          <div className="mt-8 bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
            <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide mb-4">
              {t('comingSoon.plannedFeatures')}
            </h3>
            <ul className="space-y-3 text-left max-w-md mx-auto">
              {features.map((feature, index) => (
                <li key={index} className="flex items-start gap-3">
                  <svg
                    className="w-5 h-5 text-violet-400 mt-0.5 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span className="text-gray-300">{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* CTA */}
        <div className="mt-8 text-sm text-gray-500">
          {t('comingSoon.stayTuned')}
        </div>
      </div>
    </div>
  );
}

export default ComingSoon;
