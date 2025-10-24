import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function CTA() {
  const { t } = useTranslation();

  return (
    <section id="pricing" className="relative">
      {/* Background gradient */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-transparent to-indigo-900/20"
        aria-hidden="true"
      ></div>

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="py-12 md:py-20">
          {/* Section content */}
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-3 pb-3 before:h-px before:w-8 before:bg-gradient-to-r before:from-transparent before:to-indigo-200/50 after:h-px after:w-8 after:bg-gradient-to-l after:from-transparent after:to-indigo-200/50">
              <span className="inline-flex bg-gradient-to-r from-indigo-500 to-indigo-200 bg-clip-text text-transparent">
                {t('landing.cta.badge')}
              </span>
            </div>
            <h2 className="animate-[gradient_6s_linear_infinite] bg-[linear-gradient(to_right,var(--color-gray-200),var(--color-indigo-200),var(--color-gray-50),var(--color-indigo-300),var(--color-gray-200))] bg-[length:200%_auto] bg-clip-text pb-4 font-nacelle text-3xl font-semibold text-transparent md:text-4xl">
              {t('landing.cta.title')}
            </h2>
            <p className="mb-8 text-lg text-indigo-200/65">
              {t('landing.cta.subtitle')}
            </p>

            {/* CTA buttons */}
            <div className="mx-auto max-w-xs sm:flex sm:max-w-none sm:justify-center gap-4">
              <Link to="/signup" className="btn btn-primary group mb-4 w-full sm:mb-0 sm:w-auto">
                <span className="relative inline-flex items-center">
                  {t('landing.cta.primary')}
                  <span className="ml-1 tracking-normal text-white/50 transition-transform group-hover:translate-x-0.5">
                    →
                  </span>
                </span>
              </Link>
              <Link to="/signin" className="btn btn-secondary w-full sm:w-auto">
                {t('landing.cta.secondary')}
              </Link>
            </div>

            {/* Trust badges */}
            <div className="mt-12 border-t border-gray-700/50 pt-12">
              <p className="mb-6 text-sm text-gray-400">{t('landing.cta.trustText')}</p>
              <div className="flex flex-wrap items-center justify-center gap-8 opacity-60 grayscale hover:grayscale-0 transition-all">
                {[1, 2, 3, 4, 5].map((num) => (
                  <img
                    key={num}
                    src={`/images/landing/client-logo-0${num}.svg`}
                    alt={`Client ${num}`}
                    className="h-8"
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
