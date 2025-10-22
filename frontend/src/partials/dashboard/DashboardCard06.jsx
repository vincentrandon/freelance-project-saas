import React, { useMemo } from 'react';
import DoughnutChart from '../../charts/DoughnutChart';
import { Link } from 'react-router-dom';

// Import utilities
import { getCssVariable } from '../../utils/Utils';

function DashboardCard06({ leadStats = {} }) {

  const chartData = useMemo(() => {
    const { source_breakdown = {} } = leadStats;

    // Extract source data
    const sources = Object.keys(source_breakdown);
    const labels = sources.map(key => source_breakdown[key]?.label || key);
    const data = sources.map(key => source_breakdown[key]?.count || 0);

    // Color palette
    const colors = [
      getCssVariable('--color-violet-500'),
      getCssVariable('--color-sky-500'),
      getCssVariable('--color-green-500'),
      getCssVariable('--color-amber-500'),
      getCssVariable('--color-red-500'),
      getCssVariable('--color-violet-800'),
    ];

    const hoverColors = [
      getCssVariable('--color-violet-600'),
      getCssVariable('--color-sky-600'),
      getCssVariable('--color-green-600'),
      getCssVariable('--color-amber-600'),
      getCssVariable('--color-red-600'),
      getCssVariable('--color-violet-900'),
    ];

    return {
      labels: labels.length > 0 ? labels : ['No data'],
      datasets: [{
        label: 'Lead Sources',
        data: data.length > 0 && data.some(d => d > 0) ? data : [1],
        backgroundColor: colors.slice(0, labels.length || 1),
        hoverBackgroundColor: hoverColors.slice(0, labels.length || 1),
        borderWidth: 0,
      }],
    };
  }, [leadStats]);

  const totalLeads = leadStats?.total_leads || 0;

  return (
    <div className="flex flex-col col-span-full sm:col-span-6 xl:col-span-4 bg-white dark:bg-gray-800 shadow-xs rounded-xl">
      <header className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60 flex justify-between items-center">
        <h2 className="font-semibold text-gray-800 dark:text-gray-100">Lead Sources</h2>
        <Link
          to="/leads"
          className="text-sm font-medium text-violet-500 hover:text-violet-600 dark:hover:text-violet-400"
        >
          View Leads →
        </Link>
      </header>
      {/* Chart built with Chart.js 3 */}
      {/* Change the height attribute to adjust the chart height */}
      <div className="px-5 py-3">
        <DoughnutChart data={chartData} width={389} height={220} />
        <div className="text-center text-xs text-gray-500 dark:text-gray-400 mt-2">
          {totalLeads} total leads
        </div>
      </div>
    </div>
  );
}

export default DashboardCard06;
