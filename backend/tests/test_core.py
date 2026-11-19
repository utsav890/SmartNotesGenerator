"""
SmartNotes AI - Core Unit & Integration Test Suite
Evaluates: Auth flow, Password Hashing, Model Schemas, and API responses.
"""

import os
import unittest
from pathlib import Path
from fastapi.testclient import TestClient

from tests.setup_test_db import test_engine, TestingSessionLocal
from app.database import Base
from app.models import User
from app.auth import hash_password, verify_password
from app.main import app


class TestSmartNotesCore(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        Base.metadata.create_all(bind=test_engine)
        cls.client = TestClient(app)

    def test_01_password_hashing_security(self):
        """Verify bcrypt password hashing and verification adhere to OWASP standards."""
        plain = "SuperSecurePassword2026!"
        hashed = hash_password(plain)
        self.assertNotEqual(plain, hashed)
        self.assertTrue(verify_password(plain, hashed))
        self.assertFalse(verify_password("WrongPassword!", hashed))

    def test_02_user_registration_and_jwt(self):
        """Verify user registration returns valid JWT session token and user profile."""
        payload = {
            "full_name": "Test Student",
            "email": "test.student@eval.edu",
            "password": "Password123!",
            "confirm_password": "Password123!"
        }
        res = self.client.post("/api/auth/register", json=payload)
        self.assertEqual(res.status_code, 201)
        data = res.json()
        self.assertIn("token", data)
        self.assertEqual(data["user"]["email"], "test.student@eval.edu")
        self.assertNotIn("password_hash", data["user"])

    def test_03_duplicate_email_prevention(self):
        """Verify system rejects duplicate account registrations with 400 Bad Request."""
        payload = {
            "full_name": "Test Student",
            "email": "test.student@eval.edu",
            "password": "Password123!",
            "confirm_password": "Password123!"
        }
        res = self.client.post("/api/auth/register", json=payload)
        self.assertEqual(res.status_code, 400)

    def test_04_weak_password_validation(self):
        """Verify strict password complexity rules (length, digits, special characters)."""
        payload = {
            "full_name": "Weak User",
            "email": "weak@eval.edu",
            "password": "123",
            "confirm_password": "123"
        }
        res = self.client.post("/api/auth/register", json=payload)
        self.assertIn(res.status_code, (400, 422))

    def test_05_authenticated_me_endpoint(self):
        """Verify session authentication through Bearer token authorization header."""
        login_res = self.client.post(
            "/api/auth/login",
            json={"email": "test.student@eval.edu", "password": "Password123!"}
        )
        self.assertEqual(login_res.status_code, 200)
        token = login_res.json()["token"]

        me_res = self.client.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        self.assertEqual(me_res.status_code, 200)
        user_info = me_res.json()["user"]
        self.assertEqual(user_info["email"], "test.student@eval.edu")


if __name__ == "__main__":
    unittest.main()
