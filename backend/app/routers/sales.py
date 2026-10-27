from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, require_admin
from app.models.profile import Profile
from app.services.sale_service import SaleService
from app.schemas.sale import SaleCreate, SaleResponse

router = APIRouter(prefix="/sales", tags=["Sales"])

@router.get("", response_model=List[SaleResponse])
def list_sales(
    search: Optional[str] = Query(None, description="Search by sale number"),
    status: Optional[str] = Query(None, description="COMPLETED, CANCELLED"),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user)
):
    return SaleService.get_sales(
        db=db,
        search=search,
        status_filter=status,
        start_date=start_date,
        end_date=end_date
    )

@router.get("/{sale_id}", response_model=SaleResponse)
def get_sale(
    sale_id: int,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user)
):
    return SaleService.get_sale_by_id(db=db, sale_id=sale_id)

@router.post("", response_model=SaleResponse, status_code=status.HTTP_201_CREATED)
def record_sale(
    payload: SaleCreate,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user)
):
    return SaleService.create_sale(db=db, data=payload, user_id=current_user.id)

@router.post("/{sale_id}/cancel", response_model=SaleResponse)
def cancel_sale(
    sale_id: int,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_admin)
):
    return SaleService.cancel_sale(db=db, sale_id=sale_id, user_id=current_user.id)
