import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  FiDownload, 
  FiPrinter, 
  FiArrowLeft,
  FiAlertTriangle,
  FiCheckCircle,
  FiClock,
  FiTarget,
  FiBarChart2,
  FiExternalLink
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import VulnerabilityTable from './VulnerabilityTable';
import ReportSummary from './ReportSummary';
import { apiService, formatDate } from '../../utils/api';
import { ScanReport, Vulnerability } from '../../types';

const ReportView: React.FC = () => {
  const { scanId } = useParams<{ scanId: string }>();
  const navigate = useNavigate();

  const { data: report, isLoading, error } = useQuery<ScanReport>({
    queryKey: ['scanReport', scanId],
    queryFn: () => apiService.getScanReport(scanId!),
    enabled: !!scanId,
  });

  const handleDownloadPDF = async () => {
    if (!scanId || !report) return;
    
    try {
      toast.loading('Generating PDF...', { id: 'download' });
      const response = await apiService.downloadReport(scanId);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `vuln_report_${report.scan.target_ip}_${Date.now()}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('PDF downloaded successfully!', { id: 'download' });
    } catch (error) {
      toast.error('Failed to download PDF', { id: 'download' });
      console.error('Download error:', error);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="h-8 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mt-2"></div>
          </div>
          <div className="flex space-x-3">
            <div className="h-10 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            <div className="h-10 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
          </div>
        </div>
        
        <div className="card h-96 animate-pulse"></div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="card text-center p-12">
          <FiAlertTriangle className="mx-auto text-red-500" size={48} />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-4">
            Report Not Found
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mt-2 mb-6">
            The requested scan report could not be found or has expired.
          </p>
          <button
            onClick={() => navigate('/reports')}
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <FiArrowLeft className="mr-2" />
            Back to Reports
          </button>
        </div>
      </div>
    );
  }

  const { scan, summary, vulnerabilities } = report;

  return (
    <div className="max-w-6xl mx-auto print:mx-0 print:max-w-none">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 print:hidden">
        <div>
          <button
            onClick={() => navigate('/reports')}
            className="inline-flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
          >
            <FiArrowLeft className="mr-2" />
            Back to Reports
          </button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Vulnerability Report</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Detailed security assessment for {scan.target_ip}
          </p>
        </div>
        
        <div className="flex space-x-3 mt-4 md:mt-0">
          <button
            onClick={handlePrint}
            className="flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <FiPrinter className="mr-2" />
            Print
          </button>
          <button
            onClick={handleDownloadPDF}
            className="btn-primary flex items-center"
          >
            <FiDownload className="mr-2" />
            Download PDF
          </button>
        </div>
      </div>

      {/* Print Header (only shows when printing) */}
      <div className="hidden print:block border-b-2 border-gray-300 pb-6 mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Vulnerability Scan Report</h1>
        <p className="text-gray-600">Generated on {formatDate(new Date().toISOString())}</p>
      </div>

      {/* Report Content */}
      <div className="space-y-8">
        {/* Scan Overview Card */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Scan Overview</h2>
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              scan.status === 'completed' 
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
            }`}>
              {scan.status.toUpperCase()}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-2">
              <div className="flex items-center text-gray-600 dark:text-gray-400">
                <FiTarget className="mr-2" />
                <span className="text-sm">Target IP</span>
              </div>
              <div className="font-mono text-lg font-semibold text-gray-900 dark:text-white">
                {scan.target_ip}
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center text-gray-600 dark:text-gray-400">
                <FiCheckCircle className="mr-2" />
                <span className="text-sm">Scan Name</span>
              </div>
              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                {scan.scan_name}
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center text-gray-600 dark:text-gray-400">
                <FiClock className="mr-2" />
                <span className="text-sm">Scan Duration</span>
              </div>
              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                {scan.duration ? `${scan.duration.toFixed(1)}s` : 'N/A'}
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center text-gray-600 dark:text-gray-400">
                <FiBarChart2 className="mr-2" />
                <span className="text-sm">Report ID</span>
              </div>
              <div className="font-mono text-sm text-gray-900 dark:text-white truncate">
                {scan.id}
              </div>
            </div>
          </div>
          
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Start Time</div>
              <div className="text-gray-900 dark:text-white">
                {formatDate(scan.start_time)}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">End Time</div>
              <div className="text-gray-900 dark:text-white">
                {scan.end_time ? formatDate(scan.end_time) : 'N/A'}
              </div>
            </div>
          </div>
        </div>

        {/* Executive Summary */}
        <ReportSummary summary={summary} />

        {/* Vulnerability Details */}
        <div className="space-y-8">
          {Object.entries(vulnerabilities)
            .filter(([severity, vulns]) => (vulns as Vulnerability[]).length > 0)
            .map(([severity, vulns]) => (
              <div key={severity} className="card">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center">
                    <FiAlertTriangle className={`mr-3 ${
                      severity === 'critical' ? 'text-red-600' :
                      severity === 'high' ? 'text-orange-600' :
                      severity === 'medium' ? 'text-yellow-600' :
                      'text-blue-600'
                    }`} size={24} />
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-white capitalize">
                        {severity} Vulnerabilities
                      </h2>
                      <p className="text-gray-600 dark:text-gray-400">
                        {(vulns as Vulnerability[]).length} {(vulns as Vulnerability[]).length === 1 ? 'finding' : 'findings'} requiring attention
                      </p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    severity === 'critical' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                    severity === 'high' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
                    severity === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                    'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                  }`}>
                    {severity.toUpperCase()}
                  </span>
                </div>
                
                <VulnerabilityTable 
                  vulnerabilities={vulns as Vulnerability[]} 
                  severity={severity} 
                />
              </div>
            ))}
        </div>

        {/* Remediation Summary */}
        <div className="card print:break-before-page">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Remediation Summary</h2>
          <div className="prose dark:prose-invert max-w-none">
            <p className="text-gray-700 dark:text-gray-300">
              Based on the vulnerabilities identified in this report, the following remediation actions are recommended:
            </p>
            
            <ul className="mt-4 space-y-3">
              {summary.critical > 0 && (
                <li className="flex items-start">
                  <div className="flex-shrink-0 h-6 w-6 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center mr-3 mt-0.5">
                    <div className="h-3 w-3 rounded-full bg-red-600"></div>
                  </div>
                  <span className="text-gray-700 dark:text-gray-300">
                    <strong>Critical vulnerabilities ({summary.critical})</strong> should be addressed immediately as they pose significant security risks.
                  </span>
                </li>
              )}
              
              {summary.high > 0 && (
                <li className="flex items-start">
                  <div className="flex-shrink-0 h-6 w-6 rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center mr-3 mt-0.5">
                    <div className="h-3 w-3 rounded-full bg-orange-600"></div>
                  </div>
                  <span className="text-gray-700 dark:text-gray-300">
                    <strong>High severity vulnerabilities ({summary.high})</strong> should be remediated within 7 days to maintain security posture.
                  </span>
                </li>
              )}
              
              {summary.medium > 0 && (
                <li className="flex items-start">
                  <div className="flex-shrink-0 h-6 w-6 rounded-full bg-yellow-100 dark:bg-yellow-900 flex items-center justify-center mr-3 mt-0.5">
                    <div className="h-3 w-3 rounded-full bg-yellow-600"></div>
                  </div>
                  <span className="text-gray-700 dark:text-gray-300">
                    <strong>Medium severity vulnerabilities ({summary.medium})</strong> should be scheduled for remediation within 30 days.
                  </span>
                </li>
              )}
              
              {summary.low > 0 && (
                <li className="flex items-start">
                  <div className="flex-shrink-0 h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center mr-3 mt-0.5">
                    <div className="h-3 w-3 rounded-full bg-blue-600"></div>
                  </div>
                  <span className="text-gray-700 dark:text-gray-300">
                    <strong>Low severity vulnerabilities ({summary.low})</strong> can be addressed during regular maintenance cycles.
                  </span>
                </li>
              )}
            </ul>
            
            <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Next Steps</h3>
              <ol className="space-y-2 text-gray-700 dark:text-gray-300">
                <li>1. Prioritize critical and high severity vulnerabilities for immediate action</li>
                <li>2. Implement recommended remediation steps for each finding</li>
                <li>3. Schedule follow-up scans to verify remediation effectiveness</li>
                <li>4. Document all remediation actions for compliance purposes</li>
                <li>5. Consider implementing continuous monitoring for proactive security</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-gray-500 dark:text-gray-400 text-sm print:mt-8">
          <p>Report generated by Vulnerability Scanner v1.0.0</p>
          <p className="mt-1">This report is confidential and intended for authorized personnel only.</p>
          <p className="mt-4">Need help? Contact security-team@example.com</p>
        </div>
      </div>
    </div>
  );
};

export default ReportView;