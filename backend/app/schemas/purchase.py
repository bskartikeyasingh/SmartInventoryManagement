from typing import Optional, List
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, Field
from app.models.purchase import PurchaseOrderStatus

class PurchaseItemCreate(BaseModel):
    product_id: int
    ordered_quantity: int = Field(..., gt=0)
    unit_cost: Decimal = Field(..., ge=0)

class PurchaseOrderCreate(BaseModel):
    supplier_id: int
    expected_date: Optional[datetime] = None
    notes: Optional[str] = None
    items: List[PurchaseItemCreate] = Field(..., min_length=1)

class PurchaseOrderUpdate(BaseModel):
    supplier_id: Optional[int] = None
    expected_date: Optional[datetime] = None
    notes: Optional[str] = None
    items: Optional[List[PurchaseItemCreate]] = None

class ReceiptItemCreate(BaseModel):
    purchase_item_id: int
    quantity_received: int = Field(..., gt=0)

class PurchaseReceiptCreate(BaseModel):
    reference_number: Optional[str] = None
    items: List[ReceiptItemCreate] = Field(..., min_length=1)

class PurchaseItemResponse(BaseModel):
    id: int
    product_id: int
    product_name: Optional[str] = None
    sku: Optional[str] = None
    ordered_quantity: int
    received_quantity: int
    remaining_quantity: int
    unit_cost: Decimal
    total_cost: Decimal

    class Config:
        from_attributes = True

class PurchaseReceiptResponse(BaseModel):
    id: int
    received_by: Optional[str] = None
    received_at: datetime
    reference_number: Optional[str] = None

    class Config:
        from_attributes = True

class PurchaseOrderResponse(BaseModel):
    id: int
    order_number: str
    supplier_id: int
    supplier_name: Optional[str] = None
    status: PurchaseOrderStatus
    order_date: datetime
    expected_date: Optional[datetime] = None
    total_amount: Decimal
    notes: Optional[str] = None
    created_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    items: List[PurchaseItemResponse] = []
    receipts: List[PurchaseReceiptResponse] = []

    class Config:
        from_attributes = True
