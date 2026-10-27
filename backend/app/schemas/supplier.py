from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field, EmailStr

class SupplierBase(BaseModel):
    business_name: str = Field(..., min_length=1, max_length=200)
    contact_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None
    is_active: bool = True

class SupplierCreate(SupplierBase):
    pass

class SupplierUpdate(BaseModel):
    business_name: Optional[str] = Field(None, min_length=1, max_length=200)
    contact_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None

class SupplierResponse(SupplierBase):
    id: int
    orders_count: int = 0
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
