import httpx
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
import jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db

logger = logging.getLogger("stockpilot.security")

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security_scheme = HTTPBearer(auto_error=False)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

async def verify_supabase_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Verify Supabase Auth token by calling the Supabase Auth API endpoint.
    This guarantees 100% compatibility with any Supabase project configuration.
    """
    if not settings.SUPABASE_URL:
        return None
    try:
        url = f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/user"
        headers = {
            "Authorization": f"Bearer {token}",
            "apikey": settings.SUPABASE_PUBLISHABLE_KEY
        }
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(url, headers=headers)
            if resp.status_code == 200:
                user_data = resp.json()
                return {
                    "id": user_data.get("id"),
                    "email": user_data.get("email"),
                    "role": user_data.get("user_metadata", {}).get("role", "STAFF"),
                    "full_name": user_data.get("user_metadata", {}).get("full_name") or user_data.get("email", "").split("@")[0]
                }
    except Exception as e:
        logger.debug(f"Supabase token validation error: {e}")
    return None

def verify_local_jwt(token: str) -> Optional[Dict[str, Any]]:
    """Verify local JWT token used for dev / test suite / bootstrap authentication."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except jwt.PyJWTError:
        return None

async def get_current_user(
    auth: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
    db: Session = Depends(get_db)
):
    from app.models.profile import Profile, UserRole

    if not auth or not auth.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authentication token",
            headers={"WWW-Authenticate": "Bearer"}
        )

    token = auth.credentials
    user_info = None

    # First attempt: Local JWT (e.g. for dev/test/bootstrap)
    local_payload = verify_local_jwt(token)
    if local_payload:
        user_info = {
            "id": local_payload.get("sub"),
            "email": local_payload.get("email"),
            "role": local_payload.get("role", "STAFF"),
            "full_name": local_payload.get("full_name", "User")
        }
    else:
        # Second attempt: Supabase Auth verification
        user_info = await verify_supabase_token(token)

    if not user_info or not user_info.get("id"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"}
        )

    # Sync or fetch profile in database
    user_id = str(user_info["id"])
    profile = db.query(Profile).filter(Profile.id == user_id).first()

    if not profile:
        # Auto-create profile if missing
        assigned_role = UserRole.ADMIN if user_info.get("role") == "ADMIN" else UserRole.STAFF
        # Check if first user in database -> grant ADMIN
        if db.query(Profile).count() == 0:
            assigned_role = UserRole.ADMIN

        profile = Profile(
            id=user_id,
            email=user_info.get("email", ""),
            full_name=user_info.get("full_name", "User"),
            role=assigned_role,
            is_active=True
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)

    if not profile.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is deactivated")

    return profile

def require_admin(current_user = Depends(get_current_user)):
    from app.models.profile import UserRole
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrative privileges required"
        )
    return current_user

def require_staff(current_user = Depends(get_current_user)):
    """Both ADMIN and STAFF have staff-level access."""
    return current_user
