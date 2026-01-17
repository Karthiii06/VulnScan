import ipaddress
import re

def validate_ip_address(ip_str: str) -> bool:
    """Validate if string is a valid IP address"""
    try:
        ipaddress.ip_address(ip_str)
        return True
    except ValueError:
        return False

def sanitize_scan_name(name: str) -> str:
    """Remove dangerous characters from scan name"""
    if not name:
        return "Unnamed Scan"
    
    # Remove any HTML tags or scripts
    sanitized = re.sub(r'<[^>]*>', '', name)
    # Limit length
    return sanitized[:100]

def is_valid_port(port: int) -> bool:
    """Check if port is valid"""
    return 1 <= port <= 65535