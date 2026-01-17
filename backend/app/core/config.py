import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    DATABASE_URL = os.getenv("DATABASE_URL")
    REDIS_URL = os.getenv("REDIS_URL")
    SECRET_KEY = os.getenv("SECRET_KEY")
    APP_ENV = os.getenv("APP_ENV", "development")
    
    # Nmap settings
    NMAP_ARGS = "-sV --top-ports 50 -T4 --min-rate 1000 --max-retries 2"
    
    # Scan limits
    MAX_CONCURRENT_SCANS = 3
    SCAN_TIMEOUT_SECONDS = 300
    
    @property
    def is_development(self):
        return self.APP_ENV == "development"

settings = Settings()