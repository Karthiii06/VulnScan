import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { 
  FiActivity, 
  FiX, 
  FiCheck, 
  FiAlertCircle, 
  FiBarChart2,
  FiClock,
  FiTarget,
  FiDownload
} from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { apiService } from '../../utils/api';
import { useWebSocket } from '../../hooks/useWebSocket';
import ScanProgress from './ScanProgress';
import ScanPhases from './ScanPhases';

const LiveScan: React.FC = () => {
  const { scanId } = useParams<{ scanId: string }>();
  const navigate = useNavigate();
  const [scanResult, setScanResult] = useState<any>(null);
  
  const { data: scanStatus, refetch: refetchStatus } = useQuery({
    queryKey: ['scanStatus', scanId],
    queryFn: () => apiService.getScanStatus(scanId!),
    enabled: !!scanId,
    refetchInterval: 5000, // Poll every 5 seconds
  });

  const abortMutation = useMutation({
    mutationFn: () => apiService.abortScan(scanId!),
    onSuccess: () => {
      toast.success('Scan aborted successfully');
      setTimeout(() => navigate('/dashboard'), 2000);
    },
    onError: () => {
      toast.error('Failed to abort scan');
    },
  });

  const { lastMessage, isConnected } = useWebSocket(scanId || '');

  useEffect(() => {
    if (lastMessage) {
      if (lastMessage.status === 'completed' && lastMessage.result) {
        setScanResult(lastMessage.result);
        toast.success('Scan completed successfully!');
        setTimeout(() => navigate(`/reports/${scanId}`), 3000);
      } else if (lastMessage.status === 'aborted') {
        toast.success('Scan was aborted');
        setTimeout(() => navigate('/dashboard'), 2000);
      } else if (lastMessage.status === 'failed') {
        toast.error(lastMessage.message || 'Scan failed');
      }
    }
  }, [lastMessage, navigate, scanId]);

  const handleAbort = () => {
    if (window.confirm('Are you sure you want to abort this scan?')) {
      abortMutation.mutate();
    }
  };

  const handleViewReport = () => {
    navigate(`/reports/${scanId}`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'text-blue-500';
      case 'completed': return 'text-green-500';
      case 'failed': return 'text-red-500';
      case 'aborted': return 'text-yellow-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return <FiActivity className="animate-pulse" />;
      case 'completed': return <FiCheck />;
      case 'failed': return <FiAlertCircle />;
      case 'aborted': return <FiX />;
      default: return <FiClock />;
    }
  };

  if (!scanId) {
    navigate('/dashboard');
    return null;
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Live Scan</h1>
            <div className="flex items-center space-x-4 mt-2">
              <div className="flex items-center">
                <FiTarget className="text-gray-400 mr-2" />
                <span className="text-gray-600 dark:text-gray-400 font-mono">
                  {scanStatus?.target_ip || 'Loading...'}
                </span>
              </div>
              <div className="flex items-center">
                <div className={`flex items-center ${getStatusColor(scanStatus?.status || 'pending')}`}>
                  {getStatusIcon(scanStatus?.status || 'pending')}
                  <span className="ml-2 font-medium capitalize">
                    {scanStatus?.status || 'Loading...'}
                  </span>
                </div>
              </div>
              <div className="flex items-center">
                <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                  {isConnected ? 'Live connected' : 'Connecting...'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex space-x-3">
            {scanStatus?.status === 'completed' && (
              <button
                onClick={handleViewReport}
                className="btn-primary flex items-center"
              >
                <FiBarChart2 className="mr-2" />
                View Report
              </button>
            )}
            
            {(scanStatus?.status === 'running' || scanStatus?.status === 'pending') && (
              <button
                onClick={handleAbort}
                disabled={abortMutation.isPending}
                className="btn-danger flex items-center"
              >
                <FiX className="mr-2" />
                {abortMutation.isPending ? 'Aborting...' : 'Abort Scan'}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content - Progress and Phases */}
        <div className="lg:col-span-2 space-y-8">
          {/* Progress Visualization */}
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
              Scan Progress
            </h2>
            <ScanProgress 
              status={scanStatus?.status}
              message={lastMessage?.message}
              progress={lastMessage?.progress}
              phase={lastMessage?.phase}
            />
          </div>

          {/* Scan Phases */}
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
              Scan Phases
            </h2>
            <ScanPhases currentPhase={lastMessage?.phase} />
          </div>

          {/* Real-time Logs */}
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Live Logs
              </h2>
              <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                <FiActivity className="mr-2 animate-pulse" />
                Real-time Updates
              </div>
            </div>
            
            <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm">
              <div className="text-green-400 mb-2">
                [INFO] Starting vulnerability scan...
              </div>
              <div className="text-blue-400 mb-2">
                [SCAN] Target: {scanStatus?.target_ip || 'Loading...'}
              </div>
              <div className="text-yellow-400 mb-2">
                [PHASE] {lastMessage?.phase || 'Initializing'}...
              </div>
              {lastMessage?.message && (
                <div className="text-white mb-2">
                  [STATUS] {lastMessage.message}
                </div>
              )}
              {scanStatus?.status === 'running' && (
                <div className="text-green-400 animate-pulse">
                  [LIVE] Scan in progress...
                </div>
              )}
              {scanStatus?.status === 'completed' && (
                <div className="text-green-400">
                  [COMPLETE] Scan finished successfully!
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar - Stats & Info */}
        <div className="space-y-6">
          {/* Scan Info Card */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Scan Information
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Scan ID:</span>
                <span className="font-mono text-sm text-gray-900 dark:text-white">
                  {scanId?.substring(0, 8)}...
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Started:</span>
                <span className="text-gray-900 dark:text-white">
                  {scanStatus?.start_time ? new Date(scanStatus.start_time).toLocaleTimeString() : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Duration:</span>
                <span className="text-gray-900 dark:text-white">
                  {scanStatus?.start_time && scanStatus?.end_time 
                    ? `${Math.round((new Date(scanStatus.end_time).getTime() - new Date(scanStatus.start_time).getTime()) / 1000)}s`
                    : 'Running...'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">WebSocket:</span>
                <span className={isConnected ? 'text-green-600' : 'text-red-600'}>
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Quick Actions
            </h3>
            <div className="space-y-3">
              <button
                onClick={() => navigate('/dashboard')}
                className="w-full btn-secondary flex items-center justify-center"
              >
                <FiBarChart2 className="mr-2" />
                Back to Dashboard
              </button>
              
              {scanStatus?.status === 'completed' && (
                <button
                  onClick={handleViewReport}
                  className="w-full btn-primary flex items-center justify-center"
                >
                  <FiDownload className="mr-2" />
                  Download Report
                </button>
              )}
              
              <button
                onClick={() => navigate('/scan/new')}
                className="w-full btn-secondary flex items-center justify-center"
              >
                <FiTarget className="mr-2" />
                Start New Scan
              </button>
            </div>
          </div>

          {/* Estimated Time */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Estimated Completion
            </h3>
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {scanStatus?.status === 'completed' ? 'Complete!' : '~25s'}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {scanStatus?.status === 'completed' 
                  ? 'Scan finished successfully' 
                  : 'Based on average scan time'}
              </p>
            </div>
          </div>

          {/* Stats Preview */}
          {scanResult && (
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Quick Results
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Open Ports:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {scanResult.open_ports?.length || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Vulnerabilities:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {scanResult.vulnerabilities?.length || 0}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Host Status:</span>
                  <span className={`font-semibold ${
                    scanResult.host_status === 'up' 
                      ? 'text-green-600' 
                      : 'text-red-600'
                  }`}>
                    {scanResult.host_status || 'unknown'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LiveScan;