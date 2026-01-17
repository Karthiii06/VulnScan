import React from 'react';
import { FiTarget, FiPlay, FiAlertTriangle, FiBarChart2, FiStar, FiTrendingUp } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { QuickStats as QuickStatsType } from '../../types';

interface QuickStatsProps {
  stats?: QuickStatsType;
}

const QuickStats: React.FC<QuickStatsProps> = ({ stats }) => {
  const statCards = [
    {
      title: 'Scans Today',
      value: stats?.todayScans || 0,
      icon: <FiTarget className="text-blue-600" size={24} />,
      color: 'bg-blue-50 dark:bg-blue-900/20',
      textColor: 'text-blue-600 dark:text-blue-400',
      link: '/scan/new',
      linkText: 'Start New'
    },
    {
      title: 'Running Scans',
      value: stats?.runningScans || 0,
      icon: <FiPlay className="text-green-600" size={24} />,
      color: 'bg-green-50 dark:bg-green-900/20',
      textColor: 'text-green-600 dark:text-green-400',
      link: '/dashboard',
      linkText: 'View Live'
    },
    {
      title: 'Total Vulnerabilities',
      value: stats?.totalVulnerabilities || 0,
      icon: <FiAlertTriangle className="text-red-600" size={24} />,
      color: 'bg-red-50 dark:bg-red-900/20',
      textColor: 'text-red-600 dark:text-red-400',
      link: '/reports',
      linkText: 'View All'
    },
    {
      title: 'Critical Issues',
      value: stats?.criticalVulnerabilities || 0,
      icon: <FiBarChart2 className="text-purple-600" size={24} />,
      color: 'bg-purple-50 dark:bg-purple-900/20',
      textColor: 'text-purple-600 dark:text-purple-400',
      link: '/reports',
      linkText: 'Prioritize'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statCards.map((stat, index) => (
        <div key={index} className="card group hover:shadow-lg transition-shadow duration-300">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                {stat.title}
              </p>
              <p className={`text-3xl font-bold ${stat.textColor}`}>
                {stat.value.toLocaleString()}
              </p>
            </div>
            <div className={`p-3 rounded-lg ${stat.color}`}>
              {stat.icon}
            </div>
          </div>
          
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <Link
              to={stat.link}
              className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              {stat.linkText} →
            </Link>
            
            {/* Trend indicator (mock data) */}
            <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
              <FiTrendingUp className="mr-1" size={12} />
              <span>0%</span>
            </div>
          </div>
        </div>
      ))}
      
      {/* Most Scanned IP Card */}
      <div className="lg:col-span-4 card">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Most Scanned Target
            </h3>
            {stats?.mostScannedIP ? (
              <>
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                    <FiStar className="text-indigo-600 dark:text-indigo-400" size={20} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white font-mono">
                      {stats.mostScannedIP}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Scanned {stats.mostScannedCount} times
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                  <FiStar className="text-gray-400" size={20} />
                </div>
                <div>
                  <p className="text-lg font-medium text-gray-500 dark:text-gray-400">
                    No scan history yet
                  </p>
                  <p className="text-sm text-gray-400 dark:text-gray-500">
                    Start scanning to see statistics
                  </p>
                </div>
              </div>
            )}
          </div>
          
          <div className="text-right">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Scan Efficiency</p>
            <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
              <FiTrendingUp className="mr-1" size={14} />
              98.5%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickStats;