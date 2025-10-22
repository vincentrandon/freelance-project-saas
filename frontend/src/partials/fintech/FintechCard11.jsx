import React from 'react';
import { chartAreaGradient } from '../../charts/ChartjsConfig';
import LineChart from '../../charts/LineChart08';

// Import utilities
import { adjustColorOpacity, getCssVariable } from '../../utils/Utils';

function FintechCard11() {

  const chartData = {
    labels: [
      '12-01-2022',
      '01-01-2023',
      '02-01-2023',
      '03-01-2023',
      '04-01-2023',
      '05-01-2023',
      '06-01-2023',
      '07-01-2023',
      '08-01-2023',
      '09-01-2023',
      '10-01-2023',
      '11-01-2023',
      '12-01-2023',
      '01-01-2024',
      '02-01-2024',
      '03-01-2024',
      '04-01-2024',
      '05-01-2024',
      '06-01-2024',
      '07-01-2024',
      '08-01-2024',
      '09-01-2024',
      '10-01-2024',
      '11-01-2024',
      '12-01-2024',
      '01-01-2025',
    ],
    datasets: [
      // Line
      {
        data: [222, 222, 226, 271, 365, 365, 238, 324, 288, 206, 324, 324, 500, 409, 409, 273, 232, 273, 500, 570, 767, 808, 685, 767, 685, 685],
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
      },
    ],
  };

  return (
    <div className="flex flex-col col-span-full sm:col-span-6 xl:col-span-3 bg-white dark:bg-gray-800 shadow-xs rounded-xl">
      <div className="px-5 pt-5">
        <header>
          <h3 className="text-sm font-semibold text-gray-500 uppercase mb-1">
            <span className="text-gray-800 dark:text-gray-100">Amzn</span> - Amazon Inc.
          </h3>
          <div className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-1">$3,400.35</div>
          <div className="text-sm">
            <span className="font-medium text-green-600">+$142 (3,7%)</span> - Today
          </div>
        </header>
      </div>
      {/* Chart built with Chart.js 3 */}
      <div className="grow">
        {/* Change the height attribute to adjust the chart height */}
        <LineChart data={chartData} width={286} height={98} />
      </div>
    </div>
  );
}

export default FintechCard11;
