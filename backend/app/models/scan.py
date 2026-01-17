from sqlalchemy import Column, String, Integer, DateTime, Enum, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime
from ..db.session import Base
import sqlalchemy as sa

class Scan(Base):
    __tablename__ = "scans"
    
    # For SQLite compatibility, use String instead of UUID
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    target_ip = Column(String(45), nullable=False)  # IPv6 compatible length
    scan_name = Column(String(255))
    status = Column(
        Enum('pending', 'running', 'completed', 'failed', 'aborted', name='scan_status'),
        default='pending'
    )
    start_time = Column(DateTime, default=datetime.utcnow)
    end_time = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    vulnerabilities = relationship("Vulnerability", back_populates="scan", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Scan(id={self.id}, target={self.target_ip}, status={self.status})>"

class Vulnerability(Base):
    __tablename__ = "vulnerabilities"
    
    # For SQLite compatibility, use String instead of UUID
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    scan_id = Column(String, ForeignKey('scans.id', ondelete='CASCADE'))
    port = Column(Integer, nullable=False)
    service = Column(String(100))
    name = Column(String(255))
    severity = Column(
        Enum('low', 'medium', 'high', 'critical', name='vuln_severity'),
        default='low'
    )
    description = Column(String(1000))
    remediation = Column(String(1000))
    cve_id = Column(String(50))
    detected_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    scan = relationship("Scan", back_populates="vulnerabilities")
    
    def __repr__(self):
        return f"<Vulnerability(port={self.port}, severity={self.severity})>"