import os
from typing import Dict, Any
from datetime import datetime
from jinja2 import Template
import io
import textwrap

class ReportGenerator:
    def __init__(self):
        self.template_dir = os.path.join(os.path.dirname(__file__), "..", "templates")
        
    def generate_pdf(self, scan_data: Dict[str, Any]) -> bytes:
        """Generate a properly formatted PDF report with Excel-like auto-fit cells"""
        print("INFO: Generating PDF report with auto-fit cells...")
        
        try:
            # Try to use reportlab if available
            import reportlab
            return self._generate_pdf_with_autofit(scan_data)
        except ImportError:
            print("WARNING: reportlab not installed. Using formatted text fallback.")
            return self._generate_text_with_autofit(scan_data)
    
    def _generate_pdf_with_autofit(self, scan_data: Dict[str, Any]) -> bytes:
        """Generate PDF with Excel-like auto-fit cells"""
        from reportlab.lib.pagesizes import letter
        from reportlab.pdfgen import canvas
        from reportlab.lib import colors
        
        buffer = io.BytesIO()
        c = canvas.Canvas(buffer, pagesize=letter)
        
        # Configuration
        left_margin = 40
        top_margin = 750
        page_width = letter[0]
        page_height = letter[1]
        
        # Font sizes
        title_size = 20
        heading_size = 14
        normal_size = 11
        table_header_size = 10
        table_cell_size = 9
        
        # Line heights
        title_line_height = 24
        heading_line_height = 18
        normal_line_height = 14
        table_line_height = 12
        
        # Column setup (like Excel columns)
        col_config = [
            {"name": "PORT", "width": 50, "wrap": False, "align": "center"},
            {"name": "SERVICE", "width": 80, "wrap": True, "align": "left"},
            {"name": "VULNERABILITY", "width": 130, "wrap": True, "align": "left"},
            {"name": "DESCRIPTION", "width": 200, "wrap": True, "align": "left"},
        ]
        
        # Calculate column positions
        col_x = [left_margin]
        col_widths = [col["width"] for col in col_config]
        for i in range(len(col_widths)-1):
            col_x.append(col_x[-1] + col_widths[i])
        
        current_y = top_margin
        
        # Helper function to calculate text height
        def calculate_text_height(text, width, font_size=table_cell_size, max_lines=None):
            """Calculate how many lines text will take with wrapping"""
            if not text:
                return 1
            
            # Estimate characters per line (approx)
            chars_per_line = int(width / (font_size * 0.6))
            if chars_per_line < 10:
                chars_per_line = 10
            
            # Wrap the text
            wrapped = textwrap.wrap(str(text), width=chars_per_line)
            
            if max_lines and len(wrapped) > max_lines:
                return max_lines
            return max(1, len(wrapped))
        
        # Helper function to draw wrapped text in a cell
        def draw_cell_text(c, text, x, y, width, height, font_size=table_cell_size, 
                          align="left", max_lines=None, padding=2):
            """Draw text in a cell with wrapping and vertical centering"""
            if not text:
                return
            
            # Calculate characters per line
            chars_per_line = int((width - padding * 2) / (font_size * 0.6))
            if chars_per_line < 5:
                chars_per_line = 5
            
            # Wrap text
            wrapped = textwrap.wrap(str(text), width=chars_per_line)
            
            if max_lines and len(wrapped) > max_lines:
                wrapped = wrapped[:max_lines]
                if len(wrapped[-1]) > chars_per_line - 3:
                    wrapped[-1] = wrapped[-1][:chars_per_line-3] + "..."
                else:
                    wrapped[-1] = wrapped[-1] + "..."
            
            # Calculate total text height
            text_height = len(wrapped) * table_line_height
            
            # Calculate starting Y position for vertical centering
            if text_height < height:
                start_y = y - (height - text_height) / 2 - table_line_height
            else:
                start_y = y - table_line_height - padding
            
            # Draw each line
            for i, line in enumerate(wrapped):
                line_y = start_y - (i * table_line_height)
                
                # Handle alignment
                if align == "center":
                    text_width = c.stringWidth(line, "Helvetica", font_size)
                    draw_x = x + (width - text_width) / 2
                elif align == "right":
                    text_width = c.stringWidth(line, "Helvetica", font_size)
                    draw_x = x + width - text_width - padding
                else:  # left
                    draw_x = x + padding
                
                c.drawString(draw_x, line_y, line)
            
            return len(wrapped)
        
        # Title
        c.setFont("Helvetica-Bold", title_size)
        c.drawCentredString(page_width/2, current_y, "VULNERABILITY SCAN REPORT")
        current_y -= title_line_height * 1.5
        
        # Scan Information
        c.setFont("Helvetica-Bold", heading_size)
        c.drawString(left_margin, current_y, "SCAN INFORMATION")
        current_y -= heading_line_height
        
        c.setFont("Helvetica", normal_size)
        scan_info = [
            ("Target IP:", scan_data['scan']['target_ip']),
            ("Scan Name:", scan_data['scan']['scan_name']),
            ("Status:", scan_data['scan']['status'].upper()),
        ]
        
        for label, value in scan_info:
            c.drawString(left_margin, current_y, f"{label:<15}")
            c.drawString(left_margin + 100, current_y, f"{value}")
            current_y -= normal_line_height
        
        current_y -= normal_line_height
        
        # Executive Summary
        c.setFont("Helvetica-Bold", heading_size)
        c.drawString(left_margin, current_y, "EXECUTIVE SUMMARY")
        current_y -= heading_line_height
        
        c.setFont("Helvetica", normal_size)
        summary_items = [
            ("Total Vulnerabilities:", str(scan_data['summary']['total_vulnerabilities'])),
            ("Critical:", str(scan_data['summary']['critical'])),
            ("High:", str(scan_data['summary']['high'])),
            ("Medium:", str(scan_data['summary']['medium'])),
            ("Low:", str(scan_data['summary']['low'])),
        ]
        
        for label, value in summary_items:
            c.drawString(left_margin, current_y, f"{label:<25}")
            c.drawString(left_margin + 160, current_y, f"{value}")
            current_y -= normal_line_height
        
        current_y -= normal_line_height * 1.5
        
        # Vulnerability Details
        severity_titles = {
            'critical': 'CRITICAL VULNERABILITIES',
            'high': 'HIGH SEVERITY VULNERABILITIES',
            'medium': 'MEDIUM SEVERITY VULNERABILITIES',
            'low': 'LOW SEVERITY VULNERABILITIES',
        }
        
        severity_colors = {
            'critical': colors.red,
            'high': colors.orange,
            'medium': colors.HexColor("#CCCC00"),  # Greenish-yellow
            'low': colors.blue,
        }
        
        for severity in ['critical', 'high', 'medium', 'low']:
            vulns = scan_data['vulnerabilities'][severity]
            if not vulns:
                continue
            
            # Check for new page
            if current_y < 200:
                c.showPage()
                current_y = top_margin
                c.setFont("Helvetica", normal_size)
            
            # Severity header
            c.setFont("Helvetica-Bold", 12)
            c.setFillColor(severity_colors[severity])
            c.drawString(left_margin, current_y, severity_titles[severity])
            c.setFillColor(colors.black)
            current_y -= table_line_height * 1.5
            
            # Table header
            c.setFont("Helvetica-Bold", table_header_size)
            header_height = table_line_height + 8
            
            # Draw header cells
            for i, col in enumerate(col_config):
                x = col_x[i]
                width = col["width"]
                
                # Draw cell border
                c.rect(x, current_y - header_height, width, header_height, stroke=1, fill=0)
                
                # Draw header text (centered)
                text = col["name"]
                text_width = c.stringWidth(text, "Helvetica-Bold", table_header_size)
                c.drawString(x + (width - text_width)/2, current_y - header_height + 4, text)
            
            current_y -= header_height + 5
            c.setFont("Helvetica", table_cell_size)
            
            # Draw vulnerability rows
            for vuln in vulns[:15]:  # Limit to 15 per severity
                # Get data
                port = str(vuln.get('port', 'N/A'))
                service = vuln.get('service', 'N/A') or 'N/A'
                name = vuln.get('name', 'Unknown') or 'Unknown'
                description = vuln.get('description', 'No description') or 'No description'
                
                # Calculate required lines for each cell (like Excel auto-fit)
                port_lines = 1  # PORT doesn't wrap
                service_lines = calculate_text_height(service, col_widths[1] - 4)
                name_lines = calculate_text_height(name, col_widths[2] - 4)
                desc_lines = calculate_text_height(description, col_widths[3] - 4)
                
                # Determine row height based on tallest cell
                max_cell_lines = max(service_lines, name_lines, desc_lines, 1)
                row_height = max_cell_lines * table_line_height + 10
                
                # Check if we need a new page
                if current_y - row_height < 50:
                    c.showPage()
                    current_y = top_margin - table_line_height * 3
                    
                    # Redraw severity header on new page
                    c.setFont("Helvetica-Bold", 12)
                    c.setFillColor(severity_colors[severity])
                    c.drawString(left_margin, current_y + table_line_height * 3, severity_titles[severity])
                    c.setFillColor(colors.black)
                    c.setFont("Helvetica", table_cell_size)
                
                # Draw cell borders for entire row
                for width, x in zip(col_widths, col_x):
                    c.rect(x, current_y - row_height, width, row_height, stroke=1, fill=0)
                
                # Draw PORT (centered, single line)
                port_width = c.stringWidth(port, "Helvetica", table_cell_size)
                c.drawString(col_x[0] + (col_widths[0] - port_width)/2, 
                           current_y - row_height/2 - table_line_height/2, port)
                
                # Draw SERVICE (wrapped, left aligned)
                draw_cell_text(c, service, col_x[1], current_y, 
                             col_widths[1], row_height, align="left")
                
                # Draw VULNERABILITY NAME (wrapped, left aligned)
                draw_cell_text(c, name, col_x[2], current_y, 
                             col_widths[2], row_height, align="left")
                
                # Draw DESCRIPTION (wrapped, left aligned)
                draw_cell_text(c, description, col_x[3], current_y, 
                             col_widths[3], row_height, align="left")
                
                current_y -= row_height + 5
            
            current_y -= table_line_height * 1.5
        
        # Footer
        c.setFont("Helvetica-Oblique", 9)
        c.drawString(left_margin, 40, f"Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}")
        c.drawString(left_margin, 25, "Vulnerability Scanner v1.0.0")
        
        c.save()
        buffer.seek(0)
        return buffer.read()
    
    def _generate_text_with_autofit(self, scan_data: Dict[str, Any]) -> bytes:
        """Generate text report with Excel-like formatting"""
        # Build report
        content = []
        content.append("=" * 120)
        content.append(" " * 40 + "VULNERABILITY SCAN REPORT")
        content.append("=" * 120)
        content.append("")
        
        # Scan Information
        content.append("SCAN INFORMATION")
        content.append("-" * 60)
        content.append(f"{'Target IP:':<20} {scan_data['scan']['target_ip']}")
        content.append(f"{'Scan Name:':<20} {scan_data['scan']['scan_name']}")
        content.append(f"{'Status:':<20} {scan_data['scan']['status'].upper()}")
        if scan_data['scan']['start_time']:
            content.append(f"{'Start Time:':<20} {scan_data['scan']['start_time']}")
        content.append("")
        
        # Executive Summary
        content.append("EXECUTIVE SUMMARY")
        content.append("-" * 60)
        content.append(f"{'Total Vulnerabilities:':<25} {scan_data['summary']['total_vulnerabilities']}")
        content.append(f"{'Critical:':<25} {scan_data['summary']['critical']}")
        content.append(f"{'High:':<25} {scan_data['summary']['high']}")
        content.append(f"{'Medium:':<25} {scan_data['summary']['medium']}")
        content.append(f"{'Low:':<25} {scan_data['summary']['low']}")
        content.append("")
        
        # Vulnerability Details with Excel-like formatting
        severity_titles = {
            'critical': 'CRITICAL VULNERABILITIES',
            'high': 'HIGH SEVERITY VULNERABILITIES',
            'medium': 'MEDIUM SEVERITY VULNERABILITIES',
            'low': 'LOW SEVERITY VULNERABILITIES',
        }
        
        # Column configuration (like Excel column widths)
        col_config = [
            {"name": "PORT", "width": 8, "align": "center"},
            {"name": "SERVICE", "width": 15, "align": "left"},
            {"name": "VULNERABILITY", "width": 35, "align": "left"},
            {"name": "DESCRIPTION", "width": 50, "align": "left"},
        ]
        
        for severity in ['critical', 'high', 'medium', 'low']:
            vulns = scan_data['vulnerabilities'][severity]
            if not vulns:
                continue
            
            content.append(severity_titles[severity])
            content.append("-" * 120)
            
            # Draw header
            header = ""
            for col in col_config:
                if col["align"] == "center":
                    padding = (col["width"] - len(col["name"])) // 2
                    header += " " * padding + col["name"] + " " * (col["width"] - len(col["name"]) - padding) + " "
                else:
                    header += f"{col['name']:<{col['width']}} "
            content.append(header.rstrip())
            content.append("-" * 120)
            
            # Draw rows
            for vuln in vulns:
                port = str(vuln.get('port', 'N/A'))
                service = vuln.get('service', 'N/A') or 'N/A'
                name = vuln.get('name', 'Unknown') or 'Unknown'
                description = vuln.get('description', 'No description') or 'No description'
                
                # Wrap text for each column
                service_wrapped = textwrap.wrap(service, width=col_config[1]["width"])
                name_wrapped = textwrap.wrap(name, width=col_config[2]["width"])
                desc_wrapped = textwrap.wrap(description, width=col_config[3]["width"])
                
                # Determine max lines needed (Excel-like auto-row-height)
                max_lines = max(len(service_wrapped), len(name_wrapped), len(desc_wrapped), 1)
                
                # Create each line
                for line_num in range(max_lines):
                    row_cells = []
                    
                    # PORT (single line, centered)
                    if line_num == 0:
                        padding = (col_config[0]["width"] - len(port)) // 2
                        port_cell = " " * padding + port + " " * (col_config[0]["width"] - len(port) - padding)
                    else:
                        port_cell = " " * col_config[0]["width"]
                    row_cells.append(port_cell)
                    
                    # SERVICE
                    if line_num < len(service_wrapped):
                        service_cell = f"{service_wrapped[line_num]:<{col_config[1]['width']}}"
                    else:
                        service_cell = " " * col_config[1]["width"]
                    row_cells.append(service_cell)
                    
                    # VULNERABILITY NAME
                    if line_num < len(name_wrapped):
                        name_cell = f"{name_wrapped[line_num]:<{col_config[2]['width']}}"
                    else:
                        name_cell = " " * col_config[2]["width"]
                    row_cells.append(name_cell)
                    
                    # DESCRIPTION
                    if line_num < len(desc_wrapped):
                        desc_cell = f"{desc_wrapped[line_num]:<{col_config[3]['width']}}"
                    else:
                        desc_cell = " " * col_config[3]["width"]
                    row_cells.append(desc_cell)
                    
                    content.append(" ".join(row_cells).rstrip())
                
                # Empty line between vulnerabilities
                content.append("")
            
            content.append("")
        
        # Footer
        content.append("=" * 120)
        content.append(f"Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}")
        content.append("Vulnerability Scanner v1.0.0")
        content.append("=" * 120)
        
        return "\n".join(content).encode('utf-8')