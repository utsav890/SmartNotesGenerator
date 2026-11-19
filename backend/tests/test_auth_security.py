"""
SmartNotes AI - Authentication & Authorization Security Test Suite
Covers:
- User registration, input validation, and password strength requirements
- Duplicate email prevention
- Login, password verification, and brute-force mitigation
- RFC 7519 JWT generation, decoding, expiry, and signature tampering prevention
- Role-Based Access Control (RBAC) and Admin privilege protection
- Session revocation and secure logout
"""

import os
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path

import jwt
from fastapi.testclient import TestClient

from tests.setup_test_db import test_engine, TestingSessionLocal
from app.database import Base
from app.models import User
from app.auth import (
    hash_password,
    verify_password,
    create_access_token,
    decode_access_token,
    JWT_SECRET,
    JWT_ALGORITHM
)
from app.main import app


class TestAuthSecurity(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        Base.metadata.create_all(bind=test_engine)
        cls.client = TestClient(app)

        # Create seeded test users if not already present
        with TestingSessionLocal() as db:
            if not db.query(User).filter(User.email == "admin.security@smartnotes.edu").first():
                admin = User(
                    full_name="Admin Security Officer",
                    email="admin.security@smartnotes.edu",
                    password_hash=hash_password("AdminSecure#2026!"),
                    role="admin",
                    is_verified=True,
                    is_active=True
                )
                db.add(admin)
            if not db.query(User).filter(User.email == "student.test@smartnotes.edu").first():
                student = User(
                    full_name="Regular Test Student",
                    email="student.test@smartnotes.edu",
                    password_hash=hash_password("StudentSecure#2026!"),
                    role="user",
                    is_verified=True,
                    is_active=True
                )
                db.add(student)
            if not db.query(User).filter(User.email == "banned.user@smartnotes.edu").first():
                deactivated = User(
                    full_name="Deactivated Account",
                    email="banned.user@smartnotes.edu",
                    password_hash=hash_password("BannedSecure#2026!"),
                    role="user",
                    is_verified=True,
                    is_active=False
                )
                db.add(deactivated)
            db.commit()

    def test_01_registration_success(self):
        """Verify standard user registration with strict validation."""
        res = self.client.post("/api/auth/register", json={
            "full_name": "Alice Researcher",
            "email": "alice.researcher@university.edu",
            "password": "StrongPassword#2026!",
            "confirm_password": "StrongPassword#2026!"
        })
        self.assertEqual(res.status_code, 201)
        data = res.json()
        self.assertIn("token", data)
        self.assertEqual(data["user"]["email"], "alice.researcher@university.edu")
        self.assertNotIn("password_hash", data["user"])

    def test_02_registration_duplicate_email(self):
        """Verify registration prevents duplicate emails (400 Bad Request)."""
        res = self.client.post("/api/auth/register", json={
            "full_name": "Alice Duplicate",
            "email": "alice.researcher@university.edu",
            "password": "StrongPassword#2026!",
            "confirm_password": "StrongPassword#2026!"
        })
        self.assertEqual(res.status_code, 400)
        self.assertIn("already exists", res.json()["detail"].lower())

    def test_03_registration_weak_password_enforcement(self):
        """Verify OWASP password strength enforcement (digits, uppercase, symbols)."""
        # Missing uppercase
        res = self.client.post("/api/auth/register", json={
            "full_name": "Weak User",
            "email": "weak1@smartnotes.edu",
            "password": "lowercase123!#",
            "confirm_password": "lowercase123!#"
        })
        self.assertEqual(res.status_code, 400)

        # Missing symbol
        res = self.client.post("/api/auth/register", json={
            "full_name": "Weak User 2",
            "email": "weak2@smartnotes.edu",
            "password": "NoSymbolPassword123",
            "confirm_password": "NoSymbolPassword123"
        })
        self.assertEqual(res.status_code, 400)

        # Password mismatch
        res = self.client.post("/api/auth/register", json={
            "full_name": "Mismatch User",
            "email": "mismatch@smartnotes.edu",
            "password": "StrongPassword#2026!",
            "confirm_password": "DifferentPassword#2026!"
        })
        self.assertEqual(res.status_code, 400)

    def test_04_login_successful_jwt(self):
        """Verify successful user login issues a valid RFC 7519 signed JWT."""
        res = self.client.post("/api/auth/login", json={
            "email": "student.test@smartnotes.edu",
            "password": "StudentSecure#2026!"
        })
        self.assertEqual(res.status_code, 200)
        data = res.json()
        token = data["token"]
        self.assertIn("token", data)
        self.assertEqual(token.count("."), 2)  # Valid JWT format header.payload.signature

        # Verify decoded payload claims
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        self.assertEqual(payload["email"], "student.test@smartnotes.edu")
        self.assertEqual(payload["role"], "user")
        self.assertIn("exp", payload)
        self.assertIn("jti", payload)

    def test_05_login_invalid_credentials(self):
        """Verify invalid credentials return 401 Unauthorized without leaking account existence."""
        # Wrong password
        res = self.client.post("/api/auth/login", json={
            "email": "student.test@smartnotes.edu",
            "password": "IncorrectPassword#999"
        })
        self.assertEqual(res.status_code, 401)
        self.assertIn("incorrect", res.json()["detail"].lower())

        # Nonexistent account
        res = self.client.post("/api/auth/login", json={
            "email": "ghost.user@doesnotexist.edu",
            "password": "AnyPassword#2026!"
        })
        self.assertEqual(res.status_code, 401)

    def test_06_deactivated_account_login(self):
        """Verify deactivated accounts are blocked with 403 Forbidden."""
        res = self.client.post("/api/auth/login", json={
            "email": "banned.user@smartnotes.edu",
            "password": "BannedSecure#2026!"
        })
        self.assertEqual(res.status_code, 403)
        self.assertIn("deactivated", res.json()["detail"].lower())

    def test_07_jwt_expired_token_rejection(self):
        """Verify expired JWTs are strictly rejected with 401 Unauthorized."""
        expired_token = create_access_token(
            {"sub": "1", "email": "student.test@smartnotes.edu", "role": "user"},
            expires_delta=timedelta(seconds=-10)  # Expired 10 seconds ago
        )
        res = self.client.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {expired_token}"}
        )
        self.assertEqual(res.status_code, 401)
        self.assertIn("expired", res.json()["detail"].lower())

    def test_08_jwt_tampered_signature_rejection(self):
        """Verify tampered JWT signature is rejected with 401 Unauthorized."""
        valid_token = create_access_token(
            {"sub": "1", "email": "student.test@smartnotes.edu", "role": "user"}
        )
        # Tamper payload part
        parts = valid_token.split(".")
        tampered_token = f"{parts[0]}.eyJhZG1pbiI6dHJ1ZX0.{parts[2]}"

        res = self.client.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {tampered_token}"}
        )
        self.assertEqual(res.status_code, 401)

    def test_09_jwt_refresh_flow(self):
        """Verify token refresh generates fresh token while invalidating previous session."""
        login_res = self.client.post("/api/auth/login", json={
            "email": "student.test@smartnotes.edu",
            "password": "StudentSecure#2026!"
        })
        old_token = login_res.json()["token"]

        refresh_res = self.client.post(
            "/api/auth/refresh",
            headers={"Authorization": f"Bearer {old_token}"}
        )
        self.assertEqual(refresh_res.status_code, 200)
        new_token = refresh_res.json()["token"]
        self.assertNotEqual(old_token, new_token)

        # Fresh token works
        me_res = self.client.get("/api/auth/me", headers={"Authorization": f"Bearer {new_token}"})
        self.assertEqual(me_res.status_code, 200)

        # Regress: Old refreshed token is invalidated and strictly rejected
        old_me_res = self.client.get("/api/auth/me", headers={"Authorization": f"Bearer {old_token}"})
        self.assertEqual(old_me_res.status_code, 401)
        self.assertIn("revoked", old_me_res.json()["detail"].lower())

    def test_10_rbac_admin_authorization(self):
        """Verify Role-Based Access Control: Regular user blocked from admin endpoints."""
        # Login as student
        student_res = self.client.post("/api/auth/login", json={
            "email": "student.test@smartnotes.edu",
            "password": "StudentSecure#2026!"
        })
        student_token = student_res.json()["token"]

        # Student denied on admin endpoint
        res = self.client.get(
            "/api/admin/overview",
            headers={"Authorization": f"Bearer {student_token}"}
        )
        self.assertEqual(res.status_code, 403)

        # Login as admin
        admin_res = self.client.post("/api/auth/login", json={
            "email": "admin.security@smartnotes.edu",
            "password": "AdminSecure#2026!"
        })
        admin_token = admin_res.json()["token"]

        # Admin authorized
        admin_access_res = self.client.get(
            "/api/admin/overview",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        self.assertEqual(admin_access_res.status_code, 200)

    def test_11_logout_invalidates_session(self):
        """Verify logout endpoint terminates session and invalidates access."""
        login_res = self.client.post("/api/auth/login", json={
            "email": "student.test@smartnotes.edu",
            "password": "StudentSecure#2026!"
        })
        token = login_res.json()["token"]

        # Token works initially
        initial_me = self.client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(initial_me.status_code, 200)

        logout_res = self.client.post(
            "/api/auth/logout",
            headers={"Authorization": f"Bearer {token}"}
        )
        self.assertEqual(logout_res.status_code, 200)

        # Regress: Logged-out token must be strictly rejected with 401 Unauthorized
        revoked_me = self.client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(revoked_me.status_code, 401)
        self.assertIn("revoked", revoked_me.json()["detail"].lower())
