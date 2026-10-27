from typing import Optional, List
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, Field
from app.models.sale import SaleStatus

class SaleItemCreate(BaseModel):
    product_id: int
    quantity: int = Field(..., gt=0)
    unit_price: Optional[Decimal] = Field(None, ge=0)

class SaleCreate(BaseModel):
    items: List[SaleItemCreate] = Field(..., min_length=1)
    discount_amount: Decimal = Field(Decimal("0.00"), ge=0)
    notes: Optional[str] = None

class SaleItemResponse(BaseModel):
    id: int
    product_id: int
    product_name: Optional[str] = None
    sku: Optional[str] = None
    quantity: int
    unit_price: Decimal
    unit_cost_at_sale: Decimal
    line_total: Decimal

    class Config:
        from_attributes = True

class SaleResponse(BaseModel):
    id: int
    sale_number: str
    status: SaleStatus
    subtotal: Decimal
    discount_amount: Decimal
    total_amount: Decimal
    notes: Optional[str] = None
    created_by: Optional[str] = None
    creator_name: Optional[str] = None
    created_at: datetime
    items: List[SaleItemResponse] = []

    class Config:
        from_attributes = True
