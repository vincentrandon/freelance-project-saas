import React from 'react';
import { Link } from 'react-router-dom';

function DashboardCard11({ transactions = [] }) {

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Math.abs(amount) || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    }
  };

  // Group transactions by date
  const groupedTransactions = React.useMemo(() => {
    if (!transactions || transactions.length === 0) return {};

    const grouped = {};
    transactions.slice(0, 10).forEach((transaction) => {
      const dateLabel = formatDate(transaction.date);
      if (!grouped[dateLabel]) {
        grouped[dateLabel] = [];
      }
      grouped[dateLabel].push(transaction);
    });

    return grouped;
  }, [transactions]);

  return (
    <div className="col-span-full xl:col-span-6 bg-white dark:bg-gray-800 shadow-xs rounded-xl">
      <header className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60 flex justify-between items-center">
        <h2 className="font-semibold text-gray-800 dark:text-gray-100">Income/Expenses</h2>
        <Link
          to="/finance"
          className="text-sm font-medium text-violet-500 hover:text-violet-600 dark:hover:text-violet-400"
        >
          View All →
        </Link>
      </header>
      <div className="p-3">

        {/* Card content */}
        {Object.keys(groupedTransactions).length > 0 ? (
          Object.entries(groupedTransactions).map(([dateLabel, txns]) => (
            <div key={dateLabel}>
              <header className="text-xs uppercase text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700/50 rounded-xs font-semibold p-2">
                {dateLabel}
              </header>
              <ul className="my-1">
                {txns.map((transaction) => {
                  const isIncome = transaction.category === 'income' || parseFloat(transaction.amount) > 0;
                  const amount = parseFloat(transaction.amount);

                  return (
                    <li key={transaction.id} className="flex px-2">
                      <div className={`w-9 h-9 rounded-full shrink-0 my-2 mr-3 ${
                        isIncome ? 'bg-green-500' : 'bg-red-500'
                      }`}>
                        <svg className="w-9 h-9 fill-current text-white" viewBox="0 0 36 36">
                          {isIncome ? (
                            <path d="M18.3 11.3l-1.4 1.4 4.3 4.3H11v2h10.2l-4.3 4.3 1.4 1.4L25 18z" />
                          ) : (
                            <path d="M17.7 24.7l1.4-1.4-4.3-4.3H25v-2H14.8l4.3-4.3-1.4-1.4L11 18z" />
                          )}
                        </svg>
                      </div>
                      <div className="grow flex items-center border-b border-gray-100 dark:border-gray-700/60 text-sm py-2">
                        <div className="grow flex justify-between">
                          <div className="self-center">
                            <div className="font-medium text-gray-800 dark:text-gray-100">
                              {transaction.description || transaction.counterparty_name || 'Transaction'}
                            </div>
                            {transaction.bank_account && (
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {transaction.bank_account.name || transaction.bank_account.account_name}
                              </div>
                            )}
                          </div>
                          <div className="shrink-0 self-start ml-2">
                            <span className={`font-medium ${
                              isIncome ? 'text-green-600' : 'text-gray-800 dark:text-gray-100'
                            }`}>
                              {isIncome ? '+' : '-'}{formatCurrency(amount)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))
        ) : (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
            No transactions yet. <Link to="/finance" className="text-violet-500 hover:text-violet-600">Add a bank account</Link>
          </div>
        )}

      </div>
    </div>
  );
}

export default DashboardCard11;
