"""
SmartNotes AI Administrative Management Subsystem
Provides protected endpoints for system oversight, user management,
role assignment, account deactivation, and system audit logs.
"""

import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, or_

from app.database import get_db
from app.models import (
    User,
    Lecture,
    Note,
    UserSession,
    LoginActivity,
    LectureMessage,
    EmailVerificationToken,
    PasswordResetToken
)
from app.auth import require_admin, serialize_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin", tags=["Admin"])


class UpdateRoleRequest(BaseModel):
    role: str = Field(..., pattern="^(admin|user)$")


class UpdateStatusRequest(BaseModel):
    is_active: Optional[bool] = None
    is_verified: Optional[bool] = None


class PromoteEmailRequest(BaseModel):
    email: str


@router.get("/overview")
def get_admin_overview(
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """System-wide KPIs and recent activity."""
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    day_ago = now - timedelta(hours=24)

    total_users = db.query(func.count(User.id)).scalar() or 0
    total_admins = db.query(func.count(User.id)).filter(User.role == "admin").scalar() or 0
    active_users = db.query(func.count(User.id)).filter(User.is_active == True).scalar() or 0
    verified_users = db.query(func.count(User.id)).filter(User.is_verified == True).scalar() or 0

    total_lectures = db.query(func.count(Lecture.id)).scalar() or 0
    total_notes = db.query(func.count(Note.id)).scalar() or 0
    total_qa = db.query(func.count(LectureMessage.id)).scalar() or 0

    active_sessions = db.query(func.count(UserSession.id)).filter(
        UserSession.is_active == True,
        UserSession.expires_at > now
    ).scalar() or 0

    failed_logins_24h = db.query(func.count(LoginActivity.id)).filter(
        LoginActivity.status == "failed",
        LoginActivity.created_at >= day_ago
    ).scalar() or 0

    # Recent users
    recent_users_records = db.query(User).order_by(desc(User.created_at)).limit(6).all()
    recent_users = [serialize_user(u) for u in recent_users_records]

    # Recent security audit activities
    recent_activities_records = db.query(LoginActivity).order_by(desc(LoginActivity.created_at)).limit(10).all()
    recent_activities = [
        {
            "id": a.id,
            "email": a.email,
            "status": a.status,
            "ip_address": a.ip_address,
            "user_agent": a.user_agent,
            "created_at": a.created_at
        }
        for a in recent_activities_records
    ]

    return {
        "stats": {
            "total_users": total_users,
            "total_admins": total_admins,
            "active_users": active_users,
            "verified_users": verified_users,
            "total_lectures": total_lectures,
            "total_notes": total_notes,
            "total_qa": total_qa,
            "active_sessions": active_sessions,
            "failed_logins_24h": failed_logins_24h
        },
        "recent_users": recent_users,
        "recent_activities": recent_activities
    }


@router.get("/users")
def get_admin_users(
    search: Optional[str] = None,
    role: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """List users with search, role and status filtering."""
    query = db.query(User)

    if search:
        search_pattern = f"%{search.strip()}%"
        query = query.filter(
            or_(
                User.full_name.ilike(search_pattern),
                User.email.ilike(search_pattern)
            )
        )

    if role and role in ("admin", "user"):
        query = query.filter(User.role == role)

    if status_filter == "active":
        query = query.filter(User.is_active == True)
    elif status_filter == "inactive":
        query = query.filter(User.is_active == False)
    elif status_filter == "verified":
        query = query.filter(User.is_verified == True)
    elif status_filter == "unverified":
        query = query.filter(User.is_verified == False)

    total_count = query.count()
    users = query.order_by(desc(User.created_at)).offset(offset).limit(limit).all()

    # Pre-fetch counts for lectures per user
    user_ids = [u.id for u in users]
    lectures_counts = {}
    if user_ids:
        counts = db.query(Lecture.user_id, func.count(Lecture.id)).filter(
            Lecture.user_id.in_(user_ids)
        ).group_by(Lecture.user_id).all()
        lectures_counts = {uid: count for uid, count in counts}

    results = []
    for u in users:
        data = serialize_user(u)
        data["lectures_count"] = lectures_counts.get(u.id, 0)
        results.append(data)

    return {
        "total": total_count,
        "users": results
    }


@router.patch("/users/{user_id}/role")
def update_user_role(
    user_id: int,
    payload: UpdateRoleRequest,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Promote or demote user role."""
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found.")

    if target_user.id == admin.id and payload.role != "admin":
        admin_count = db.query(func.count(User.id)).filter(User.role == "admin").scalar() or 0
        if admin_count <= 1:
            raise HTTPException(
                status_code=400,
                detail="Cannot demote the last remaining administrator account."
            )

    target_user.role = payload.role
    db.commit()
    db.refresh(target_user)

    logger.info("Admin %s updated role of %s to %s", admin.email, target_user.email, payload.role)
    return {
        "message": f"User role updated to {payload.role}.",
        "user": serialize_user(target_user)
    }


@router.patch("/users/{user_id}/status")
def update_user_status(
    user_id: int,
    payload: UpdateStatusRequest,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Activate, deactivate, verify, or unverify account."""
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found.")

    if target_user.id == admin.id and payload.is_active is False:
        raise HTTPException(status_code=400, detail="Cannot deactivate your own administrator account.")

    if payload.is_active is not None:
        target_user.is_active = payload.is_active
        if not payload.is_active:
            # Terminate all active sessions for this deactivated user
            db.query(UserSession).filter(UserSession.user_id == target_user.id).update({"is_active": False})

    if payload.is_verified is not None:
        target_user.is_verified = payload.is_verified

    db.commit()
    db.refresh(target_user)

    logger.info("Admin %s updated status of user %s", admin.email, target_user.email)
    return {
        "message": "User account status updated successfully.",
        "user": serialize_user(target_user)
    }


@router.delete("/users/{user_id}")
def delete_user_account(
    user_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Permanently delete user and cascade associated resources."""
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found.")

    if target_user.id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own administrator account.")

    target_email = target_user.email

    # Explicit cascade cleanup to prevent FK constraint issues
    db.query(UserSession).filter(UserSession.user_id == target_user.id).delete(synchronize_session=False)
    db.query(EmailVerificationToken).filter(EmailVerificationToken.user_id == target_user.id).delete(synchronize_session=False)
    db.query(PasswordResetToken).filter(PasswordResetToken.user_id == target_user.id).delete(synchronize_session=False)
    db.query(LoginActivity).filter(LoginActivity.user_id == target_user.id).update({"user_id": None}, synchronize_session=False)

    lectures = db.query(Lecture).filter(Lecture.user_id == target_user.id).all()
    for lec in lectures:
        db.delete(lec)

    db.delete(target_user)
    db.commit()

    logger.warning("Admin %s deleted user account %s (id=%d)", admin.email, target_email, user_id)
    return {"message": f"User account {target_email} and associated data deleted successfully."}


@router.delete("/users/by-email/{email:path}")
def delete_user_by_email(
    email: str,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Permanently delete user by their email address."""
    clean_email = email.strip().lower()
    target_user = db.query(User).filter(func.lower(User.email) == clean_email).first()
    if not target_user:
        raise HTTPException(status_code=404, detail=f"No user account found with email '{email}'.")

    if target_user.id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own administrator account.")

    target_email = target_user.email
    user_id = target_user.id

    # Explicit cascade cleanup
    db.query(UserSession).filter(UserSession.user_id == user_id).delete(synchronize_session=False)
    db.query(EmailVerificationToken).filter(EmailVerificationToken.user_id == user_id).delete(synchronize_session=False)
    db.query(PasswordResetToken).filter(PasswordResetToken.user_id == user_id).delete(synchronize_session=False)
    db.query(LoginActivity).filter(LoginActivity.user_id == user_id).update({"user_id": None}, synchronize_session=False)

    lectures = db.query(Lecture).filter(Lecture.user_id == user_id).all()
    for lec in lectures:
        db.delete(lec)

    db.delete(target_user)
    db.commit()

    logger.warning("Admin %s deleted user account %s via email", admin.email, target_email)
    return {"message": f"User account {target_email} and associated data deleted successfully."}


@router.get("/lectures")
def get_admin_lectures(
    search: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """View lectures across the system with author information."""
    query = db.query(Lecture).join(User, Lecture.user_id == User.id, isouter=True)

    if search:
        search_pattern = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Lecture.title.ilike(search_pattern),
                User.full_name.ilike(search_pattern),
                User.email.ilike(search_pattern)
            )
        )

    total_count = query.count()
    lectures = query.order_by(desc(Lecture.created_at)).offset(offset).limit(limit).all()

    results = []
    for l in lectures:
        author_name = l.user.full_name if l.user else "System User"
        author_email = l.user.email if l.user else "system@smartnotes.local"
        results.append({
            "id": l.id,
            "title": l.title or "Untitled Lecture",
            "audio_path": l.audio_path,
            "created_at": l.created_at,
            "author_id": l.user_id,
            "author_name": author_name,
            "author_email": author_email,
            "has_notes": bool(l.notes)
        })

    return {
        "total": total_count,
        "lectures": results
    }


@router.delete("/lectures/{lecture_id}")
def delete_admin_lecture(
    lecture_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Remove lecture from system."""
    lecture = db.query(Lecture).filter(Lecture.id == lecture_id).first()
    if not lecture:
        raise HTTPException(status_code=404, detail="Lecture not found.")

    title = lecture.title
    db.delete(lecture)
    db.commit()

    logger.warning("Admin %s deleted lecture #%d (%s)", admin.email, lecture_id, title)
    return {"message": f"Lecture #{lecture_id} deleted successfully."}


@router.get("/audit-logs")
def get_admin_audit_logs(
    status_filter: Optional[str] = Query(None, alias="status"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """System-wide security and login audit trail."""
    query = db.query(LoginActivity)
    if status_filter in ("success", "failed"):
        query = query.filter(LoginActivity.status == status_filter)

    total_count = query.count()
    logs = query.order_by(desc(LoginActivity.created_at)).offset(offset).limit(limit).all()

    return {
        "total": total_count,
        "logs": [
            {
                "id": log.id,
                "user_id": log.user_id,
                "email": log.email,
                "status": log.status,
                "ip_address": log.ip_address,
                "user_agent": log.user_agent,
                "created_at": log.created_at
            }
            for log in logs
        ]
    }


@router.post("/promote-by-email")
def promote_user_by_email(
    payload: PromoteEmailRequest,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db)
):
    """Quickly grant administrator privileges by email."""
    target_email = payload.email.strip().lower()
    target_user = db.query(User).filter(User.email == target_email).first()
    if not target_user:
        raise HTTPException(status_code=404, detail=f"No account found with email {target_email}.")

    target_user.role = "admin"
    target_user.is_verified = True
    db.commit()
    db.refresh(target_user)

    logger.info("Admin %s promoted %s to admin", admin.email, target_email)
    return {
        "message": f"Administrator privileges granted to {target_email}.",
        "user": serialize_user(target_user)
    }
