import axios from 'axios';
import { QueryClient } from '@tanstack/react-query';

// Create axios instance
export const api = axios.create({
  baseURL: 'http://localhost:8000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Create query client
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30000,
    },
  },
});

// Function to manually refresh dashboard data
export const refreshDashboardData = async (): Promise<void> => {
  try {
    await queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
    await queryClient.invalidateQueries({ queryKey: ['quickStats'] });
    await queryClient.invalidateQueries({ queryKey: ['reports'] });
    
    // Force immediate refetch
    await queryClient.refetchQueries({ queryKey: ['dashboardMetrics'] });
    await queryClient.refetchQueries({ queryKey: ['quickStats'] });
    
    console.log('Dashboard data refreshed manually');
  } catch (error) {
    console.error('Failed to refresh dashboard data:', error);
  }
};

// API endpoints
export const endpoints = {
  // Dashboard
  dashboardMetrics: '/dashboard/metrics',
  quickStats: '/dashboard/stats',
  
  // Scans
  startScan: '/scans/start',
  scanStatus: (scanId: string) => `/scans/${scanId}/status`,
  abortScan: (scanId: string) => `/scans/${scanId}/abort`,
  listScans: '/scans',
  
  // Reports
  scanReport: (scanId: string) => `/reports/${scanId}`,
  downloadReport: (scanId: string) => `/reports/${scanId}/download`,
  listReports: '/reports',
  deleteReport: (reportId: string) => `/reports/${reportId}`,
};

// Helper function to transform snake_case to camelCase for dashboard data
const transformDashboardData = (data: any): any => {
  if (!data || typeof data !== 'object') return data;
  
  if (Array.isArray(data)) {
    return data.map(transformDashboardData);
  }
  
  const result: any = {};
  
  for (const [key, value] of Object.entries(data)) {
    // Convert snake_case to camelCase
    const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
    
    // Recursively transform nested objects
    result[camelKey] = transformDashboardData(value);
  }
  
  return result;
};

// API functions
export const apiService = {
  // Dashboard - Transform snake_case to camelCase
  getDashboardMetrics: () => 
    api.get(endpoints.dashboardMetrics).then(res => {
      console.log('Dashboard metrics (raw):', res.data); // Debug
      const transformed = transformDashboardData(res.data);
      console.log('Dashboard metrics (transformed):', transformed); // Debug
      return transformed;
    }),
  
  getQuickStats: () => 
    api.get(endpoints.quickStats).then(res => {
      console.log('Quick stats (raw):', res.data); // Debug
      const transformed = transformDashboardData(res.data);
      console.log('Quick stats (transformed):', transformed); // Debug
      return transformed;
    }),
  
  // Scans
  startScan: (targetIp: string, scanName?: string) => {
    console.log('Starting scan with:', { targetIp, scanName });
    return api.post(endpoints.startScan, null, {
      params: { target_ip: targetIp, scan_name: scanName }
    }).then(res => {
      console.log('Scan start response:', res.data);
      return res.data;
    }).catch(error => {
      console.error('Scan start error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      throw error;
    });
  },
  
  getScanStatus: (scanId: string) => 
    api.get(endpoints.scanStatus(scanId)).then(res => res.data),
  
  abortScan: (scanId: string) => 
    api.post(endpoints.abortScan(scanId)).then(res => res.data),
  
  listScans: () => api.get(endpoints.listScans).then(res => res.data),
  
  // Reports
  getScanReport: (scanId: string) => 
    api.get(endpoints.scanReport(scanId)).then(res => res.data),
  
  downloadReport: (scanId: string) => 
    api.get(endpoints.downloadReport(scanId), { responseType: 'blob' }),
  
  listReports: () => api.get(endpoints.listReports).then(res => res.data),
  
  deleteReport: (reportId: string) => 
    api.delete(endpoints.deleteReport(reportId)).then(res => res.data),
};

// WebSocket helper
export const createWebSocket = (scanId: string): WebSocket => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.hostname === 'localhost' ? 'localhost:8000' : window.location.host;
  return new WebSocket(`${protocol}//${host}/api/scans/ws/${scanId}`);
};

// IP validation
export const isValidIP = (ip: string): boolean => {
  const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  return ipRegex.test(ip);
};

// Format date
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Severity color mapping
export const severityColors = {
  critical: {
    bg: 'bg-critical',
    text: 'text-critical',
    border: 'border-critical',
    light: 'bg-critical-light',
  },
  high: {
    bg: 'bg-high',
    text: 'text-high',
    border: 'border-high',
    light: 'bg-high-light',
  },
  medium: {
    bg: 'bg-medium',
    text: 'text-medium',
    border: 'border-medium',
    light: 'bg-medium-light',
  },
  low: {
    bg: 'bg-low',
    text: 'text-low',
    border: 'border-low',
    light: 'bg-low-light',
  },
};