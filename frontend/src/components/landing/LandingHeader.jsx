import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function LandingHeader() {
  const { t } = useTranslation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={`z-30 w-full ${isScrolled ? 'mt-0' : 'mt-2 md:mt-5'}`}>
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="relative flex h-14 items-center justify-between gap-3 rounded-2xl bg-gray-900/90 px-3 before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit] before:border before:border-transparent before:[background:linear-gradient(to_right,var(--color-gray-800),var(--color-gray-700),var(--color-gray-800))_border-box] before:[mask-composite:exclude_!important] before:[mask:linear-gradient(white_0_0)_padding-box,_linear-gradient(white_0_0)] after:absolute after:inset-0 after:-z-10 after:backdrop-blur-xs">
          {/* Site branding */}
          <div className="flex flex-1 items-center">
            <Link to="/" className="inline-flex shrink-0" aria-label={t('landing.header.siteName')}>
              <img src="/images/landing/logo.svg" width="32" height="32" alt="Logo" />
            </Link>
          </div>

          {/* Desktop navigation */}
          <nav className="hidden md:flex md:grow">
            <ul className="flex grow flex-wrap items-center justify-center gap-4 text-sm lg:gap-8">
              <li>
                <a href="#features" className="flex items-center px-2 py-1 text-gray-200 transition hover:text-indigo-500 lg:px-3">
                  {t('landing.header.features')}
                </a>
              </li>
              <li>
                <a href="#benefits" className="flex items-center px-2 py-1 text-gray-200 transition hover:text-indigo-500 lg:px-3">
                  {t('landing.header.benefits')}
                </a>
              </li>
              <li>
                <a href="#pricing" className="flex items-center px-2 py-1 text-gray-200 transition hover:text-indigo-500 lg:px-3">
                  {t('landing.header.pricing')}
                </a>
              </li>
            </ul>
          </nav>

          {/* Desktop sign in links */}
          <ul className="flex flex-1 items-center justify-end gap-3">
            <li>
              <Link to="/signin" className="btn-sm relative bg-gradient-to-b from-gray-800 to-gray-800/60 bg-[length:100%_100%] bg-[bottom] py-[5px] text-gray-300 before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit] before:border before:border-transparent before:[background:linear-gradient(to_right,var(--color-gray-800),var(--color-gray-700),var(--color-gray-800))_border-box] before:[mask-composite:exclude_!important] before:[mask:linear-gradient(white_0_0)_padding-box,_linear-gradient(white_0_0)] hover:bg-[length:100%_150%]">
                {t('landing.header.signIn')}
              </Link>
            </li>
            <li>
              <Link to="/signup" className="btn-sm bg-gradient-to-t from-indigo-600 to-indigo-500 bg-[length:100%_100%] bg-[bottom] py-[5px] text-white shadow-[inset_0px_1px_0px_0px_theme(colors.white/16%)] hover:bg-[length:100%_150%]">
                {t('landing.header.signUp')}
              </Link>
            </li>
          </ul>

          {/* Mobile menu button */}
          <div className="flex md:hidden">
            <button
              className="hamburger"
              aria-label="Toggle menu"
              aria-controls="mobile-nav"
              aria-expanded={isMobileMenuOpen}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <span className="sr-only">{t('landing.header.menu')}</span>
              <svg
                className="w-6 h-6 fill-current text-gray-300"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect y="4" width="24" height="2" rx="1" />
                <rect y="11" width="24" height="2" rx="1" />
                <rect y="18" width="24" height="2" rx="1" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile navigation */}
      {isMobileMenuOpen && (
        <div className="md:hidden" id="mobile-nav">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 mt-2">
            <div className="relative bg-gray-900 rounded-xl p-4 border border-gray-700/50 shadow-xl">
              <nav className="flex flex-col gap-2">
                <a
                  href="#features"
                  className="flex rounded-lg px-3 py-2 text-gray-200 hover:bg-gray-800 hover:text-indigo-400 transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {t('landing.header.features')}
                </a>
                <a
                  href="#benefits"
                  className="flex rounded-lg px-3 py-2 text-gray-200 hover:bg-gray-800 hover:text-indigo-400 transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {t('landing.header.benefits')}
                </a>
                <a
                  href="#pricing"
                  className="flex rounded-lg px-3 py-2 text-gray-200 hover:bg-gray-800 hover:text-indigo-400 transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {t('landing.header.pricing')}
                </a>
                <hr className="border-gray-700 my-2" />
                <Link
                  to="/signin"
                  className="flex rounded-lg px-3 py-2 text-gray-200 hover:bg-gray-800 transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {t('landing.header.signIn')}
                </Link>
                <Link
                  to="/signup"
                  className="flex rounded-lg px-3 py-2 bg-gradient-to-t from-indigo-600 to-indigo-500 text-white text-center justify-center font-medium shadow-lg"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {t('landing.header.signUp')}
                </Link>
              </nav>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
