import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { 
  FiFileText, 
  FiDownload, 
  FiEye, 
  FiCalendar,
  FiAlertTriangle,
  FiBarChart2,
  FiTrash2,
  FiTrash,
  FiRefreshCw
} from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { apiService, formatDate, severityColors } from '../../utils/api';

interface ReportItem {
  id: string;
  target_ip: string;
  scan_name: string;
  scan_date: string;
  vulnerability_count: number;
  highest_severity: 'critical' | 'high' | 'medium' | 'low';
  status: string;
}

const ReportsList: React.FC = () => {
  const queryClient = useQueryClient();
  
  const { data: reports, isLoading, error, refetch } = useQuery<ReportItem[]>({
    queryKey: ['reports'],
    queryFn: apiService.listReports,
    refetchInterval: 25, // Auto-refresh every 0.02 seconds
  });

  // Delete report mutation with dashboard invalidation
  const deleteReportMutation = useMutation({
    mutationFn: (reportId: string) => apiService.deleteReport(reportId),
    onMutate: async (reportId: string) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['reports'] });
      await queryClient.cancelQueries({ queryKey: ['dashboardMetrics'] });
      await queryClient.cancelQueries({ queryKey: ['quickStats'] });
      
      // Snapshot the previous value
      const previousReports = queryClient.getQueryData<ReportItem[]>(['reports']);
      
      // Optimistically update reports
      if (previousReports) {
        queryClient.setQueryData<ReportItem[]>(['reports'], 
          previousReports.filter(report => report.id !== reportId)
        );
      }
      
      return { previousReports };
    },
    onSuccess: () => {
      toast.success('Report deleted successfully');
      
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
      queryClient.invalidateQueries({ queryKey: ['quickStats'] });
      
      // Force immediate refetch of dashboard
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'], refetchType: 'all' });
        queryClient.invalidateQueries({ queryKey: ['quickStats'], refetchType: 'all' });
      }, 100);
    },
    onError: (error: any, reportId: string, context: any) => {
      toast.error(`Failed to delete report: ${error.message}`);
      
      // Rollback to previous data
      if (context?.previousReports) {
        queryClient.setQueryData(['reports'], context.previousReports);
      }
      
      // Force refetch
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
      queryClient.invalidateQueries({ queryKey: ['quickStats'] });
    }
  });

  const handleDelete = async (reportId: string, reportName: string) => {
    if (window.confirm(`Are you sure you want to delete report: ${reportName}?`)) {
      deleteReportMutation.mutate(reportId);
    }
  };

  const handleDownload = async (scanId: string, targetIP: string) => {
    try {
      const response = await apiService.downloadReport(scanId);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `scan_report_${targetIP}_${Date.now()}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Report downloaded successfully');
    } catch (error) {
      console.error('Download failed:', error);
      toast.error('Failed to download report');
    }
  };

  const getSeverityBadge = (severity: string) => {
    const colors = severityColors[severity as keyof typeof severityColors] || severityColors.low;
    
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${colors.bg} ${colors.text === 'text-medium' ? 'text-gray-900' : 'text-white'}`}>
        <FiAlertTriangle className="mr-1" size={12} />
        {severity.toUpperCase()}
      </span>
    );
  };

  // Bulk delete functionality with dashboard updates
  const handleBulkDelete = () => {
    if (!reports || reports.length === 0) {
      toast.error('No reports to delete');
      return;
    }

    if (window.confirm(`Are you sure you want to delete all ${reports.length} reports?`)) {
      // Optimistically update UI
      queryClient.setQueryData(['reports'], []);
      
      Promise.all(reports.map(report => apiService.deleteReport(report.id)))
        .then(() => {
          toast.success(`Successfully deleted ${reports.length} reports`);
          
          // Invalidate and refetch all related data
          queryClient.invalidateQueries({ queryKey: ['reports'] });
          queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
          queryClient.invalidateQueries({ queryKey: ['quickStats'] });
          
          // Force immediate dashboard update
          setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'], refetchType: 'all' });
            queryClient.invalidateQueries({ queryKey: ['quickStats'], refetchType: 'all' });
          }, 200);
        })
        .catch((error) => {
          toast.error('Failed to delete some reports');
          console.error('Bulk delete error:', error);
          
          // Revert on error
          queryClient.invalidateQueries({ queryKey: ['reports'] });
          queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
          queryClient.invalidateQueries({ queryKey: ['quickStats'] });
        });
    }
  };

  // Manual refresh function
  const handleRefresh = () => {
    refetch();
    queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
    queryClient.invalidateQueries({ queryKey: ['quickStats'] });
    toast.success('Reports refreshed');
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            <div className="h-4 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mt-2"></div>
          </div>
          <div className="h-10 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="card h-48 animate-pulse">
              <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
              <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded mb-3"></div>
              <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card text-center p-12">
        <FiAlertTriangle className="mx-auto text-red-500" size={48} />
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-4">
          Failed to load reports
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Please check your connection and try again.
        </p>
        <button
          onClick={() => refetch()}
          className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <FiRefreshCw className="mr-2" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Scan Reports</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            View, download, and manage vulnerability assessment reports
          </p>
        </div>
        
        <div className="flex space-x-3 mt-4 md:mt-0">
          <button
            onClick={handleRefresh}
            className="flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <FiRefreshCw className="mr-2" />
            Refresh
          </button>
          {reports && reports.length > 0 && (
            <button
              onClick={handleBulkDelete}
              className="flex items-center px-4 py-2 border border-red-300 dark:border-red-600 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
            >
              <FiTrash className="mr-2" />
              Delete All
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Reports</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {reports?.length || 0}
              </p>
            </div>
            <FiFileText className="text-blue-600" size={32} />
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Critical Issues</p>
              <p className="text-3xl font-bold text-red-600 dark:text-red-400 mt-2">
                {reports?.filter(r => r.highest_severity === 'critical').length || 0}
              </p>
            </div>
            <FiAlertTriangle className="text-red-600" size={32} />
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Vulnerabilities</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {reports?.reduce((sum, r) => sum + r.vulnerability_count, 0) || 0}
              </p>
            </div>
            <FiBarChart2 className="text-green-600" size={32} />
          </div>
        </div>
        
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Last Report</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white mt-2">
                {reports?.length ? formatDate(reports[0].scan_date) : 'No reports'}
              </p>
            </div>
            <FiCalendar className="text-purple-600" size={32} />
          </div>
        </div>
      </div>

      {/* Reports Grid */}
      {reports && reports.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reports.map((report) => (
            <div key={report.id} className="card group hover:shadow-xl transition-all duration-300 relative">
              {/* Delete button for individual report */}
              <button
                onClick={() => handleDelete(report.id, report.scan_name)}
                className="absolute top-4 right-4 p-2 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Delete report"
              >
                <FiTrash2 size={18} />
              </button>
              
              <div className="flex items-start justify-between mb-4">
                {getSeverityBadge(report.highest_severity)}
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {formatDate(report.scan_date)}
                </span>
              </div>
              
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 pr-8">
                {report.scan_name}
              </h3>
              
              <p className="font-mono text-sm text-gray-600 dark:text-gray-400 mb-4">
                {report.target_ip}
              </p>
              
              <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 mb-6">
                <div className="flex items-center">
                  <FiAlertTriangle className="mr-1" size={14} />
                  {report.vulnerability_count} vulnerabilities
                </div>
                <div className="capitalize">
                  {report.status}
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <Link
                  to={`/reports/${report.id}`}
                  className="flex-1 btn-secondary flex items-center justify-center py-2 text-sm"
                >
                  <FiEye className="mr-2" />
                  View
                </Link>
                
                <button
                  onClick={() => handleDownload(report.id, report.target_ip)}
                  className="flex-1 btn-primary flex items-center justify-center py-2 text-sm"
                >
                  <FiDownload className="mr-2" />
                  PDF
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card text-center p-12">
          <FiFileText className="mx-auto text-gray-400" size={64} />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mt-6">
            No reports yet
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mt-2 mb-6">
            Complete your first vulnerability scan to generate reports
          </p>
          <Link
            to="/scan/new"
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <FiAlertTriangle className="mr-2" />
            Start Your First Scan
          </Link>
        </div>
      )}
    </div>
  );
};

export default ReportsList;