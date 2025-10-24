import React from 'react';
import { useTranslation } from 'react-i18next';

export default function Benefits() {
  const { t } = useTranslation();

  const benefits = [
    {
      stat: '10+',
      unit: t('landing.benefits.items.timeSaved.unit'),
      description: t('landing.benefits.items.timeSaved.description'),
    },
    {
      stat: '3x',
      unit: t('landing.benefits.items.fasterPayments.unit'),
      description: t('landing.benefits.items.fasterPayments.description'),
    },
    {
      stat: '100%',
      unit: t('landing.benefits.items.organized.unit'),
      description: t('landing.benefits.items.organized.description'),
    },
  ];

  return (
    <section id="benefits" className="relative">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="py-12 md:py-20">
          {/* Section header */}
          <div className="mx-auto max-w-3xl pb-12 text-center md:pb-20">
            <div className="inline-flex items-center gap-3 pb-3 before:h-px before:w-8 before:bg-gradient-to-r before:from-transparent before:to-indigo-200/50 after:h-px after:w-8 after:bg-gradient-to-l after:from-transparent after:to-indigo-200/50">
              <span className="inline-flex bg-gradient-to-r from-indigo-500 to-indigo-200 bg-clip-text text-transparent">
                {t('landing.benefits.badge')}
              </span>
            </div>
            <h2 className="animate-[gradient_6s_linear_infinite] bg-[linear-gradient(to_right,var(--color-gray-200),var(--color-indigo-200),var(--color-gray-50),var(--color-indigo-300),var(--color-gray-200))] bg-[length:200%_auto] bg-clip-text pb-4 font-nacelle text-3xl font-semibold text-transparent md:text-4xl">
              {t('landing.benefits.title')}
            </h2>
            <p className="text-lg text-indigo-200/65">
              {t('landing.benefits.subtitle')}
            </p>
          </div>

          {/* Benefits stats */}
          <div className="grid gap-8 sm:grid-cols-3 lg:gap-16">
            {benefits.map((benefit, index) => (
              <div key={index} className="text-center">
                <div className="mb-4">
                  <span className="inline-flex bg-gradient-to-r from-indigo-500 to-indigo-200 bg-clip-text text-6xl font-bold text-transparent">
                    {benefit.stat}
                  </span>
                  <span className="ml-2 text-2xl font-semibold text-indigo-200/80">
                    {benefit.unit}
                  </span>
                </div>
                <p className="text-lg text-gray-300">{benefit.description}</p>
              </div>
            ))}
          </div>

          {/* Testimonial section */}
          <div className="mx-auto mt-16 max-w-3xl">
            <div className="relative rounded-2xl bg-gradient-to-br from-gray-900 via-indigo-900/20 to-gray-900 p-8 md:p-12">
              <div className="absolute inset-0 rounded-2xl border border-gray-700/50"></div>
              <div className="relative">
                <div className="mb-6 flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold">
                    JD
                  </div>
                  <div>
                    <div className="font-semibold text-gray-200">{t('landing.benefits.testimonial.name')}</div>
                    <div className="text-sm text-indigo-200/65">{t('landing.benefits.testimonial.title')}</div>
                  </div>
                </div>
                <blockquote className="text-lg italic text-gray-300">
                  "{t('landing.benefits.testimonial.quote')}"
                </blockquote>
                <div className="mt-6 flex gap-1">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="h-5 w-5 fill-yellow-500" viewBox="0 0 20 20">
                      <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                    </svg>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
