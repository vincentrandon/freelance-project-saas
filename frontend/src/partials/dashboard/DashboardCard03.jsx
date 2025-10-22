import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import LineChart from '../../charts/LineChart01';
import { chartAreaGradient } from '../../charts/ChartjsConfig';
import EditMenu from '../../components/DropdownEditMenu';

// Import utilities
import { adjustColorOpacity, getCssVariable } from '../../utils/Utils';

function DashboardCard03({ financeData = {}, transactions = [] }) {

  const chartData = useMemo(() => {
    if (!transactions || transactions.length === 0) {
      return {
        labels: [],
        datasets: [{
          data: [],
          fill: true,
          backgroundColor: function(context) {
            const chart = context.chart;
            const {ctx, chartArea} = chart;
            return chartAreaGradient(ctx, chartArea, [
              { stop: 0, color: adjustColorOpacity(getCssVariable('--color-green-500'), 0) },
              { stop: 1, color: adjustColorOpacity(getCssVariable('--color-green-500'), 0.2) }
            ]);
          },
          borderColor: getCssVariable('--color-green-500'),
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 3,
          pointBackgroundColor: getCssVariable('--color-green-500'),
          pointHoverBackgroundColor: getCssVariable('--color-green-500'),
          pointBorderWidth: 0,
          pointHoverBorderWidth: 0,
          clip: 20,
          tension: 0.2,
        }]
      };
    }

    // Calculate balance over time (last 30 days)
    const now = new Date();
    const balanceByDay = {};
    const labels = [];

    // Initialize last 30 days
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      const dayKey = date.toISOString().split('T')[0];
      const dayLabel = i === 0 ? 'Today' : i <= 6 ? date.toLocaleDateString('en-US', { weekday: 'short' }) : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      labels.push(dayLabel);
      balanceByDay[dayKey] = 0;
    }

    // Aggregate transactions by day (cumulative balance)
    let runningBalance = financeData?.total_balance || 0;
    const sortedDays = Object.keys(balanceByDay).sort().reverse();

    transactions.forEach(transaction => {
      if (transaction.date) {
        const txnDate = transaction.date.split('T')[0];
        const txnAmount = parseFloat(transaction.amount || 0);

        // Go backwards from most recent to oldest
        for (let i = 0; i < sortedDays.length; i++) {
          const day = sortedDays[i];
          if (txnDate > day) {
            // This transaction happened after this day
            balanceByDay[day] = runningBalance - txnAmount;
            runningBalance -= txnAmount;
          }
        }
      }
    });

    // Fill any remaining days with the final running balance
    sortedDays.forEach(day => {
      if (balanceByDay[day] === 0) {
        balanceByDay[day] = runningBalance;
      }
    });

    const data = Object.keys(balanceByDay).sort().map(day => balanceByDay[day]);

    return {
      labels,
      datasets: [{
        label: 'Balance',
        data,
        fill: true,
        backgroundColor: function(context) {
          const chart = context.chart;
          const {ctx, chartArea} = chart;
          return chartAreaGradient(ctx, chartArea, [
            { stop: 0, color: adjustColorOpacity(getCssVariable('--color-green-500'), 0) },
            { stop: 1, color: adjustColorOpacity(getCssVariable('--color-green-500'), 0.2) }
          ]);
        },
        borderColor: getCssVariable('--color-green-500'),
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 3,
        pointBackgroundColor: getCssVariable('--color-green-500'),
        pointHoverBackgroundColor: getCssVariable('--color-green-500'),
        pointBorderWidth: 0,
        pointHoverBorderWidth: 0,
        clip: 20,
        tension: 0.2,
      }]
    };
  }, [financeData, transactions]);

  const totalBalance = financeData?.total_balance || 0;
  const accountsCount = financeData?.accounts_count || 0;

  const formattedBalance = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(totalBalance);

  return (
    <div className="flex flex-col col-span-full sm:col-span-6 xl:col-span-4 bg-white dark:bg-gray-800 shadow-xs rounded-xl">
      <div className="px-5 pt-5">
        <header className="flex justify-between items-start mb-2">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">Bank Balance</h2>
          {/* Menu button */}
          <EditMenu align="right" className="relative inline-flex">
            <li>
              <Link className="font-medium text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-200 flex py-1 px-3" to="/finance">
                View Accounts
              </Link>
            </li>
            <li>
              <Link className="font-medium text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-200 flex py-1 px-3" to="/finance/transactions">
                View Transactions
              </Link>
            </li>
          </EditMenu>
        </header>
        <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase mb-1">Current Balance</div>
        <div className="flex items-start">
          <div className="text-3xl font-bold text-gray-800 dark:text-gray-100 mr-2">{formattedBalance}</div>
          <div className="text-sm font-medium text-gray-600 px-1.5 bg-gray-500/20 rounded-full">
            {accountsCount} {accountsCount === 1 ? 'account' : 'accounts'}
          </div>
        </div>
      </div>
      {/* Chart built with Chart.js 3 */}
      <div className="grow max-sm:max-h-[128px] xl:max-h-[128px]">
        {/* Change the height attribute to adjust the chart height */}
        <LineChart data={chartData} width={389} height={128} />
      </div>
    </div>
  );
}

export default DashboardCard03;
