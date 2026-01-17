from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import scans, dashboard, reports
from app.db.session import create_tables
import uvicorn

# Create FastAPI app
app = FastAPI(
    title="Vulnerability Scanner",
    description="Lightweight vulnerability scanner using Nmap",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(scans.router, prefix="/api/scans", tags=["scans"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["dashboard"])
app.include_router(reports.router, prefix="/api/reports", tags=["reports"])

@app.on_event("startup")
async def startup_event():
    """Run on application startup"""
    print("Creating database tables...")
    create_tables()
    print("Database tables created!")

@app.get("/")
async def root():
    return {"message": "Vulnerability Scanner API", "status": "running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)