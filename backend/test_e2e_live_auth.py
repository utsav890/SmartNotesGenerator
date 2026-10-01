"""
End-to-End Live Integration Test for SmartNotes AI Authentication System
Tests the running FastAPI server (http://127.0.0.1:8000) and frontend delivery (http://localhost:5173).
"""

import sys
import json
import urllib.request
import urllib.parse
import http.cookiejar
import io

# Ensure UTF-8 stdout if possible
if sys.stdout.encoding and sys.stdout.encoding.lower() != 'utf-8':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

API_URL = "http://127.0.0.1:8000"
FRONTEND_URL = "http://localhost:5173"

def make_request(url, method="GET", data=None, headers=None, opener=None):
    if headers is None:
        headers = {}
    req_data = None
    if data is not None:
        if isinstance(data, dict):
            req_data = json.dumps(data).encode("utf-8")
            headers["Content-Type"] = "application/json"
        elif isinstance(data, bytes):
            req_data = data
            
    req = urllib.request.Request(url, data=req_data, headers=headers, method=method)
    runner = opener.open if opener else urllib.request.urlopen
    
    try:
        with runner(req) as resp:
            body = resp.read().decode("utf-8")
            return resp.status, json.loads(body) if "application/json" in resp.headers.get("Content-Type", "") else body, resp.headers
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        try:
            parsed = json.loads(body)
        except:
            parsed = body
        return e.code, parsed, e.headers

