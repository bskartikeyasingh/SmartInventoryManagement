from typing import Optional
from datetime import datetime
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, require_admin
from app.models.profile import Profile
from app.services.inventory_service import InventoryService
from app.schemas.inventory import (
    StockReceiveRequest,
    StockAdjustRequest,
    StockMovementResponse,
    StockMovementListResponse,
    InventorySummaryResponse
)

router = APIRouter(prefix="/inventory", tags=["Inventory"])

@router.get("/summary", response_model=InventorySummaryResponse)
def get_inventory_summary(
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user)
):
    return InventoryService.get_summary(db=db)

@router.get("/movements", response_model=StockMovementListResponse)
def list_stock_movements(
    product_id: Optional[int] = Query(None),
    movement_type: Optional[str] = Query(None),
    user_id: Optional[str] = Query(None),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user)
):
    return InventoryService.get_movements(
        db=db,
        product_id=product_id,
        movement_type=movement_type,
        user_id=user_id,
        start_date=start_date,
        end_date=end_date,
        page=page,
        limit=limit
    )

@router.post("/receive", response_model=StockMovementResponse, status_code=status.HTTP_201_CREATED)
def receive_stock(
    payload: StockReceiveRequest,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user)
):
    return InventoryService.receive_stock(db=db, data=payload, user_id=current_user.id)

@router.post("/adjust", response_model=StockMovementResponse, status_code=status.HTTP_201_CREATED)
def adjust_stock(
    payload: StockAdjustRequest,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_admin)
):
    return InventoryService.adjust_stock(db=db, data=payload, user_id=current_user.id)
