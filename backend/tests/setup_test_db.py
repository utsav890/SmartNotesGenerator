"""
Shared Test Database Fixture for SmartNotes AI Test Suites
Provides a single clean SQLite test engine and overrides database dependencies.
"""

from sqlalchemy import create_engine
from sqlalchemy.pool import StaticPool
from sqlalchemy.orm import sessionmaker

import app.database as db_module
from app.database import Base, get_db
from app.auth import rate_limiter
from app.main import app

test_engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
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
