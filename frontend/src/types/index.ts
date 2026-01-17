// Dashboard types
export interface DashboardMetrics {
  totalScans: number;
  completedScans: number;
  lastScan: {
    timestamp: string;
    target: string;
    status: string;
  };
  riskDistribution: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  avgVulnerabilities: number;
  recentScans: any[];
  scanTrend: any[];
}

// WebSocket types
export interface WebSocketMessage {
  type: 'scan_update' | 'scan_completed' | 'scan_failed' | 'scan_aborted' | 'connected' | 'dashboard_update' | 'scan_error' | 'pong' | 'scan_started';
  scan_id?: string;
  data?: {
    progress?: number;
    phase?: string;
    message?: string;
    [key: string]: any;
  };
  timestamp: string;
  error?: string;
  message?: string;
  [key: string]: any;
}

// Scan types
export interface Scan {
  id: string;
  target_ip: string;
  scan_name: string;
  status: string;
  start_time: string;
  end_time?: string;
  created_at: string;
  vulnerabilities: Vulnerability[];
}

export interface Vulnerability {
  id: string;
  port: number;
  service: string;
  name: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  remediation: string;
  cve_id?: string;
  detected_at: string;
}

// Report types
export interface Report {
  id: string;
  scan_id: string;
  target_ip: string;
  scan_name: string;
  scan_date: string;
  vulnerability_count: number;
  highest_severity: 'critical' | 'high' | 'medium' | 'low';
  status: string;
}

// Quick Stats types
export interface QuickStats {
  todayScans: number;
  runningScans: number;
  totalVulnerabilities: number;
  criticalVulnerabilities: number;
  mostScannedIP?: string;
  mostScannedCount: number;
}

// Scan Report types
export interface ScanReport {
  scan: {
    id: string;
    target_ip: string;
    scan_name: string;
    status: string;
    start_time: string;
    end_time: string | null;
    duration: number | null;
    created_at: string;
  };
  summary: {
    total_vulnerabilities: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  vulnerabilities: {
    critical: Vulnerability[];
    high: Vulnerability[];
    medium: Vulnerability[];
    low: Vulnerability[];
  };
}

// Vulnerability type (update if exists, add if not)
export interface Vulnerability {
  id: string;
  port: number;
  service: string;
  name: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  remediation: string;
  cve_id?: string;
  detected_at: string;
}

// Vulnerability table props
export interface VulnerabilityTableProps {
  vulnerabilities: Vulnerability[];
  severity: string;
}