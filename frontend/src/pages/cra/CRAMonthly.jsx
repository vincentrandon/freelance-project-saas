import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMonthlyView } from '../../api/hooks';
import Header from '../../partials/Header';
import Sidebar from '../../partials/Sidebar';
import StatusBadge from '../../components/StatusBadge';
import EmptyState from '../../components/EmptyState';
import { useTranslation } from 'react-i18next';

function CRAMonthly() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Get current month and year
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());

  const { data: monthlyData, isLoading } = useMonthlyView(selectedMonth, selectedYear);

  const stats = monthlyData?.data || {
    total_cras: 0,
    total_draft: 0,
    total_pending: 0,
    total_validated: 0,
    total_rejected: 0,
    total_amount: 0,
    total_days: 0,
    cras: []
  };

  const monthNames = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  const handlePreviousMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      draft: 'bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-slate-200',
      pending_validation: 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200',
      validated: 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200',
      rejected: 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200',
    };
    return colors[status] || 'bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-slate-200';
  };

  const getStatusLabel = (status) => {
    const labels = {
      draft: t('cra.status.draft', 'Brouillon'),
      pending_validation: t('cra.status.pending', 'En attente'),
      validated: t('cra.status.validated', 'Validé'),
      rejected: t('cra.status.rejected', 'Rejeté'),
    };
    return labels[status] || status;
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />

      <div className="relative flex flex-col flex-1 overflow-y-auto overflow-x-hidden">
        <Header />

        <main>
          <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-9xl mx-auto">

            {/* Page header */}
            <div className="sm:flex sm:justify-between sm:items-center mb-8">
              <div className="mb-4 sm:mb-0">
                <h1 className="text-2xl md:text-3xl text-slate-800 dark:text-slate-100 font-bold">
                  Comptes Rendus d'Activité
                </h1>
              </div>

              <div className="grid grid-flow-col sm:auto-cols-max justify-start sm:justify-end gap-2">
                <button
                  onClick={() => navigate(`/cra/create?month=${selectedMonth}&year=${selectedYear}`)}
                  className="btn bg-indigo-500 hover:bg-indigo-600 text-white"
                >
                  <svg className="w-4 h-4 fill-current opacity-50 shrink-0" viewBox="0 0 16 16">
                    <path d="M15 7H9V1c0-.6-.4-1-1-1S7 .4 7 1v6H1c-.6 0-1 .4-1 1s.4 1 1 1h6v6c0 .6.4 1 1 1s1-.4 1-1V9h6c.6 0 1-.4 1-1s-.4-1-1-1z" />
                  </svg>
                  <span className="ml-2">Nouveau CRA</span>
                </button>
              </div>
            </div>

            {/* Month selector */}
            <div className="flex items-center justify-between mb-6 bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700">
              <button
                onClick={handlePreviousMonth}
                className="btn bg-white dark:bg-slate-700 border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500 text-slate-600 dark:text-slate-300"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 16 16">
                  <path d="M9.4 13.4l1.4-1.4-4-4 4-4-1.4-1.4L4 8z" />
                </svg>
              </button>

              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                {monthNames[selectedMonth - 1]} {selectedYear}
              </h2>

              <button
                onClick={handleNextMonth}
                className="btn bg-white dark:bg-slate-700 border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500 text-slate-600 dark:text-slate-300"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 16 16">
                  <path d="M6.6 13.4L5.2 12l4-4-4-4 1.4-1.4L12 8z" />
                </svg>
              </button>
            </div>

            {/* Stats cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="bg-white dark:bg-slate-800 p-5 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase mb-1">
                      Total CRA
                    </div>
                    <div className="text-3xl font-bold text-slate-800 dark:text-slate-100">{stats.total_cras}</div>
                  </div>
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-indigo-500/10 dark:bg-indigo-500/20">
                    <svg className="w-6 h-6 fill-current text-indigo-500" viewBox="0 0 24 24">
                      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 p-5 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase mb-1">
                      Validés
                    </div>
                    <div className="text-3xl font-bold text-green-600 dark:text-green-400">{stats.total_validated}</div>
                  </div>
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-500/10 dark:bg-green-500/20">
                    <svg className="w-6 h-6 fill-current text-green-500 dark:text-green-400" viewBox="0 0 24 24">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 p-5 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase mb-1">
                      Total Jours
                    </div>
                    <div className="text-3xl font-bold text-slate-800 dark:text-slate-100">{stats.total_days}</div>
                  </div>
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-500/10 dark:bg-blue-500/20">
                    <svg className="w-6 h-6 fill-current text-blue-500 dark:text-blue-400" viewBox="0 0 24 24">
                      <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
                    </svg>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-800 p-5 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase mb-1">
                      Total Facturé
                    </div>
                    <div className="text-3xl font-bold text-slate-800 dark:text-slate-100">
                      {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(stats.total_amount)}
                    </div>
                  </div>
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/10 dark:bg-emerald-500/20">
                    <svg className="w-6 h-6 fill-current text-emerald-500 dark:text-emerald-400" viewBox="0 0 24 24">
                      <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/>
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* CRA List */}
            <div className="bg-white dark:bg-slate-800 shadow-sm rounded-lg border border-gray-200 dark:border-slate-700">
              <div className="p-4 border-b border-gray-200 dark:border-slate-700">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                  CRA du mois
                </h3>
              </div>

              {isLoading ? (
                <div className="p-8 text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                </div>
              ) : stats.cras.length === 0 ? (
                <EmptyState
                  title="Aucun CRA pour ce mois"
                  description="Créez votre premier compte rendu d'activité pour ce mois."
                  buttonText="Créer un CRA"
                  onButtonClick={() => navigate('/cra/create')}
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="table-auto w-full">
                    <thead className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 bg-gray-50 dark:bg-slate-900/50 border-t border-b border-gray-200 dark:border-slate-700">
                      <tr>
                        <th className="px-4 py-3 whitespace-nowrap">
                          <div className="font-semibold text-left">Client</div>
                        </th>
                        <th className="px-4 py-3 whitespace-nowrap">
                          <div className="font-semibold text-left">Projet</div>
                        </th>
                        <th className="px-4 py-3 whitespace-nowrap">
                          <div className="font-semibold text-left">Statut</div>
                        </th>
                        <th className="px-4 py-3 whitespace-nowrap">
                          <div className="font-semibold text-right">Jours</div>
                        </th>
                        <th className="px-4 py-3 whitespace-nowrap">
                          <div className="font-semibold text-right">Montant HT</div>
                        </th>
                        <th className="px-4 py-3 whitespace-nowrap">
                          <div className="font-semibold text-right">Actions</div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="text-sm divide-y divide-gray-200 dark:divide-slate-700">
                      {stats.cras.map((cra) => (
                        <tr
                          key={cra.id}
                          className="hover:bg-gray-50 dark:hover:bg-slate-700/50 cursor-pointer"
                          onClick={() => navigate(`/cra/${cra.id}`)}
                        >
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="font-medium text-slate-800 dark:text-slate-100">{cra.customer.name}</div>
                            {cra.customer.company && (
                              <div className="text-xs text-slate-500 dark:text-slate-400">{cra.customer.company}</div>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="text-slate-800 dark:text-slate-100">{cra.project?.name || '-'}</div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(cra.status)}`}>
                              {getStatusLabel(cra.status)}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right">
                            <div className="font-medium text-slate-800 dark:text-slate-100">{cra.total_days}</div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right">
                            <div className="font-medium text-slate-800 dark:text-slate-100">
                              {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: cra.currency }).format(cra.total_amount)}
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/cra/${cra.id}`);
                              }}
                              className="text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 dark:hover:text-indigo-300"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}

export default CRAMonthly;
