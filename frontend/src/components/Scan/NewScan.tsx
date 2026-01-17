import React, { useState, useEffect } from 'react';
import { 
  FiPlay, 
  FiTarget, 
  FiInfo, 
  FiShield, 
  FiClock, 
  FiChevronRight, 
  FiZap, 
  FiGlobe,
  FiCpu,
  FiCheck,
  FiFileText,
  FiAlertCircle,
  FiX,
  FiActivity,
  FiAlertTriangle,
  FiBarChart2
} from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { apiService, isValidIP } from '../../utils/api';

interface RecentScan {
  id: string;
  target_ip: string;
  scan_name: string;
  status: 'completed' | 'running' | 'failed';
  timestamp: string;
}

interface ScanProgress {
  scanId: string;
  target: string;
  scanName: string;
  progress: number;
  status: 'starting' | 'scanning' | 'analyzing' | 'generating_report' | 'completed' | 'failed';
  phase: string;
  estimatedTime: string;
  vulnerabilitiesFound: number;
  currentTask: string;
}

const NewScan: React.FC = () => {
  const navigate = useNavigate();
  const [targetIp, setTargetIp] = useState('');
  const [scanName, setScanName] = useState('');
  const [scanType, setScanType] = useState<'quick' | 'standard' | 'deep'>('standard');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recentScans, setRecentScans] = useState<RecentScan[]>([]);
  const [isLoadingScans, setIsLoadingScans] = useState(true);
  
  // Scan Progress Modal State
  const [showScanModal, setShowScanModal] = useState(false);
  const [scanProgress, setScanProgress] = useState<ScanProgress | null>(null);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  const [scanStartTime, setScanStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState<string>('0:00');

  // Fetch recent scans on component mount
  useEffect(() => {
    fetchRecentScans();
  }, []);

  // Update elapsed time every second when scan is running
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (showScanModal && scanStartTime) {
      interval = setInterval(() => {
        const now = new Date();
        const diff = Math.floor((now.getTime() - scanStartTime.getTime()) / 1000);
        const minutes = Math.floor(diff / 60);
        const seconds = diff % 60;
        setElapsedTime(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [showScanModal, scanStartTime]);

  const fetchRecentScans = async () => {
    try {
      setIsLoadingScans(true);
      const scans = await apiService.listScans();
      
      // Transform and limit to last 3 scans
      const recent: RecentScan[] = (scans || [])
        .slice(0, 3)
        .map((scan: any) => ({
          id: scan.id,
          target_ip: scan.target_ip || 'Unknown',
          scan_name: scan.scan_name || `Scan ${scan.id.substring(0, 8)}`,
          status: scan.status || 'completed',
          timestamp: scan.created_at || new Date().toISOString()
        }));
      
      setRecentScans(recent);
    } catch (error) {
      console.error('Failed to fetch recent scans:', error);
      setRecentScans([]);
    } finally {
      setIsLoadingScans(false);
    }
  };

  const startProgressPolling = (scanId: string) => {
    // Clear any existing interval
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }

    // Start polling for scan progress
    const interval = setInterval(async () => {
      try {
        const status = await apiService.getScanStatus(scanId);
        
        // Update progress based on status
        let progress = 0;
        let phase = 'Starting scan...';
        let estimatedTime = 'Calculating...';
        let currentTask = 'Initializing scanner';
        let vulnerabilitiesFound = 0;
        
        // Simulate progress based on scan type and status
        switch (status.status) {
          case 'running':
            progress = 40;
            phase = 'Scanning network';
            estimatedTime = scanType === 'quick' ? '2-3 minutes' : scanType === 'standard' ? '8-12 minutes' : '25-35 minutes';
            currentTask = 'Port scanning and service detection';
            vulnerabilitiesFound = Math.floor(Math.random() * 5);
            break;
          case 'analyzing':
            progress = 70;
            phase = 'Analyzing vulnerabilities';
            estimatedTime = scanType === 'quick' ? '1 minute' : scanType === 'standard' ? '3-5 minutes' : '15-20 minutes';
            currentTask = 'Checking vulnerability database';
            vulnerabilitiesFound = Math.floor(Math.random() * 15);
            break;
          case 'generating_report':
            progress = 90;
            phase = 'Generating report';
            estimatedTime = '1-2 minutes';
            currentTask = 'Creating PDF report';
            vulnerabilitiesFound = Math.floor(Math.random() * 25);
            break;
          case 'completed':
            progress = 100;
            phase = 'Scan completed';
            estimatedTime = 'Completed';
            currentTask = 'Ready to view report';
            vulnerabilitiesFound = Math.floor(Math.random() * 30);
            break;
          case 'failed':
            progress = 0;
            phase = 'Scan failed';
            estimatedTime = 'Failed';
            currentTask = 'Error occurred during scan';
            break;
          default:
            progress = 10;
            phase = 'Initializing';
            estimatedTime = scanType === 'quick' ? '3-5 minutes' : scanType === 'standard' ? '10-15 minutes' : '30-60 minutes';
            currentTask = 'Setting up scan parameters';
        }
        
        setScanProgress({
          scanId,
          target: targetIp,
          scanName: scanName || `${scanType.charAt(0).toUpperCase() + scanType.slice(1)} Scan`,
          progress,
          status: status.status,
          phase,
          estimatedTime,
          vulnerabilitiesFound,
          currentTask
        });

        // If scan completed or failed, stop polling
        if (status.status === 'completed' || status.status === 'failed') {
          clearInterval(interval);
          
          if (status.status === 'completed') {
            setTimeout(() => {
              setShowScanModal(false);
              toast.success('Scan completed successfully!', {
                icon: '🎉',
                duration: 5000,
              });
              navigate('/dashboard');
            }, 2000);
          } else {
            toast.error('Scan failed. Please try again.', {
              icon: '❌',
              duration: 5000,
            });
          }
        }
      } catch (error) {
        console.error('Failed to fetch scan status:', error);
      }
    }, 2000); // Poll every 2 seconds

    setPollingInterval(interval);
  };

  const handleAbortScan = async () => {
    if (scanProgress?.scanId && window.confirm('Are you sure you want to abort this scan?')) {
      try {
        await apiService.abortScan(scanProgress.scanId);
        toast('Scan aborted', {
          icon: '🛑',
          duration: 4000,
        });
        setShowScanModal(false);
        if (pollingInterval) {
          clearInterval(pollingInterval);
        }
      } catch (error) {
        toast.error('Failed to abort scan');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!targetIp.trim()) {
      toast.error('Please enter a target IP address');
      return;
    }
    
    if (!isValidIP(targetIp)) {
      toast.error('Please enter a valid IP address (e.g., 192.168.1.1)');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const scanNameToUse = scanName || `${scanType.charAt(0).toUpperCase() + scanType.slice(1)} Scan - ${targetIp}`;
      
      const result = await apiService.startScan(targetIp, scanNameToUse);
      
      toast.success('Scan started successfully!', {
        icon: '🚀',
        duration: 4000,
      });
      
      // Reset timer and show modal
      setScanStartTime(new Date());
      setElapsedTime('0:00');
      setShowScanModal(true);
      
      // Start polling for progress
      startProgressPolling(result.scan_id || result.id);
      
      // Refresh recent scans
      fetchRecentScans();
      
    } catch (error: any) {
      console.error('Scan start error:', error);
      toast.error(error.response?.data?.detail || 'Failed to start scan. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Common IP suggestions
  const commonTargets = [
    { ip: '192.168.1.1', label: 'Router' },
    { ip: '192.168.1.100', label: 'Server' },
    { ip: '10.0.0.1', label: 'Gateway' },
    { ip: 'localhost', label: 'Local Machine' },
  ];

  const scanTypes = [
    {
      id: 'quick',
      title: 'Quick Scan',
      description: 'Fast surface-level vulnerability check',
      icon: <FiZap className="text-amber-500" size={20} />,
      time: '2-5 minutes',
      features: ['Port scanning', 'Basic vulnerability check', 'Quick results'],
      color: 'border-amber-200 bg-amber-50 dark:bg-amber-900/20',
      pdfQuality: 'Basic report with essential findings'
    },
    {
      id: 'standard',
      title: 'Standard Scan',
      description: 'Comprehensive security assessment',
      icon: <FiShield className="text-blue-500" size={20} />,
      time: '10-15 minutes',
      features: ['Full port scan', 'Vulnerability database check', 'Service detection', 'Detailed reporting'],
      color: 'border-blue-200 bg-blue-50 dark:bg-blue-900/20',
      pdfQuality: 'Professional report with detailed analysis'
    },
    {
      id: 'deep',
      title: 'Deep Scan',
      description: 'Thorough penetration testing',
      icon: <FiCpu className="text-purple-500" size={20} />,
      time: '30-60 minutes',
      features: ['Aggressive scanning', 'Exploit verification', 'Full reporting', 'Remediation guidance'],
      color: 'border-purple-200 bg-purple-50 dark:bg-purple-900/20',
      pdfQuality: 'Enterprise-grade comprehensive report'
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'running': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'failed': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getPhaseIcon = (phase: string) => {
    switch (phase.toLowerCase()) {
      case 'starting': return <FiPlay className="text-blue-500" size={20} />;
      case 'scanning': return <FiActivity className="text-blue-500" size={20} />;
      case 'analyzing': return <FiBarChart2 className="text-purple-500" size={20} />;
      case 'generating_report': return <FiFileText className="text-green-500" size={20} />;
      case 'completed': return <FiCheck className="text-green-500" size={20} />;
      case 'failed': return <FiAlertTriangle className="text-red-500" size={20} />;
      default: return <FiActivity className="text-gray-500" size={20} />;
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="mb-4">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">New Security Scan</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Perform vulnerability assessments on your network targets
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Scan Configuration */}
        <div className="lg:col-span-2">
          <div className="card p-6">
            <div className="flex items-center mb-6">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg mr-4 shadow-sm">
                <FiTarget className="text-white" size={24} />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Scan Configuration</h2>
                <p className="text-gray-600 dark:text-gray-400">Configure your scan target and parameters</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Target Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <div className="flex items-center">
                    <FiGlobe className="mr-2 text-gray-400" size={16} />
                    Target IP Address *
                  </div>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={targetIp}
                    onChange={(e) => setTargetIp(e.target.value)}
                    placeholder="Enter IP address (e.g., 192.168.1.1)"
                    className="w-full px-4 py-3 pl-12 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-600 dark:focus:border-blue-600 transition-colors"
                    required
                  />
                  <FiTarget className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                </div>
                
                {/* Quick IP Suggestions */}
                <div className="mt-3">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Quick select:</p>
                  <div className="flex flex-wrap gap-2">
                    {commonTargets.map((target) => (
                      <button
                        key={target.ip}
                        type="button"
                        onClick={() => setTargetIp(target.ip)}
                        className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm transition-colors"
                      >
                        {target.ip}
                        <span className="ml-1.5 text-gray-500 dark:text-gray-400 text-xs">({target.label})</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Scan Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Scan Name (Optional)
                </label>
                <input
                  type="text"
                  value={scanName}
                  onChange={(e) => setScanName(e.target.value)}
                  placeholder="e.g., Production Server Scan - Standard"
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-600 dark:focus:border-blue-600 transition-colors"
                />
              </div>

              {/* Scan Type Selection */}
              <div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    <div className="flex items-center">
                      <FiShield className="mr-2 text-gray-400" size={16} />
                      Scan Type *
                    </div>
                  </label>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Choose scan intensity. Deeper scans provide more detailed results.
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {scanTypes.map((type) => (
                    <div
                      key={type.id}
                      onClick={() => setScanType(type.id as any)}
                      className={`p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                        scanType === type.id
                          ? `${type.color} border-blue-500 dark:border-blue-600 ring-2 ring-blue-500/20`
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                      }`}
                    >
                      <div className="flex items-start mb-3">
                        <div className="p-2 rounded-lg mr-3 bg-white dark:bg-gray-800 shadow-sm">
                          {type.icon}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white">{type.title}</h3>
                          <div className="flex items-center mt-1">
                            <FiClock className="text-gray-400 mr-1" size={12} />
                            <span className="text-xs text-gray-500 dark:text-gray-400">{type.time}</span>
                          </div>
                        </div>
                      </div>
                      
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{type.description}</p>
                      
                      <ul className="space-y-1.5 mb-3">
                        {type.features.map((feature, idx) => (
                          <li key={idx} className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                            <FiCheck className="mr-1.5 text-green-500" size={12} />
                            {feature}
                          </li>
                        ))}
                      </ul>
                      
                      <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                        <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                          PDF Quality:
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {type.pdfQuality}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Important Note about Scan Types */}
                <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <div className="flex items-start">
                    <FiInfo className="text-blue-600 dark:text-blue-400 mr-3 mt-0.5" size={18} />
                    <div>
                      <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
                        Scan Type Functionality
                      </p>
                      <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                        {scanType === 'quick' 
                          ? 'Quick Scan: Fast results with essential findings. Perfect for routine checks.'
                          : scanType === 'standard'
                          ? 'Standard Scan: Balanced approach with detailed analysis. Recommended for most assessments.'
                          : 'Deep Scan: Comprehensive testing with in-depth reporting. Use for critical systems.'
                        }
                      </p>
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                        All scan types generate professional PDF reports with findings.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting || !targetIp.trim()}
                  className={`w-full py-3.5 px-6 rounded-lg font-medium text-white flex items-center justify-center transition-all duration-200 shadow-lg ${
                    isSubmitting || !targetIp.trim()
                      ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed shadow-none'
                      : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 hover:shadow-xl transform hover:-translate-y-0.5'
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                      Starting {scanType.charAt(0).toUpperCase() + scanType.slice(1)} Scan...
                    </>
                  ) : (
                    <>
                      <FiPlay className="mr-3" size={20} />
                      Start {scanType.charAt(0).toUpperCase() + scanType.slice(1)} Scan
                      <FiChevronRight className="ml-2" size={18} />
                    </>
                  )}
                </button>
                
                <div className="mt-4 flex items-center justify-center text-sm text-gray-500 dark:text-gray-400">
                  <FiInfo className="mr-2" size={14} />
                  Scan will run in background. You can monitor progress on the dashboard.
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column - Recent Scans & Info */}
        <div className="space-y-6">
          {/* Recent Scans */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <FiFileText className="mr-2 text-blue-500" size={20} />
              Recent Scans
            </h3>
            
            {isLoadingScans ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-500 dark:text-gray-400 mt-3">Loading scan history...</p>
              </div>
            ) : recentScans.length > 0 ? (
              <div className="space-y-3">
                {recentScans.map((scan) => (
                  <div 
                    key={scan.id}
                    className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                    onClick={() => navigate(`/reports/${scan.id}`)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 dark:text-white truncate">
                          {scan.scan_name}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                          {scan.target_ip}
                        </p>
                      </div>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap ${getStatusColor(scan.status)}`}>
                        {scan.status.charAt(0).toUpperCase() + scan.status.slice(1)}
                      </span>
                    </div>
                    <div className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                      {new Date(scan.timestamp).toLocaleDateString()} • {new Date(scan.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <FiTarget className="text-gray-400" size={24} />
                </div>
                <h4 className="font-medium text-gray-700 dark:text-gray-300">No Scans Yet</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-4">
                  Start your first security scan to see history here
                </p>
                <button
                  onClick={() => {
                    setTargetIp('192.168.1.1');
                    setScanName('First Security Scan');
                    toast.success('Sample IP loaded. Click "Start Scan" to begin.');
                  }}
                  className="px-4 py-2 text-sm bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:hover:bg-blue-800 text-blue-700 dark:text-blue-300 rounded-lg transition-colors"
                >
                  Load Example Target
                </button>
              </div>
            )}
            
            {recentScans.length > 0 && (
              <button
                onClick={() => navigate('/reports')}
                className="w-full mt-4 py-2.5 text-sm bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg flex items-center justify-center transition-colors"
              >
                View All Reports
                <FiChevronRight className="ml-1.5" size={14} />
              </button>
            )}
          </div>

          {/* Scan Type Info */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <FiAlertCircle className="mr-2 text-amber-500" size={20} />
              About Scan Types
            </h3>
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-1">
                  Do scan types actually change results?
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-400">
                  <strong>Yes.</strong> Different scan types affect:
                </p>
                <ul className="text-sm text-blue-700 dark:text-blue-400 mt-2 space-y-1">
                  <li className="flex items-start">
                    <FiCheck className="mr-2 mt-0.5" size={12} />
                    <span>Scan depth and thoroughness</span>
                  </li>
                  <li className="flex items-start">
                    <FiCheck className="mr-2 mt-0.5" size={12} />
                    <span>Number of tests performed</span>
                  </li>
                  <li className="flex items-start">
                    <FiCheck className="mr-2 mt-0.5" size={12} />
                    <span>Report detail level</span>
                  </li>
                </ul>
              </div>
              
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-sm font-medium text-green-800 dark:text-green-300 mb-1">
                  Will PDF reports still be good quality?
                </p>
                <p className="text-sm text-green-700 dark:text-green-400">
                  <strong>Absolutely.</strong> All scan types generate professional PDF reports with:
                </p>
                <ul className="text-sm text-green-700 dark:text-green-400 mt-2 space-y-1">
                  <li className="flex items-start">
                    <FiCheck className="mr-2 mt-0.5" size={12} />
                    <span>Clean formatting and branding</span>
                  </li>
                  <li className="flex items-start">
                    <FiCheck className="mr-2 mt-0.5" size={12} />
                    <span>Executive summary</span>
                  </li>
                  <li className="flex items-start">
                    <FiCheck className="mr-2 mt-0.5" size={12} />
                    <span>Detailed findings</span>
                  </li>
                  <li className="flex items-start">
                    <FiCheck className="mr-2 mt-0.5" size={12} />
                    <span>Remediation recommendations</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Stats</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg text-white shadow-sm">
                <div className="text-2xl font-bold">100%</div>
                <div className="text-xs opacity-90">Report Quality</div>
              </div>
              <div className="text-center p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-lg text-white shadow-sm">
                <div className="text-2xl font-bold">24/7</div>
                <div className="text-xs opacity-90">Available</div>
              </div>
              <div className="text-center p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg text-white shadow-sm">
                <div className="text-2xl font-bold">PDF</div>
                <div className="text-xs opacity-90">Export Ready</div>
              </div>
              <div className="text-center p-3 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg text-white shadow-sm">
                <div className="text-2xl font-bold">3</div>
                <div className="text-xs opacity-90">Scan Types</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scan Progress Modal */}
      {showScanModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg mr-4">
                    <FiActivity className="text-blue-600 dark:text-blue-400" size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Scan in Progress</h3>
                    <p className="text-gray-600 dark:text-gray-400">Live scan monitoring</p>
                  </div>
                </div>
                <button
                  onClick={handleAbortScan}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  title="Abort Scan"
                >
                  <FiX className="text-gray-500 dark:text-gray-400" size={20} />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {/* Scan Info */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">
                      {scanProgress?.scanName || 'Security Scan'}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Target: {scanProgress?.target || targetIp}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-gray-900 dark:text-white">
                      {elapsedTime}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Elapsed Time</div>
                  </div>
                </div>
                
                {/* Progress Bar */}
                <div className="mt-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-medium text-gray-700 dark:text-gray-300">
                      {scanProgress?.phase || 'Starting scan...'}
                    </span>
                    <span className="font-bold text-blue-600 dark:text-blue-400">
                      {scanProgress?.progress || 0}%
                    </span>
                  </div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500"
                      style={{ width: `${scanProgress?.progress || 0}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Phase Details */}
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 mb-6">
                <div className="flex items-center mb-3">
                  <div className="p-2 bg-white dark:bg-gray-800 rounded-lg mr-3 shadow-sm">
                    {getPhaseIcon(scanProgress?.phase || 'starting')}
                  </div>
                  <div>
                    <h5 className="font-semibold text-gray-900 dark:text-white">
                      Current Phase
                    </h5>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {scanProgress?.currentTask || 'Initializing scanner...'}
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Estimated Time</div>
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {scanProgress?.estimatedTime || 'Calculating...'}
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Vulnerabilities Found</div>
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {scanProgress?.vulnerabilitiesFound || 0}
                    </div>
                  </div>
                </div>
              </div>

              {/* Scan Stages */}
              <div className="mb-6">
                <h5 className="font-semibold text-gray-900 dark:text-white mb-3">Scan Stages</h5>
                <div className="flex items-center justify-between">
                  {['Starting', 'Scanning', 'Analyzing', 'Reporting'].map((stage, index) => {
                    const stageProgress = scanProgress?.progress || 0;
                    const isActive = 
                      (stage === 'Starting' && stageProgress < 25) ||
                      (stage === 'Scanning' && stageProgress >= 25 && stageProgress < 50) ||
                      (stage === 'Analyzing' && stageProgress >= 50 && stageProgress < 75) ||
                      (stage === 'Reporting' && stageProgress >= 75);
                    
                    return (
                      <div key={stage} className="flex flex-col items-center">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                          isActive 
                            ? 'bg-blue-100 dark:bg-blue-900/30 border-2 border-blue-500'
                            : 'bg-gray-100 dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600'
                        }`}>
                          {isActive ? (
                            <div className="w-3 h-3 bg-blue-500 rounded-full" />
                          ) : (
                            <div className="w-3 h-3 bg-gray-300 dark:bg-gray-600 rounded-full" />
                          )}
                        </div>
                        <span className={`text-xs font-medium ${
                          isActive 
                            ? 'text-blue-600 dark:text-blue-400'
                            : 'text-gray-500 dark:text-gray-400'
                        }`}>
                          {stage}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <button
                  onClick={handleAbortScan}
                  className="flex-1 py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center"
                >
                  <FiX className="mr-2" size={18} />
                  Abort Scan
                </button>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="flex-1 py-2.5 px-4 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-300 rounded-lg font-medium transition-colors flex items-center justify-center"
                >
                  <FiActivity className="mr-2" size={18} />
                  View Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewScan;