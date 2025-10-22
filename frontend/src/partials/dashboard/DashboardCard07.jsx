import React from 'react';
import { Link } from 'react-router-dom';

function DashboardCard07({ invoices = [] }) {

  const getStatusBadge = (status) => {
    const badges = {
      paid: 'text-green-700 bg-green-500/20',
      sent: 'text-sky-700 bg-sky-500/20',
      draft: 'text-gray-700 bg-gray-500/20',
      overdue: 'text-red-700 bg-red-500/20',
      pending: 'text-amber-700 bg-amber-500/20',
    };
    return badges[status] || 'text-gray-700 bg-gray-500/20';
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="col-span-full xl:col-span-8 bg-white dark:bg-gray-800 shadow-xs rounded-xl">
      <header className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60 flex justify-between items-center">
        <h2 className="font-semibold text-gray-800 dark:text-gray-100">Recent Invoices</h2>
        <Link
          to="/invoices"
          className="text-sm font-medium text-violet-500 hover:text-violet-600 dark:hover:text-violet-400"
        >
          View All →
        </Link>
      </header>
      <div className="p-3">
        {/* Table */}
        <div className="overflow-x-auto">
          <table className="table-auto w-full dark:text-gray-300">
            {/* Table header */}
            <thead className="text-xs uppercase text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700/50 rounded-xs">
              <tr>
                <th className="p-2">
                  <div className="font-semibold text-left">Invoice Number</div>
                </th>
                <th className="p-2">
                  <div className="font-semibold text-left">Customer</div>
                </th>
                <th className="p-2">
                  <div className="font-semibold text-center">Date</div>
                </th>
                <th className="p-2">
                  <div className="font-semibold text-center">Amount</div>
                </th>
                <th className="p-2">
                  <div className="font-semibold text-center">Status</div>
                </th>
              </tr>
            </thead>
            {/* Table body */}
            <tbody className="text-sm font-medium divide-y divide-gray-100 dark:divide-gray-700/60">
              {invoices && invoices.length > 0 ? (
                invoices.slice(0, 5).map((invoice) => (
                  <tr key={invoice.id}>
                    <td className="p-2">
                      <Link
                        to={`/invoices/${invoice.id}`}
                        className="text-violet-500 hover:text-violet-600 dark:hover:text-violet-400"
                      >
                        {invoice.invoice_number}
                      </Link>
                    </td>
                    <td className="p-2">
                      <div className="text-gray-800 dark:text-gray-100">
                        {invoice.customer?.name || invoice.customer_name || '-'}
                      </div>
                    </td>
                    <td className="p-2">
                      <div className="text-center text-gray-600 dark:text-gray-400">
                        {formatDate(invoice.issue_date)}
                      </div>
                    </td>
                    <td className="p-2">
                      <div className="text-center text-gray-800 dark:text-gray-100 font-semibold">
                        {formatCurrency(invoice.total)}
                      </div>
                    </td>
                    <td className="p-2">
                      <div className="text-center">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(invoice.status)}`}>
                          {invoice.status}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="p-4 text-center text-gray-500 dark:text-gray-400">
                    No invoices yet. <Link to="/invoices/create" className="text-violet-500 hover:text-violet-600">Create your first invoice</Link>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default DashboardCard07;
