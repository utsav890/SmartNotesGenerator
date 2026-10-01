import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL not found in .env")

engine = create_engine(DATABASE_URL)

def run_migration():
    with engine.begin() as conn:
        print("Checking users table columns...")
        # Check columns of users table
        cols_result = conn.execute(text("SHOW COLUMNS FROM users")).fetchall()
        existing_cols = {col[0] for col in cols_result}

        if "is_verified" not in existing_cols:
            print("Adding is_verified to users...")
            conn.execute(text("ALTER TABLE users ADD COLUMN is_verified BOOLEAN NOT NULL DEFAULT FALSE"))

        if "updated_at" not in existing_cols:
            print("Adding updated_at to users...")
            conn.execute(text("ALTER TABLE users ADD COLUMN updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP"))

        if "last_login" not in existing_cols:
            print("Adding last_login to users...")
            conn.execute(text("ALTER TABLE users ADD COLUMN last_login TIMESTAMP NULL"))

        # Create user_sessions table
        print("Creating user_sessions table...")
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS user_sessions (
                id VARCHAR(64) PRIMARY KEY,
                user_id BIGINT NOT NULL,
                token_hash VARCHAR(64) NOT NULL UNIQUE,
                ip_address VARCHAR(45) NULL,
                user_agent TEXT NULL,
                device_name VARCHAR(100) NULL,
                is_active BOOLEAN NOT NULL DEFAULT TRUE,
                expires_at TIMESTAMP NOT NULL,
                created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
                last_active_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX ix_user_sessions_user_id (user_id),
                INDEX ix_user_sessions_token_hash (token_hash),
                CONSTRAINT fk_user_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
        """))

        # Create email_verification_tokens table
        print("Creating email_verification_tokens table...")
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS email_verification_tokens (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                user_id BIGINT NOT NULL,
                token_hash VARCHAR(64) NOT NULL UNIQUE,
                expires_at TIMESTAMP NOT NULL,
                used_at TIMESTAMP NULL,
                created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
                INDEX ix_evt_user_id (user_id),
                INDEX ix_evt_token_hash (token_hash),
                CONSTRAINT fk_evt_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
        """))

        # Create password_reset_tokens table
        print("Creating password_reset_tokens table...")
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS password_reset_tokens (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                user_id BIGINT NOT NULL,
                token_hash VARCHAR(64) NOT NULL UNIQUE,
                expires_at TIMESTAMP NOT NULL,
                used_at TIMESTAMP NULL,
                created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
                INDEX ix_prt_user_id (user_id),
                INDEX ix_prt_token_hash (token_hash),
                CONSTRAINT fk_prt_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
        """))

        # Create login_activities table
        print("Creating login_activities table...")
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS login_activities (
                id BIGINT AUTO_INCREMENT PRIMARY KEY,
                user_id BIGINT NULL,
                email VARCHAR(255) NOT NULL,
                status VARCHAR(20) NOT NULL,
                ip_address VARCHAR(45) NULL,
                user_agent TEXT NULL,
                created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
                INDEX ix_login_activities_user_id (user_id),
                INDEX ix_login_activities_email (email),
                CONSTRAINT fk_login_activities_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
        """))

        # Mark default/system user as verified if present
        conn.execute(text("UPDATE users SET is_verified = TRUE WHERE email = 'system@smartnotes.local'"))
        print("Migration completed successfully!")

if __name__ == "__main__":
    run_migration()
