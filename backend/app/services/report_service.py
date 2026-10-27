import io
import csv
from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, desc

from app.models.product import Product
from app.models.category import Category
from app.models.sale import Sale, SaleItem, SaleStatus
from app.models.stock_movement import StockMovement
from app.schemas.report import (
    InventoryValuationItem,
    LowStockReportItem,
    MovementReportItem,
    SalesSummaryReport,
    ProductSalesReportItem
)

class ReportService:
    @classmethod
    def get_inventory_valuation(cls, db: Session) -> List[InventoryValuationItem]:
        products = db.query(Product).options(joinedload(Product.category)).filter(Product.is_active == True).all()
        results = []
        for p in products:
            cost = Decimal(str(p.cost_price)) * Decimal(str(p.quantity))
            retail = Decimal(str(p.selling_price)) * Decimal(str(p.quantity))
            margin = 0.0
            if retail > 0:
                margin = float(((retail - cost) / retail) * 100)

            results.append(InventoryValuationItem(
                product_id=p.id,
                sku=p.sku,
                name=p.name,
                category=p.category.name if p.category else "N/A",
                quantity=p.quantity,
                unit=p.unit,
                cost_price=p.cost_price,
                selling_price=p.selling_price,
                total_cost=cost,
                total_retail=retail,
                margin_pct=round(margin, 2)
            ))
        return results

    @classmethod
    def get_low_stock(cls, db: Session) -> List[LowStockReportItem]:
        products = db.query(Product).options(joinedload(Product.category)).filter(
            Product.is_active == True,
            Product.quantity <= Product.reorder_level
        ).order_by(Product.quantity.asc()).all()

        results = []
        for p in products:
            deficit = max(0, p.reorder_level - p.quantity)
            results.append(LowStockReportItem(
                product_id=p.id,
                sku=p.sku,
                name=p.name,
                category=p.category.name if p.category else "N/A",
                quantity=p.quantity,
                reorder_level=p.reorder_level,
                deficit=deficit,
                unit=p.unit
            ))
        return results

    @classmethod
    def get_stock_movements_report(
        cls,
        db: Session,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> List[MovementReportItem]:
        query = db.query(StockMovement).options(joinedload(StockMovement.product))
        if start_date:
            query = query.filter(StockMovement.created_at >= start_date)
        if end_date:
            query = query.filter(StockMovement.created_at <= end_date)
        movements = query.order_by(desc(StockMovement.created_at)).all()

        results = []
        for m in movements:
            results.append(MovementReportItem(
                id=m.id,
                timestamp=m.created_at,
                sku=m.product.sku if m.product else "N/A",
                product_name=m.product.name if m.product else "N/A",
                movement_type=m.movement_type.value,
                quantity_change=m.quantity_change,
                quantity_before=m.quantity_before,
                quantity_after=m.quantity_after,
                reference=m.reference_id,
                reason=m.reason,
                user=m.created_by
            ))
        return results

    @classmethod
    def get_sales_summary_report(
        cls,
        db: Session,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> SalesSummaryReport:
        query = db.query(Sale).filter(Sale.status == SaleStatus.COMPLETED)
        if start_date:
            query = query.filter(Sale.created_at >= start_date)
        if end_date:
            query = query.filter(Sale.created_at <= end_date)

        sales = query.all()
        total_orders = len(sales)
        total_revenue = sum(s.total_amount for s in sales) if sales else Decimal("0.00")
        total_discounts = sum(s.discount_amount for s in sales) if sales else Decimal("0.00")
        net_sales = total_revenue

        # Calculate COGS and units sold
        total_units = 0
        total_cogs = Decimal("0.00")
        for s in sales:
            for item in s.items:
                total_units += item.quantity
                total_cogs += Decimal(str(item.unit_cost_at_sale)) * Decimal(str(item.quantity))

        gross_profit = net_sales - total_cogs

        return SalesSummaryReport(
            total_orders=total_orders,
            total_revenue=total_revenue,
            total_discounts=total_discounts,
            net_sales=net_sales,
            total_units_sold=total_units,
            estimated_cogs=total_cogs,
            estimated_gross_profit=gross_profit
        )

    @classmethod
    def get_product_sales_report(
        cls,
        db: Session,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> List[ProductSalesReportItem]:
        query = db.query(SaleItem).join(Sale).filter(Sale.status == SaleStatus.COMPLETED)
        if start_date:
            query = query.filter(Sale.created_at >= start_date)
        if end_date:
            query = query.filter(Sale.created_at <= end_date)

        sale_items = query.options(joinedload(SaleItem.product).joinedload(Product.category)).all()

        product_aggregates: Dict[int, Dict[str, Any]] = {}
        for it in sale_items:
            p_id = it.product_id
            if p_id not in product_aggregates:
                p_sku = it.product.sku if it.product else "N/A"
                p_name = it.product.name if it.product else "N/A"
                p_cat = it.product.category.name if (it.product and it.product.category) else "N/A"
                product_aggregates[p_id] = {
                    "product_id": p_id,
                    "sku": p_sku,
                    "name": p_name,
                    "category": p_cat,
                    "units_sold": 0,
                    "revenue": Decimal("0.00"),
                    "cogs": Decimal("0.00")
                }
            product_aggregates[p_id]["units_sold"] += it.quantity
            product_aggregates[p_id]["revenue"] += Decimal(str(it.unit_price)) * Decimal(str(it.quantity))
            product_aggregates[p_id]["cogs"] += Decimal(str(it.unit_cost_at_sale)) * Decimal(str(it.quantity))

        results = []
        for agg in product_aggregates.values():
            profit = agg["revenue"] - agg["cogs"]
            results.append(ProductSalesReportItem(
                product_id=agg["product_id"],
                sku=agg["sku"],
                name=agg["name"],
                category=agg["category"],
                units_sold=agg["units_sold"],
                revenue=agg["revenue"],
                cogs=agg["cogs"],
                gross_profit=profit
            ))

        results.sort(key=lambda x: x.revenue, reverse=True)
        return results

    @classmethod
    def export_csv(
        cls,
        db: Session,
        report_type: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> str:
        """Generates standard RFC-4180 CSV string safely escaping commas, quotes, linebreaks."""
        output = io.StringIO()
        writer = csv.writer(output, quoting=csv.QUOTE_MINIMAL)

        if report_type == "inventory":
            items = cls.get_inventory_valuation(db)
            writer.writerow(["SKU", "Product Name", "Category", "Quantity", "Unit", "Cost Price", "Selling Price", "Total Cost Value", "Total Retail Value", "Margin (%)"])
            for it in items:
                writer.writerow([it.sku, it.name, it.category, it.quantity, it.unit, f"{it.cost_price:.2f}", f"{it.selling_price:.2f}", f"{it.total_cost:.2f}", f"{it.total_retail:.2f}", f"{it.margin_pct:.1f}%"])

        elif report_type == "low-stock":
            items = cls.get_low_stock(db)
            writer.writerow(["SKU", "Product Name", "Category", "Current Stock", "Reorder Level", "Deficit", "Unit"])
            for it in items:
                writer.writerow([it.sku, it.name, it.category, it.quantity, it.reorder_level, it.deficit, it.unit])

        elif report_type == "movements":
            items = cls.get_stock_movements_report(db, start_date, end_date)
            writer.writerow(["Timestamp", "SKU", "Product Name", "Movement Type", "Change", "Before", "After", "Reference", "Reason", "User"])
            for it in items:
                writer.writerow([it.timestamp.isoformat(), it.sku, it.product_name, it.movement_type, it.quantity_change, it.quantity_before, it.quantity_after, it.reference or "", it.reason or "", it.user or ""])

        elif report_type == "sales":
            items = cls.get_product_sales_report(db, start_date, end_date)
            writer.writerow(["SKU", "Product Name", "Category", "Units Sold", "Total Revenue", "Estimated COGS", "Gross Profit"])
            for it in items:
                writer.writerow([it.sku, it.name, it.category, it.units_sold, f"{it.revenue:.2f}", f"{it.cogs:.2f}", f"{it.gross_profit:.2f}"])

        else:
            writer.writerow(["Error", "Unknown report type"])

        return output.getvalue()
