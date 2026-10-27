import math
from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional, List
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, desc
from fastapi import HTTPException, status

from app.models.product import Product
from app.models.stock_movement import StockMovement, MovementType
from app.schemas.inventory import (
    StockReceiveRequest,
    StockAdjustRequest,
    StockMovementResponse,
    StockMovementListResponse,
    InventorySummaryResponse
)

class InventoryService:
    @classmethod
    def get_summary(cls, db: Session) -> InventorySummaryResponse:
        active_products = db.query(Product).filter(Product.is_active == True).all()

        total_active = len(active_products)
        total_units = sum(p.quantity for p in active_products)
        total_cost = sum(Decimal(str(p.cost_price)) * Decimal(str(p.quantity)) for p in active_products)
        total_retail = sum(Decimal(str(p.selling_price)) * Decimal(str(p.quantity)) for p in active_products)

        low_stock = sum(1 for p in active_products if 0 < p.quantity <= p.reorder_level)
        out_of_stock = sum(1 for p in active_products if p.quantity <= 0)

        return InventorySummaryResponse(
            total_active_products=total_active,
            total_units_in_stock=total_units,
            total_inventory_cost=total_cost,
            total_retail_value=total_retail,
            low_stock_count=low_stock,
            out_of_stock_count=out_of_stock
        )

    @classmethod
    def receive_stock(cls, db: Session, data: StockReceiveRequest, user_id: Optional[str] = None) -> StockMovementResponse:
        product = db.query(Product).filter(Product.id == data.product_id).with_for_update().first()
        if not product:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

        qty_before = product.quantity
        qty_after = qty_before + data.quantity

        product.quantity = qty_after
        if data.unit_cost is not None and data.unit_cost >= 0:
            product.cost_price = data.unit_cost

        movement = StockMovement(
            product_id=product.id,
            movement_type=MovementType.PURCHASE_RECEIPT,
            quantity_change=data.quantity,
            quantity_before=qty_before,
            quantity_after=qty_after,
            reference_type="DIRECT_RECEIPT",
            reference_id=data.reference or "DIRECT",
            reason=data.notes or "Direct stock receipt into inventory",
            created_by=user_id
        )
        db.add(movement)
        db.commit()
        db.refresh(movement)

        return StockMovementResponse(
            id=movement.id,
            product_id=movement.product_id,
            product_name=product.name,
            sku=product.sku,
            movement_type=movement.movement_type,
            quantity_change=movement.quantity_change,
            quantity_before=movement.quantity_before,
            quantity_after=movement.quantity_after,
            reference_type=movement.reference_type,
            reference_id=movement.reference_id,
            reason=movement.reason,
            created_by=movement.created_by,
            created_at=movement.created_at
        )

    @classmethod
    def adjust_stock(cls, db: Session, data: StockAdjustRequest, user_id: Optional[str] = None) -> StockMovementResponse:
        if not data.reason or len(data.reason.strip()) < 3:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A clear, mandatory reason is required for manual stock adjustments"
            )

        product = db.query(Product).filter(Product.id == data.product_id).with_for_update().first()
        if not product:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

        qty_before = product.quantity

        if data.adjustment_type == "INCREASE":
            qty_change = data.quantity
            qty_after = qty_before + data.quantity
            movement_type = MovementType.ADJUSTMENT_INCREASE
        elif data.adjustment_type == "DECREASE":
            if qty_before < data.quantity:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Cannot decrease stock by {data.quantity}: current available stock is only {qty_before}. Negative stock is prohibited."
                )
            qty_change = -data.quantity
            qty_after = qty_before - data.quantity
            movement_type = MovementType.ADJUSTMENT_DECREASE
        else:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid adjustment type")

        product.quantity = qty_after

        movement = StockMovement(
            product_id=product.id,
            movement_type=movement_type,
            quantity_change=qty_change,
            quantity_before=qty_before,
            quantity_after=qty_after,
            reference_type="MANUAL_ADJUSTMENT",
            reference_id=f"ADJ-{int(datetime.now(timezone.utc).timestamp())}",
            reason=data.reason.strip(),
            created_by=user_id
        )
        db.add(movement)
        db.commit()
        db.refresh(movement)

        return StockMovementResponse(
            id=movement.id,
            product_id=movement.product_id,
            product_name=product.name,
            sku=product.sku,
            movement_type=movement.movement_type,
            quantity_change=movement.quantity_change,
            quantity_before=movement.quantity_before,
            quantity_after=movement.quantity_after,
            reference_type=movement.reference_type,
            reference_id=movement.reference_id,
            reason=movement.reason,
            created_by=movement.created_by,
            created_at=movement.created_at
        )

    @classmethod
    def get_movements(
        cls,
        db: Session,
        product_id: Optional[int] = None,
        movement_type: Optional[str] = None,
        user_id: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        page: int = 1,
        limit: int = 25
    ) -> StockMovementListResponse:
        query = db.query(StockMovement).options(joinedload(StockMovement.product))

        if product_id:
            query = query.filter(StockMovement.product_id == product_id)
        if movement_type:
            query = query.filter(StockMovement.movement_type == movement_type)
        if user_id:
            query = query.filter(StockMovement.created_by == user_id)
        if start_date:
            query = query.filter(StockMovement.created_at >= start_date)
        if end_date:
            query = query.filter(StockMovement.created_at <= end_date)

        query = query.order_by(desc(StockMovement.created_at))

        total = query.count()
        total_pages = math.ceil(total / limit) if total > 0 else 1
        offset = (page - 1) * limit
        items = query.offset(offset).limit(limit).all()

        results = []
        for m in items:
            p_name = m.product.name if m.product else "Unknown Product"
            p_sku = m.product.sku if m.product else "N/A"
            results.append(StockMovementResponse(
                id=m.id,
                product_id=m.product_id,
                product_name=p_name,
                sku=p_sku,
                movement_type=m.movement_type,
                quantity_change=m.quantity_change,
                quantity_before=m.quantity_before,
                quantity_after=m.quantity_after,
                reference_type=m.reference_type,
                reference_id=m.reference_id,
                reason=m.reason,
                created_by=m.created_by,
                created_at=m.created_at
            ))

        return StockMovementListResponse(
            items=results,
            total=total,
            page=page,
            limit=limit,
            total_pages=total_pages
        )
