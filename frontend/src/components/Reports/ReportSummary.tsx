import React from 'react';
import { FiAlertTriangle, FiTrendingUp, FiCheckCircle, FiBarChart2 } from 'react-icons/fi';

interface ReportSummaryProps {
  summary: {
    total_vulnerabilities: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

const ReportSummary: React.FC<ReportSummaryProps> = ({ summary }) => {
  const total = summary.total_vulnerabilities;
  
  const severityCards = [
    {
      title: 'Critical',
      value: summary.critical,
      color: 'bg-red-500',
      textColor: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-50 dark:bg-red-900/20',
      icon: <FiAlertTriangle className="text-red-600" />,
      percentage: total > 0 ? (summary.critical / total * 100).toFixed(1) : '0'
    },
    {
      title: 'High',
      value: summary.high,
      color: 'bg-orange-500',
      textColor: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20',
      icon: <FiTrendingUp className="text-orange-600" />,
      percentage: total > 0 ? (summary.high / total * 100).toFixed(1) : '0'
    },
    {
      title: 'Medium',
      value: summary.medium,
      color: 'bg-yellow-500',
      textColor: 'text-yellow-600 dark:text-yellow-400',
      bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
      icon: <FiBarChart2 className="text-yellow-600" />,
      percentage: total > 0 ? (summary.medium / total * 100).toFixed(1) : '0'
    },
    {
      title: 'Low',
      value: summary.low,
      color: 'bg-blue-500',
      textColor: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      icon: <FiCheckCircle className="text-blue-600" />,
      percentage: total > 0 ? (summary.low / total * 100).toFixed(1) : '0'
    }
  ];

  const riskScore = calculateRiskScore(summary);
  const riskLevel = getRiskLevel(riskScore);

  return (
    <div className="card">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Executive Summary</h2>
      
      {/* Risk Score */}
      <div className="mb-8 p-6 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Overall Risk Score</h3>
            <p className="text-gray-600 dark:text-gray-400">Based on vulnerability severity and count</p>
          </div>
          <div className={`text-4xl font-bold ${riskLevel.color}`}>
            {riskScore}/100
          </div>
        </div>
        
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
            <span>Low Risk</span>
            <span>High Risk</span>
          </div>
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-1000 ${riskLevel.color.replace('text-', 'bg-')}`}
              style={{ width: `${riskScore}%` }}
            />
          </div>
        </div>
        
        <div className="flex items-center">
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${riskLevel.bgColor} ${riskLevel.textColor}`}>
            {riskLevel.label}
          </div>
          <p className="ml-3 text-sm text-gray-600 dark:text-gray-400">
            {riskLevel.description}
          </p>
        </div>
      </div>

      {/* Vulnerability Breakdown */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Vulnerability Breakdown</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {severityCards.map((card, index) => (
            <div key={index} className={`p-4 rounded-lg ${card.bgColor}`}>
              <div className="flex items-center justify-between mb-3">
                <div className={`p-2 rounded-lg ${card.bgColor.replace('50', '100').replace('900/20', '900/30')}`}>
                  {card.icon}
                </div>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {card.percentage}%
                </span>
              </div>
              <div className={`text-3xl font-bold mb-1 ${card.textColor}`}>
                {card.value}
              </div>
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {card.title} Severity
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Total Vulnerabilities */}
      <div className="p-6 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Total Vulnerabilities</h3>
            <p className="text-gray-600 dark:text-gray-400">All severity levels combined</p>
          </div>
          <div className="text-4xl font-bold text-gray-900 dark:text-white">
            {total}
          </div>
        </div>
        
        {/* Severity Distribution Bar */}
        <div className="mt-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden flex">
            {total > 0 && severityCards.map((card, index) => (
              card.value > 0 && (
                <div
                  key={index}
                  className={`h-full ${card.color}`}
                  style={{ width: `${(card.value / total) * 100}%` }}
                  title={`${card.title}: ${card.value} (${card.percentage}%)`}
                />
              )
            ))}
          </div>
          
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2">
            {severityCards.map((card, index) => (
              <div key={index} className="text-center">
                <div className="flex items-center justify-center">
                  <div className={`h-3 w-3 rounded-full ${card.color} mr-1`}></div>
                  <span>{card.title}</span>
                </div>
                <div>{card.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Key Insights */}
      <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <h3 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">Key Insights</h3>
        <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
          {summary.critical > 0 && (
            <li>• {summary.critical} critical vulnerabilities require immediate attention</li>
          )}
          {summary.high > 0 && (
            <li>• {summary.high} high severity issues should be addressed within 7 days</li>
          )}
          {summary.total_vulnerabilities === 0 && (
            <li>• No vulnerabilities detected - target appears secure</li>
          )}
          {summary.critical === 0 && summary.high === 0 && summary.total_vulnerabilities > 0 && (
            <li>• No critical or high severity issues found</li>
          )}
          <li>• Consider implementing the recommended remediation steps below</li>
        </ul>
      </div>
    </div>
  );
};

// Helper functions
function calculateRiskScore(summary: ReportSummaryProps['summary']): number {
  const weights = {
    critical: 10,
    high: 6,
    medium: 3,
    low: 1
  };

  const totalWeightedScore = 
    summary.critical * weights.critical +
    summary.high * weights.high +
    summary.medium * weights.medium +
    summary.low * weights.low;

  // Normalize to 0-100 scale (max score is when all 50 ports have critical vulnerabilities = 500)
  const maxPossibleScore = 50 * weights.critical;
  const normalizedScore = Math.min((totalWeightedScore / maxPossibleScore) * 100, 100);
  
  return Math.round(normalizedScore);
}

function getRiskLevel(score: number) {
  if (score >= 75) {
    return {
      label: 'CRITICAL',
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-100 dark:bg-red-900',
      textColor: 'text-red-800 dark:text-red-200',  // Added this
      description: 'Immediate action required'
    };
  } else if (score >= 50) {
    return {
      label: 'HIGH',
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-100 dark:bg-orange-900',
      textColor: 'text-orange-800 dark:text-orange-200',  // Added this
      description: 'Address within 7 days'
    };
  } else if (score >= 25) {
    return {
      label: 'MEDIUM',
      color: 'text-yellow-600 dark:text-yellow-400',
      bgColor: 'bg-yellow-100 dark:bg-yellow-900',
      textColor: 'text-yellow-800 dark:text-yellow-200',  // Added this
      description: 'Address within 30 days'
    };
  } else if (score > 0) {
    return {
      label: 'LOW',
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-100 dark:bg-blue-900',
      textColor: 'text-blue-800 dark:text-blue-200',  // Added this
      description: 'Address during maintenance'
    };
  } else {
    return {
      label: 'SECURE',
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-100 dark:bg-green-900',
      textColor: 'text-green-800 dark:text-green-200',  // Added this
      description: 'No significant issues found'
    };
  }
}

export default ReportSummary;