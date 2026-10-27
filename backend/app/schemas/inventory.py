from typing import Optional, List
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, Field
from app.models.stock_movement import MovementType

class StockReceiveRequest(BaseModel):
    product_id: int
    quantity: int = Field(..., gt=0)
    unit_cost: Optional[Decimal] = Field(None, ge=0)
    reference: Optional[str] = "DIRECT_RECEIPT"
    notes: Optional[str] = None

class StockAdjustRequest(BaseModel):
    product_id: int
    adjustment_type: str = Field(..., pattern="^(INCREASE|DECREASE)$")
    quantity: int = Field(..., gt=0)
    reason: str = Field(..., min_length=3, max_length=500, description="Mandatory reason for manual adjustment")

class StockMovementResponse(BaseModel):
    id: int
    product_id: int
    product_name: Optional[str] = None
    sku: Optional[str] = None
    movement_type: MovementType
    quantity_change: int
    quantity_before: int
    quantity_after: int
    reference_type: Optional[str] = None
    reference_id: Optional[str] = None
    reason: Optional[str] = None
    created_by: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class StockMovementListResponse(BaseModel):
    items: List[StockMovementResponse]
    total: int
    page: int
    limit: int
    total_pages: int

class InventorySummaryResponse(BaseModel):
    total_active_products: int
    total_units_in_stock: int
    total_inventory_cost: Decimal
    total_retail_value: Decimal
    low_stock_count: int
    out_of_stock_count: int
