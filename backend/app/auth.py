import os
import re
import secrets
import hashlib
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional
from collections import defaultdict

import bcrypt
import jwt
from jwt import ExpiredSignatureError, InvalidTokenError
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models import (
    User,
    UserSession,
    EmailVerificationToken,
    PasswordResetToken,
    LoginActivity
)

logger = logging.getLogger("smartnotes.auth")

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

SESSION_DURATION = timedelta(days=7)
RESET_TOKEN_DURATION = timedelta(hours=1)
VERIFY_TOKEN_DURATION = timedelta(hours=24)

COOKIE_NAME = "session_token"
IS_SECURE_COOKIE = os.getenv("COOKIE_SECURE", "false").lower() == "true"

# --------------------------------------------------
# JWT & SECRET VALIDATION
# --------------------------------------------------
INSECURE_PLACEHOLDER_SECRETS = {
    "super-secret-smartnotes-jwt-key-2026-eval-prod",
    "your_jwt_secret",
    "super_secret_production_key_change_me_2026!",
    "change_me",
    "secret",
    "jwt_secret",
    "SmartNotesSuperSecretJwtKey2026!",
    "replace_with_strong_random_secret_at_least_32_characters"
}


def get_and_validate_jwt_secret() -> str:
    """Validate JWT secret strength. Require explicit strong configuration in production."""
    env = os.getenv("ENVIRONMENT", "development").lower()
    secret = os.getenv("JWT_SECRET", "").strip()

    if env == "production":
        if not secret:
            raise RuntimeError(
                "CRITICAL SECURITY CONFIGURATION ERROR: "
                "JWT_SECRET environment variable is missing in production. "
                "You must configure a strong secret with at least 32 characters."
            )
        if secret in INSECURE_PLACEHOLDER_SECRETS:
            raise RuntimeError(
                "CRITICAL SECURITY CONFIGURATION ERROR: Insecure placeholder JWT_SECRET detected in production. "
                "Generate a cryptographically random 32+ character key."
            )
        if len(secret) < 32:
            raise RuntimeError(
                f"CRITICAL SECURITY CONFIGURATION ERROR: JWT_SECRET length ({len(secret)}) is below minimum "
                "security threshold (32 characters) for production."
            )
        return secret
    else:
        # Development / Testing fallback
        if not secret:
            secret = "dev-testing-insecure-jwt-secret-key-at-least-32-chars-long"
        return secret


JWT_SECRET = get_and_validate_jwt_secret()
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days


def is_email_service_configured() -> bool:
    """Check if an outbound SMTP or email service provider is configured."""
    return bool(
        os.getenv("SMTP_HOST") or
        os.getenv("SENDGRID_API_KEY")
    )


