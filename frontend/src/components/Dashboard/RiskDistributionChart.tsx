import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { severityColors } from '../../utils/api';

interface RiskDistributionData {
  critical: number;
  high: number;
  medium: number;
  low: number;
}

interface RiskDistributionChartProps {
  data?: RiskDistributionData;
}

const RiskDistributionChart: React.FC<RiskDistributionChartProps> = ({ data }) => {
  const chartData = [
    { name: 'Critical', value: data?.critical || 0, color: severityColors.critical.bg },
    { name: 'High', value: data?.high || 0, color: severityColors.high.bg },
    { name: 'Medium', value: data?.medium || 0, color: severityColors.medium.bg },
    { name: 'Low', value: data?.low || 0, color: severityColors.low.bg },
  ].filter(item => item.value > 0);

  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const percentage = total > 0 ? ((data.value / total) * 100).toFixed(1) : '0';
      
      return (
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <p className="font-semibold" style={{ color: data.color }}>
            {data.name}
          </p>
          <p className="text-gray-700 dark:text-gray-300">
            {data.value} vulnerabilities
          </p>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            {percentage}% of total
          </p>
        </div>
      );
    }
    return null;
  };

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-80">
        <div className="text-center">
          <div className="text-4xl mb-4">📊</div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No vulnerabilities detected
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Run a scan to see vulnerability distribution
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-80">
      <div className="flex h-full">
        {/* Pie Chart - Left side */}
        <div className="flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={70}
                paddingAngle={2}
                dataKey="value"
                label={false} // No labels inside pie
                labelLine={false}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        {/* Percentage Legend - Right side */}
        <div className="w-48 flex flex-col justify-center space-y-4 pl-6 border-l border-gray-200 dark:border-gray-700">
          {chartData.map((item, index) => {
            const percentage = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0';
            return (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div 
                    className="w-4 h-4 rounded-full mr-3" 
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {item.name}
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {item.value}
                  </span>
                  <span className="text-sm font-bold text-gray-700 dark:text-gray-300 min-w-[45px] text-right">
                    {percentage}%
                  </span>
                </div>
              </div>
            );
          })}
          
          {/* Total Row */}
          <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                Total
              </span>
              <span className="text-sm font-bold text-gray-900 dark:text-white">
                {total}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RiskDistributionChart;