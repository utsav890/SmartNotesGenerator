import os

from pathlib import Path
from dotenv import load_dotenv

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Load .env from the backend folder
BASE_DIR = Path(__file__).resolve().parent.parent
ENV_PATH = BASE_DIR / ".env"

load_dotenv(ENV_PATH)

import os
import re
from pathlib import Path
from dotenv import load_dotenv

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Load .env from the backend folder
BASE_DIR = Path(__file__).resolve().parent.parent
ENV_PATH = BASE_DIR / ".env"

load_dotenv(ENV_PATH)

# Detect Cloud Run production environment
is_cloud_run = bool(os.getenv("K_SERVICE"))

# Read MySQL / SQLite connection URL
raw_database_url = os.getenv("DATABASE_URL")

# Fail loudly on Cloud Run if DATABASE_URL is not set
if is_cloud_run and not raw_database_url:
    raise RuntimeError(
        "CRITICAL DATABASE ERROR: DATABASE_URL environment variable is missing on Cloud Run. "
        "A persistent database connection string (e.g. Aiven MySQL) is mandatory in production."
    )

DATABASE_URL = raw_database_url or "sqlite:///./smart_notes.db"

# Strip ?ssl-mode=REQUIRED or &ssl-mode=... if present
# (PyMySQL rejects ssl-mode as a URL query param when SSL dictionary is supplied via connect_args)
if "ssl-mode=" in DATABASE_URL:
    DATABASE_URL = re.sub(r'([?&])ssl-mode=[^&]+(&?)', r'\1\2', DATABASE_URL).rstrip('?&')

connect_args = {}
engine_kwargs = {
    "echo": False,
}

if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}
    engine_kwargs.update({
        "connect_args": connect_args,
        "pool_pre_ping": False,
    })
else:
    # Aiven MySQL 8.4 TLS configuration without requiring a local ca.pem file
    connect_args = {
        "ssl": {
            "check_hostname": False
        }
    }
    engine_kwargs.update({
        "connect_args": connect_args,
        "pool_pre_ping": True,
        "pool_recycle": 280,
        "pool_size": 5,
        "max_overflow": 10,
    })

# Create database engine
engine = create_engine(DATABASE_URL, **engine_kwargs)

# Create database sessions
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

# Base class for SQLAlchemy models
Base = declarative_base()


# Dependency for FastAPI routes
def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()

# Create database sessions
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

# Base class for SQLAlchemy models
Base = declarative_base()


# Dependency for FastAPI routes
def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()