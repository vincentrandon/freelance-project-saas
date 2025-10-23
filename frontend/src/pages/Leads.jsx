import React from 'react';
import { useTranslation } from 'react-i18next';
import Header from '../partials/Header';
import Sidebar from '../partials/Sidebar';
import ComingSoon from '../components/ComingSoon';

// Leads icon component
const LeadsIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);

function Leads() {
  const { t } = useTranslation();

  return (
    <div className="flex h-screen overflow-hidden bg-gray-900">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto">
          <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-9xl mx-auto">
            <ComingSoon
              title={t('leads.comingSoonTitle')}
              description={t('leads.comingSoonDescription')}
              icon={LeadsIcon}
              features={[
                t('leads.feature1'),
                t('leads.feature2'),
                t('leads.feature3'),
                t('leads.feature4'),
                t('leads.feature5'),
              ]}
            />
          </div>
        </main>
      </div>
    </div>
  );
}

export default Leads;
