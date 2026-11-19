"""
SmartNotes AI - Production Security Regressions Test Suite
Specifically covers:
1. JWT Secret strength validation in production (minimum 32 chars, blocks placeholders, blocks missing).
2. Protection of /db-test (blocked from public access, admin-only probe without DB name leakage).
3. Public minimal /health and /api/health endpoints.
4. Omission of sensitive tokens (verification_token, reset_token) in production responses.
5. Accurate email status reporting (no false claims of email dispatch when unconfigured).
"""

import os
import unittest
from unittest.mock import patch
from fastapi.testclient import TestClient

from tests.setup_test_db import test_engine, TestingSessionLocal
from app.models import User
from app.auth import (
    hash_password,
    get_and_validate_jwt_secret,
    INSECURE_PLACEHOLDER_SECRETS
)
from app.main import app


class TestProductionSecurityRegressions(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

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
                db.commit()

        admin_login = cls.client.post("/api/auth/login", json={
            "email": "admin.security@smartnotes.edu",
            "password": "AdminSecure#2026!"
        })
        cls.admin_token = admin_login.json()["token"]

    def test_01_production_jwt_secret_validation(self):
        """Verify get_and_validate_jwt_secret enforces strict rules in production."""
        # Missing secret in production
        with patch.dict(os.environ, {"ENVIRONMENT": "production", "JWT_SECRET": ""}):
            with self.assertRaises(RuntimeError) as ctx:
                get_and_validate_jwt_secret()
            self.assertIn("missing in production", str(ctx.exception))

        # Short secret (< 32 chars) in production
        with patch.dict(os.environ, {"ENVIRONMENT": "production", "JWT_SECRET": "short-secret-123"}):
            with self.assertRaises(RuntimeError) as ctx:
                get_and_validate_jwt_secret()
            self.assertIn("below minimum", str(ctx.exception))

        # Known placeholder secret in production
        for placeholder in INSECURE_PLACEHOLDER_SECRETS:
            with patch.dict(os.environ, {"ENVIRONMENT": "production", "JWT_SECRET": placeholder}):
                with self.assertRaises(RuntimeError) as ctx:
                    get_and_validate_jwt_secret()
                self.assertIn("Insecure placeholder", str(ctx.exception))

        # Valid strong secret in production
        strong = "SuperStrongCryptographicSecretKey2026!WithPlentyOfEntropy"
        with patch.dict(os.environ, {"ENVIRONMENT": "production", "JWT_SECRET": strong}):
            validated = get_and_validate_jwt_secret()
            self.assertEqual(validated, strong)

    def test_02_public_health_endpoint_no_information_disclosure(self):
        """Verify public /health check returns status without leaking DB names or credentials."""
        for path in ("/health", "/api/health"):
            res = self.client.get(path)
            self.assertEqual(res.status_code, 200)
            data = res.json()
            self.assertEqual(data.get("status"), "healthy")
            self.assertNotIn("database", data)
            self.assertNotIn("mysql", str(res.content).lower())
            self.assertNotIn("password", str(res.content).lower())

    def test_03_db_test_protected_from_public(self):
        """Verify /db-test requires admin authentication and cannot be accessed publicly."""
        # Unauthenticated request blocked
        unauth_client = TestClient(app)
        res_unauth = unauth_client.get("/db-test")
        self.assertEqual(res_unauth.status_code, 401)

        # Admin authorized probe succeeds without leaking database name
        res_admin = self.client.get(
            "/db-test",
            headers={"Authorization": f"Bearer {self.admin_token}"}
        )
        self.assertEqual(res_admin.status_code, 200)
        data = res_admin.json()
        self.assertEqual(data.get("status"), "connected")
        self.assertNotIn("database", data)

    def test_04_production_omits_tokens_from_registration(self):
        """Verify verification_token is strictly excluded from responses in production."""
        with patch.dict(os.environ, {"ENVIRONMENT": "production"}):
            res = self.client.post("/api/auth/register", json={
                "full_name": "Prod Secure User",
                "email": "prod.user@university.edu",
                "password": "StrongPassword#2026!",
                "confirm_password": "StrongPassword#2026!"
            })
            self.assertEqual(res.status_code, 201)
            data = res.json()
            self.assertNotIn("verification_token", data)
            self.assertIn("token", data)

    def test_05_production_omits_reset_tokens_and_handles_unconfigured_email(self):
        """Verify forgot-password omits reset_token in production and accurately reports email status."""
        with patch.dict(os.environ, {"ENVIRONMENT": "production"}):
            # Ensure email provider env vars are unset
            with patch.dict(os.environ, {"SMTP_HOST": "", "SENDGRID_API_KEY": ""}, clear=False):
                res = self.client.post("/api/auth/forgot-password", json={
                    "email": "prod.user@university.edu"
                })
                self.assertEqual(res.status_code, 200)
                data = res.json()
                self.assertNotIn("reset_token", data)
                # Verify it does NOT falsely claim an email was dispatched
                self.assertIn("not configured", data["message"].lower())

    def test_06_startup_validation_crashes_on_invalid_production_jwt(self):
        """Verify on_startup() crashes with RuntimeError on weak/missing JWT in production."""
        from app.main import on_startup

        # Missing JWT_SECRET in production MUST raise RuntimeError
        with patch.dict(os.environ, {"ENVIRONMENT": "production", "JWT_SECRET": ""}):
            with self.assertRaises(RuntimeError) as ctx:
                on_startup()
            self.assertIn("missing in production", str(ctx.exception))

        # Placeholder JWT_SECRET in production MUST raise RuntimeError
        with patch.dict(os.environ, {"ENVIRONMENT": "production", "JWT_SECRET": "change_me"}):
            with self.assertRaises(RuntimeError) as ctx:
                on_startup()
            self.assertIn("Insecure placeholder", str(ctx.exception))

    def test_07_revoked_session_blocked_across_multiple_protected_endpoints(self):
        """Regression test: Proves revoked/logged-out JWTs cannot access protected endpoints."""
        reg = self.client.post("/api/auth/register", json={
            "full_name": "Revocation Subject",
            "email": "revocation.subject@university.edu",
            "password": "SecurePassword#2026!",
            "confirm_password": "SecurePassword#2026!"
        })
        self.assertEqual(reg.status_code, 201)
        token = reg.json()["token"]

        # Token works initially
        headers = {"Authorization": f"Bearer {token}"}
        me_before = self.client.get("/api/auth/me", headers=headers)
        self.assertEqual(me_before.status_code, 200)

        # Logout revokes session
        logout_res = self.client.post("/api/auth/logout", headers=headers)
        self.assertEqual(logout_res.status_code, 200)

        # Regress: Every protected endpoint strictly rejects the revoked token
        for path in ("/api/auth/me", "/api/admin/overview", "/lectures"):
            res = self.client.get(path, headers=headers)
            self.assertEqual(res.status_code, 401)
            self.assertIn("revoked", res.json()["detail"].lower())

    def test_08_forged_stateless_jwt_without_active_db_session_rejected(self):
        """Verify a cryptographically valid JWT signature without an active DB session is rejected."""
        import jwt
        from app.auth import JWT_SECRET, JWT_ALGORITHM

        forged_token = jwt.encode(
            {"sub": "99999", "email": "nonexistent@univ.edu", "role": "user", "exp": 9999999999},
            JWT_SECRET,
            algorithm=JWT_ALGORITHM
        )

        res = self.client.get("/api/auth/me", headers={"Authorization": f"Bearer {forged_token}"})
        self.assertEqual(res.status_code, 401)
        self.assertIn("revoked", res.json()["detail"].lower())

    def test_09_email_provider_real_dispatch_and_failure_reporting(self):
        """Verify email dispatch handling when mail provider is configured."""
        with patch.dict(os.environ, {"ENVIRONMENT": "production"}):
            # When SMTP provider is configured and dispatch succeeds
            with patch.dict(os.environ, {"SMTP_HOST": "smtp.example.com", "SMTP_PORT": "587"}):
                with patch("app.auth.send_email_message", return_value=True) as mock_send:
                    res = self.client.post("/api/auth/forgot-password", json={
                        "email": "admin.security@smartnotes.edu"
                    })
                    self.assertEqual(res.status_code, 200)
                    mock_send.assert_called_once()
                    self.assertIn("dispatched", res.json()["message"].lower())

            # When SMTP provider is configured but delivery fails
            with patch.dict(os.environ, {"SMTP_HOST": "smtp.example.com", "SMTP_PORT": "587"}):
                with patch("app.auth.send_email_message", return_value=False) as mock_send_fail:
                    res = self.client.post("/api/auth/forgot-password", json={
                        "email": "admin.security@smartnotes.edu"
                    })
                    self.assertEqual(res.status_code, 200)
                    mock_send_fail.assert_called_once()
                    self.assertIn("failed", res.json()["message"].lower())
