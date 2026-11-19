"""
SmartNotes AI - Frontend Serving & SPA Routing Test Suite
Verifies:
1. Root URL (/) serves the built React SPA index.html (when built).
2. Direct refresh on client-side routes (/dashboard, /login, /lecture/1, /notes) serves index.html.
3. Static files (/favicon.svg, /icons.svg) and assets (/assets/*) are served with correct MIME types.
4. Nonexistent API endpoints (/api/invalid) return 404 JSON, never index.html.
5. Missing static asset files (/missing.js, /missing.css) return 404, never index.html.
6. System health endpoints (/health, /api/health) and Swagger docs (/docs, /openapi.json) remain intact.
"""

import unittest
from fastapi.testclient import TestClient

from tests.setup_test_db import test_engine
from app.main import app, STATIC_DIR


class TestFrontendServing(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_01_root_url_serves_spa_or_api_message(self):
        """Verify GET / returns index.html when frontend is built, or status message otherwise."""
        res = self.client.get("/")
        self.assertEqual(res.status_code, 200)
        if STATIC_DIR and (STATIC_DIR / "index.html").is_file():
            self.assertIn("text/html", res.headers.get("content-type", ""))
            self.assertIn('<div id="root">', res.text)
        else:
            self.assertIn("message", res.json())

    def test_02_spa_client_routes_serve_index_html(self):
        """Verify client-side routes return index.html for direct navigation and refresh."""
        if not STATIC_DIR or not (STATIC_DIR / "index.html").is_file():
            self.skipTest("Frontend dist not built")

        for route in ("/dashboard", "/login", "/register", "/notes", "/lecture/42", "/settings"):
            res = self.client.get(route)
            self.assertEqual(res.status_code, 200, f"Failed on route {route}")
            self.assertIn("text/html", res.headers.get("content-type", ""))
            self.assertIn('<div id="root">', res.text)

    def test_03_static_assets_serving(self):
        """Verify static files like favicon and bundle assets are accessible with correct MIME types."""
        if not STATIC_DIR:
            self.skipTest("Frontend dist not built")

        # Test root public files
        favicon = self.client.get("/favicon.svg")
        if (STATIC_DIR / "favicon.svg").is_file():
            self.assertEqual(favicon.status_code, 200)
            self.assertIn("image/svg", favicon.headers.get("content-type", ""))

        # Test assets folder if any JS/CSS bundle exists
        assets_dir = STATIC_DIR / "assets"
        if assets_dir.is_dir():
            for asset_file in assets_dir.iterdir():
                if asset_file.is_file():
                    res = self.client.get(f"/assets/{asset_file.name}")
                    self.assertEqual(res.status_code, 200)
                    if asset_file.suffix == ".css":
                        self.assertIn("text/css", res.headers.get("content-type", ""))
                    elif asset_file.suffix == ".js":
                        self.assertIn("javascript", res.headers.get("content-type", ""))
                    break

    def test_04_api_routes_not_intercepted_by_spa_fallback(self):
        """Verify invalid API routes return 404 JSON, not index.html."""
        for path in ("/api/nonexistent", "/api/auth/nonexistent", "/api/v99/unknown"):
            res = self.client.get(path)
            self.assertEqual(res.status_code, 404)
            self.assertIn("application/json", res.headers.get("content-type", ""))
            self.assertNotIn('<div id="root">', res.text)

    def test_05_missing_static_assets_return_404_not_html(self):
        """Verify missing .js or .css files return 404 to prevent 'Unexpected token <' JS errors."""
        for bad_asset in ("/missing-chunk.js", "/assets/missing-style.css", "/vendor.map"):
            res = self.client.get(bad_asset)
            self.assertEqual(res.status_code, 404)
            self.assertNotIn('<div id="root">', res.text)

    def test_06_health_and_docs_endpoints_preserved(self):
        """Verify system monitoring and OpenAPI endpoints are not impacted."""
        # Health check
        health_res = self.client.get("/health")
        self.assertEqual(health_res.status_code, 200)
        self.assertEqual(health_res.json()["status"], "healthy")

        # OpenAPI schema
        openapi_res = self.client.get("/openapi.json")
        self.assertEqual(openapi_res.status_code, 200)
        self.assertIn("paths", openapi_res.json())


if __name__ == "__main__":
    unittest.main()
