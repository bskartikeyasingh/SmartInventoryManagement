from typing import List, Optional
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel

class DashboardSummaryResponse(BaseModel):
    total_active_products: int
    total_units_in_stock: int
    total_inventory_cost: Decimal
    total_inventory_retail: Decimal
    low_stock_count: int
    out_of_stock_count: int
    period_sales_revenue: Decimal
    period_orders_count: int
    revenue_growth_pct: float = 0.0
    orders_growth_pct: float = 0.0

class SalesTrendItem(BaseModel):
    period: str  # e.g. "Jan", "Feb" or "2026-10-01"
    revenue: Decimal
    order_count: int

class StockDistributionItem(BaseModel):
    category_id: int
    category_name: str
    product_count: int
    total_units: int
    total_cost: Decimal
    percentage: float

class NeedsAttentionItem(BaseModel):
    product_id: int
    sku: str
    product_name: str
    category_name: str
    current_stock: int
    reorder_level: int
    stock_status: str  # "LOW_STOCK" | "OUT_OF_STOCK"
    unit: str

class RecentActivityItem(BaseModel):
    id: str
    activity_type: str  # "SALE", "PURCHASE", "STOCK_MOVEMENT"
    title: str
    subtitle: str
    amount_or_quantity: str
    timestamp: datetime
    badge: Optional[str] = None
