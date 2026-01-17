import nmap
import asyncio
from typing import Dict, Any, Optional
from datetime import datetime
from ..core.config import settings
from ..core.security import validate_ip_address

class ScannerError(Exception):
    pass

class NmapScanner:
    def __init__(self):
        self.nm = nmap.PortScanner()
        
    async def quick_scan(self, target_ip: str) -> Dict[str, Any]:
        """Scan top 50 ports with optimized flags"""
        if not validate_ip_address(target_ip):
            raise ScannerError(f"Invalid IP address: {target_ip}")
        
        try:
            print(f"Starting scan for {target_ip}...")
            
            # Perform the scan
            scan_result = await asyncio.to_thread(
                self.nm.scan,
                hosts=target_ip,
                arguments=settings.NMAP_ARGS
            )
            
            print(f"Scan completed for {target_ip}")
            return self._parse_results(target_ip, scan_result)
            
        except Exception as e:
            raise ScannerError(f"Scan failed: {str(e)}")
    
    def _parse_results(self, target_ip: str, raw_result: Dict) -> Dict[str, Any]:
        """Parse Nmap output into structured data"""
        vulnerabilities = []
        open_ports = []
        
        if 'scan' not in raw_result or target_ip not in raw_result['scan']:
            return {'open_ports': [], 'vulnerabilities': []}
        
        host_data = raw_result['scan'][target_ip]
        
        # Get open ports
        if 'tcp' in host_data:
            for port, port_info in host_data['tcp'].items():
                if port_info['state'] == 'open':
                    open_ports.append(port)
                    
                    # Create vulnerability entry based on service
                    vuln = self._detect_vulnerability(port, port_info)
                    if vuln:
                        vulnerabilities.append(vuln)
        
        return {
            'target_ip': target_ip,
            'open_ports': open_ports,
            'vulnerabilities': vulnerabilities,
            'host_status': host_data.get('status', {}).get('state', 'unknown'),
            'scan_timestamp': datetime.utcnow().isoformat()
        }
    
    def _detect_vulnerability(self, port: int, port_info: Dict) -> Optional[Dict]:
        """Simple vulnerability detection based on port and service"""
        service = port_info.get('name', '').lower()
        version = port_info.get('version', '').lower()
        
        # Common vulnerability patterns
        vuln_patterns = {
            'ftp': {
                'name': 'FTP Anonymous Login Enabled',
                'severity': 'medium',
                'description': 'FTP server allows anonymous login without authentication',
                'remediation': 'Disable anonymous FTP access or require authentication'
            },
            'telnet': {
                'name': 'Telnet Service Detected',
                'severity': 'high',
                'description': 'Telnet transmits credentials in plain text',
                'remediation': 'Replace Telnet with SSH'
            },
            'http': {
                'name': 'HTTP Service Without HTTPS',
                'severity': 'medium',
                'description': 'Web service running without encryption',
                'remediation': 'Enable HTTPS/TLS encryption'
            },
            'smtp': {
                'name': 'Open SMTP Relay',
                'severity': 'medium',
                'description': 'SMTP server may allow open relaying',
                'remediation': 'Configure SMTP authentication and relay restrictions'
            },
            'ssh': {
                'name': 'SSH Service Detected',
                'severity': 'low',
                'description': 'SSH service is running',
                'remediation': 'Ensure SSH is configured with strong authentication'
            },
            'rdp': {
                'name': 'Remote Desktop Enabled',
                'severity': 'medium',
                'description': 'Remote Desktop Protocol is accessible',
                'remediation': 'Restrict RDP access to trusted networks'
            },
            'netbios': {
                'name': 'NetBIOS Service Exposed',
                'severity': 'medium',
                'description': 'NetBIOS service may expose system information',
                'remediation': 'Disable NetBIOS if not needed'
            },
            'snmp': {
                'name': 'SNMP Service Accessible',
                'severity': 'medium',
                'description': 'SNMP may expose system information',
                'remediation': 'Secure SNMP with proper community strings'
            }
        }
        
        # Check for specific patterns
        for service_key, vuln_info in vuln_patterns.items():
            if service_key in service:
                return {
                    'port': port,
                    'service': service,
                    'version': version,
                    **vuln_info
                }
        
        # Generic vulnerability for any open port - ALWAYS include severity
        return {
            'port': port,
            'service': service,
            'version': version,
            'name': f'Open {service.upper()} Port Detected',
            'severity': 'low',  # Default severity
            'description': f'Port {port} is open running {service or "unknown service"}',
            'remediation': f'Review if port {port} needs to be open. Close if unnecessary.'
        }

# Global scanner instance
scanner = NmapScanner()