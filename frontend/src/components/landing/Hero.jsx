import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function Hero() {
  const { t } = useTranslation();

  return (
    <section className="relative">
      {/* Page illustration - purple glow effect */}
      <div className="pointer-events-none absolute left-1/2 top-0 -z-10 -translate-x-1/4 opacity-100" aria-hidden="true">
        <img
          className="max-w-none"
          src="/images/landing/page-illustration.svg"
          width="846"
          height="594"
          alt=""
          style={{ imageRendering: 'auto' }}
        />
      </div>

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Hero content */}
        <div className="py-12 md:py-20">
          {/* Section header */}
          <div className="pb-12 text-center md:pb-20">
            <h1 className="animate-[gradient_6s_linear_infinite] bg-[linear-gradient(to_right,var(--color-gray-200),var(--color-indigo-200),var(--color-gray-50),var(--color-indigo-300),var(--color-gray-200))] bg-[length:200%_auto] bg-clip-text pb-5 font-nacelle text-4xl font-semibold text-transparent md:text-5xl" data-aos="fade-up">
              {t('landing.hero.title')}
            </h1>
            <div className="mx-auto max-w-3xl">
              <p className="mb-8 text-xl text-indigo-200/65">
                {t('landing.hero.subtitle')}
              </p>
              <div className="mx-auto max-w-xs sm:flex sm:max-w-none sm:justify-center gap-4">
                <div>
                  <Link
                    to="/signup"
                    className="btn btn-primary group mb-4 w-full sm:mb-0 sm:w-auto"
                  >
                    <span className="relative inline-flex items-center">
                      {t('landing.hero.cta.primary')}
                      <span className="ml-1 tracking-normal text-white/50 transition-transform group-hover:translate-x-0.5">
                        →
                      </span>
                    </span>
                  </Link>
                </div>
                <div>
                  <a
                    href="#features"
                    className="btn btn-secondary w-full sm:w-auto"
                  >
                    {t('landing.hero.cta.secondary')}
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Hero image */}
          <div className="relative">
            {/* Secondary illustration */}
            <div
              className="pointer-events-none absolute bottom-8 left-1/2 -z-10 -ml-28 -translate-x-1/2 translate-y-1/2"
              aria-hidden="true"
            >
              <img
                className="md:max-w-none"
                src="/images/landing/secondary-illustration.svg"
                width="1165"
                height="1012"
                alt=""
              />
            </div>

            {/* Hero image */}
            <div className="relative flex items-center justify-center rounded-2xl">
              <figure className="relative overflow-hidden rounded-2xl before:absolute before:inset-0 before:-z-10 before:bg-gradient-to-br before:from-gray-900 before:via-indigo-500/20 before:to-gray-900">
                <img
                  className="opacity-50 grayscale rounded-2xl w-full"
                  src="/images/landing/hero-image-01.jpg"
                  width="1104"
                  height="576"
                  alt={t('landing.hero.imageAlt')}
                />
              </figure>
              {/* Play button overlay - optional video demo */}
              <div className="absolute inset-0 flex items-center justify-center">
                <svg
                  className="w-20 h-20 fill-white opacity-80 hover:opacity-100 transition-opacity"
                  viewBox="0 0 88 88"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle className="fill-indigo-600" cx="44" cy="44" r="44" />
                  <path
                    className="fill-white"
                    d="M52 44a.999.999 0 0 0-.427-.82l-10-7A1 1 0 0 0 40 37v14a.999.999 0 0 0 1.573.82l10-7A.995.995 0 0 0 52 44V44c0 .001 0 .001 0 0Z"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
