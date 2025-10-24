import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function LandingFooter() {
  const { t } = useTranslation();

  return (
    <footer className="border-t border-gray-800">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="py-12 md:py-16">
          {/* Footer content */}
          <div className="grid gap-8 sm:grid-cols-12 lg:gap-12">
            {/* Brand */}
            <div className="sm:col-span-12 lg:col-span-4">
              <div className="mb-4">
                <Link to="/" className="inline-flex items-center gap-2" aria-label={t('landing.footer.siteName')}>
                  <img src="/images/landing/logo.svg" width="32" height="32" alt="Logo" />
                  <span className="text-gray-200 font-semibold text-lg">{t('landing.footer.siteName')}</span>
                </Link>
              </div>
              <p className="text-sm text-gray-400 mb-4">{t('landing.footer.description')}</p>
              {/* Social links */}
              <div className="flex gap-4">
                <a
                  href="https://twitter.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-indigo-500 transition-colors"
                  aria-label="Twitter"
                >
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 20 20">
                    <path d="M15.5 1h2.5l-5.5 6.3L18 19h-5l-4-5.2L4.5 19H2l5.9-6.7L2 1h5.2l3.6 4.8L15.5 1zm-.9 16.2h1.4L6.8 2.5H5.3l9.3 14.7z" />
                  </svg>
                </a>
                <a
                  href="https://linkedin.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-indigo-500 transition-colors"
                  aria-label="LinkedIn"
                >
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 20 20">
                    <path d="M18 0H2C.9 0 0 .9 0 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V2c0-1.1-.9-2-2-2zM6 17H3V8h3v9zM4.5 6.3c-1 0-1.8-.8-1.8-1.8s.8-1.8 1.8-1.8 1.8.8 1.8 1.8-.8 1.8-1.8 1.8zM17 17h-3v-4.5c0-1.1 0-2.5-1.5-2.5s-1.8 1.2-1.8 2.4V17H8V8h2.8v1.2h.1c.4-.8 1.4-1.5 2.8-1.5 3 0 3.6 2 3.6 4.6V17h-.3z" />
                  </svg>
                </a>
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-indigo-500 transition-colors"
                  aria-label="GitHub"
                >
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 20 20">
                    <path d="M10 0C4.477 0 0 4.477 0 10c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0 1 10 4.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C17.137 18.165 20 14.418 20 10c0-5.523-4.477-10-10-10z" />
                  </svg>
                </a>
              </div>
            </div>

            {/* Links - Product */}
            <div className="sm:col-span-6 lg:col-span-2">
              <h3 className="mb-4 text-sm font-semibold text-gray-200">{t('landing.footer.product.title')}</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="#features" className="text-gray-400 hover:text-indigo-500 transition-colors">
                    {t('landing.footer.product.features')}
                  </a>
                </li>
                <li>
                  <a href="#pricing" className="text-gray-400 hover:text-indigo-500 transition-colors">
                    {t('landing.footer.product.pricing')}
                  </a>
                </li>
                <li>
                  <Link to="/signin" className="text-gray-400 hover:text-indigo-500 transition-colors">
                    {t('landing.footer.product.signIn')}
                  </Link>
                </li>
                <li>
                  <Link to="/signup" className="text-gray-400 hover:text-indigo-500 transition-colors">
                    {t('landing.footer.product.signUp')}
                  </Link>
                </li>
              </ul>
            </div>

            {/* Links - Company */}
            <div className="sm:col-span-6 lg:col-span-2">
              <h3 className="mb-4 text-sm font-semibold text-gray-200">{t('landing.footer.company.title')}</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="#about" className="text-gray-400 hover:text-indigo-500 transition-colors">
                    {t('landing.footer.company.about')}
                  </a>
                </li>
                <li>
                  <a href="#contact" className="text-gray-400 hover:text-indigo-500 transition-colors">
                    {t('landing.footer.company.contact')}
                  </a>
                </li>
                <li>
                  <a href="#blog" className="text-gray-400 hover:text-indigo-500 transition-colors">
                    {t('landing.footer.company.blog')}
                  </a>
                </li>
              </ul>
            </div>

            {/* Links - Support */}
            <div className="sm:col-span-6 lg:col-span-2">
              <h3 className="mb-4 text-sm font-semibold text-gray-200">{t('landing.footer.support.title')}</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="#help" className="text-gray-400 hover:text-indigo-500 transition-colors">
                    {t('landing.footer.support.helpCenter')}
                  </a>
                </li>
                <li>
                  <a href="#docs" className="text-gray-400 hover:text-indigo-500 transition-colors">
                    {t('landing.footer.support.documentation')}
                  </a>
                </li>
                <li>
                  <a href="#api" className="text-gray-400 hover:text-indigo-500 transition-colors">
                    {t('landing.footer.support.api')}
                  </a>
                </li>
              </ul>
            </div>

            {/* Links - Legal */}
            <div className="sm:col-span-6 lg:col-span-2">
              <h3 className="mb-4 text-sm font-semibold text-gray-200">{t('landing.footer.legal.title')}</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="#privacy" className="text-gray-400 hover:text-indigo-500 transition-colors">
                    {t('landing.footer.legal.privacy')}
                  </a>
                </li>
                <li>
                  <a href="#terms" className="text-gray-400 hover:text-indigo-500 transition-colors">
                    {t('landing.footer.legal.terms')}
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom section */}
          <div className="mt-12 border-t border-gray-800 pt-8">
            <div className="text-center text-sm text-gray-400">
              <p>
                &copy; {new Date().getFullYear()} {t('landing.footer.siteName')}. {t('landing.footer.copyright')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
