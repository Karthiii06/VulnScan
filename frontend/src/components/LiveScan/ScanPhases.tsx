import React from 'react';
import { FiCheck, FiPlay, FiClock, FiAlertCircle, FiTarget } from 'react-icons/fi';

interface ScanPhasesProps {
  currentPhase?: string;
}

const ScanPhases: React.FC<ScanPhasesProps> = ({ currentPhase = 'initializing' }) => {
  const phases = [
    {
      id: 'initializing',
      name: 'Initializing',
      description: 'Setting up scanner and preparing for scan',
      icon: <FiClock />,
      estimatedTime: '2-5 seconds'
    },
    {
      id: 'port_scan',
      name: 'Port Scan',
      description: 'Scanning top 50 ports for open services',
      icon: <FiTarget />,
      estimatedTime: '10-15 seconds'
    },
    {
      id: 'service_detection',
      name: 'Service Detection',
      description: 'Identifying running services and versions',
      icon: <FiPlay />,
      estimatedTime: '5-8 seconds'
    },
    {
      id: 'vulnerability_analysis',
      name: 'Vulnerability Analysis',
      description: 'Analyzing services for known vulnerabilities',
      icon: <FiAlertCircle />,
      estimatedTime: '5-10 seconds'
    },
    {
      id: 'completed',
      name: 'Completed',
      description: 'Generating final report and summary',
      icon: <FiCheck />,
      estimatedTime: '1-2 seconds'
    }
  ];

  const getPhaseStatus = (phaseId: string) => {
    const phaseIndex = phases.findIndex(p => p.id === phaseId);
    const currentIndex = phases.findIndex(p => p.id === currentPhase);
    
    if (phaseIndex < currentIndex) return 'completed';
    if (phaseIndex === currentIndex) return 'current';
    return 'pending';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100 dark:bg-green-900/30';
      case 'current': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 animate-pulse';
      default: return 'text-gray-400 bg-gray-100 dark:bg-gray-800';
    }
  };

  const getStatusIcon = (status: string, phaseIcon: React.ReactNode) => {
    switch (status) {
      case 'completed': return <FiCheck className="text-green-600" />;
      case 'current': return phaseIcon;
      default: return <FiClock className="text-gray-400" />;
    }
  };

  return (
    <div className="space-y-4">
      {phases.map((phase) => {
        const status = getPhaseStatus(phase.id);
        
        return (
          <div 
            key={phase.id}
            className={`flex items-start p-4 rounded-lg border transition-all duration-300 ${
              status === 'current' 
                ? 'border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/10' 
                : 'border-gray-200 dark:border-gray-700'
            }`}
          >
            {/* Status Indicator */}
            <div className={`flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center mr-4 ${getStatusColor(status)}`}>
              {getStatusIcon(status, phase.icon)}
            </div>
            
            {/* Phase Details */}
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h4 className={`font-semibold ${
                  status === 'current' 
                    ? 'text-blue-700 dark:text-blue-300' 
                    : 'text-gray-900 dark:text-white'
                }`}>
                  {phase.name}
                </h4>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {phase.estimatedTime}
                </span>
              </div>
              
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {phase.description}
              </p>
              
              {/* Progress Bar for Current Phase */}
              {status === 'current' && (
                <div className="mt-3">
                  <div className="h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full w-1/2 animate-pulse"></div>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-right">
                    In progress...
                  </div>
                </div>
              )}
            </div>
            
            {/* Status Badge */}
            <div className="ml-4">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                status === 'completed' 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  : status === 'current'
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
              }`}>
                {status === 'completed' ? '✓' : status === 'current' ? '●' : '○'} {status}
              </span>
            </div>
          </div>
        );
      })}
      
      {/* Legend */}
      <div className="flex items-center justify-center space-x-6 text-sm text-gray-600 dark:text-gray-400 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center">
          <div className="h-3 w-3 rounded-full bg-green-500 mr-2"></div>
          <span>Completed</span>
        </div>
        <div className="flex items-center">
          <div className="h-3 w-3 rounded-full bg-blue-500 animate-pulse mr-2"></div>
          <span>Current</span>
        </div>
        <div className="flex items-center">
          <div className="h-3 w-3 rounded-full bg-gray-400 mr-2"></div>
          <span>Pending</span>
        </div>
      </div>
    </div>
  );
};

export default ScanPhases;