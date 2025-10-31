import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function Pricing() {
  const { t } = useTranslation();
  const [billingCycle, setBillingCycle] = useState('monthly');

  const plans = [
    {
      id: 'free',
      name: t('landing.pricing.free.name'),
      tier: 'FREE',
      priceMonthly: '€0',
      priceYearly: '€0',
      description: t('landing.pricing.free.description'),
      cta: t('landing.pricing.free.cta'),
      ctaLink: '/signup',
      features: t('landing.pricing.free.features', { returnObjects: true }),
      popular: false,
    },
    {
      id: 'core',
      name: t('landing.pricing.core.name'),
      tier: 'CORE',
      priceMonthly: '€10',
      priceYearly: '€8',
      description: t('landing.pricing.core.description'),
      cta: t('landing.pricing.core.cta'),
      ctaLink: '/signup',
      features: t('landing.pricing.core.features', { returnObjects: true }),
      popular: false,
    },
    {
      id: 'elite',
      name: t('landing.pricing.elite.name'),
      tier: 'ELITE',
      priceMonthly: '€20',
      priceYearly: '€16',
      description: t('landing.pricing.elite.description'),
      cta: t('landing.pricing.elite.cta'),
      ctaLink: '/signup',
      features: t('landing.pricing.elite.features', { returnObjects: true }),
      popular: true,
      popularBadge: t('landing.pricing.elite.popularBadge'),
    },
  ];

  return (
    <section id="pricing" className="relative">
      {/* Background gradient */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-transparent to-indigo-900/20"
        aria-hidden="true"
      ></div>

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="py-12 md:py-20">
          {/* Section header */}
          <div className="mx-auto max-w-3xl pb-12 text-center">
            <div className="inline-flex items-center gap-3 pb-3 before:h-px before:w-8 before:bg-gradient-to-r before:from-transparent before:to-indigo-200/50 after:h-px after:w-8 after:bg-gradient-to-l after:from-transparent after:to-indigo-200/50">
              <span className="inline-flex bg-gradient-to-r from-indigo-500 to-indigo-200 bg-clip-text text-transparent">
                {t('landing.pricing.badge')}
              </span>
            </div>
            <h2 className="animate-[gradient_6s_linear_infinite] bg-[linear-gradient(to_right,var(--color-gray-200),var(--color-indigo-200),var(--color-gray-50),var(--color-indigo-300),var(--color-gray-200))] bg-[length:200%_auto] bg-clip-text pb-4 font-nacelle text-3xl font-semibold text-transparent md:text-4xl">
              {t('landing.pricing.title')}
            </h2>
            <p className="text-lg text-indigo-200/65">
              {t('landing.pricing.subtitle')}
            </p>

            {/* Billing cycle toggle */}
            <div className="mt-8 flex items-center justify-center gap-4">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`text-sm font-medium transition ${
                  billingCycle === 'monthly'
                    ? 'text-indigo-400'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                {t('landing.pricing.monthly')}
              </button>
              <div
                onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
                className="relative inline-flex h-6 w-11 cursor-pointer items-center rounded-full bg-gray-700 transition"
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-indigo-500 transition ${
                    billingCycle === 'yearly' ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </div>
              <button
                onClick={() => setBillingCycle('yearly')}
                className={`text-sm font-medium transition ${
                  billingCycle === 'yearly'
                    ? 'text-indigo-400'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                {t('landing.pricing.yearly')}
              </button>
              {billingCycle === 'yearly' && (
                <span className="ml-2 inline-flex rounded-full bg-indigo-500/20 px-2.5 py-0.5 text-xs font-medium text-indigo-300">
                  {t('landing.pricing.save')}
                </span>
              )}
            </div>
          </div>

          {/* Pricing cards */}
          <div className="mx-auto grid max-w-sm gap-8 sm:max-w-none sm:grid-cols-3 lg:gap-6">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`relative flex flex-col rounded-2xl border p-6 ${
                  plan.popular
                    ? 'border-indigo-500 bg-gradient-to-b from-indigo-500/10 to-transparent shadow-lg shadow-indigo-500/20'
                    : 'border-gray-700/50 bg-gray-800/50'
                }`}
              >
                {/* Popular badge */}
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="inline-flex rounded-full bg-gradient-to-r from-indigo-500 to-indigo-400 px-4 py-1 text-xs font-semibold text-white shadow-lg">
                      {plan.popularBadge}
                    </span>
                  </div>
                )}

                {/* Plan header */}
                <div className="mb-4 border-b border-gray-700/50 pb-4">
                  <h3 className="mb-1 font-nacelle text-xl font-semibold text-gray-200">
                    {plan.name}
                  </h3>
                  <p className="text-sm text-indigo-200/65">{plan.description}</p>
                </div>

                {/* Price */}
                <div className="mb-6">
                  <div className="mb-1 flex items-baseline gap-1">
                    <span className="font-nacelle text-4xl font-bold text-gray-200">
                      {billingCycle === 'monthly' ? plan.priceMonthly : plan.priceYearly}
                    </span>
                    <span className="text-sm text-gray-400">
                      {t('landing.pricing.period')}
                    </span>
                  </div>
                  {billingCycle === 'yearly' && plan.tier !== 'FREE' && (
                    <p className="text-xs text-gray-400">
                      {t('landing.pricing.periodYearly')}
                    </p>
                  )}
                </div>

                {/* Features */}
                <ul className="mb-6 flex-grow space-y-3">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <svg
                        className="mt-0.5 h-5 w-5 flex-shrink-0 fill-indigo-500"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                      >
                        <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                      </svg>
                      <span className="text-sm text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA button */}
                <Link
                  to={plan.ctaLink}
                  className={`group w-full rounded-lg px-4 py-3 text-center text-sm font-medium transition ${
                    plan.popular
                      ? 'bg-gradient-to-r from-indigo-500 to-indigo-400 text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40'
                      : 'border border-gray-600 bg-gray-700/50 text-gray-200 hover:border-indigo-500/50 hover:bg-gray-700'
                  }`}
                >
                  {plan.cta}
                  {plan.popular && (
                    <span className="ml-1 inline-block transition-transform group-hover:translate-x-0.5">
                      →
                    </span>
                  )}
                </Link>
              </div>
            ))}
          </div>

          {/* Trust message */}
          <div className="mt-12 text-center">
            <p className="text-sm text-gray-400">
              {t('landing.pricing.trustMessage')}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
