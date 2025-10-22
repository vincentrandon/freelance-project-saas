import React, { useState } from 'react';
import {
  useBankAccounts,
  useTransactions,
  useFinanceDashboard,
  useReconcileTransaction,
} from '../api/hooks';
import Header from '../partials/Header';
import Sidebar from '../partials/Sidebar';
import ModalBasic from '../components/ModalBasic';

function Finance() {
  const { data: dashboard, isLoading: isDashboardLoading, error: dashboardError } = useFinanceDashboard();
  const { data: accounts = [], isLoading: isAccountsLoading, error: accountsError } = useBankAccounts();
  const { data: transactionsData = {}, isLoading: isTransactionsLoading, error: transactionsError } = useTransactions();
  const reconcileMutation = useReconcileTransaction();

  const [selectedFilter, setSelectedFilter] = useState('all');
  const [reconcileModalOpen, setReconcileModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [reconcileData, setReconcileData] = useState({
    is_reconciled: false,
    project_id: null,
  });

  const transactions = transactionsData.results || [];

  const handleReconcile = async () => {
    if (selectedTransaction) {
      try {
        await reconcileMutation.mutateAsync({
          id: selectedTransaction.id,
          data: reconcileData,
        });
        setReconcileModalOpen(false);
      } catch (err) {
        console.error('Error reconciling:', err);
      }
    }
  };

  const openReconcileModal = (transaction) => {
    setSelectedTransaction(transaction);
    setReconcileData({
      is_reconciled: transaction.is_reconciled,
      project_id: transaction.project,
    });
    setReconcileModalOpen(true);
  };

  const CATEGORY_COLORS = {
    income: 'text-green-400',
    expense: 'text-red-400',
    transfer: 'text-blue-400',
    other: 'text-gray-400',
  };

  const CATEGORY_BG = {
    income: 'bg-green-900/30',
    expense: 'bg-red-900/30',
    transfer: 'bg-blue-900/30',
    other: 'bg-gray-900/30',
  };

  // Show error state
  if (accountsError || transactionsError || dashboardError) {
    return (
      <div className="flex h-screen overflow-hidden bg-gray-900">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto">
            <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-9xl mx-auto">
              <div className="flex flex-col items-center justify-center h-64 space-y-4">
                <div className="text-red-400">
                  {accountsError?.response?.status === 401 || transactionsError?.response?.status === 401 || dashboardError?.response?.status === 401
                    ? 'Authentication failed. Please log in again.'
                    : 'Failed to load finance data. Please try again.'}
                </div>
                <button
                  onClick={() => window.location.reload()}
                  className="btn bg-violet-500 hover:bg-violet-600 text-white"
                >
                  Retry
                </button>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // Show loading state
  if (isDashboardLoading || isAccountsLoading || isTransactionsLoading) {
    return (
      <div className="flex h-screen overflow-hidden bg-gray-900">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto">
            <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-9xl mx-auto">
              <div className="flex items-center justify-center h-64">
                <div className="text-gray-400">Loading...</div>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // Ensure accounts is always an array
  const safeAccounts = Array.isArray(accounts) ? accounts : [];

  return (
    <div className="flex h-screen overflow-hidden bg-gray-900">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto">
          <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-9xl mx-auto">
            {/* Page Header */}
            <div className="mb-8">
              <h1 className="text-2xl md:text-3xl text-gray-100 font-bold">Finances</h1>
            </div>

            {/* Dashboard Stats */}
            {dashboard && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg p-6 border border-gray-700">
                  <p className="text-gray-400 text-sm mb-2">Total Balance</p>
                  <p className="text-3xl font-bold text-gray-100">
                    ${dashboard.total_balance.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">{dashboard.accounts_count} accounts connected</p>
                </div>

                <div className="bg-gradient-to-br from-green-900/20 to-gray-900 rounded-lg p-6 border border-green-900/50">
                  <p className="text-gray-400 text-sm mb-2">Total Income</p>
                  <p className="text-3xl font-bold text-green-400">
                    ${dashboard.total_income.toLocaleString()}
                  </p>
                </div>

                <div className="bg-gradient-to-br from-red-900/20 to-gray-900 rounded-lg p-6 border border-red-900/50">
                  <p className="text-gray-400 text-sm mb-2">Total Expenses</p>
                  <p className="text-3xl font-bold text-red-400">
                    ${dashboard.total_expense.toLocaleString()}
                  </p>
                </div>

                <div className="bg-gradient-to-br from-blue-900/20 to-gray-900 rounded-lg p-6 border border-blue-900/50">
                  <p className="text-gray-400 text-sm mb-2">Unreconciled</p>
                  <p className="text-3xl font-bold text-blue-400">
                    {dashboard.unreconciled_transactions}
                  </p>
                </div>
              </div>
            )}

            {/* Bank Accounts */}
            <div className="mb-8">
              <h2 className="text-xl font-bold text-gray-100 mb-4">Bank Accounts</h2>
              {safeAccounts.length === 0 ? (
                <div className="bg-gray-800 rounded-lg p-8 text-center border border-gray-700">
                  <p className="text-gray-400">No bank accounts connected yet</p>
                  <button className="btn btn-sm bg-violet-600 hover:bg-violet-700 text-white mt-4">
                    Connect Bank Account
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {safeAccounts.map((account) => (
                    <div key={account.id} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-semibold text-gray-100">{account.account_name}</h3>
                          <p className="text-sm text-gray-400">{account.bank_name}</p>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            account.is_active
                              ? 'bg-green-900/50 text-green-400'
                              : 'bg-red-900/50 text-red-400'
                          }`}
                        >
                          {account.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <p className="text-2xl font-bold text-gray-100 mb-2">${account.balance.toLocaleString()}</p>
                      <div className="flex justify-between items-center">
                        <p className="text-xs text-gray-500">
                          •••• {account.account_number_masked}
                        </p>
                        {account.last_synced && (
                          <p className="text-xs text-gray-500">
                            Synced: {new Date(account.last_synced).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Transactions */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-100">Recent Transactions</h2>
                <select
                  value={selectedFilter}
                  onChange={(e) => setSelectedFilter(e.target.value)}
                  className="form-select bg-gray-800 text-gray-100 border-gray-700 text-sm"
                >
                  <option value="all">All</option>
                  <option value="income">Income</option>
                  <option value="expense">Expense</option>
                  <option value="unreconciled">Unreconciled</option>
                </select>
              </div>

              <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-900 border-b border-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Description</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Category</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase">Amount</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-300 uppercase">Status</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-300 uppercase">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {transactions.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="px-6 py-8 text-center text-gray-400">
                          No transactions yet
                        </td>
                      </tr>
                    ) : (
                      transactions.map((transaction) => (
                        <tr key={transaction.id} className="hover:bg-gray-700/50">
                          <td className="px-6 py-4 text-sm text-gray-300">
                            {new Date(transaction.date).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <div className="text-gray-100">{transaction.description}</div>
                            <div className="text-xs text-gray-500">{transaction.counterparty_name}</div>
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-medium ${
                                CATEGORY_BG[transaction.category]
                              } ${CATEGORY_COLORS[transaction.category]}`}
                            >
                              {transaction.category}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-right font-semibold">
                            <span className={transaction.amount > 0 ? 'text-green-400' : 'text-red-400'}>
                              {transaction.amount > 0 ? '+' : '-'}${Math.abs(transaction.amount).toLocaleString()}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center text-sm">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-medium ${
                                transaction.is_reconciled
                                  ? 'bg-green-900/30 text-green-400'
                                  : 'bg-yellow-900/30 text-yellow-400'
                              }`}
                            >
                              {transaction.is_reconciled ? 'Reconciled' : 'Pending'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <button
                              onClick={() => openReconcileModal(transaction)}
                              className="text-violet-400 hover:text-violet-300 text-sm"
                            >
                              Reconcile
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Reconcile Modal */}
      <ModalBasic
        isOpen={reconcileModalOpen}
        setIsOpen={setReconcileModalOpen}
        title="Reconcile Transaction"
      >
        <div className="space-y-4">
          {selectedTransaction && (
            <>
              <div>
                <p className="text-sm text-gray-400">Description</p>
                <p className="text-lg font-semibold text-gray-100">{selectedTransaction.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-400">Amount</p>
                  <p className="text-lg font-semibold text-gray-100">
                    ${selectedTransaction.amount.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Date</p>
                  <p className="text-lg font-semibold text-gray-100">
                    {new Date(selectedTransaction.date).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={reconcileData.is_reconciled}
                    onChange={(e) =>
                      setReconcileData({ ...reconcileData, is_reconciled: e.target.checked })
                    }
                    className="form-checkbox bg-gray-700 border-gray-600"
                  />
                  <span className="text-gray-300">Mark as Reconciled</span>
                </label>
              </div>
            </>
          )}

          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={() => setReconcileModalOpen(false)}
              className="btn bg-gray-700 hover:bg-gray-600 text-gray-100"
            >
              Cancel
            </button>
            <button
              onClick={handleReconcile}
              disabled={reconcileMutation.isPending}
              className="btn bg-violet-500 hover:bg-violet-600 text-white disabled:opacity-50"
            >
              {reconcileMutation.isPending ? 'Updating...' : 'Save'}
            </button>
          </div>
        </div>
      </ModalBasic>
    </div>
  );
}

export default Finance;
