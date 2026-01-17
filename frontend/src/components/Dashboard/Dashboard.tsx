import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  FiActivity, 
  FiCheckCircle, 
  FiAlertTriangle, 
  FiClock, 
  FiTrendingUp,
  FiRefreshCw,
  FiWifi,
  FiWifiOff
} from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import RiskDistributionChart from './RiskDistributionChart';
import RecentScansTable from './RecentScansTable';
import QuickStats from './QuickStats';
import { apiService } from '../../utils/api';
import { DashboardMetrics } from '../../types';
import { useDashboardWebSocket } from '../../hooks/useWebSocket';

const Dashboard: React.FC = () => {
  const { data: metrics, isLoading, error, refetch: refetchMetrics } = useQuery<DashboardMetrics>({
    queryKey: ['dashboardMetrics'],
    queryFn: apiService.getDashboardMetrics,
    refetchInterval: 5000, // Refresh every 5 seconds
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 3000,
  });

  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ['quickStats'],
    queryFn: apiService.getQuickStats,
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    staleTime: 3000,
  });

  // Connect to dashboard WebSocket
  const { isConnected: wsConnected, lastMessage: wsMessage } = useDashboardWebSocket();

  // Listen for WebSocket updates
  useEffect(() => {
    if (wsMessage) {
      console.log('Dashboard received WebSocket message:', wsMessage);
      
      if (wsMessage.type === 'dashboard_update' || wsMessage.type === 'scan_completed') {
        // Refresh dashboard data
        refetchMetrics();
        refetchStats();
        
        // Show notification for scan completion
        if (wsMessage.type === 'scan_completed') {
          toast.success(`Scan completed! Dashboard updated.`, {
            icon: '🔄',
          });
        }
      }
    }
  }, [wsMessage, refetchMetrics, refetchStats]);

  // Manual refresh function
  const handleManualRefresh = () => {
    refetchMetrics();
    refetchStats();
    toast.success('Dashboard refreshed manually');
  };

  // Auto-refresh when window regains focus
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        refetchMetrics();
        refetchStats();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refetchMetrics, refetchStats]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            <div className="h-4 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mt-2"></div>
          </div>
          <div className="h-10 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
        </div>
        
        {/* Quick Stats Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card h-32 animate-pulse">
              <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
              <div className="h-10 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 card h-96 animate-pulse"></div>
          <div className="card h-96 animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card text-center p-12">
        <FiAlertTriangle className="mx-auto text-red-500" size={48} />
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-4">
          Failed to load dashboard
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Please check your connection and try again.
        </p>
        <button
          onClick={handleManualRefresh}
          className="mt-4 inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <FiRefreshCw className="mr-2" />
          Refresh Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with connection status */}
      <div className="flex flex-col md:flex-row md:items-center justify-between">
        <div>
          <div className="flex items-center space-x-3">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
            <div className={`flex items-center px-3 py-1 rounded-full text-sm ${
              wsConnected 
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
            }`}>
              {wsConnected ? <FiWifi className="mr-1" /> : <FiWifiOff className="mr-1" />}
              <span>{wsConnected ? 'Live' : 'Offline'}</span>
            </div>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Real-time overview of your security scans and vulnerabilities
            {wsConnected && (
              <span className="ml-2 text-xs text-green-600 dark:text-green-400 animate-pulse">
                • Auto-updating
              </span>
            )}
          </p>
        </div>
        <div className="flex space-x-3 mt-4 md:mt-0">
          <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
            <FiClock className="mr-1" size={14} />
            Auto-refresh: 5s
          </div>
          <button
            onClick={handleManualRefresh}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <FiRefreshCw className="mr-2" />
            Refresh Now
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <QuickStats stats={stats} />

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Risk Distribution */}
        <div className="lg:col-span-2">
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Risk Distribution
                </h2>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Severity breakdown of detected vulnerabilities
                </p>
              </div>
              <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                <FiTrendingUp />
                <span className="text-sm">
                  {wsConnected ? 'Live updates' : 'Manual refresh'}
                </span>
              </div>
            </div>
            <RiskDistributionChart data={metrics?.riskDistribution} />
          </div>
        </div>

        {/* Recent Activity Sidebar */}
        <div className="space-y-6">
          {/* Total Scans Card */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">Total Scans</h3>
              <FiActivity className="text-blue-600" size={20} />
            </div>
            <div className="text-4xl font-bold text-gray-900 dark:text-white">
              {metrics?.totalScans || 0}
            </div>
            <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              {metrics?.completedScans || 0} completed
            </div>
          </div>

          {/* Last Scan Card */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">Last Scan</h3>
              <FiClock className="text-green-600" size={20} />
            </div>
            {metrics?.lastScan?.timestamp ? (
              <>
                <div className="text-lg font-semibold text-gray-900 dark:text-white">
                  {metrics.lastScan.target || 'Unknown'}
                </div>
                <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                  {new Date(metrics.lastScan.timestamp).toLocaleString()}
                </div>
                <div className="mt-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    metrics.lastScan.status === 'completed' 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : metrics.lastScan.status === 'running'
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                      : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                  }`}>
                    {metrics.lastScan.status || 'Unknown'}
                  </span>
                </div>
              </>
            ) : (
              <div className="text-gray-500 dark:text-gray-400 italic">No scans yet</div>
            )}
          </div>

          {/* Connection Status Card */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">Connection</h3>
              {wsConnected ? (
                <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
              ) : (
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              )}
            </div>
            <div className={`text-lg font-semibold ${
              wsConnected 
                ? 'text-green-600 dark:text-green-400'
                : 'text-yellow-600 dark:text-yellow-400'
            }`}>
              {wsConnected ? 'Connected' : 'Disconnected'}
            </div>
            <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              {wsConnected 
                ? 'Receiving real-time updates'
                : 'Using manual refresh'
              }
            </div>
          </div>
        </div>
      </div>

      {/* Recent Scans Table */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Recent Scans
          </h2>
          <div className="flex items-center space-x-3">
            {wsMessage?.type === 'scan_completed' && (
              <span className="text-xs text-green-600 dark:text-green-400 animate-pulse">
                New scan completed!
              </span>
            )}
            <button
              onClick={handleManualRefresh}
              className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Refresh table
            </button>
          </div>
        </div>
        <RecentScansTable scans={metrics?.recentScans} />
      </div>
    </div>
  );
};

export default Dashboard;