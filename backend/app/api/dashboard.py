from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from datetime import datetime, timedelta

from ..db.session import get_db
from ..models.scan import Scan, Vulnerability

router = APIRouter()

@router.get("/metrics")
async def get_dashboard_metrics(db: Session = Depends(get_db)):
    """Get dashboard metrics and statistics"""
    
    # Total scans
    total_scans = db.query(func.count(Scan.id)).scalar() or 0
    
    # Completed scans
    completed_scans = db.query(func.count(Scan.id)).filter(Scan.status == 'completed').scalar() or 0
    
    # Last scan timestamp
    last_scan = db.query(Scan).order_by(desc(Scan.created_at)).first()
    
    # Vulnerability counts by severity
    severity_counts = db.query(
        Vulnerability.severity,
        func.count(Vulnerability.id)
    ).group_by(Vulnerability.severity).all()
    
    # Convert to dictionary
    risk_distribution = {
        "critical": 0,
        "high": 0,
        "medium": 0,
        "low": 0
    }
    
    for severity, count in severity_counts:
        if severity in risk_distribution:
            risk_distribution[severity] = count
    
    # Average vulnerabilities per scan
    avg_vulnerabilities = 0
    if completed_scans > 0:
        total_vulns = db.query(func.count(Vulnerability.id)).scalar() or 0
        avg_vulnerabilities = round(total_vulns / completed_scans, 1)
    
    # Recent scans (last 10)
    recent_scans = db.query(Scan).order_by(desc(Scan.created_at)).limit(10).all()
    
    recent_scans_data = []
    for scan in recent_scans:
        recent_scans_data.append({
            "id": scan.id,
            "target_ip": scan.target_ip,
            "scan_name": scan.scan_name,
            "status": scan.status,
            "start_time": scan.start_time,
            "vulnerability_count": len(scan.vulnerabilities),
            "duration": (scan.end_time - scan.start_time).total_seconds() if scan.end_time else None
        })
    
    # Scan trend (last 7 days)
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    
    daily_scans = db.query(
        func.date(Scan.created_at).label('date'),
        func.count(Scan.id).label('count')
    ).filter(Scan.created_at >= seven_days_ago).group_by(func.date(Scan.created_at)).all()
    
    scan_trend = [
        {"date": str(date), "count": count}
        for date, count in daily_scans
    ]
    
    return {
        "totalScans": total_scans,
        "completedScans": completed_scans,
        "lastScan": {
            "timestamp": last_scan.created_at if last_scan else None,
            "target": last_scan.target_ip if last_scan else None,
            "status": last_scan.status if last_scan else None
        },
        "riskDistribution": risk_distribution,
        "avgVulnerabilities": avg_vulnerabilities,
        "recentScans": recent_scans_data,
        "scanTrend": scan_trend
    }

@router.get("/stats")
async def get_quick_stats(db: Session = Depends(get_db)):
    """Get quick statistics for dashboard widgets"""
    
    # Today's scans
    today = datetime.utcnow().date()
    today_scans = db.query(func.count(Scan.id)).filter(
        func.date(Scan.created_at) == today
    ).scalar() or 0
    
    # Running scans
    running_scans = db.query(func.count(Scan.id)).filter(
        Scan.status == 'running'
    ).scalar() or 0
    
    # Total vulnerabilities
    total_vulnerabilities = db.query(func.count(Vulnerability.id)).scalar() or 0
    
    # Critical vulnerabilities
    critical_vulns = db.query(func.count(Vulnerability.id)).filter(
        Vulnerability.severity == 'critical'
    ).scalar() or 0
    
    # Most scanned IP
    most_scanned = db.query(
        Scan.target_ip,
        func.count(Scan.id).label('scan_count')
    ).group_by(Scan.target_ip).order_by(desc('scan_count')).first()
    
    return {
        "todayScans": today_scans,
        "runningScans": running_scans,
        "totalVulnerabilities": total_vulnerabilities,
        "criticalVulnerabilities": critical_vulns,
        "mostScannedIP": most_scanned[0] if most_scanned else None,
        "mostScannedCount": most_scanned[1] if most_scanned else 0
    }