def run_tests():
    print("=" * 60)
    print("STARTING LIVE SMARTNOTES AI AUTHENTICATION VERIFICATION")
    print("=" * 60)

    # 1. Verify Frontend Delivery
    print("\n[TEST 1] Frontend Delivery at http://localhost:5173")
    status, body, _ = make_request(FRONTEND_URL)
    assert status == 200, f"Frontend returned {status}"
    assert "SmartNotes" in body or "root" in body, "Frontend HTML missing core elements"
    print("  [PASS] Frontend is serving HTML on port 5173")

    # 2. Registration with Weak Password
    print("\n[TEST 2] Registration with Weak Password")
    status, body, _ = make_request(f"{API_URL}/api/auth/register", method="POST", data={
        "full_name": "Live Test User",
        "email": "livetest@smartnotes.ai",
        "password": "weak",
        "confirm_password": "weak"
    })
    assert status in (400, 422), f"Expected 400 or 422 for weak password, got {status}"
    print(f"  [PASS] Weak password rejected with status {status}")

    # 3. Successful Registration
    import time
    ts = int(time.time())
    test_email = f"jane.austin.{ts}@university.edu"
    test_pass = "Aust1n#P@ssw0rd2026!"
    print(f"\n[TEST 3] Successful Registration for {test_email}")
    status, body, _ = make_request(f"{API_URL}/api/auth/register", method="POST", data={
        "full_name": "Jane Austin",
        "email": test_email,
        "password": test_pass,
        "confirm_password": test_pass
    })
    if status == 400 and "already exists" in str(body):
        print(f"  [INFO] User already registered from previous run, proceeding to login")
    else:
        assert status == 201, f"Expected 201 for registration, got {status}: {body}"
        assert body["user"]["email"] == test_email
        assert "password_hash" not in body["user"], "CRITICAL: password_hash leaked!"
        assert "password" not in body["user"], "CRITICAL: password leaked!"
        print(f"  [PASS] Account registered: {body['user']['full_name']} ({body['user']['email']})")

    # 4. Duplicate Registration
    print("\n[TEST 4] Duplicate Registration Prevention")
    status, body, _ = make_request(f"{API_URL}/api/auth/register", method="POST", data={
        "full_name": "Duplicate User",
        "email": test_email,
        "password": test_pass,
        "confirm_password": test_pass
    })
    assert status == 400, f"Expected 400 for duplicate email, got {status}"
    assert "already exists" in body.get("detail", "")
    print(f"  [PASS] Duplicate registration safely rejected: {body.get('detail')}")

    # 5. Failed Login (Generic Safe Message)
    print("\n[TEST 5] Failed Login Credentials (Non-Leaking Safe Error)")
    status, body, _ = make_request(f"{API_URL}/api/auth/login", method="POST", data={
        "email": test_email,
        "password": "WrongPassword999!"
    })
    assert status == 401, f"Expected 401 for bad password, got {status}"
    assert body.get("detail") == "Email or password is incorrect.", f"Leaked credential info: {body}"
    print(f"  [PASS] Generic error returned without leaking credential details: {body.get('detail')}")

    # 6. Successful Login and Session Cookie / Token
    print("\n[TEST 6] Successful Login & Session Creation")
    cj = http.cookiejar.CookieJar()
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))
    status, body, headers = make_request(f"{API_URL}/api/auth/login", method="POST", data={
        "email": test_email,
        "password": test_pass
    }, opener=opener)
    assert status == 200, f"Expected 200 for login, got {status}: {body}"
    token = body.get("access_token")
    assert token, "Login did not return an access token"
    assert "password_hash" not in body.get("user", {}), "CRITICAL: Leaked password_hash in login"
    
    # Verify HttpOnly session cookie
    set_cookie = headers.get("Set-Cookie", "")
    assert "session_token=" in set_cookie, f"Expected session_token cookie, got: {set_cookie}"
    assert "HttpOnly" in set_cookie, "session_token cookie must be HttpOnly"
    print(f"  [PASS] Logged in successfully. Bearer token and HttpOnly cookie set.")

    # 7. Authenticated Route & Me Endpoint
    print("\n[TEST 7] GET /api/auth/me (Protected Route)")
    status, me_body, _ = make_request(f"{API_URL}/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert status == 200, f"Expected 200, got {status}"
    me_user = me_body.get("user", me_body)
    assert me_user["email"] == test_email
    print(f"  [PASS] /api/auth/me verified for user: {me_user['full_name']}")

    # 8. Unauthenticated Access Protection
    print("\n[TEST 8] Protected Route Without Auth")
    status, unauth_body, _ = make_request(f"{API_URL}/lectures")
    assert status in (401, 403), f"Expected 401/403 for unauthenticated access, got {status}"
    print(f"  [PASS] Unauthenticated access blocked with {status}")

    # 9. Cross-User Resource Isolation (Data Ownership)
    print("\n[TEST 9] Cross-User Ownership Isolation")
    # Jane creates a lecture
    status, create_resp, _ = make_request(f"{API_URL}/lectures", method="POST", data={
        "title": "Jane's Private Chemistry Lecture",
        "audio_path": "audio/private_lecture.mp3"
    }, headers={"Authorization": f"Bearer {token}"})
    assert status == 200, f"Expected 200, got {status}: {create_resp}"
    lecture_id = create_resp.get("lecture_id") or create_resp.get("id")
    print(f"  [PASS] User Jane created lecture #{lecture_id}")

    # Register and log in User 2 (Bob)
    bob_email = f"bob.marley.{ts}@reggae.edu"
    bob_pass = "Bob#M@rley2026!"
    make_request(f"{API_URL}/api/auth/register", method="POST", data={
        "full_name": "Bob Marley",
        "email": bob_email,
        "password": bob_pass,
        "confirm_password": bob_pass
    })
    _, bob_login, _ = make_request(f"{API_URL}/api/auth/login", method="POST", data={
        "email": bob_email,
        "password": bob_pass
    })
    bob_token = bob_login["access_token"]
    print(f"  [PASS] User Bob logged in")

    # Bob attempts to view Jane's lecture
    status, bob_view, _ = make_request(f"{API_URL}/lectures/{lecture_id}", headers={"Authorization": f"Bearer {bob_token}"})
    assert status == 403, f"Expected 403 Forbidden for cross-user lecture access, got {status}: {bob_view}"
    print(f"  [PASS] Cross-user lecture access strictly blocked: {status} Forbidden")

    # Bob attempts to view Jane's notes
    status, bob_notes, _ = make_request(f"{API_URL}/lectures/{lecture_id}/notes", headers={"Authorization": f"Bearer {bob_token}"})
    assert status == 403, f"Expected 403 Forbidden for cross-user notes access, got {status}: {bob_notes}"
    print(f"  [PASS] Cross-user notes access strictly blocked: {status} Forbidden")

    # Bob attempts to query Jane's lecture
    status, bob_q, _ = make_request(f"{API_URL}/lectures/{lecture_id}/questions", method="POST", data={
        "question": "What are Jane's secrets?"
    }, headers={"Authorization": f"Bearer {bob_token}"})
    assert status == 403, f"Expected 403 Forbidden for cross-user Q&A access, got {status}: {bob_q}"
    print(f"  [PASS] Cross-user Q&A access strictly blocked: {status} Forbidden")

    # Bob's own lecture list should NOT contain Jane's lecture
    status, bob_lectures, _ = make_request(f"{API_URL}/lectures", headers={"Authorization": f"Bearer {bob_token}"})
    assert status == 200
    lecture_ids = [l["id"] for l in bob_lectures.get("lectures", [])]
    assert lecture_id not in lecture_ids, f"Jane's lecture leaked into Bob's lecture list!"
    print(f"  [PASS] Bob's library does not contain Jane's private lecture")

    # 10. Forgot Password (Safe Non-Leaking Response)
    print("\n[TEST 10] Forgot Password Generic Safe Response")
    status, fp_body, _ = make_request(f"{API_URL}/api/auth/forgot-password", method="POST", data={
        "email": "nonexistent_person_999@domain.org"
    })
    assert status == 200, f"Expected 200, got {status}"
    assert "If an account exists" in fp_body.get("message", "")
    print(f"  [PASS] Forgot password returns generic safe response: {fp_body.get('message')}")

    # 11. Security Overview & Active Sessions
    print("\n[TEST 11] Security Overview & Active Sessions")
    status, sec_overview, _ = make_request(f"{API_URL}/api/auth/security", headers={"Authorization": f"Bearer {token}"})
    assert status == 200, f"Expected 200, got {status}"
    activities = sec_overview.get("activities") or sec_overview.get("login_activities") or []
    assert len(activities) >= 1, "Expected login audit logs"
    print(f"  [PASS] Security overview: {len(sec_overview['sessions'])} sessions, {len(activities)} audit records")

    # 12. Change Password
    print("\n[TEST 12] Change Password")
    new_pass = "Jane#NewP@ssw0rd2026!"
    status, cp_body, _ = make_request(f"{API_URL}/api/auth/change-password", method="POST", data={
        "current_password": test_pass,
        "new_password": new_pass,
        "confirm_password": new_pass
    }, headers={"Authorization": f"Bearer {token}"})
    assert status == 200, f"Expected 200, got {status}: {cp_body}"
    print(f"  [PASS] Password changed successfully: {cp_body.get('message')}")

    # Old password no longer works
    status, _, _ = make_request(f"{API_URL}/api/auth/login", method="POST", data={
        "email": test_email,
        "password": test_pass
    })
    assert status == 401, "Old password still allowed login!"
    print(f"  [PASS] Old password correctly rejected")

    # New password works
    status, new_login, _ = make_request(f"{API_URL}/api/auth/login", method="POST", data={
        "email": test_email,
        "password": new_pass
    })
    assert status == 200, "New password failed to log in!"
    new_token = new_login["access_token"]
    print(f"  [PASS] New password successfully verified")

    # 13. Revoke All Other Sessions
    print("\n[TEST 13] Revoke Other Sessions")
    status, revoke_body, _ = make_request(f"{API_URL}/api/auth/sessions/revoke-others", method="POST", headers={"Authorization": f"Bearer {new_token}"})
    assert status == 200, f"Expected 200, got {status}"
    print(f"  [PASS] Other sessions revoked: {revoke_body.get('message')}")

    # 14. Logout & Invalidation
    print("\n[TEST 14] Real Logout & Backend Invalidation")
    status, logout_body, _ = make_request(f"{API_URL}/api/auth/logout", method="POST", headers={"Authorization": f"Bearer {new_token}"})
    assert status == 200, f"Expected 200, got {status}"
    print(f"  [PASS] Logout endpoint succeeded: {logout_body.get('message')}")

    # Token must now be rejected
    status, after_logout, _ = make_request(f"{API_URL}/api/auth/me", headers={"Authorization": f"Bearer {new_token}"})
    assert status == 401, f"Expected 401 after logout, got {status}: {after_logout}"
    print(f"  [PASS] Session successfully invalidated on backend: 401 Unauthorized")

    print("\n" + "=" * 60)
    print("ALL 14 E2E AUTHENTICATION & SECURITY TESTS PASSED WITH 100% SUCCESS!")
    print("=" * 60)

if __name__ == "__main__":
    run_tests()
