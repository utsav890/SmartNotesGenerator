import sys
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.models import User, Lecture, Note, UserSession

client = TestClient(app)

def test_full_auth_flow():
    print("\n--- 1. Testing Registration ---")
    reg_data = {
        "full_name": "Test User Alpha",
        "email": "alpha_test@example.com",
        "password": "Password123!",
        "confirm_password": "Password123!"
    }
    # Clean up any leftover test data
    with SessionLocal() as db:
        existing = db.query(User).filter(User.email.in_(["alpha_test@example.com", "beta_test@example.com"])).all()
        for u in existing:
            db.delete(u)
        db.commit()

    res = client.post("/api/auth/register", json=reg_data)
    assert res.status_code == 201, f"Registration failed: {res.text}"
    alpha_body = res.json()
    assert "token" in alpha_body, "Token not returned"
    assert alpha_body["user"]["email"] == "alpha_test@example.com"
    alpha_token = alpha_body["token"]
    verify_token = alpha_body.get("verification_token")
    print("Registration OK! Token received.")

    print("\n--- 2. Testing Duplicate Email Prevention ---")
    res_dup = client.post("/api/auth/register", json=reg_data)
    assert res_dup.status_code == 400, "Duplicate registration should fail with 400"
    print("Duplicate email prevented OK!")

    print("\n--- 3. Testing Weak Password Rejection ---")
    weak_short = {
        "full_name": "Weak User",
        "email": "weak_short@example.com",
        "password": "weak",
        "confirm_password": "weak"
    }
    res_short = client.post("/api/auth/register", json=weak_short)
    assert res_short.status_code in (400, 422), f"Short password should be rejected: {res_short.status_code}"

    weak_complexity = {
        "full_name": "Weak User",
        "email": "weak_complex@example.com",
        "password": "weakpassword",
        "confirm_password": "weakpassword"
    }
    res_complex = client.post("/api/auth/register", json=weak_complexity)
    assert res_complex.status_code == 400, f"Non-complex password should return 400: {res_complex.status_code}"
    print("Weak password (length & complexity) rejected OK!")

    print("\n--- 4. Testing Password Mismatch Rejection ---")
    mismatch_data = {
        "full_name": "Mismatch User",
        "email": "mismatch@example.com",
        "password": "Password123!",
        "confirm_password": "DifferentPassword123!"
    }
    res_mismatch = client.post("/api/auth/register", json=mismatch_data)
    assert res_mismatch.status_code == 400, "Password mismatch should be rejected"
    print("Password mismatch rejected OK!")

    print("\n--- 5. Testing Login (Valid & Invalid) ---")
    # Invalid password
    res_bad_login = client.post("/api/auth/login", json={
        "email": "alpha_test@example.com",
        "password": "WrongPassword999!"
    })
    assert res_bad_login.status_code == 401, "Invalid login must return 401"
    assert res_bad_login.json()["detail"] == "Email or password is incorrect."
    print("Invalid login rejected with generic safe message OK!")

    # Valid login
    res_good_login = client.post("/api/auth/login", json={
        "email": "alpha_test@example.com",
        "password": "Password123!"
    })
    assert res_good_login.status_code == 200, f"Valid login failed: {res_good_login.text}"
    alpha_token = res_good_login.json()["token"]
    print("Valid login succeeded OK!")

    print("\n--- 6. Testing Email Verification ---")
    assert verify_token is not None, "Verify token must exist"
    res_verify = client.post("/api/auth/verify-email", json={"token": verify_token})
    assert res_verify.status_code == 200, f"Verify email failed: {res_verify.text}"
    print("Email verification OK!")

    print("\n--- 7. Testing Protected /me Route ---")
    # Fresh unauthenticated client without cookies
    unauth_client = TestClient(app)
    res_me_unauth = unauth_client.get("/api/auth/me")
    assert res_me_unauth.status_code == 401, f"Unauthenticated /me must return 401, got {res_me_unauth.status_code}"

    # Authenticated client with token
    res_me = unauth_client.get("/api/auth/me", headers={"Authorization": f"Bearer {alpha_token}"})
    assert res_me.status_code == 200
    assert res_me.json()["user"]["is_verified"] is True
    print("Protected /me route OK!")

    print("\n--- 8. Registering User Beta for Cross-User Isolation Testing ---")
    beta_client = TestClient(app)
    res_beta = beta_client.post("/api/auth/register", json={
        "full_name": "Test User Beta",
        "email": "beta_test@example.com",
        "password": "Password123!",
        "confirm_password": "Password123!"
    })
    assert res_beta.status_code == 201
    beta_token = res_beta.json()["token"]

    print("\n--- 9. Testing Data Ownership: User Alpha creates lecture ---")
    alpha_client = TestClient(app)
    res_lec = alpha_client.post(
        "/lectures",
        json={"title": "Alpha Quantum Physics Lecture"},
        headers={"Authorization": f"Bearer {alpha_token}"}
    )
    assert res_lec.status_code == 200, f"Create lecture failed: {res_lec.text}"
    alpha_lec_id = res_lec.json()["lecture_id"]
    print(f"Alpha lecture created: id={alpha_lec_id}")

    print("\n--- 10. User Beta attempts to access User Alpha's lecture ---")
    res_beta_access = beta_client.get(
        f"/lectures/{alpha_lec_id}",
        headers={"Authorization": f"Bearer {beta_token}"}
    )
    assert res_beta_access.status_code == 403, f"Cross-user access must be forbidden: {res_beta_access.status_code}"
    print("Cross-user access blocked with 403 Forbidden OK!")

    res_beta_notes = beta_client.get(
        f"/lectures/{alpha_lec_id}/notes",
        headers={"Authorization": f"Bearer {beta_token}"}
    )
    assert res_beta_notes.status_code == 403, "Cross-user notes access must return 403"
    print("Cross-user notes blocked with 403 Forbidden OK!")

    res_beta_delete = beta_client.delete(
        f"/lectures/{alpha_lec_id}/notes",
        headers={"Authorization": f"Bearer {beta_token}"}
    )
    assert res_beta_delete.status_code == 403, "Cross-user delete must return 403"
    print("Cross-user delete blocked with 403 Forbidden OK!")

    print("\n--- 11. Testing Forgot Password Flow ---")
    res_forgot = client.post("/api/auth/forgot-password", json={"email": "alpha_test@example.com"})
    assert res_forgot.status_code == 200
    reset_token = res_forgot.json().get("reset_token")
    assert reset_token is not None, "Reset token must be returned in dev"
    print("Forgot password request OK!")

    print("\n--- 12. Testing Reset Password Flow ---")
    res_reset = client.post("/api/auth/reset-password", json={
        "token": reset_token,
        "password": "NewSecretPassword456!",
        "confirm_password": "NewSecretPassword456!"
    })
    assert res_reset.status_code == 200
    print("Reset password OK!")

    # Login with new password
    res_login_new = client.post("/api/auth/login", json={
        "email": "alpha_test@example.com",
        "password": "NewSecretPassword456!"
    })
    assert res_login_new.status_code == 200
    new_alpha_token = res_login_new.json()["token"]
    print("Login with new password OK!")

    print("\n--- 13. Testing Change Password in Settings ---")
    res_change = client.post("/api/auth/change-password", json={
        "current_password": "NewSecretPassword456!",
        "new_password": "UpdatedPassword789!",
        "confirm_password": "UpdatedPassword789!"
    }, headers={"Authorization": f"Bearer {new_alpha_token}"})
    assert res_change.status_code == 200
    print("Change password OK!")

    print("\n--- 14. Testing Security Overview & Sessions ---")
    res_sec = client.get("/api/auth/security", headers={"Authorization": f"Bearer {new_alpha_token}"})
    assert res_sec.status_code == 200
    sec_data = res_sec.json()
    assert len(sec_data["sessions"]) >= 1
    assert len(sec_data["activities"]) >= 1
    print(f"Security overview OK! Active sessions: {len(sec_data['sessions'])}, Login activities: {len(sec_data['activities'])}")

    print("\n--- 15. Testing Logout ---")
    res_logout = client.post("/api/auth/logout", headers={"Authorization": f"Bearer {new_alpha_token}"})
    assert res_logout.status_code == 200
    # After logout, token must be invalidated
    res_after_logout = client.get("/api/auth/me", headers={"Authorization": f"Bearer {new_alpha_token}"})
    assert res_after_logout.status_code == 401, "Invalidated token must fail authentication"
    print("Logout & session invalidation OK!")

    print("\n==========================================")
    print("ALL AUTHENTICATION TESTS PASSED PERFECTLY!")
    print("==========================================")

if __name__ == "__main__":
    test_full_auth_flow()