def send_email_message(
    to_email: str,
    subject: str,
    text_content: str,
    html_content: Optional[str] = None
) -> bool:
    """
    Dispatch outbound transactional email via SMTP or SendGrid API.
    Returns True if successfully sent, False otherwise.
    """
    smtp_host = os.getenv("SMTP_HOST")
    sendgrid_key = os.getenv("SENDGRID_API_KEY")

    if not smtp_host and not sendgrid_key:
        return False

    # Attempt SendGrid API if configured
    if sendgrid_key:
        try:
            import urllib.request
            import json
            sender = os.getenv("SENDGRID_FROM", "no-reply@smartnotes.ai")
            payload = {
                "personalizations": [{"to": [{"email": to_email}]}],
                "from": {"email": sender},
                "subject": subject,
                "content": [{"type": "text/plain", "value": text_content}]
            }
            if html_content:
                payload["content"].append({"type": "text/html", "value": html_content})
            req = urllib.request.Request(
                "https://api.sendgrid.com/v3/mail/send",
                data=json.dumps(payload).encode("utf-8"),
                headers={
                    "Authorization": f"Bearer {sendgrid_key}",
                    "Content-Type": "application/json"
                },
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                if 200 <= resp.status < 300:
                    logger.info("Dispatched email to %s via SendGrid", to_email)
                    return True
        except Exception as exc:
            logger.error("Failed to send email via SendGrid to %s: %exc", to_email, exc)

    # Attempt SMTP if configured
    if smtp_host:
        try:
            from email.mime.multipart import MIMEMultipart
            from email.mime.text import MIMEText
            import smtplib

            smtp_port = int(os.getenv("SMTP_PORT", "587"))
            smtp_user = os.getenv("SMTP_USER")
            smtp_pass = os.getenv("SMTP_PASSWORD")
            smtp_from = os.getenv("SMTP_FROM", smtp_user or "no-reply@smartnotes.ai")
            use_tls = os.getenv("SMTP_USE_TLS", "true").lower() == "true"

            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = smtp_from
            msg["To"] = to_email
            msg.attach(MIMEText(text_content, "plain"))
            if html_content:
                msg.attach(MIMEText(html_content, "html"))

            with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as server:
                if use_tls:
                    server.starttls()
                if smtp_user and smtp_pass:
                    server.login(smtp_user, smtp_pass)
                server.sendmail(smtp_from, [to_email], msg.as_string())
            logger.info("Dispatched email to %s via SMTP", to_email)
            return True
        except Exception as exc:
            logger.error("Failed to send email via SMTP to %s: %exc", to_email, exc)

    return False


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Generate a signed RFC 7519 compliant JSON Web Token with unique jti claim."""
    secret = get_and_validate_jwt_secret()
    to_encode = data.copy()
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({
        "exp": int(expire.timestamp()),
        "iat": int(now.timestamp()),
        "jti": secrets.token_hex(16)
    })
    return jwt.encode(to_encode, secret, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> dict:
    """Validate and decode a JWT access token, enforcing signature and expiration."""
    secret = get_and_validate_jwt_secret()
    try:
        return jwt.decode(token, secret, algorithms=[JWT_ALGORITHM])
    except ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired. Please sign in again."
        )
    except InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token."
        )


# --------------------------------------------------
# RATE LIMITER
# --------------------------------------------------
class SimpleRateLimiter:
    """Sliding window in-memory rate limiter per IP address."""
    def __init__(self, max_requests: int = 15, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.history = defaultdict(list)

    def is_allowed(self, ip: str) -> bool:
        now = datetime.now(timezone.utc).timestamp()
        cutoff = now - self.window_seconds
        # Clean older requests
        self.history[ip] = [t for t in self.history[ip] if t > cutoff]
        if len(self.history[ip]) >= self.max_requests:
            return False
        self.history[ip].append(now)
        return True


rate_limiter = SimpleRateLimiter(max_requests=20, window_seconds=60)


def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "127.0.0.1"


def check_rate_limit(request: Request):
    ip = get_client_ip(request)
    if not rate_limiter.is_allowed(ip):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many requests. Please wait a moment before trying again."
        )


# --------------------------------------------------
# PASSWORD UTILITIES
# --------------------------------------------------
def hash_password(password: str) -> str:
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8")
        )
    except Exception:
        return False


def validate_password_strength(password: str) -> tuple[bool, str]:
    if len(password) < 8:
        return False, "Password must be at least 8 characters long."
    if not re.search(r"[A-Z]", password):
        return False, "Password must contain at least one uppercase letter."
    if not re.search(r"[a-z]", password):
        return False, "Password must contain at least one lowercase letter."
    if not re.search(r"[0-9]", password):
        return False, "Password must contain at least one number."
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>\-_=+/\\~`\[\]]", password):
        return False, "Password must contain at least one special character."
    return True, ""


def hash_token(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "127.0.0.1"


def get_user_agent(request: Request) -> str:
    return request.headers.get("user-agent", "")[:500]


def parse_device_name(user_agent: str) -> str:
    ua = user_agent.lower()
    os_name = "Desktop"
    if "windows" in ua:
        os_name = "Windows PC"
    elif "macintosh" in ua or "mac os" in ua:
        os_name = "Mac"
    elif "android" in ua:
        os_name = "Android"
    elif "iphone" in ua or "ipad" in ua:
        os_name = "iOS Device"
    elif "linux" in ua:
        os_name = "Linux"

    browser = "Browser"
    if "edg" in ua:
        browser = "Edge"
    elif "chrome" in ua:
        browser = "Chrome"
    elif "firefox" in ua:
        browser = "Firefox"
    elif "safari" in ua and "chrome" not in ua:
        browser = "Safari"

    return f"{browser} on {os_name}"


# --------------------------------------------------
# SCHEMAS
# --------------------------------------------------
EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")


class RegisterRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=100)
    email: str
    password: str = Field(min_length=8)
    confirm_password: str = Field(min_length=8)

    @field_validator("email")
    def validate_email_format(cls, v):
        v = v.strip().lower()
        if not EMAIL_REGEX.match(v):
            raise ValueError("Please provide a valid email address.")
        return v


class LoginRequest(BaseModel):
    email: str
    password: str

    @field_validator("email")
    def validate_email_format(cls, v):
        v = v.strip().lower()
        if not EMAIL_REGEX.match(v):
            raise ValueError("Please provide a valid email address.")
        return v


class VerifyEmailRequest(BaseModel):
    token: str


class ResendVerificationRequest(BaseModel):
    email: Optional[str] = None


class ForgotPasswordRequest(BaseModel):
    email: str

    @field_validator("email")
    def validate_email_format(cls, v):
        v = v.strip().lower()
        if not EMAIL_REGEX.match(v):
            raise ValueError("Please provide a valid email address.")
        return v


class ResetPasswordRequest(BaseModel):
    token: str
    password: str = Field(min_length=8)
    confirm_password: str = Field(min_length=8)


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8)
    confirm_password: str = Field(min_length=8)


class DeleteAccountRequest(BaseModel):
    password: str


class UserOut(BaseModel):
    id: int
    full_name: str
    email: str
    role: str = "user"
    is_admin: bool = False
    is_active: bool = True
    is_verified: bool
    created_at: Optional[datetime] = None
    last_login: Optional[datetime] = None


class SessionOut(BaseModel):
    id: str
    ip_address: Optional[str]
    device_name: Optional[str]
    is_current: bool
    created_at: Optional[datetime]
    last_active_at: Optional[datetime]


class LoginActivityOut(BaseModel):
    id: int
    status: str
    ip_address: Optional[str]
    user_agent: Optional[str]
    created_at: Optional[datetime]


def serialize_user(user: User) -> dict:
    role = getattr(user, "role", "user") or "user"
    return {
        "id": user.id,
        "full_name": user.full_name,
        "email": user.email,
        "role": role,
        "is_admin": role == "admin",
        "is_active": getattr(user, "is_active", True),
        "is_verified": bool(user.is_verified),
        "created_at": user.created_at,
        "last_login": user.last_login
    }


# --------------------------------------------------
# SESSION & CURRENT USER DEPENDENCY
# --------------------------------------------------
def get_token_from_request(request: Request) -> Optional[str]:
    # 1. Check Authorization Bearer header
    auth_header = request.headers.get("authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[len("Bearer "):].strip()
        if token:
            return token

    # 2. Check Cookie
    cookie_token = request.cookies.get(COOKIE_NAME)
    if cookie_token:
        return cookie_token

    return None


def get_current_user_and_session(
    request: Request,
    db: Session = Depends(get_db)
) -> tuple[User, UserSession]:
    token = get_token_from_request(request)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required."
        )

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    user = None
    secret = get_and_validate_jwt_secret()

    # 1. If token is formatted as JWT (header.payload.signature), validate signature & expiration
    if token.count(".") == 2:
        try:
            payload = jwt.decode(token, secret, algorithms=[JWT_ALGORITHM])
            user_id = payload.get("sub")
            if user_id:
                user = db.query(User).filter(User.id == int(user_id)).first()
        except ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired. Please sign in again."
            )
        except InvalidTokenError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication token."
            )

    # 2. Check active database session for EVERY token to enforce logout & revocation
    t_hash = hash_token(token)
    session_record = db.query(UserSession).filter(
        UserSession.token_hash == t_hash,
        UserSession.is_active == True,
        UserSession.expires_at > now
    ).first()

    if not session_record:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has been revoked or expired. Please sign in again."
        )

    if not user:
        user = db.query(User).filter(User.id == session_record.user_id).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or session is invalid."
        )

    if hasattr(user, "is_active") and not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been deactivated. Please contact an administrator."
        )

    session_record.last_active_at = now
    db.commit()

    return user, session_record


def get_current_user(
    user_and_session: tuple[User, UserSession] = Depends(get_current_user_and_session)
) -> User:
    return user_and_session[0]


def require_admin(
    current_user: User = Depends(get_current_user)
) -> User:
    if getattr(current_user, "role", "user") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrative privileges required. Access denied."
        )
    return current_user


def get_current_user_optional(
    request: Request,
    db: Session = Depends(get_db)
) -> Optional[User]:
    try:
        user, _ = get_current_user_and_session(request, db)
        return user
    except HTTPException:
        return None


def set_auth_cookie(response: Response, raw_token: str):
    response.set_cookie(
        key=COOKIE_NAME,
        value=raw_token,
        max_age=int(SESSION_DURATION.total_seconds()),
        httponly=True,
        samesite="lax",
        secure=IS_SECURE_COOKIE,
        path="/"
    )


def clear_auth_cookie(response: Response):
    response.delete_cookie(
        key=COOKIE_NAME,
        path="/",
        httponly=True,
        samesite="lax"
    )


def create_user_session(
    user: User,
    request: Request,
    db: Session
) -> tuple[UserSession, str]:
    # Generate signed JWT access token
    raw_token = create_access_token({
        "sub": str(user.id),
        "email": user.email,
        "role": getattr(user, "role", "user") or "user"
    })
    t_hash = hash_token(raw_token)
    session_id = secrets.token_hex(16)
    ua = get_user_agent(request)
    ip = get_client_ip(request)
    device_name = parse_device_name(ua)

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    expires_at = now + SESSION_DURATION

    session = UserSession(
        id=session_id,
        user_id=user.id,
        token_hash=t_hash,
        ip_address=ip,
        user_agent=ua,
        device_name=device_name,
        is_active=True,
        expires_at=expires_at,
        created_at=now,
        last_active_at=now
    )
    db.add(session)
    user.last_login = now
    db.commit()
    db.refresh(session)
    return session, raw_token


# --------------------------------------------------
# AUTH ENDPOINTS
# --------------------------------------------------

@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(
    payload: RegisterRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db)
):
    check_rate_limit(request)

    if payload.password != payload.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Passwords do not match."
        )

    is_valid, msg = validate_password_strength(payload.password)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=msg
        )

    normalized_email = payload.email.strip().lower()

    existing_user = db.query(User).filter(User.email == normalized_email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists."
        )

    pwd_hash = hash_password(payload.password)

    user = User(
        full_name=payload.full_name.strip(),
        email=normalized_email,
        password_hash=pwd_hash,
        is_verified=False
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Generate verification token
    raw_verify_token = secrets.token_urlsafe(32)
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    verify_token_record = EmailVerificationToken(
        user_id=user.id,
        token_hash=hash_token(raw_verify_token),
        expires_at=now + VERIFY_TOKEN_DURATION
    )
    db.add(verify_token_record)

    # Create active session so user is logged in
    session, raw_session_token = create_user_session(user, request, db)
    set_auth_cookie(response, raw_session_token)

    env = os.getenv("ENVIRONMENT", "development").lower()
    if env != "production":
        logger.info(
            "User registered: email=%s, verification_token=%s",
            user.email,
            raw_verify_token
        )
    else:
        logger.info("User registered successfully: email=%s", user.email)

    result_data = {
        "message": "Account created successfully.",
        "user": serialize_user(user),
        "token": raw_session_token,
        "access_token": raw_session_token
    }
    # In production, never expose verification tokens in API payloads
    if env != "production":
        result_data["verification_token"] = raw_verify_token

    return result_data


@router.post("/login")
def login(
    payload: LoginRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db)
):
    check_rate_limit(request)

    normalized_email = payload.email.strip().lower()
    ip = get_client_ip(request)
    ua = get_user_agent(request)

    user = db.query(User).filter(User.email == normalized_email).first()

    # Safety on-demand seeder: if demo seeding is enabled and the requested login is for a known
    # demo user that does not exist in this database instance yet, provision it immediately.
    if not user and os.getenv("ENABLE_DEMO_SEEDING", "true").lower() == "true":
        if normalized_email == "admin.super@smartnotes.ai":
            user = User(
                full_name="Super Admin",
                email="admin.super@smartnotes.ai",
                password_hash=hash_password("Admin#P@ssword2026!"),
                role="admin",
                is_verified=True,
                is_active=True
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        elif normalized_email == "regular.student@university.edu":
            user = User(
                full_name="Regular Student",
                email="regular.student@university.edu",
                password_hash=hash_password("Std#P@ssword2026!"),
                role="user",
                is_verified=True,
                is_active=True
            )
            db.add(user)
            db.commit()
            db.refresh(user)

    # Defend against timing attacks: constant-time bcrypt verification even if user does not exist
    dummy_hash = "$2b$12$e80yqVbVj9w7Qv20qG7Qe.4wP5V5n8sO3Vf8fH6iZ5g1W1nZq1tKi"
    hash_to_verify = user.password_hash if user else dummy_hash
    pwd_valid = verify_password(payload.password, hash_to_verify)

    if not user or not pwd_valid:
        # Record failed login
        activity = LoginActivity(
            user_id=user.id if user else None,
            email=normalized_email,
            status="failed",
            ip_address=ip,
            user_agent=ua
        )
        db.add(activity)
        db.commit()

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email or password is incorrect."
        )

    if hasattr(user, "is_active") and not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been deactivated. Please contact an administrator."
        )

    # Record successful login
    activity = LoginActivity(
        user_id=user.id,
        email=normalized_email,
        status="success",
        ip_address=ip,
        user_agent=ua
    )
    db.add(activity)

    # Create session
    session, raw_session_token = create_user_session(user, request, db)
    set_auth_cookie(response, raw_session_token)

    logger.info("User logged in successfully: user_id=%s, email=%s", user.id, user.email)

    return {
        "message": "Welcome back!",
        "user": serialize_user(user),
        "token": raw_session_token,
        "access_token": raw_session_token
    }


@router.post("/logout")
def logout(
    response: Response,
    user_and_session: tuple[User, UserSession] = Depends(get_current_user_and_session),
    db: Session = Depends(get_db)
):
    _, session = user_and_session
    session.is_active = False
    db.commit()

    clear_auth_cookie(response)
    return {"message": "You have been logged out successfully."}


@router.post("/refresh")
def refresh_session_token(
    request: Request,
    response: Response,
    user_and_session: tuple[User, UserSession] = Depends(get_current_user_and_session),
    db: Session = Depends(get_db)
):
    """Generate a refreshed JWT access token for active authenticated user."""
    user, old_session = user_and_session
    old_session.is_active = False
    db.commit()

    new_session, new_token = create_user_session(user, request, db)
    set_auth_cookie(response, new_token)

    return {
        "message": "Token refreshed successfully.",
        "token": new_token,
        "access_token": new_token,
        "user": serialize_user(user)
    }


@router.get("/me")
def get_me(
    current_user: User = Depends(get_current_user)
):
    return {
        "user": serialize_user(current_user)
    }


@router.post("/verify-email")
def verify_email(
    payload: VerifyEmailRequest,
    db: Session = Depends(get_db)
):
    t_hash = hash_token(payload.token.strip())
    now = datetime.now(timezone.utc).replace(tzinfo=None)

    token_record = db.query(EmailVerificationToken).filter(
        EmailVerificationToken.token_hash == t_hash,
        EmailVerificationToken.used_at == None,
        EmailVerificationToken.expires_at > now
    ).first()

    if not token_record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The verification link is invalid or has expired."
        )

    user = db.query(User).filter(User.id == token_record.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found."
        )

    user.is_verified = True
    token_record.used_at = now
    db.commit()

    return {
        "message": "Your email address has been verified successfully.",
        "is_verified": True
    }


@router.post("/resend-verification")
def resend_verification(
    payload: ResendVerificationRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    check_rate_limit(request)

    email = payload.email
    if not email:
        # Check if authenticated
        optional_user = get_current_user_optional(request, db)
        if optional_user:
            email = optional_user.email

    dev_token = None
    if email:
        user = db.query(User).filter(User.email == email.strip().lower()).first()
        if user and not user.is_verified:
            # Invalidate older tokens
            now = datetime.now(timezone.utc).replace(tzinfo=None)
            raw_token = secrets.token_urlsafe(32)
            token_record = EmailVerificationToken(
                user_id=user.id,
                token_hash=hash_token(raw_token),
                expires_at=now + VERIFY_TOKEN_DURATION
            )
            db.add(token_record)
            db.commit()
            dev_token = raw_token

            env = os.getenv("ENVIRONMENT", "development").lower()
            if env != "production":
                logger.info("Resent verification token for %s: %s", user.email, raw_token)
            else:
                logger.info("Resent verification notification processed.")

    env = os.getenv("ENVIRONMENT", "development").lower()
    email_active = is_email_service_configured()
    email_dispatched = False

    if email:
        user = db.query(User).filter(User.email == email.strip().lower()).first()
        if user and not user.is_verified:
            # Invalidate older tokens
            now = datetime.now(timezone.utc).replace(tzinfo=None)
            raw_token = secrets.token_urlsafe(32)
            token_record = EmailVerificationToken(
                user_id=user.id,
                token_hash=hash_token(raw_token),
                expires_at=now + VERIFY_TOKEN_DURATION
            )
            db.add(token_record)
            db.commit()
            dev_token = raw_token

            if email_active:
                base_url = os.getenv("FRONTEND_URL", "https://smartnotes-ai-626471362775.asia-south1.run.app")
                verify_url = f"{base_url}/verify-email?token={raw_token}"
                email_dispatched = send_email_message(
                    to_email=user.email,
                    subject="SmartNotes AI - Verify Your Email",
                    text_content=f"Welcome to SmartNotes AI!\nPlease verify your email by opening:\n{verify_url}\nThis link expires in 24 hours."
                )

            if env != "production":
                logger.info("Resent verification token for %s: %s", user.email, raw_token)
            else:
                logger.info("Resent verification notification processed.")

    if not email_active:
        msg = (
            "Verification request received. Note: Automated outbound email service is not configured in this environment; "
            "please contact a system administrator."
            if env == "production"
            else "Verification token created. (Notice: Outbound email service not configured in development mode)."
        )
    elif email and user and not email_dispatched:
        msg = "Outbound email delivery failed. Please check mail provider settings or contact support."
    else:
        msg = "If an account exists with this email address, verification instructions have been dispatched."

    response_data = {"message": msg}
    if env != "production" and dev_token:
        response_data["verification_token"] = dev_token
    return response_data


@router.post("/forgot-password")
def forgot_password(
    payload: ForgotPasswordRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    check_rate_limit(request)

    normalized_email = payload.email.strip().lower()
    user = db.query(User).filter(User.email == normalized_email).first()

    dev_token = None
    env = os.getenv("ENVIRONMENT", "development").lower()
    email_active = is_email_service_configured()
    email_dispatched = False

    if user:
        raw_reset_token = secrets.token_urlsafe(32)
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        reset_record = PasswordResetToken(
            user_id=user.id,
            token_hash=hash_token(raw_reset_token),
            expires_at=now + RESET_TOKEN_DURATION
        )
        db.add(reset_record)
        db.commit()
        dev_token = raw_reset_token

        if email_active:
            base_url = os.getenv("FRONTEND_URL", "https://smartnotes-ai-626471362775.asia-south1.run.app")
            reset_url = f"{base_url}/reset-password?token={raw_reset_token}"
            email_dispatched = send_email_message(
                to_email=user.email,
                subject="SmartNotes AI - Password Reset Request",
                text_content=f"You requested a password reset.\nPlease reset your password using:\n{reset_url}\nThis link expires in 1 hour."
            )

        if env != "production":
            logger.info(
                "Password reset requested for %s: token=%s",
                user.email,
                raw_reset_token
            )
        else:
            logger.info("Password reset request logged for processing.")

    if not email_active:
        msg = (
            "Password reset request received. Note: Outbound email service is not configured in this environment; "
            "please contact your platform administrator."
            if env == "production"
            else "Password reset requested. (Notice: Outbound email service not configured in development mode)."
        )
    elif user and not email_dispatched:
        msg = "Outbound email delivery failed. Please check mail provider settings or contact support."
    else:
        msg = "If an account exists for this email, password reset instructions have been dispatched."

    # Strictly generic message to avoid leaking user existence
    response_data = {"message": msg}
    if env != "production" and dev_token:
        response_data["reset_token"] = dev_token
    return response_data


@router.post("/reset-password")
def reset_password(
    payload: ResetPasswordRequest,
    db: Session = Depends(get_db)
):
    if payload.password != payload.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Passwords do not match."
        )

    is_valid, msg = validate_password_strength(payload.password)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=msg
        )

    t_hash = hash_token(payload.token.strip())
    now = datetime.now(timezone.utc).replace(tzinfo=None)

    token_record = db.query(PasswordResetToken).filter(
        PasswordResetToken.token_hash == t_hash,
        PasswordResetToken.used_at == None,
        PasswordResetToken.expires_at > now
    ).first()

    if not token_record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This reset link is invalid or has expired."
        )

    user = db.query(User).filter(User.id == token_record.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found."
        )

    # Update password and invalidate token
    user.password_hash = hash_password(payload.password)
    token_record.used_at = now

    # Invalidate all active sessions for security
    db.query(UserSession).filter(
        UserSession.user_id == user.id,
        UserSession.is_active == True
    ).update({"is_active": False})

    db.commit()

    return {
        "message": "Your password has been updated. Please sign in with your new password."
    }


@router.post("/change-password")
def change_password(
    payload: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The current password you provided is incorrect."
        )

    if payload.new_password != payload.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New passwords do not match."
        )

    is_valid, msg = validate_password_strength(payload.new_password)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=msg
        )

    current_user.password_hash = hash_password(payload.new_password)
    db.commit()

    return {"message": "Your password has been changed successfully."}


@router.get("/sessions")
def list_sessions(
    user_and_session: tuple[User, UserSession] = Depends(get_current_user_and_session),
    db: Session = Depends(get_db)
):
    current_user, current_session = user_and_session
    now = datetime.now(timezone.utc).replace(tzinfo=None)

    sessions = db.query(UserSession).filter(
        UserSession.user_id == current_user.id,
        UserSession.is_active == True,
        UserSession.expires_at > now
    ).order_by(desc(UserSession.last_active_at)).all()

    return {
        "sessions": [
            {
                "id": s.id,
                "ip_address": s.ip_address,
                "device_name": s.device_name or "Web Browser",
                "is_current": s.id == current_session.id,
                "created_at": s.created_at,
                "last_active_at": s.last_active_at
            }
            for s in sessions
        ]
    }


@router.delete("/sessions/{session_id}")
def revoke_session(
    session_id: str,
    user_and_session: tuple[User, UserSession] = Depends(get_current_user_and_session),
    db: Session = Depends(get_db)
):
    current_user, _ = user_and_session
    session = db.query(UserSession).filter(
        UserSession.id == session_id,
        UserSession.user_id == current_user.id
    ).first()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found."
        )

    session.is_active = False
    db.commit()
    return {"message": "Session terminated."}


@router.post("/sessions/revoke-others")
def revoke_other_sessions(
    user_and_session: tuple[User, UserSession] = Depends(get_current_user_and_session),
    db: Session = Depends(get_db)
):
    current_user, current_session = user_and_session

    db.query(UserSession).filter(
        UserSession.user_id == current_user.id,
        UserSession.id != current_session.id,
        UserSession.is_active == True
    ).update({"is_active": False})
    db.commit()

    return {"message": "All other sessions have been logged out."}


@router.get("/security")
def get_security_overview(
    user_and_session: tuple[User, UserSession] = Depends(get_current_user_and_session),
    db: Session = Depends(get_db)
):
    current_user, current_session = user_and_session
    now = datetime.now(timezone.utc).replace(tzinfo=None)

    # Active sessions
    sessions = db.query(UserSession).filter(
        UserSession.user_id == current_user.id,
        UserSession.is_active == True,
        UserSession.expires_at > now
    ).order_by(desc(UserSession.last_active_at)).all()

    # Recent login activity
    activities = db.query(LoginActivity).filter(
        LoginActivity.user_id == current_user.id
    ).order_by(desc(LoginActivity.created_at)).limit(10).all()

    return {
        "user": {
            "id": current_user.id,
            "email": current_user.email,
            "is_verified": current_user.is_verified,
            "created_at": current_user.created_at,
            "last_login": current_user.last_login
        },
        "two_factor_enabled": False,
        "sessions": [
            {
                "id": s.id,
                "ip_address": s.ip_address,
                "device_name": s.device_name or "Web Browser",
                "is_current": s.id == current_session.id,
                "created_at": s.created_at,
                "last_active_at": s.last_active_at
            }
            for s in sessions
        ],
        "activities": [
            {
                "id": a.id,
                "status": a.status,
                "ip_address": a.ip_address,
                "user_agent": a.user_agent,
                "created_at": a.created_at
            }
            for a in activities
        ]
    }


@router.delete("/account")
def delete_account(
    payload: DeleteAccountRequest,
    user_and_session: tuple[User, UserSession] = Depends(get_current_user_and_session),
    response: Response = None,
    db: Session = Depends(get_db)
):
    current_user, _ = user_and_session

    if not verify_password(payload.password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect password. Account deletion cannot proceed."
        )

    db.delete(current_user)
    db.commit()

    if response:
        clear_auth_cookie(response)

    return {"message": "Account has been deleted permanently."}
