from typing import List, Optional
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel

class InventoryValuationItem(BaseModel):
    product_id: int
    sku: str
    name: str
    category: str
    quantity: int
    unit: str
    cost_price: Decimal
    selling_price: Decimal
    total_cost: Decimal
    total_retail: Decimal
    margin_pct: float

class LowStockReportItem(BaseModel):
    product_id: int
    sku: str
    name: str
    category: str
    quantity: int
    reorder_level: int
    deficit: int
    unit: str

class MovementReportItem(BaseModel):
    id: int
    timestamp: datetime
    sku: str
    product_name: str
    movement_type: str
    quantity_change: int
    quantity_before: int
    quantity_after: int
    reference: Optional[str] = None
    reason: Optional[str] = None
    user: Optional[str] = None

class SalesSummaryReport(BaseModel):
    total_orders: int
    total_revenue: Decimal
    total_discounts: Decimal
    net_sales: Decimal
    total_units_sold: int
    estimated_cogs: Decimal
    estimated_gross_profit: Decimal

class ProductSalesReportItem(BaseModel):
    product_id: int
    sku: str
    name: str
    category: str
    units_sold: int
    revenue: Decimal
    cogs: Decimal
    gross_profit: Decimal
