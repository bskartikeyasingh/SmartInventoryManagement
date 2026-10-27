from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional, List
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc, func
from fastapi import HTTPException, status

from app.models.sale import Sale, SaleItem, SaleStatus
from app.models.product import Product
from app.models.stock_movement import StockMovement, MovementType
from app.schemas.sale import SaleCreate, SaleResponse, SaleItemResponse

class SaleService:
    @classmethod
    def _to_response(cls, sale: Sale) -> SaleResponse:
        creator_name = sale.creator.full_name if sale.creator else "Staff"
        items = []
        for it in sale.items:
            line_tot = Decimal(str(it.unit_price)) * Decimal(str(it.quantity))
            p_name = it.product.name if it.product else "Unknown Product"
            p_sku = it.product.sku if it.product else "N/A"
            items.append(SaleItemResponse(
                id=it.id,
                product_id=it.product_id,
                product_name=p_name,
                sku=p_sku,
                quantity=it.quantity,
                unit_price=it.unit_price,
                unit_cost_at_sale=it.unit_cost_at_sale,
                line_total=line_tot
            ))

        return SaleResponse(
            id=sale.id,
            sale_number=sale.sale_number,
            status=sale.status,
            subtotal=sale.subtotal,
            discount_amount=sale.discount_amount,
            total_amount=sale.total_amount,
            notes=sale.notes,
            created_by=sale.created_by,
            creator_name=creator_name,
            created_at=sale.created_at,
            items=items
        )

    @classmethod
    def create_sale(cls, db: Session, data: SaleCreate, user_id: Optional[str] = None) -> SaleResponse:
        # Generate unique sale number SO-1001 etc.
        count = db.query(func.count(Sale.id)).scalar() or 0
        sale_number = f"SO-{1000 + count + 1}"

        # 1. Validation phase & atomicity check
        # First gather all products with lock
        product_map = {}
        for it in data.items:
            product = db.query(Product).filter(Product.id == it.product_id).with_for_update().first()
            if not product:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Product with ID {it.product_id} not found"
                )
            if not product.is_active:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Product '{product.name}' is archived/inactive and cannot be sold"
                )
            product_map[it.product_id] = product

        # Check total requested per product (in case same product is in multiple lines)
        requested_totals = {}
        for it in data.items:
            requested_totals[it.product_id] = requested_totals.get(it.product_id, 0) + it.quantity

        for p_id, req_qty in requested_totals.items():
            product = product_map[p_id]
            if product.quantity < req_qty:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Insufficient stock for '{product.name}' (SKU: {product.sku}). Available: {product.quantity}, Requested: {req_qty}."
                )

        # 2. Execution phase
        subtotal = Decimal("0.00")
        sale = Sale(
            sale_number=sale_number,
            status=SaleStatus.COMPLETED,
            discount_amount=data.discount_amount,
            notes=data.notes,
            created_by=user_id,
            created_at=datetime.now(timezone.utc)
        )
        db.add(sale)
        db.flush()

        for it in data.items:
            product = product_map[it.product_id]
            price = it.unit_price if it.unit_price is not None else product.selling_price
            line_cost = Decimal(str(price)) * Decimal(str(it.quantity))
            subtotal += line_cost

            # Deduct stock
            qty_before = product.quantity
            qty_after = qty_before - it.quantity
            product.quantity = qty_after

            # Insert stock movement
            movement = StockMovement(
                product_id=product.id,
                movement_type=MovementType.SALE,
                quantity_change=-it.quantity,
                quantity_before=qty_before,
                quantity_after=qty_after,
                reference_type="SALE",
                reference_id=sale.sale_number,
                reason=f"Sale order {sale.sale_number}",
                created_by=user_id
            )
            db.add(movement)

            # Insert sale line item with cost & price snapshot
            sale_item = SaleItem(
                sale_id=sale.id,
                product_id=product.id,
                quantity=it.quantity,
                unit_price=price,
                unit_cost_at_sale=product.cost_price
            )
            db.add(sale_item)

        total_amount = max(Decimal("0.00"), subtotal - data.discount_amount)
        sale.subtotal = subtotal
        sale.total_amount = total_amount

        db.commit()
        db.refresh(sale)
        return cls._to_response(sale)

    @classmethod
    def get_sales(
        cls,
        db: Session,
        search: Optional[str] = None,
        status_filter: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> List[SaleResponse]:
        query = db.query(Sale).options(
            joinedload(Sale.items).joinedload(SaleItem.product),
            joinedload(Sale.creator)
        )

        if search:
            s = f"%{search.strip().lower()}%"
            query = query.filter(func.lower(Sale.sale_number).like(s))
        if status_filter:
            query = query.filter(Sale.status == status_filter.upper())
        if start_date:
            query = query.filter(Sale.created_at >= start_date)
        if end_date:
            query = query.filter(Sale.created_at <= end_date)

        sales = query.order_by(desc(Sale.created_at)).all()
        return [cls._to_response(s) for s in sales]

    @classmethod
    def get_sale_by_id(cls, db: Session, sale_id: int) -> SaleResponse:
        sale = db.query(Sale).options(
            joinedload(Sale.items).joinedload(SaleItem.product),
            joinedload(Sale.creator)
        ).filter(Sale.id == sale_id).first()
        if not sale:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sale not found")
        return cls._to_response(sale)

    @classmethod
    def cancel_sale(cls, db: Session, sale_id: int, user_id: Optional[str] = None) -> SaleResponse:
        sale = db.query(Sale).filter(Sale.id == sale_id).first()
        if not sale:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sale not found")
        if sale.status == SaleStatus.CANCELLED:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Sale is already cancelled")

        # Restore inventory
        for it in sale.items:
            product = db.query(Product).filter(Product.id == it.product_id).with_for_update().first()
            if product:
                qty_before = product.quantity
                qty_after = qty_before + it.quantity
                product.quantity = qty_after

                movement = StockMovement(
                    product_id=product.id,
                    movement_type=MovementType.ADJUSTMENT_INCREASE,
                    quantity_change=it.quantity,
                    quantity_before=qty_before,
                    quantity_after=qty_after,
                    reference_type="SALE_CANCELLATION",
                    reference_id=sale.sale_number,
                    reason=f"Restored stock from cancelled sale {sale.sale_number}",
                    created_by=user_id
                )
                db.add(movement)

        sale.status = SaleStatus.CANCELLED
        db.commit()
        db.refresh(sale)
        return cls._to_response(sale)
