from typing import Optional, List
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, Field, field_validator

class ProductBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    sku: str = Field(..., min_length=1, max_length=64)
    description: Optional[str] = None
    category_id: int
    unit: str = Field("pcs", max_length=32)
    cost_price: Decimal = Field(..., ge=0)
    selling_price: Decimal = Field(..., ge=0)
    reorder_level: int = Field(10, ge=0)
    image_url: Optional[str] = None
    is_active: bool = True

class ProductCreate(ProductBase):
    opening_quantity: int = Field(0, ge=0)

class ProductUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    sku: Optional[str] = Field(None, min_length=1, max_length=64)
    description: Optional[str] = None
    category_id: Optional[int] = None
    unit: Optional[str] = Field(None, max_length=32)
    cost_price: Optional[Decimal] = Field(None, ge=0)
    selling_price: Optional[Decimal] = Field(None, ge=0)
    reorder_level: Optional[int] = Field(None, ge=0)
    image_url: Optional[str] = None
    is_active: Optional[bool] = None

class ProductResponse(ProductBase):
    id: int
    quantity: int
    category_name: Optional[str] = None
    stock_status: str  # "IN_STOCK", "LOW_STOCK", "OUT_OF_STOCK"
    total_cost_value: Decimal = Decimal("0.00")
    total_sales_value: Decimal = Decimal("0.00")
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class ProductListResponse(BaseModel):
    items: List[ProductResponse]
    total: int
    page: int
    limit: int
    total_pages: int
