import React from 'react';
import { useTranslation } from 'react-i18next';

export default function Features() {
  const { t } = useTranslation();

  const features = [
    {
      icon: (
        <svg className="mb-3 fill-indigo-500" xmlns="http://www.w3.org/2000/svg" width="24" height="24">
          <path d="M19 4h-2V3a1 1 0 0 0-2 0v1H9V3a1 1 0 0 0-2 0v1H5a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3h14a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3Zm1 15a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-7h16v7Zm0-9H4V7a1 1 0 0 1 1-1h2v1a1 1 0 0 0 2 0V6h6v1a1 1 0 0 0 2 0V6h2a1 1 0 0 1 1 1v3Z" />
        </svg>
      ),
      title: t('landing.features.clientManagement.title'),
      description: t('landing.features.clientManagement.description'),
    },
    {
      icon: (
        <svg className="mb-3 fill-indigo-500" xmlns="http://www.w3.org/2000/svg" width="24" height="24">
          <path d="M3 3h7v7H3V3zm9 0h9v3h-9V3zm0 5h9v5h-9V8zm-9 4h7v9H3v-9zm9 4h9v5h-9v-5z" opacity=".48" />
          <path d="M21 8h-9V3h9v5zm-2-3h-5v1h5V5z" />
        </svg>
      ),
      title: t('landing.features.projectTracking.title'),
      description: t('landing.features.projectTracking.description'),
    },
    {
      icon: (
        <svg className="mb-3 fill-indigo-500" xmlns="http://www.w3.org/2000/svg" width="24" height="24">
          <path fillOpacity=".48" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.31-8.86c-1.77-.45-2.34-.94-2.34-1.67 0-.84.79-1.43 2.1-1.43 1.38 0 1.9.66 1.94 1.64h1.71c-.05-1.34-.87-2.57-2.49-2.97V5H10.9v1.69c-1.51.32-2.72 1.3-2.72 2.81 0 1.79 1.49 2.69 3.66 3.21 1.95.46 2.34 1.15 2.34 1.87 0 .53-.39 1.39-2.1 1.39-1.6 0-2.23-.72-2.32-1.64H8.04c.1 1.7 1.36 2.66 2.86 2.97V19h2.34v-1.67c1.52-.29 2.72-1.16 2.73-2.77-.01-2.2-1.9-2.96-3.66-3.42z" />
        </svg>
      ),
      title: t('landing.features.aiInvoicing.title'),
      description: t('landing.features.aiInvoicing.description'),
    },
    {
      icon: (
        <svg className="mb-3 fill-indigo-500" xmlns="http://www.w3.org/2000/svg" width="24" height="24">
          <path d="M4 4h7v7H4V4zm9 0h7v3h-7V4zm0 5h7v6h-7V9zM4 13h7v7H4v-7zm9 4h7v3h-7v-3z" opacity=".48" />
          <path d="M13 4h7v3h-7V4zm0 5h7v6h-7V9z" />
        </svg>
      ),
      title: t('landing.features.financeDashboard.title'),
      description: t('landing.features.financeDashboard.description'),
    },
    {
      icon: (
        <svg className="mb-3 fill-indigo-500" xmlns="http://www.w3.org/2000/svg" width="24" height="24">
          <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z" opacity=".48" />
          <path d="m12 6-6 9h12l-6-9z" />
        </svg>
      ),
      title: t('landing.features.leadPipeline.title'),
      description: t('landing.features.leadPipeline.description'),
    },
    {
      icon: (
        <svg className="mb-3 fill-indigo-500" xmlns="http://www.w3.org/2000/svg" width="24" height="24">
          <circle cx="12" cy="12" r="10" opacity=".48" />
          <path d="M12 6v6l4 2" strokeWidth="2" stroke="currentColor" fill="none" />
        </svg>
      ),
      title: t('landing.features.timeTracking.title'),
      description: t('landing.features.timeTracking.description'),
    },
  ];

  return (
    <section id="features" className="relative">
      {/* Blurred shape decorations */}
      <div className="pointer-events-none absolute left-1/2 top-0 -z-10 -mt-20 -translate-x-1/2 opacity-100" aria-hidden="true">
        <img
          className="max-w-none"
          src="/images/landing/blurred-shape-gray.svg"
          width="760"
          height="668"
          alt=""
          style={{ imageRendering: 'auto' }}
        />
      </div>
      <div
        className="pointer-events-none absolute bottom-0 left-1/2 -z-10 -mb-80 -translate-x-[120%] opacity-100"
        aria-hidden="true"
      >
        <img
          className="max-w-none"
          src="/images/landing/blurred-shape.svg"
          width="760"
          height="668"
          alt=""
          style={{ imageRendering: 'auto' }}
        />
      </div>

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="border-t py-12 [border-image:linear-gradient(to_right,transparent,theme(colors.gray.400/.25),transparent)1] md:py-20">
          {/* Section header */}
          <div className="mx-auto max-w-3xl pb-4 text-center md:pb-12">
            <div className="inline-flex items-center gap-3 pb-3 before:h-px before:w-8 before:bg-gradient-to-r before:from-transparent before:to-indigo-200/50 after:h-px after:w-8 after:bg-gradient-to-l after:from-transparent after:to-indigo-200/50">
              <span className="inline-flex bg-gradient-to-r from-indigo-500 to-indigo-200 bg-clip-text text-transparent">
                {t('landing.features.badge')}
              </span>
            </div>
            <h2 className="animate-[gradient_6s_linear_infinite] bg-[linear-gradient(to_right,var(--color-gray-200),var(--color-indigo-200),var(--color-gray-50),var(--color-indigo-300),var(--color-gray-200))] bg-[length:200%_auto] bg-clip-text pb-4 font-nacelle text-3xl font-semibold text-transparent md:text-4xl">
              {t('landing.features.title')}
            </h2>
            <p className="text-lg text-indigo-200/65">
              {t('landing.features.subtitle')}
            </p>
          </div>

          {/* Features image */}
          <div className="flex justify-center pb-4 md:pb-12">
            <img
              className="max-w-none rounded-xl"
              src="/images/landing/features.png"
              width="1104"
              height="384"
              alt={t('landing.features.imageAlt')}
            />
          </div>

          {/* Feature items grid */}
          <div className="mx-auto grid max-w-sm gap-12 sm:max-w-none sm:grid-cols-2 md:gap-x-14 md:gap-y-16 lg:grid-cols-3">
            {features.map((feature, index) => (
              <article key={index}>
                {feature.icon}
                <h3 className="mb-1 font-nacelle text-[1rem] font-semibold text-gray-200">
                  {feature.title}
                </h3>
                <p className="text-indigo-200/65">{feature.description}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
