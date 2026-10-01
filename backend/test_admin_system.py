"""
Test the SmartNotes AI Admin Panel Backend Endpoints
Verifies:
1. Strict 403 Forbidden for regular users attempting admin access
2. 200 OK for admin user accessing /api/admin/overview
3. User listing, lecture oversight, and audit logs
"""

import sys
import json
import urllib.request
import urllib.parse
from app.database import SessionLocal
from app.models import User
from app.auth import hash_password

API_URL = "http://127.0.0.1:8000"

def make_req(url, method="GET", data=None, headers=None):
    if headers is None:
        headers = {}
    req_data = None
    if data is not None:
        req_data = json.dumps(data).encode("utf-8")
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=req_data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        try:
            return e.code, json.loads(body)
        except:
            return e.code, body

def run():
    print("=" * 60)
    print("VERIFYING SMARTNOTES AI ADMIN PANEL BACKEND")
    print("=" * 60)

    # 1. Setup a standard user and an admin user in DB with known passwords
    db = SessionLocal()
    try:
        # Standard user
        std_user = db.query(User).filter(User.email == "regular.student@university.edu").first()
        if not std_user:
            std_user = User(
                full_name="Regular Student",
                email="regular.student@university.edu",
                password_hash=hash_password("Std#P@ssword2026!"),
                role="user",
                is_active=True,
                is_verified=True
            )
            db.add(std_user)
        else:
            std_user.password_hash = hash_password("Std#P@ssword2026!")
            std_user.role = "user"
            std_user.is_active = True

        # Admin user
        adm_user = db.query(User).filter(User.email == "admin.super@smartnotes.ai").first()
        if not adm_user:
            adm_user = User(
                full_name="Super Admin",
                email="admin.super@smartnotes.ai",
                password_hash=hash_password("Admin#P@ssword2026!"),
                role="admin",
                is_active=True,
                is_verified=True
            )
            db.add(adm_user)
        else:
            adm_user.password_hash = hash_password("Admin#P@ssword2026!")
            adm_user.role = "admin"
            adm_user.is_active = True

        db.commit()
    finally:
        db.close()

    # 2. Login as regular user
    status, std_login = make_req(f"{API_URL}/api/auth/login", method="POST", data={
        "email": "regular.student@university.edu",
        "password": "Std#P@ssword2026!"
    })
    assert status == 200, f"Login failed for regular user: {std_login}"
    std_token = std_login["token"]
    assert std_login["user"]["is_admin"] is False
    assert std_login["user"]["role"] == "user"
    print("  [PASS] Regular user logged in (is_admin=False)")

    # 3. Attempt admin access with regular user token -> Must be 403 Forbidden
    status, denied_body = make_req(f"{API_URL}/api/admin/overview", headers={"Authorization": f"Bearer {std_token}"})
    assert status == 403, f"Expected 403 for non-admin, got {status}: {denied_body}"
    print(f"  [PASS] Regular user access strictly blocked with 403: {denied_body.get('detail')}")

    # 4. Login as admin user
    status, adm_login = make_req(f"{API_URL}/api/auth/login", method="POST", data={
        "email": "admin.super@smartnotes.ai",
        "password": "Admin#P@ssword2026!"
    })
    assert status == 200, f"Login failed for admin: {adm_login}"
    adm_token = adm_login["token"]
    assert adm_login["user"]["is_admin"] is True
    assert adm_login["user"]["role"] == "admin"
    print("  [PASS] Admin user logged in (is_admin=True, role=admin)")

    # 5. Access /api/admin/overview as admin
    status, overview = make_req(f"{API_URL}/api/admin/overview", headers={"Authorization": f"Bearer {adm_token}"})
    assert status == 200, f"Expected 200 for admin, got {status}: {overview}"
    stats = overview["stats"]
    assert "total_users" in stats
    assert "total_lectures" in stats
    print(f"  [PASS] Admin overview retrieved successfully: {stats['total_users']} total users, {stats['total_lectures']} total lectures")

    # 6. Access /api/admin/users
    status, users_resp = make_req(f"{API_URL}/api/admin/users", headers={"Authorization": f"Bearer {adm_token}"})
    assert status == 200
    print(f"  [PASS] Admin user list retrieved: {len(users_resp['users'])} users in system")

    # 7. Access /api/admin/lectures
    status, lectures_resp = make_req(f"{API_URL}/api/admin/lectures", headers={"Authorization": f"Bearer {adm_token}"})
    assert status == 200
    print(f"  [PASS] Admin lecture oversight retrieved: {len(lectures_resp['lectures'])} lectures in system")

    # 8. Access /api/admin/audit-logs
    status, logs_resp = make_req(f"{API_URL}/api/admin/audit-logs", headers={"Authorization": f"Bearer {adm_token}"})
    assert status == 200
    print(f"  [PASS] Admin audit logs retrieved: {len(logs_resp['logs'])} audit entries")

    print("\n" + "=" * 60)
    print("ALL ADMIN BACKEND SECURITY & ACCESS TESTS PASSED!")
    print("=" * 60)

if __name__ == "__main__":
    run()
