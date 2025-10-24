import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';

import LandingHeader from '../components/landing/LandingHeader';
import Hero from '../components/landing/Hero';
import Features from '../components/landing/Features';
import Benefits from '../components/landing/Benefits';
import CTA from '../components/landing/CTA';
import LandingFooter from '../components/landing/LandingFooter';

export default function Landing() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  // Redirect authenticated users to dashboard
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      navigate('/dashboard');
    }
  }, [navigate]);

  const currentLang = i18n.language || 'en';
  const siteUrl = window.location.origin;

  return (
    <>
      <Helmet>
        {/* Primary Meta Tags */}
        <title>{t('landing.seo.title')}</title>
        <meta name="title" content={t('landing.seo.title')} />
        <meta name="description" content={t('landing.seo.description')} />
        <meta name="keywords" content={t('landing.seo.keywords')} />
        <meta name="author" content={t('landing.seo.author')} />
        <link rel="canonical" href={siteUrl} />

        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={siteUrl} />
        <meta property="og:title" content={t('landing.seo.title')} />
        <meta property="og:description" content={t('landing.seo.description')} />
        <meta property="og:image" content={`${siteUrl}/images/landing/hero-image-01.jpg`} />
        <meta property="og:locale" content={currentLang === 'fr' ? 'fr_FR' : 'en_US'} />

        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content={siteUrl} />
        <meta property="twitter:title" content={t('landing.seo.title')} />
        <meta property="twitter:description" content={t('landing.seo.description')} />
        <meta property="twitter:image" content={`${siteUrl}/images/landing/hero-image-01.jpg`} />

        {/* hreflang tags for multilingual SEO */}
        <link rel="alternate" hrefLang="en" href={`${siteUrl}?lang=en`} />
        <link rel="alternate" hrefLang="fr" href={`${siteUrl}?lang=fr`} />
        <link rel="alternate" hrefLang="x-default" href={siteUrl} />

        {/* Schema.org structured data */}
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: t('landing.footer.siteName'),
            applicationCategory: 'BusinessApplication',
            operatingSystem: 'Web',
            offers: {
              '@type': 'Offer',
              price: '0',
              priceCurrency: 'USD',
            },
            description: t('landing.seo.description'),
            url: siteUrl,
            image: `${siteUrl}/images/landing/hero-image-01.jpg`,
            author: {
              '@type': 'Organization',
              name: t('landing.footer.siteName'),
            },
            aggregateRating: {
              '@type': 'AggregateRating',
              ratingValue: '4.8',
              ratingCount: '127',
            },
          })}
        </script>
      </Helmet>

      <div className="flex min-h-screen flex-col overflow-hidden supports-[overflow:clip]:overflow-clip bg-gray-950 font-inter text-base text-gray-200 antialiased">
        <LandingHeader />

        <main className="relative grow">
          <Hero />
          <Features />
          <Benefits />
          <CTA />
        </main>

        <LandingFooter />
      </div>
    </>
  );
}
