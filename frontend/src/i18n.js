import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpBackend from 'i18next-http-backend';
import moment from 'moment';

i18n
  .use(HttpBackend) // Load translations from public/locales
  .use(LanguageDetector) // Detect user language
  .use(initReactI18next) // Pass i18n to React
  .init({
    fallbackLng: 'en',
    debug: import.meta.env.DEV, // Enable debug in development

    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },

    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },

    ns: ['translation'], // Namespaces
    defaultNS: 'translation',

    interpolation: {
      escapeValue: false, // React already escapes by default
    },

    react: {
      useSuspense: true,
    },
  });

// Update Moment.js locale when language changes
i18n.on('languageChanged', (lng) => {
  const momentLocale = lng === 'fr' ? 'fr' : 'en';
  moment.locale(momentLocale);
});

// Set initial Moment.js locale
const currentLang = i18n.language || 'en';
moment.locale(currentLang === 'fr' ? 'fr' : 'en');

export default i18n;
