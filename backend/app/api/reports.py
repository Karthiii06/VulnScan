from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List
import json
from datetime import datetime

from ..db.session import get_db
from ..models.scan import Scan, Vulnerability
from ..services.report_generator import ReportGenerator
from ..core.config import settings

router = APIRouter()

@router.get("/")
async def list_reports(db: Session = Depends(get_db)):
    """List all scan reports"""
    scans = db.query(Scan).order_by(Scan.created_at.desc()).all()
    
    reports = []
    for scan in scans:
        # Count vulnerabilities by severity
        critical = db.query(Vulnerability).filter(
            Vulnerability.scan_id == scan.id,
            Vulnerability.severity == 'critical'
        ).count()
        
        high = db.query(Vulnerability).filter(
            Vulnerability.scan_id == scan.id,
            Vulnerability.severity == 'high'
        ).count()
        
        medium = db.query(Vulnerability).filter(
            Vulnerability.scan_id == scan.id,
            Vulnerability.severity == 'medium'
        ).count()
        
        low = db.query(Vulnerability).filter(
            Vulnerability.scan_id == scan.id,
            Vulnerability.severity == 'low'
        ).count()
        
        # Determine highest severity
        highest_severity = 'low'
        if critical > 0:
            highest_severity = 'critical'
        elif high > 0:
            highest_severity = 'high'
        elif medium > 0:
            highest_severity = 'medium'
        
        reports.append({
            'id': scan.id,
            'target_ip': scan.target_ip,
            'scan_name': scan.scan_name,
            'scan_date': scan.created_at.isoformat(),
            'vulnerability_count': len(scan.vulnerabilities),
            'highest_severity': highest_severity,
            'status': scan.status
        })
    
    return reports

@router.get("/{scan_id}")
async def get_scan_report(scan_id: str, db: Session = Depends(get_db)):
    """Get detailed report for a specific scan"""
    scan = db.query(Scan).filter(Scan.id == scan_id).first()
    
    if not scan:
        raise HTTPException(status_code=404, detail="Scan report not found")
    
    # Group vulnerabilities by severity
    vulnerabilities = {
        'critical': [],
        'high': [],
        'medium': [],
        'low': []
    }
    
    for vuln in scan.vulnerabilities:
        vulnerabilities[vuln.severity].append({
            'id': vuln.id,
            'port': vuln.port,
            'service': vuln.service,
            'name': vuln.name,
            'severity': vuln.severity,
            'description': vuln.description,
            'remediation': vuln.remediation,
            'cve_id': vuln.cve_id,
            'detected_at': vuln.detected_at.isoformat()
        })
    
    # Calculate summary
    total_vulns = len(scan.vulnerabilities)
    critical = len(vulnerabilities['critical'])
    high = len(vulnerabilities['high'])
    medium = len(vulnerabilities['medium'])
    low = len(vulnerabilities['low'])
    
    # Calculate duration if scan completed
    duration = None
    if scan.start_time and scan.end_time:
        duration = (scan.end_time - scan.start_time).total_seconds()
    
    return {
        'scan': {
            'id': scan.id,
            'target_ip': scan.target_ip,
            'scan_name': scan.scan_name,
            'status': scan.status,
            'start_time': scan.start_time.isoformat() if scan.start_time else None,
            'end_time': scan.end_time.isoformat() if scan.end_time else None,
            'duration': duration,
            'created_at': scan.created_at.isoformat()
        },
        'summary': {
            'total_vulnerabilities': total_vulns,
            'critical': critical,
            'high': high,
            'medium': medium,
            'low': low
        },
        'vulnerabilities': vulnerabilities
    }

@router.get("/{scan_id}/download")
async def download_report(scan_id: str, db: Session = Depends(get_db)):
    """Download PDF report for a scan"""
    try:
        scan = db.query(Scan).filter(Scan.id == scan_id).first()
        
        if not scan:
            raise HTTPException(status_code=404, detail="Scan report not found")
        
        if scan.status != 'completed':
            raise HTTPException(status_code=400, detail="Scan is not completed yet")
        
        # Get the complete report data
        report_data = await get_scan_report(scan_id, db)
        
        # Create ReportGenerator instance and generate PDF
        generator = ReportGenerator()
        pdf_data = generator.generate_pdf(report_data)
        
        # Return PDF file
        from fastapi.responses import Response
        return Response(
            content=pdf_data,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=vuln_report_{scan.target_ip}_{scan.id[:8]}.pdf"
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_traceback = traceback.format_exc()
        print("\n" + "="*60)
        print("PDF GENERATION ERROR DETAILS:")
        print("="*60)
        print(f"Error Type: {type(e).__name__}")
        print(f"Error Message: {str(e)}")
        print(f"Full Traceback:\n{error_traceback}")
        print("="*60 + "\n")
        
        # Return a simple error PDF instead of failing
        from reportlab.lib.pagesizes import letter
        from reportlab.pdfgen import canvas
        import io
        
        buffer = io.BytesIO()
        c = canvas.Canvas(buffer, pagesize=letter)
        c.setFont("Helvetica-Bold", 16)
        c.drawString(100, 750, "PDF Generation Error")
        c.setFont("Helvetica", 12)
        c.drawString(100, 720, f"Scan: {scan_id if 'scan' in locals() else 'Unknown'}")
        c.drawString(100, 700, f"Error: {str(e)[:100]}...")
        c.drawString(100, 680, "Check backend logs for details.")
        c.save()
        
        buffer.seek(0)
        pdf_data = buffer.read()
        
        from fastapi.responses import Response
        return Response(
            content=pdf_data,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=error_report_{scan_id[:8]}.pdf"
            }
        )

@router.delete("/{report_id}")
async def delete_report(report_id: str, db: Session = Depends(get_db)):
    """Delete a scan report and associated data"""
    # Find the scan
    scan = db.query(Scan).filter(Scan.id == report_id).first()
    
    if not scan:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Delete associated vulnerabilities
    db.query(Vulnerability).filter(Vulnerability.scan_id == report_id).delete()
    
    # Delete the scan
    db.delete(scan)
    db.commit()
    
    return {"message": "Report deleted successfully"}