import uuid
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, require_admin, create_access_token
from app.models.profile import Profile, UserRole
from app.schemas.auth import UserResponse, LoginRequest, DevLoginRequest, TokenResponse

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.get("/me", response_model=UserResponse)
def get_current_user_profile(current_user: Profile = Depends(get_current_user)):
    return current_user

@router.post("/dev-login", response_model=TokenResponse)
def dev_login(payload: DevLoginRequest, db: Session = Depends(get_db)):
    """
    Development login allowing quick switching between ADMIN and STAFF roles
    for testing and local evaluation. Also auto-creates or syncs profile.
    """
    email_clean = payload.email.lower().strip()
    profile = db.query(Profile).filter(Profile.email == email_clean).first()

    if not profile:
        user_id = f"usr_{uuid.uuid4().hex[:12]}"
        profile = Profile(
            id=user_id,
            email=email_clean,
            full_name=payload.full_name or "Demo User",
            role=payload.role or UserRole.ADMIN,
            is_active=True
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)
    else:
        # Update role if explicitly requested in dev login
        if payload.role and profile.role != payload.role:
            profile.role = payload.role
            db.commit()
            db.refresh(profile)

    token = create_access_token({
        "sub": profile.id,
        "email": profile.email,
        "role": profile.role.value,
        "full_name": profile.full_name
    })

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=profile
    )

@router.post("/bootstrap-admin", response_model=UserResponse)
def bootstrap_admin(payload: DevLoginRequest, db: Session = Depends(get_db)):
    """Initializes the primary administrator account safely."""
    admin_exists = db.query(Profile).filter(Profile.role == UserRole.ADMIN).first()
    if admin_exists:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"An administrator account already exists ({admin_exists.email})"
        )

    user_id = f"admin_{uuid.uuid4().hex[:12]}"
    admin_profile = Profile(
        id=user_id,
        email=payload.email.lower().strip(),
        full_name=payload.full_name or "StockPilot Administrator",
        role=UserRole.ADMIN,
        is_active=True
    )
    db.add(admin_profile)
    db.commit()
    db.refresh(admin_profile)
    return admin_profile

@router.get("/users", response_model=List[UserResponse])
def list_users(db: Session = Depends(get_db), current_user: Profile = Depends(require_admin)):
    """List all user profiles (Admin only)."""
    return db.query(Profile).order_by(Profile.created_at.desc()).all()
