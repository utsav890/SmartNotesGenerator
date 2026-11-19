"""
Shared Test Database Fixture for SmartNotes AI Test Suites
Provides a single clean SQLite test engine and overrides database dependencies.
"""

from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import app.database as db_module
from app.database import Base, get_db
from app.auth import rate_limiter
from app.main import app

TEST_DB_FILE = Path(__file__).resolve().parent / "test_shared.db"
if TEST_DB_FILE.exists():
    try:
        TEST_DB_FILE.unlink()
    except Exception:
        pass

test_engine = create_engine(
    f"sqlite:///{TEST_DB_FILE}",
    connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=test_engine
)

# Bind app database to test SQLite database
db_module.engine = test_engine
db_module.SessionLocal = TestingSessionLocal
Base.metadata.create_all(bind=test_engine)

# Increase rate limiter capacity during test runs
rate_limiter.max_requests = 1000
rate_limiter.history.clear()


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
