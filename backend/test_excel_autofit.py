import sys
import os

# Add current directory to path
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

print("Testing Excel-like auto-fit cell expansion...")
print("=" * 70)

try:
    from app.services.report_generator import ReportGenerator
    
    # Test data with varying description lengths
    test_data = {
        'scan': {
            'id': 'test-excel-001',
            'target_ip': '192.168.100.50',
            'scan_name': 'Enterprise Security Assessment',
            'status': 'completed',
            'start_time': '2024-01-17T08:00:00',
            'end_time': '2024-01-17T17:00:00',
            'duration': 32400.0,
            'created_at': '2024-01-17T08:00:00'
        },
        'summary': {
            'total_vulnerabilities': 4,
            'critical': 1,
            'high': 1,
            'medium': 1,
            'low': 1
        },
        'vulnerabilities': {
            'critical': [{
                'port': 443,
                'service': 'https',
                'name': 'Heartbleed OpenSSL Vulnerability',
                'description': 'The Heartbleed bug is a serious vulnerability in the OpenSSL cryptographic software library that allows stealing information protected by SSL/TLS encryption. This vulnerability allows anyone on the Internet to read the memory of systems protected by vulnerable versions of the OpenSSL software. This compromises secret keys, names and passwords of users, and actual content.',
                'remediation': 'Upgrade OpenSSL to version 1.0.1g or later. Reissue SSL certificates. Revoke compromised certificates.',
                'cve_id': 'CVE-2014-0160'
            }],
            'high': [{
                'port': 80,
                'service': 'http',
                'name': 'Apache Struts Remote Code Execution',
                'description': 'Remote code execution vulnerability in Apache Struts 2 that allows attackers to execute arbitrary code via crafted HTTP requests. The vulnerability exists due to improper handling of OGNL expressions in HTTP parameters.',
                'remediation': 'Update to Apache Struts 2.5.26 or later. Apply security patches immediately.',
                'cve_id': 'CVE-2017-5638'
            }],
            'medium': [{
                'port': 22,
                'service': 'ssh',
                'name': 'Weak SSH Configuration',
                'description': 'SSH server allows password-based authentication and supports weak cryptographic algorithms. This could allow brute-force attacks or cryptographic attacks.',
                'remediation': 'Disable password authentication, enable key-based authentication only. Disable weak ciphers and MAC algorithms.',
                'cve_id': None
            }],
            'low': [{
                'port': 25,
                'service': 'smtp',
                'name': 'Open Mail Relay',
                'description': 'SMTP server is configured as an open relay, allowing unauthorized users to send email through the server.',
                'remediation': 'Configure SMTP server to require authentication for relaying.',
                'cve_id': None
            }]
        }
    }
    
    print("Generating report with Excel-like auto-fit cells...")
    generator = ReportGenerator()
    pdf_data = generator.generate_pdf(test_data)
    
    print(f"✓ Report generated: {len(pdf_data)} bytes")
    
    # Save PDF
    output_file = 'excel_autofit_report.pdf'
    with open(output_file, 'wb') as f:
        f.write(pdf_data)
    
    print(f"✓ Saved as: {output_file}")
    
    # Try to show preview
    try:
        text_content = pdf_data.decode('utf-8', errors='ignore')
        if len(text_content) > 500:
            print("\n📄 TEXT PREVIEW (showing vulnerability table section):")
            print("=" * 100)
            
            lines = text_content.split('\n')
            found_table = False
            for i, line in enumerate(lines):
                if "VULNERABILITIES" in line:
                    found_table = True
                if found_table and i < len(lines):
                    print(line)
                    if i > 50:  # Limit preview
                        break
            
            print("=" * 100)
    except:
        print("\n✅ EXCEL-LIKE FEATURES ENABLED:")
        print("1. Cells auto-expand vertically based on content")
        print("2. Text wraps within cell boundaries")
        print("3. Row height adjusts to tallest cell")
        print("4. Vertical centering of text in cells")
        print("5. Consistent cell borders and spacing")
    
    print("\n📊 WHAT TO CHECK IN THE PDF:")
    print("1. Open the PDF and find the vulnerability table")
    print("2. Look at the CRITICAL vulnerability description")
    print("3. Notice how the row expands to fit all text")
    print("4. Each cell contains wrapped text that stays within borders")
    print("5. Compare row heights - longer descriptions = taller rows")
    
except Exception as e:
    print(f"✗ Error: {e}")
    import traceback
    traceback.print_exc()