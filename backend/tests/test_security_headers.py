"""
SmartNotes AI - OWASP Security Headers, Rate Limiting & Safe Error Responses Test Suite
Covers:
- Standard OWASP HTTP response headers (nosniff, DENY, XSS, Referrer-Policy)
- Sliding-window rate limiter blocking request floods with 429 Too Many Requests
- Information disclosure defense: Error responses return clean JSON without leaking stack traces
"""

import unittest
from fastapi.testclient import TestClient

from tests.setup_test_db import test_engine
from app.auth import rate_limiter
from app.main import app


class TestSecurityHeaders(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def tearDown(self):
        # Clear rate limiter history so other test suites are never throttled
        rate_limiter.history.clear()

    def test_01_owasp_security_headers_present(self):
        """Verify presence of OWASP-recommended HTTP defense-in-depth security response headers."""
        res = self.client.get("/")
        self.assertEqual(res.status_code, 200)

        # Check defensive headers
        self.assertEqual(res.headers.get("x-content-type-options"), "nosniff")
        self.assertEqual(res.headers.get("x-frame-options"), "DENY")
        self.assertEqual(res.headers.get("x-xss-protection"), "1; mode=block")
        self.assertEqual(res.headers.get("referrer-policy"), "strict-origin-when-cross-origin")
        self.assertIn("microphone=", res.headers.get("permissions-policy", ""))

    def test_02_rate_limiting_enforcement(self):
        """Verify rate limiter blocks abuse with 429 Too Many Requests."""
        orig_max = rate_limiter.max_requests
        rate_limiter.max_requests = 5
        rate_limiter.history.clear()
        try:
            status_codes = []
            for _ in range(10):
                res = self.client.post("/api/auth/login", json={
                    "email": "ratelimit.test@example.com",
                    "password": "Password123!"
                })
                status_codes.append(res.status_code)

            self.assertIn(429, status_codes)
        finally:
            rate_limiter.max_requests = orig_max
            rate_limiter.history.clear()

    def test_03_error_responses_do_not_leak_stack_traces(self):
        """Verify API error responses return structured JSON detail without exposing internal tracebacks."""
        res = self.client.get("/api/non-existent-endpoint-404")
        self.assertEqual(res.status_code, 404)
        data = res.json()
        self.assertIn("detail", data)
        self.assertNotIn("Traceback (most recent call last)", str(res.content))
        self.assertNotIn("File \"", str(res.content))
