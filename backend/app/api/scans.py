from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from typing import List, Optional, Dict
import json
import asyncio
import uuid
from datetime import datetime

from ..db.session import get_db
from ..models.scan import Scan, Vulnerability
from ..services.scanner import scanner, ScannerError
from ..core.security import validate_ip_address, sanitize_scan_name

router = APIRouter()

# Store active scans and their WebSocket connections
active_scans = {}
scan_connections = {}

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.scan_connections: Dict[str, List[WebSocket]] = {}
        self.dashboard_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket, scan_id: str = None):
        await websocket.accept()
        
        if scan_id:
            # For specific scan connections
            if scan_id not in self.scan_connections:
                self.scan_connections[scan_id] = []
            self.scan_connections[scan_id].append(websocket)
            print(f"Client connected to scan {scan_id}")
        else:
            # For dashboard connections
            self.dashboard_connections.append(websocket)
            print("Dashboard client connected")
        
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        
        # Remove from scan-specific connections
        for scan_id, connections in self.scan_connections.items():
            if websocket in connections:
                connections.remove(websocket)
                print(f"Client disconnected from scan {scan_id}")
        
        # Remove from dashboard connections
        if websocket in self.dashboard_connections:
            self.dashboard_connections.remove(websocket)
            print("Dashboard client disconnected")

    async def send_personal_message(self, message: dict, websocket: WebSocket):
        try:
            await websocket.send_json(message)
        except:
            pass

    async def broadcast_to_dashboard(self, message: dict):
        """Send update to all dashboard clients"""
        disconnected_clients = []
        
        for connection in self.dashboard_connections:
            try:
                await connection.send_json(message)
            except:
                disconnected_clients.append(connection)
        
        # Clean up disconnected clients
        for client in disconnected_clients:
            self.disconnect(client)

    async def send_to_scan(self, scan_id: str, message: dict):
        """Send message to all clients subscribed to a specific scan"""
        if scan_id in self.scan_connections:
            disconnected_clients = []
            
            for connection in self.scan_connections[scan_id]:
                try:
                    await connection.send_json(message)
                except:
                    disconnected_clients.append(connection)
            
            # Clean up disconnected clients
            for client in disconnected_clients:
                self.scan_connections[scan_id].remove(client)
                if client in self.active_connections:
                    self.active_connections.remove(client)

    async def broadcast_scan_completion(self, scan_id: str, scan_data: dict):
        """Broadcast scan completion to both scan and dashboard clients"""
        scan_message = {
            "type": "scan_completed",
            "scan_id": scan_id,
            "data": scan_data,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        dashboard_message = {
            "type": "dashboard_update",
            "event": "scan_completed",
            "scan_id": scan_id,
            "timestamp": datetime.utcnow().isoformat(),
            "message": f"Scan {scan_id} completed"
        }
        
        # Send to scan-specific clients
        await self.send_to_scan(scan_id, scan_message)
        
        # Send to dashboard clients
        await self.broadcast_to_dashboard(dashboard_message)
        
        print(f"Broadcasted completion for scan {scan_id}")

    async def send_scan_progress(self, scan_id: str, progress: int, phase: str, message: str):
        """Send scan progress updates"""
        progress_message = {
            "type": "scan_update",
            "scan_id": scan_id,
            "data": {
                "progress": progress,
                "phase": phase,
                "message": message
            },
            "timestamp": datetime.utcnow().isoformat()
        }
        
        await self.send_to_scan(scan_id, progress_message)

manager = ConnectionManager()

@router.websocket("/ws/{scan_id}")
async def websocket_endpoint(websocket: WebSocket, scan_id: str):
    """WebSocket endpoint for real-time scan updates"""
    await manager.connect(websocket, scan_id)
    
    try:
        # Send initial connection confirmation
        await manager.send_personal_message({
            "type": "connected",
            "scan_id": scan_id,
            "message": "Connected to scan updates",
            "timestamp": datetime.utcnow().isoformat()
        }, websocket)
        
        # Keep connection alive
        while True:
            data = await websocket.receive_text()
            # Handle any incoming messages if needed
            try:
                message = json.loads(data)
                if message.get("type") == "ping":
                    await manager.send_personal_message({
                        "type": "pong",
                        "timestamp": datetime.utcnow().isoformat()
                    }, websocket)
            except:
                pass
                
    except WebSocketDisconnect:
        manager.disconnect(websocket)

@router.websocket("/ws/dashboard")
async def dashboard_websocket(websocket: WebSocket):
    """WebSocket endpoint for dashboard real-time updates"""
    await manager.connect(websocket)
    
    try:
        # Send initial connection confirmation
        await manager.send_personal_message({
            "type": "connected",
            "message": "Connected to dashboard updates",
            "timestamp": datetime.utcnow().isoformat()
        }, websocket)
        
        # Keep connection alive
        while True:
            data = await websocket.receive_text()
            # Handle ping messages
            try:
                message = json.loads(data)
                if message.get("type") == "ping":
                    await manager.send_personal_message({
                        "type": "pong",
                        "timestamp": datetime.utcnow().isoformat()
                    }, websocket)
            except:
                pass
                
    except WebSocketDisconnect:
        manager.disconnect(websocket)

@router.post("/start")
async def start_scan(
    target_ip: str,
    scan_name: Optional[str] = None,
    background_tasks: BackgroundTasks = None,
    db: Session = Depends(get_db)
):
    """Start a new vulnerability scan"""
    
    # Validate IP address
    if not validate_ip_address(target_ip):
        raise HTTPException(status_code=400, detail="Invalid IP address")
    
    # Create scan record
    scan_id = str(uuid.uuid4())
    scan = Scan(
        id=scan_id,
        target_ip=target_ip,
        scan_name=sanitize_scan_name(scan_name) if scan_name else f"Scan {datetime.utcnow().strftime('%Y-%m-%d %H:%M')}",
        status="pending"
    )
    
    db.add(scan)
    db.commit()
    db.refresh(scan)
    
    # Start scan in background
    background_tasks.add_task(run_scan_task, scan_id, target_ip, db)
    
    return {
        "scan_id": scan_id,
        "message": "Scan started successfully",
        "status": "pending"
    }

async def run_scan_task(scan_id: str, target_ip: str, db: Session):
    """Background task to run the scan"""
    try:
        # Update status to running
        scan = db.query(Scan).filter(Scan.id == scan_id).first()
        if scan:
            scan.status = "running"
            scan.start_time = datetime.utcnow()
            db.commit()
        
        # Send initial progress
        await manager.send_scan_progress(
            scan_id=scan_id,
            progress=0,
            phase="initializing",
            message="Starting Nmap scan..."
        )
        
        # Phase 1: Port Scanning
        await asyncio.sleep(1)
        await manager.send_scan_progress(
            scan_id=scan_id,
            progress=30,
            phase="port_scan",
            message="Scanning top 50 ports..."
        )
        
        # Perform the scan
        result = await scanner.quick_scan(target_ip)
        
        # Phase 2: Vulnerability Analysis
        await manager.send_scan_progress(
            scan_id=scan_id,
            progress=70,
            phase="vulnerability_analysis",
            message="Analyzing vulnerabilities..."
        )
        
        # Save vulnerabilities to database
        for vuln_data in result.get("vulnerabilities", []):
            vulnerability = Vulnerability(
                id=str(uuid.uuid4()),
                scan_id=scan_id,
                port=vuln_data["port"],
                service=vuln_data.get("service", ""),
                name=vuln_data["name"],
                severity=vuln_data["severity"],
                description=vuln_data["description"],
                remediation=vuln_data["remediation"],
                cve_id=vuln_data.get("cve_id")
            )
            db.add(vulnerability)
        
        # Update scan status
        if scan:
            scan.status = "completed"
            scan.end_time = datetime.utcnow()
            db.commit()
        
        # Send completion
        await manager.send_scan_progress(
            scan_id=scan_id,
            progress=100,
            phase="completed",
            message="Scan completed successfully"
        )
        
        # Broadcast completion to all clients
        await manager.broadcast_scan_completion(scan_id, {
            "target_ip": target_ip,
            "scan_name": scan.scan_name if scan else "Unknown",
            "vulnerability_count": len(result.get("vulnerabilities", [])),
            "status": "completed"
        })
        
    except ScannerError as e:
        # Update scan status to failed
        scan = db.query(Scan).filter(Scan.id == scan_id).first()
        if scan:
            scan.status = "failed"
            scan.end_time = datetime.utcnow()
            db.commit()
        
        error_message = {
            "type": "scan_failed",
            "scan_id": scan_id,
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Send error to scan clients
        await manager.send_to_scan(scan_id, error_message)
        
    except Exception as e:
        scan = db.query(Scan).filter(Scan.id == scan_id).first()
        if scan:
            scan.status = "failed"
            scan.end_time = datetime.utcnow()
            db.commit()
        
        error_message = {
            "type": "scan_error",
            "scan_id": scan_id,
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Send error to scan clients
        await manager.send_to_scan(scan_id, error_message)

# ... Rest of your existing endpoints (abort, status, list scans) remain the same ...
@router.post("/{scan_id}/abort")
async def abort_scan(scan_id: str, db: Session = Depends(get_db)):
    """Abort a running scan"""
    scan = db.query(Scan).filter(Scan.id == scan_id).first()
    
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    
    if scan.status != "running":
        raise HTTPException(status_code=400, detail="Scan is not running")
    
    # Update status
    scan.status = "aborted"
    scan.end_time = datetime.utcnow()
    db.commit()
    
    # Send abort signal via WebSocket
    await manager.send_to_scan(scan_id, {
        "type": "scan_aborted",
        "scan_id": scan_id,
        "message": "Scan was aborted by user",
        "timestamp": datetime.utcnow().isoformat()
    })
    
    return {"message": "Scan aborted successfully"}

@router.get("/{scan_id}/status")
async def get_scan_status(scan_id: str, db: Session = Depends(get_db)):
    """Get current status of a scan"""
    scan = db.query(Scan).filter(Scan.id == scan_id).first()
    
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")
    
    return {
        "scan_id": scan_id,
        "status": scan.status,
        "target_ip": scan.target_ip,
        "scan_name": scan.scan_name,
        "start_time": scan.start_time,
        "end_time": scan.end_time
    }

@router.get("")
async def list_scans(db: Session = Depends(get_db)):
    """List all scans"""
    scans = db.query(Scan).order_by(Scan.created_at.desc()).all()
    
    return [
        {
            "id": scan.id,
            "target_ip": scan.target_ip,
            "scan_name": scan.scan_name,
            "status": scan.status,
            "start_time": scan.start_time,
            "end_time": scan.end_time,
            "vulnerability_count": len(scan.vulnerabilities)
        }
        for scan in scans
    ]