from typing import Optional
from datetime import datetime
from pydantic import BaseModel, EmailStr
from app.models.profile import UserRole

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: UserRole
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class DevLoginRequest(BaseModel):
    email: EmailStr
    role: Optional[UserRole] = UserRole.ADMIN
    full_name: Optional[str] = "Admin User"

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
