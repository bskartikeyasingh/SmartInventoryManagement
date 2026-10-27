from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, require_admin
from app.models.profile import Profile
from app.services.purchase_service import PurchaseService
from app.schemas.purchase import (
    PurchaseOrderCreate,
    PurchaseOrderUpdate,
    PurchaseReceiptCreate,
    PurchaseOrderResponse
)

router = APIRouter(prefix="/purchases", tags=["Purchases"])

@router.get("", response_model=List[PurchaseOrderResponse])
def list_purchases(
    status: Optional[str] = Query(None, description="DRAFT, ORDERED, PARTIALLY_RECEIVED, RECEIVED, CANCELLED"),
    supplier_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user)
):
    return PurchaseService.get_purchase_orders(
        db=db,
        status_filter=status,
        supplier_id=supplier_id,
        search=search
    )

@router.get("/{po_id}", response_model=PurchaseOrderResponse)
def get_purchase_order(
    po_id: int,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user)
):
    return PurchaseService.get_purchase_order_by_id(db=db, po_id=po_id)

@router.post("", response_model=PurchaseOrderResponse, status_code=status.HTTP_201_CREATED)
def create_purchase_order(
    payload: PurchaseOrderCreate,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_admin)
):
    return PurchaseService.create_purchase_order(db=db, data=payload, user_id=current_user.id)

@router.patch("/{po_id}", response_model=PurchaseOrderResponse)
def update_purchase_order(
    po_id: int,
    payload: PurchaseOrderUpdate,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_admin)
):
    return PurchaseService.update_purchase_order(db=db, po_id=po_id, data=payload)

@router.post("/{po_id}/order", response_model=PurchaseOrderResponse)
def order_purchase(
    po_id: int,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_admin)
):
    return PurchaseService.order_purchase_order(db=db, po_id=po_id)

@router.post("/{po_id}/receipts", response_model=PurchaseOrderResponse)
def receive_purchase(
    po_id: int,
    payload: PurchaseReceiptCreate,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user)
):
    return PurchaseService.receive_purchase_order(db=db, po_id=po_id, data=payload, user_id=current_user.id)

@router.post("/{po_id}/cancel", response_model=PurchaseOrderResponse)
def cancel_purchase(
    po_id: int,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_admin)
):
    return PurchaseService.cancel_purchase_order(db=db, po_id=po_id)
