import React from 'react';
import PolarChart from '../../charts/PolarChart';

// Import utilities
import { adjustColorOpacity, getCssVariable } from '../../utils/Utils';

function AnalyticsCard10() {

  const chartData = {
    labels: ['Males', 'Females', 'Unknown'],
    datasets: [
      {
        label: 'Sessions By Gender',
        data: [
          500, 326, 242,
        ],
        backgroundColor: [
          adjustColorOpacity(getCssVariable('--color-violet-500'), 0.8),
          adjustColorOpacity(getCssVariable('--color-sky-500'), 0.8),
          adjustColorOpacity(getCssVariable('--color-green-500'), 0.8),
        ],
        hoverBackgroundColor: [
          adjustColorOpacity(getCssVariable('--color-violet-600'), 0.8),
          adjustColorOpacity(getCssVariable('--color-sky-600'), 0.8),
          adjustColorOpacity(getCssVariable('--color-green-600'), 0.8),
        ],
        borderWidth: 0,
      },
    ],
  };

  return (
    <div className="flex flex-col col-span-full sm:col-span-6 xl:col-span-4 bg-white dark:bg-gray-800 shadow-xs rounded-xl">
      <header className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60">
        <h2 className="font-semibold text-gray-800 dark:text-gray-100">Sessions By Gender</h2>
      </header>
      {/* Chart built with Chart.js 3 */}
      {/* Change the height attribute to adjust the chart height */}
      <PolarChart data={chartData} width={389} height={260} />
    </div>
  );
}

export default AnalyticsCard10;
