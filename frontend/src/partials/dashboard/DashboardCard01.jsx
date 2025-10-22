import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import LineChart from '../../charts/LineChart01';
import { chartAreaGradient } from '../../charts/ChartjsConfig';
import EditMenu from '../../components/DropdownEditMenu';

// Import utilities
import { adjustColorOpacity, getCssVariable } from '../../utils/Utils';

function DashboardCard01({ invoices = [], stats = {} }) {

  // Process invoice data for the chart
  const chartData = useMemo(() => {
    if (!invoices || invoices.length === 0) {
      return {
        labels: [],
        datasets: [{
          data: [],
          fill: true,
          backgroundColor: function(context) {
            const chart = context.chart;
            const {ctx, chartArea} = chart;
            return chartAreaGradient(ctx, chartArea, [
              { stop: 0, color: adjustColorOpacity(getCssVariable('--color-violet-500'), 0) },
              { stop: 1, color: adjustColorOpacity(getCssVariable('--color-violet-500'), 0.2) }
            ]);
          },
          borderColor: getCssVariable('--color-violet-500'),
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 3,
          pointBackgroundColor: getCssVariable('--color-violet-500'),
          pointHoverBackgroundColor: getCssVariable('--color-violet-500'),
          pointBorderWidth: 0,
          pointHoverBorderWidth: 0,
          clip: 20,
          tension: 0.2,
        }]
      };
    }

    // Group invoices by month for last 12 months
    const now = new Date();
    const monthsData = {};
    const labels = [];

    // Initialize last 12 months
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      labels.push(monthLabel);
      monthsData[monthKey] = 0;
    }

    // Aggregate paid invoices by month
    invoices.forEach(invoice => {
      if (invoice.status === 'paid' && invoice.issue_date) {
        const issueDate = new Date(invoice.issue_date);
        const monthKey = `${issueDate.getFullYear()}-${String(issueDate.getMonth() + 1).padStart(2, '0')}`;
        if (monthsData.hasOwnProperty(monthKey)) {
          monthsData[monthKey] += parseFloat(invoice.total || 0);
        }
      }
    });

    const data = Object.values(monthsData);

    return {
      labels,
      datasets: [{
        data,
        fill: true,
        backgroundColor: function(context) {
          const chart = context.chart;
          const {ctx, chartArea} = chart;
          return chartAreaGradient(ctx, chartArea, [
            { stop: 0, color: adjustColorOpacity(getCssVariable('--color-violet-500'), 0) },
            { stop: 1, color: adjustColorOpacity(getCssVariable('--color-violet-500'), 0.2) }
          ]);
        },
        borderColor: getCssVariable('--color-violet-500'),
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 3,
        pointBackgroundColor: getCssVariable('--color-violet-500'),
        pointHoverBackgroundColor: getCssVariable('--color-violet-500'),
        pointBorderWidth: 0,
        pointHoverBorderWidth: 0,
        clip: 20,
        tension: 0.2,
      }]
    };
  }, [invoices]);

  // Calculate growth percentage (current month vs previous month)
  const growthPercentage = useMemo(() => {
    if (!chartData.datasets[0].data || chartData.datasets[0].data.length < 2) return 0;
    const data = chartData.datasets[0].data;
    const currentMonth = data[data.length - 1];
    const previousMonth = data[data.length - 2];
    if (previousMonth === 0) return 0;
    return (((currentMonth - previousMonth) / previousMonth) * 100).toFixed(1);
  }, [chartData]);

  const totalRevenue = stats?.total_revenue || 0;
  const formattedRevenue = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(totalRevenue);

  return (
    <div className="flex flex-col col-span-full sm:col-span-6 xl:col-span-4 bg-white dark:bg-gray-800 shadow-xs rounded-xl">
      <div className="px-5 pt-5">
        <header className="flex justify-between items-start mb-2">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">Total Revenue</h2>
          {/* Menu button */}
          <EditMenu align="right" className="relative inline-flex">
            <li>
              <Link className="font-medium text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-200 flex py-1 px-3" to="/invoices">
                View All Invoices
              </Link>
            </li>
            <li>
              <Link className="font-medium text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-200 flex py-1 px-3" to="/invoices/create">
                Create Invoice
              </Link>
            </li>
          </EditMenu>
        </header>
        <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase mb-1">Paid Invoices</div>
        <div className="flex items-start">
          <div className="text-3xl font-bold text-gray-800 dark:text-gray-100 mr-2">{formattedRevenue}</div>
          <div className={`text-sm font-medium px-1.5 rounded-full ${
            growthPercentage >= 0
              ? 'text-green-700 bg-green-500/20'
              : 'text-red-700 bg-red-500/20'
          }`}>
            {growthPercentage >= 0 ? '+' : ''}{growthPercentage}%
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

export default DashboardCard01;
