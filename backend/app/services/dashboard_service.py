from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, desc, and_

from app.models.product import Product
from app.models.category import Category
from app.models.sale import Sale, SaleItem, SaleStatus
from app.models.stock_movement import StockMovement, MovementType
from app.models.purchase import PurchaseOrder
from app.schemas.dashboard import (
    DashboardSummaryResponse,
    SalesTrendItem,
    StockDistributionItem,
    NeedsAttentionItem,
    RecentActivityItem
)

class DashboardService:
    @classmethod
    def get_summary(cls, db: Session, days: int = 30) -> DashboardSummaryResponse:
        now = datetime.now(timezone.utc)
        period_start = now - timedelta(days=days)
        prev_period_start = now - timedelta(days=days * 2)

        # Products metrics
        active_products = db.query(Product).filter(Product.is_active == True).all()
        total_active = len(active_products)
        total_units = sum(p.quantity for p in active_products)
        total_cost = sum(Decimal(str(p.cost_price)) * Decimal(str(p.quantity)) for p in active_products)
        total_retail = sum(Decimal(str(p.selling_price)) * Decimal(str(p.quantity)) for p in active_products)

        low_stock = sum(1 for p in active_products if 0 < p.quantity <= p.reorder_level)
        out_of_stock = sum(1 for p in active_products if p.quantity <= 0)

        # Current period sales
        current_sales = db.query(Sale).filter(
            Sale.status == SaleStatus.COMPLETED,
            Sale.created_at >= period_start
        ).all()
        period_revenue = sum(s.total_amount for s in current_sales) if current_sales else Decimal("0.00")
        period_orders = len(current_sales)

        # Previous period sales for growth comparison
        prev_sales = db.query(Sale).filter(
            Sale.status == SaleStatus.COMPLETED,
            Sale.created_at >= prev_period_start,
            Sale.created_at < period_start
        ).all()
        prev_revenue = sum(s.total_amount for s in prev_sales) if prev_sales else Decimal("0.00")
        prev_orders = len(prev_sales)

        revenue_growth = 0.0
        if prev_revenue > 0:
            revenue_growth = float(((period_revenue - prev_revenue) / prev_revenue) * 100)

        orders_growth = 0.0
        if prev_orders > 0:
            orders_growth = float(((period_orders - prev_orders) / prev_orders) * 100)

        return DashboardSummaryResponse(
            total_active_products=total_active,
            total_units_in_stock=total_units,
            total_inventory_cost=total_cost,
            total_inventory_retail=total_retail,
            low_stock_count=low_stock,
            out_of_stock_count=out_of_stock,
            period_sales_revenue=period_revenue,
            period_orders_count=period_orders,
            revenue_growth_pct=round(revenue_growth, 1),
            orders_growth_pct=round(orders_growth, 1)
        )

    @classmethod
    def get_sales_trend(cls, db: Session, months: int = 12) -> List[SalesTrendItem]:
        """Returns monthly revenue and order counts for the past N months."""
        now = datetime.now(timezone.utc)
        results = []

        for i in range(months - 1, -1, -1):
            # Calculate month window
            # Approx month calculation
            year = now.year
            month = now.month - i
            while month <= 0:
                month += 12
                year -= 1

            month_label = datetime(year, month, 1).strftime("%b")

            # Determine start and end of that calendar month
            m_start = datetime(year, month, 1, 0, 0, 0, tzinfo=timezone.utc)
            if month == 12:
                m_end = datetime(year + 1, 1, 1, 0, 0, 0, tzinfo=timezone.utc)
            else:
                m_end = datetime(year, month + 1, 1, 0, 0, 0, tzinfo=timezone.utc)

            sales = db.query(Sale).filter(
                Sale.status == SaleStatus.COMPLETED,
                Sale.created_at >= m_start,
                Sale.created_at < m_end
            ).all()

            month_rev = sum(s.total_amount for s in sales) if sales else Decimal("0.00")
            results.append(SalesTrendItem(
                period=month_label,
                revenue=month_rev,
                order_count=len(sales)
            ))

        return results

    @classmethod
    def get_stock_distribution(cls, db: Session) -> List[StockDistributionItem]:
        categories = db.query(Category).filter(Category.is_active == True).all()
        products = db.query(Product).filter(Product.is_active == True).all()

        total_all_units = sum(p.quantity for p in products) or 1
        results = []

        for cat in categories:
            cat_products = [p for p in products if p.category_id == cat.id]
            units = sum(p.quantity for p in cat_products)
            cost = sum(Decimal(str(p.cost_price)) * Decimal(str(p.quantity)) for p in cat_products)
            pct = round((units / total_all_units) * 100, 1)

            results.append(StockDistributionItem(
                category_id=cat.id,
                category_name=cat.name,
                product_count=len(cat_products),
                total_units=units,
                total_cost=cost,
                percentage=pct
            ))

        # Sort descending by total units
        results.sort(key=lambda x: x.total_units, reverse=True)
        return results

    @classmethod
    def get_needs_attention(cls, db: Session, limit: int = 10) -> List[NeedsAttentionItem]:
        # Active products with quantity <= reorder_level
        products = db.query(Product).options(joinedload(Product.category)).filter(
            Product.is_active == True,
            Product.quantity <= Product.reorder_level
        ).order_by(Product.quantity.asc()).limit(limit).all()

        results = []
        for p in products:
            status_str = "OUT_OF_STOCK" if p.quantity <= 0 else "LOW_STOCK"
            cat_name = p.category.name if p.category else "Uncategorized"
            results.append(NeedsAttentionItem(
                product_id=p.id,
                sku=p.sku,
                product_name=p.name,
                category_name=cat_name,
                current_stock=p.quantity,
                reorder_level=p.reorder_level,
                stock_status=status_str,
                unit=p.unit
            ))
        return results

    @classmethod
    def get_recent_activity(cls, db: Session, limit: int = 8) -> List[RecentActivityItem]:
        items: List[RecentActivityItem] = []

        # Recent sales
        recent_sales = db.query(Sale).order_by(desc(Sale.created_at)).limit(limit).all()
        for s in recent_sales:
            items.append(RecentActivityItem(
                id=f"sale-{s.id}",
                activity_type="SALE",
                title=f"Sale {s.sale_number}",
                subtitle=f"{len(s.items)} item(s) sold",
                amount_or_quantity=f"${s.total_amount:,.2f}",
                timestamp=s.created_at,
                badge=s.status.value
            ))

        # Recent movements
        recent_movements = db.query(StockMovement).options(joinedload(StockMovement.product)).order_by(desc(StockMovement.created_at)).limit(limit).all()
        for m in recent_movements:
            p_name = m.product.name if m.product else "Item"
            sign = "+" if m.quantity_change > 0 else ""
            items.append(RecentActivityItem(
                id=f"mov-{m.id}",
                activity_type="STOCK_MOVEMENT",
                title=f"{m.movement_type.value.replace('_', ' ').title()}",
                subtitle=f"{p_name} ({m.reason or 'Inventory updated'})",
                amount_or_quantity=f"{sign}{m.quantity_change} units",
                timestamp=m.created_at,
                badge=m.reference_id
            ))

        # Sort merged activity by timestamp descending
        items.sort(key=lambda x: x.timestamp, reverse=True)
        return items[:limit]
