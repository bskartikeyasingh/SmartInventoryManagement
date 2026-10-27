from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional, List
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc, func
from fastapi import HTTPException, status

from app.models.purchase import (
    PurchaseOrder,
    PurchaseItem,
    PurchaseReceipt,
    PurchaseReceiptItem,
    PurchaseOrderStatus
)
from app.models.product import Product
from app.models.supplier import Supplier
from app.models.stock_movement import StockMovement, MovementType
from app.schemas.purchase import (
    PurchaseOrderCreate,
    PurchaseOrderUpdate,
    PurchaseReceiptCreate,
    PurchaseOrderResponse,
    PurchaseItemResponse,
    PurchaseReceiptResponse
)

class PurchaseService:
    @classmethod
    def _to_response(cls, po: PurchaseOrder) -> PurchaseOrderResponse:
        supplier_name = po.supplier.business_name if po.supplier else None
        item_responses = []
        for it in po.items:
            rem = max(0, it.ordered_quantity - it.received_quantity)
            total_cost = Decimal(str(it.unit_cost)) * Decimal(str(it.ordered_quantity))
            p_name = it.product.name if it.product else None
            p_sku = it.product.sku if it.product else None
            item_responses.append(PurchaseItemResponse(
                id=it.id,
                product_id=it.product_id,
                product_name=p_name,
                sku=p_sku,
                ordered_quantity=it.ordered_quantity,
                received_quantity=it.received_quantity,
                remaining_quantity=rem,
                unit_cost=it.unit_cost,
                total_cost=total_cost
            ))

        receipt_responses = []
        for r in po.receipts:
            receipt_responses.append(PurchaseReceiptResponse(
                id=r.id,
                received_by=r.received_by,
                received_at=r.received_at,
                reference_number=r.reference_number
            ))

        return PurchaseOrderResponse(
            id=po.id,
            order_number=po.order_number,
            supplier_id=po.supplier_id,
            supplier_name=supplier_name,
            status=po.status,
            order_date=po.order_date,
            expected_date=po.expected_date,
            total_amount=po.total_amount,
            notes=po.notes,
            created_by=po.created_by,
            created_at=po.created_at,
            updated_at=po.updated_at,
            items=item_responses,
            receipts=receipt_responses
        )

    @classmethod
    def create_purchase_order(cls, db: Session, data: PurchaseOrderCreate, user_id: Optional[str] = None) -> PurchaseOrderResponse:
        # Check supplier exists
        supplier = db.query(Supplier).filter(Supplier.id == data.supplier_id).first()
        if not supplier:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Supplier not found")

        # Generate unique order number
        count = db.query(func.count(PurchaseOrder.id)).scalar() or 0
        order_num = f"PO-{1000 + count + 1}"

        total_amount = Decimal("0.00")
        po = PurchaseOrder(
            order_number=order_num,
            supplier_id=data.supplier_id,
            status=PurchaseOrderStatus.DRAFT,
            expected_date=data.expected_date,
            notes=data.notes,
            created_by=user_id,
            total_amount=Decimal("0.00")
        )
        db.add(po)
        db.flush()

        for item_data in data.items:
            product = db.query(Product).filter(Product.id == item_data.product_id).first()
            if not product:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Product ID {item_data.product_id} not found")

            line_cost = Decimal(str(item_data.unit_cost)) * Decimal(str(item_data.ordered_quantity))
            total_amount += line_cost

            pi = PurchaseItem(
                purchase_order_id=po.id,
                product_id=item_data.product_id,
                ordered_quantity=item_data.ordered_quantity,
                received_quantity=0,
                unit_cost=item_data.unit_cost
            )
            db.add(pi)

        po.total_amount = total_amount
        db.commit()
        db.refresh(po)
        return cls._to_response(po)

    @classmethod
    def get_purchase_orders(
        cls,
        db: Session,
        status_filter: Optional[str] = None,
        supplier_id: Optional[int] = None,
        search: Optional[str] = None
    ) -> List[PurchaseOrderResponse]:
        query = db.query(PurchaseOrder).options(
            joinedload(PurchaseOrder.supplier),
            joinedload(PurchaseOrder.items).joinedload(PurchaseItem.product),
            joinedload(PurchaseOrder.receipts)
        )

        if status_filter:
            query = query.filter(PurchaseOrder.status == status_filter.upper())
        if supplier_id:
            query = query.filter(PurchaseOrder.supplier_id == supplier_id)
        if search:
            s = f"%{search.strip().lower()}%"
            query = query.filter(func.lower(PurchaseOrder.order_number).like(s))

        orders = query.order_by(desc(PurchaseOrder.created_at)).all()
        return [cls._to_response(po) for po in orders]

    @classmethod
    def get_purchase_order_by_id(cls, db: Session, po_id: int) -> PurchaseOrderResponse:
        po = db.query(PurchaseOrder).options(
            joinedload(PurchaseOrder.supplier),
            joinedload(PurchaseOrder.items).joinedload(PurchaseItem.product),
            joinedload(PurchaseOrder.receipts)
        ).filter(PurchaseOrder.id == po_id).first()
        if not po:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Purchase order not found")
        return cls._to_response(po)

    @classmethod
    def update_purchase_order(cls, db: Session, po_id: int, data: PurchaseOrderUpdate) -> PurchaseOrderResponse:
        po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id).first()
        if not po:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Purchase order not found")
        if po.status != PurchaseOrderStatus.DRAFT:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only DRAFT purchase orders can be modified")

        if data.supplier_id is not None:
            po.supplier_id = data.supplier_id
        if data.expected_date is not None:
            po.expected_date = data.expected_date
        if data.notes is not None:
            po.notes = data.notes

        if data.items is not None:
            # Remove old items
            db.query(PurchaseItem).filter(PurchaseItem.purchase_order_id == po.id).delete()
            total = Decimal("0.00")
            for item_data in data.items:
                product = db.query(Product).filter(Product.id == item_data.product_id).first()
                if not product:
                    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Product ID {item_data.product_id} not found")
                total += Decimal(str(item_data.unit_cost)) * Decimal(str(item_data.ordered_quantity))
                pi = PurchaseItem(
                    purchase_order_id=po.id,
                    product_id=item_data.product_id,
                    ordered_quantity=item_data.ordered_quantity,
                    received_quantity=0,
                    unit_cost=item_data.unit_cost
                )
                db.add(pi)
            po.total_amount = total

        db.commit()
        db.refresh(po)
        return cls._to_response(po)

    @classmethod
    def order_purchase_order(cls, db: Session, po_id: int) -> PurchaseOrderResponse:
        po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id).first()
        if not po:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Purchase order not found")
        if po.status != PurchaseOrderStatus.DRAFT:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Cannot order PO in '{po.status}' status. Only DRAFT orders can be placed.")

        po.status = PurchaseOrderStatus.ORDERED
        po.order_date = datetime.now(timezone.utc)
        db.commit()
        db.refresh(po)
        return cls._to_response(po)

    @classmethod
    def receive_purchase_order(cls, db: Session, po_id: int, data: PurchaseReceiptCreate, user_id: Optional[str] = None) -> PurchaseOrderResponse:
        po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id).first()
        if not po:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Purchase order not found")
        if po.status not in [PurchaseOrderStatus.ORDERED, PurchaseOrderStatus.PARTIALLY_RECEIVED]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot receive items for PO in status '{po.status}'. Must be ORDERED or PARTIALLY_RECEIVED."
            )

        # Create receipt container
        receipt = PurchaseReceipt(
            purchase_order_id=po.id,
            received_by=user_id,
            received_at=datetime.now(timezone.utc),
            reference_number=data.reference_number
        )
        db.add(receipt)
        db.flush()

        for rec_item in data.items:
            po_item = db.query(PurchaseItem).filter(
                PurchaseItem.id == rec_item.purchase_item_id,
                PurchaseItem.purchase_order_id == po.id
            ).first()

            if not po_item:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Purchase line item {rec_item.purchase_item_id} not found in this order"
                )

            remaining = po_item.ordered_quantity - po_item.received_quantity
            if rec_item.quantity_received > remaining:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Over-receipt rejected: Attempted to receive {rec_item.quantity_received} units for item '{po_item.product.name}', but only {remaining} units remaining to receive."
                )

            # Update purchase line item
            po_item.received_quantity += rec_item.quantity_received

            # Update product quantity atomically
            product = db.query(Product).filter(Product.id == po_item.product_id).with_for_update().first()
            qty_before = product.quantity
            qty_after = qty_before + rec_item.quantity_received
            product.quantity = qty_after

            # Insert stock movement
            movement = StockMovement(
                product_id=product.id,
                movement_type=MovementType.PURCHASE_RECEIPT,
                quantity_change=rec_item.quantity_received,
                quantity_before=qty_before,
                quantity_after=qty_after,
                reference_type="PURCHASE_ORDER",
                reference_id=po.order_number,
                reason=f"Received against purchase order {po.order_number}",
                created_by=user_id
            )
            db.add(movement)

            # Create receipt line item
            receipt_item = PurchaseReceiptItem(
                receipt_id=receipt.id,
                purchase_item_id=po_item.id,
                quantity_received=rec_item.quantity_received,
                unit_cost=po_item.unit_cost
            )
            db.add(receipt_item)

        # Check overall PO status
        all_items = db.query(PurchaseItem).filter(PurchaseItem.purchase_order_id == po.id).all()
        is_fully_received = all(it.received_quantity >= it.ordered_quantity for it in all_items)
        po.status = PurchaseOrderStatus.RECEIVED if is_fully_received else PurchaseOrderStatus.PARTIALLY_RECEIVED

        db.commit()
        db.refresh(po)
        return cls._to_response(po)

    @classmethod
    def cancel_purchase_order(cls, db: Session, po_id: int) -> PurchaseOrderResponse:
        po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id).first()
        if not po:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Purchase order not found")
        if po.status not in [PurchaseOrderStatus.DRAFT, PurchaseOrderStatus.ORDERED]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot cancel purchase order in '{po.status}' status. Received items must remain recorded."
            )
        # Verify no items received
        any_received = any(it.received_quantity > 0 for it in po.items)
        if any_received:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot cancel purchase order with partial receipts"
            )

        po.status = PurchaseOrderStatus.CANCELLED
        db.commit()
        db.refresh(po)
        return cls._to_response(po)
