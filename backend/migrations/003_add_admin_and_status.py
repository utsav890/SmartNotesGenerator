"""
Migration 003: Add role and is_active columns to users table and grant admin access.
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import text
from app.database import engine

def run_migration():
    with engine.connect() as conn:
        # Check if role column exists
        result = conn.execute(text("SHOW COLUMNS FROM users LIKE 'role'"))
        if not result.fetchone():
            print("Adding 'role' column to users table...")
            conn.execute(text("ALTER TABLE users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'user'"))
            print("Added 'role' column.")
        else:
            print("'role' column already exists.")

        # Check if is_active column exists
        result = conn.execute(text("SHOW COLUMNS FROM users LIKE 'is_active'"))
        if not result.fetchone():
            print("Adding 'is_active' column to users table...")
            conn.execute(text("ALTER TABLE users ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT 1"))
            print("Added 'is_active' column.")
        else:
            print("'is_active' column already exists.")

        # Grant admin access to Utsav's accounts and system
        print("Granting admin privileges to primary accounts...")
        conn.execute(text("""
            UPDATE users 
            SET role = 'admin', is_verified = 1 
            WHERE email IN ('sachanutsav800@gmail.com', 'sachanutsav714@gmail.com', 'system@smartnotes.local')
        """))
        conn.commit()
        print("Migration 003 completed successfully!")

if __name__ == "__main__":
    run_migration()
