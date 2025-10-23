import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

import Sidebar from '../partials/Sidebar';
import Header from '../partials/Header';
import FilterButton from '../components/DropdownFilter';
import Datepicker from '../components/Datepicker';
import DashboardCard01 from '../partials/dashboard/DashboardCard01';
import DashboardCard02 from '../partials/dashboard/DashboardCard02';
import DashboardCard03 from '../partials/dashboard/DashboardCard03';
import DashboardCard04 from '../partials/dashboard/DashboardCard04';
import DashboardCard05 from '../partials/dashboard/DashboardCard05';
import DashboardCard06 from '../partials/dashboard/DashboardCard06';
import DashboardCard07 from '../partials/dashboard/DashboardCard07';
import DashboardCard08 from '../partials/dashboard/DashboardCard08';
import DashboardCard09 from '../partials/dashboard/DashboardCard09';
import DashboardCard10 from '../partials/dashboard/DashboardCard10';
import DashboardCard11 from '../partials/dashboard/DashboardCard11';

// Import API hooks
import {
  useFinanceDashboard,
  useLeadStats,
  useInvoiceStats,
  useRecentTransactions,
  useRecentInvoices,
  useInvoices,
  useTransactions
} from '../api/hooks';

function Dashboard() {
  const { t } = useTranslation();

  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Fetch dashboard data from APIs
  const { data: financeData, isLoading: financeLoading } = useFinanceDashboard();
  const { data: leadStats, isLoading: leadsLoading } = useLeadStats();
  const { data: invoiceStats, isLoading: invoiceStatsLoading } = useInvoiceStats();
  const { data: recentTransactionsData, isLoading: transactionsLoading } = useRecentTransactions(10);
  const { data: recentInvoicesData, isLoading: recentInvoicesLoading } = useRecentInvoices(5);

  // Fetch all invoices for revenue chart (last 12 months)
  const { data: allInvoicesData } = useInvoices();

  // Fetch all transactions for income/expense trends
  const { data: allTransactionsData } = useTransactions();

  // Extract arrays from API responses (handle pagination)
  const allInvoices = Array.isArray(allInvoicesData) ? allInvoicesData : (allInvoicesData?.results || []);
  const allTransactions = Array.isArray(allTransactionsData) ? allTransactionsData : (allTransactionsData?.results || []);
  const recentTransactions = Array.isArray(recentTransactionsData) ? recentTransactionsData : (recentTransactionsData?.results || []);
  const recentInvoices = Array.isArray(recentInvoicesData) ? recentInvoicesData : (recentInvoicesData?.results || []);

  const isLoading = financeLoading || leadsLoading || invoiceStatsLoading ||
                     transactionsLoading || recentInvoicesLoading;

  return (
    <div className="flex h-[100dvh] overflow-hidden">

      {/* Sidebar */}
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      {/* Content area */}
      <div className="relative flex flex-col flex-1 overflow-y-auto overflow-x-hidden">

        {/*  Site header */}
        <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

        <main className="grow">
          <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-[96rem] mx-auto">

            {/* Dashboard actions */}
            <div className="sm:flex sm:justify-between sm:items-center mb-8">

              {/* Left: Title */}
              <div className="mb-4 sm:mb-0">
                <h1 className="text-2xl md:text-3xl text-gray-800 dark:text-gray-100 font-bold">{t('dashboard.title')}</h1>
              </div>

              {/* Right: Actions */}
              <div className="grid grid-flow-col sm:auto-cols-max justify-start sm:justify-end gap-2">
                {/* Filter button */}
                <FilterButton align="right" />
                {/* Datepicker built with React Day Picker */}
                <Datepicker align="right" />
                {/* Add view button */}
                <button className="btn bg-gray-900 text-gray-100 hover:bg-gray-800 dark:bg-gray-100 dark:text-gray-800 dark:hover:bg-white">
                  <svg className="fill-current shrink-0 xs:hidden" width="16" height="16" viewBox="0 0 16 16">
                    <path d="M15 7H9V1c0-.6-.4-1-1-1S7 .4 7 1v6H1c-.6 0-1 .4-1 1s.4 1 1 1h6v6c0 .6.4 1 1 1s1-.4 1-1V9h6c.6 0 1-.4 1-1s-.4-1-1-1z" />
                  </svg>
                  <span className="max-xs:sr-only">{t('common.add')} {t('common.view', { defaultValue: 'View' })}</span>
                </button>                
              </div>

            </div>

            {/* Cards */}
            <div className="grid grid-cols-12 gap-6">

              {isLoading ? (
                <div className="col-span-full text-center py-8">
                  <div className="text-gray-500">{t('common.loading')}</div>
                </div>
              ) : (
                <>
                  {/* Total Revenue Chart */}
                  <DashboardCard01
                    invoices={allInvoices}
                    stats={invoiceStats}
                  />
                  {/* Leads Pipeline Value */}
                  <DashboardCard02
                    leadStats={leadStats}
                  />
                  {/* Bank Balance Overview */}
                  <DashboardCard03
                    financeData={financeData}
                    transactions={allTransactions}
                  />
                  {/* Income vs Expenses Bar Chart */}
                  <DashboardCard04
                    transactions={allTransactions}
                  />
                  {/* Lead Conversion Rate (keep for now) */}
                  <DashboardCard05 />
                  {/* Lead Sources Doughnut */}
                  <DashboardCard06
                    leadStats={leadStats}
                  />
                  {/* Recent Invoices Table */}
                  <DashboardCard07
                    invoices={recentInvoices}
                  />
                  {/* Monthly Revenue Chart (keep for now) */}
                  <DashboardCard08 />
                  {/* Invoice Status Breakdown (keep for now) */}
                  <DashboardCard09 />
                  {/* Recent Transactions */}
                  <DashboardCard10
                    transactions={recentTransactions}
                  />
                  {/* Income/Expenses List */}
                  <DashboardCard11
                    transactions={recentTransactions}
                  />
                </>
              )}

            </div>

          </div>
        </main>

      </div>

    </div>
  );
}

export default Dashboard;