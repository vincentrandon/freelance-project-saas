import React from 'react';
import { useTranslation } from 'react-i18next';
import Header from '../partials/Header';
import Sidebar from '../partials/Sidebar';
import ComingSoon from '../components/ComingSoon';

// Finance icon component
const FinanceIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

function Finance() {
  const { t } = useTranslation();

  return (
    <div className="flex h-screen overflow-hidden bg-gray-900">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto">
          <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-9xl mx-auto">
            <ComingSoon
              title={t('finance.comingSoonTitle')}
              description={t('finance.comingSoonDescription')}
              icon={FinanceIcon}
              features={[
                t('finance.feature1'),
                t('finance.feature2'),
                t('finance.feature3'),
                t('finance.feature4'),
                t('finance.feature5'),
              ]}
            />
          </div>
        </main>
      </div>
    </div>
  );
}

export default Finance;
