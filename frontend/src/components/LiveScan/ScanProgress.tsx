import React from 'react';
import { FiActivity, FiCheck, FiAlertCircle, FiClock } from 'react-icons/fi';

interface ScanProgressProps {
  status?: string;
  message?: string;
  progress?: number;
  phase?: string;
}

const ScanProgress: React.FC<ScanProgressProps> = ({ 
  status = 'pending', 
  message = 'Initializing scan...',
  progress = 0,
  phase = 'initializing'
}) => {
  const getStatusColor = () => {
    switch (status) {
      case 'running': return 'bg-blue-500';
      case 'completed': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      case 'aborted': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'running': return <FiActivity className="animate-pulse text-blue-500" size={24} />;
      case 'completed': return <FiCheck className="text-green-500" size={24} />;
      case 'failed': return <FiAlertCircle className="text-red-500" size={24} />;
      case 'aborted': return <FiAlertCircle className="text-yellow-500" size={24} />;
      default: return <FiClock className="text-gray-500" size={24} />;
    }
  };

  const getPhaseDescription = () => {
    switch (phase) {
      case 'initializing':
        return 'Setting up scanner and preparing for scan';
      case 'port_scan':
        return 'Scanning top 50 ports for open services';
      case 'service_detection':
        return 'Identifying running services and versions';
      case 'vulnerability_analysis':
        return 'Analyzing services for known vulnerabilities';
      case 'completed':
        return 'Scan completed, generating report';
      default:
        return 'Processing scan data';
    }
  };

  return (
    <div className="space-y-6">
      {/* Status Indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className={`p-3 rounded-full ${getStatusColor().replace('bg-', 'bg-').replace('500', '100')} dark:${getStatusColor().replace('bg-', 'bg-').replace('500', '900/30')}`}>
            {getStatusIcon()}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white capitalize">
              {status === 'running' ? 'Scan in Progress' : status}
            </h3>
            <p className="text-gray-600 dark:text-gray-400">{message}</p>
          </div>
        </div>
        
        <div className="text-right">
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {progress}%
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Complete</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="relative">
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all duration-500 ${getStatusColor()}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        
        {/* Progress Indicators */}
        <div className="flex justify-between mt-2">
          {[0, 25, 50, 75, 100].map((point) => (
            <div key={point} className="flex flex-col items-center">
              <div className={`h-3 w-3 rounded-full border-2 ${progress >= point ? getStatusColor() : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'}`} />
              <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">{point}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Phase Information */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
            <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse mr-2"></div>
            <span className="font-medium text-gray-900 dark:text-white">Current Phase</span>
          </div>
          <span className="text-sm font-medium text-blue-600 dark:text-blue-400 capitalize">
            {phase.replace('_', ' ')}
          </span>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {getPhaseDescription()}
        </p>
      </div>

      {/* Time Estimate */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Time Elapsed</div>
          <div className="text-xl font-semibold text-gray-900 dark:text-white">
            {status === 'completed' ? 'Complete' : '~15s'}
          </div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Estimated Time Remaining</div>
          <div className="text-xl font-semibold text-gray-900 dark:text-white">
            {status === 'completed' ? '0s' : '~10s'}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScanProgress;