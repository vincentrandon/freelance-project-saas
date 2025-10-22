import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import LineChart from '../../charts/LineChart01';
import { chartAreaGradient } from '../../charts/ChartjsConfig';
import EditMenu from '../../components/DropdownEditMenu';

// Import utilities
import { adjustColorOpacity, getCssVariable } from '../../utils/Utils';

function DashboardCard02({ leadStats = {} }) {

  const chartData = useMemo(() => {
    const { status_breakdown = {} } = leadStats;

    // Simple visualization: show counts for each status
    const statuses = ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost'];
    const labels = statuses.map(s => {
      const statusInfo = status_breakdown[s];
      return statusInfo?.label || s;
    });

    const data = statuses.map(s => {
      const statusInfo = status_breakdown[s];
      return statusInfo?.count || 0;
    });

    return {
      labels,
      datasets: [{
        label: 'Leads',
        data,
        fill: true,
        backgroundColor: function(context) {
          const chart = context.chart;
          const {ctx, chartArea} = chart;
          return chartAreaGradient(ctx, chartArea, [
            { stop: 0, color: adjustColorOpacity(getCssVariable('--color-sky-500'), 0) },
            { stop: 1, color: adjustColorOpacity(getCssVariable('--color-sky-500'), 0.2) }
          ]);
        },
        borderColor: getCssVariable('--color-sky-500'),
        borderWidth: 2,
        pointRadius: 3,
        pointHoverRadius: 4,
        pointBackgroundColor: getCssVariable('--color-sky-500'),
        pointHoverBackgroundColor: getCssVariable('--color-sky-500'),
        pointBorderWidth: 0,
        pointHoverBorderWidth: 0,
        clip: 20,
        tension: 0.2,
      }]
    };
  }, [leadStats]);

  const totalValue = leadStats?.total_value || 0;
  const conversionRate = leadStats?.conversion_rate || 0;
  const totalLeads = leadStats?.total_leads || 0;

  const formattedValue = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(totalValue);

  return (
    <div className="flex flex-col col-span-full sm:col-span-6 xl:col-span-4 bg-white dark:bg-gray-800 shadow-xs rounded-xl">
      <div className="px-5 pt-5">
        <header className="flex justify-between items-start mb-2">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">Leads Pipeline</h2>
          {/* Menu button */}
          <EditMenu align="right" className="relative inline-flex">
            <li>
              <Link className="font-medium text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-200 flex py-1 px-3" to="/leads">
                View All Leads
              </Link>
            </li>
            <li>
              <Link className="font-medium text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-200 flex py-1 px-3" to="/leads/create">
                Create Lead
              </Link>
            </li>
          </EditMenu>
        </header>
        <div className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase mb-1">Pipeline Value</div>
        <div className="flex items-start">
          <div className="text-3xl font-bold text-gray-800 dark:text-gray-100 mr-2">{formattedValue}</div>
          <div className="text-sm font-medium text-sky-700 px-1.5 bg-sky-500/20 rounded-full">
            {conversionRate.toFixed(1)}% conv
          </div>
        </div>
        <div className="text-xs text-gray-500 mt-1">{totalLeads} total leads</div>
      </div>
      {/* Chart built with Chart.js 3 */}
      <div className="grow max-sm:max-h-[128px] max-h-[128px]">
        {/* Change the height attribute to adjust the chart height */}
        <LineChart data={chartData} width={389} height={128} />
      </div>
    </div>
  );
}

export default DashboardCard02;
