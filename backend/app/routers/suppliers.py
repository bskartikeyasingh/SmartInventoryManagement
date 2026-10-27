from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, require_admin
from app.models.profile import Profile
from app.services.supplier_service import SupplierService
from app.schemas.supplier import SupplierCreate, SupplierUpdate, SupplierResponse

router = APIRouter(prefix="/suppliers", tags=["Suppliers"])

@router.get("", response_model=List[SupplierResponse])
def list_suppliers(
    include_inactive: bool = Query(False),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user)
):
    return SupplierService.get_suppliers(db=db, include_inactive=include_inactive, search=search)

@router.get("/{supplier_id}", response_model=SupplierResponse)
def get_supplier(
    supplier_id: int,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user)
):
    return SupplierService.get_supplier_by_id(db=db, supplier_id=supplier_id)

@router.post("", response_model=SupplierResponse, status_code=status.HTTP_201_CREATED)
def create_supplier(
    payload: SupplierCreate,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_admin)
):
    return SupplierService.create_supplier(db=db, data=payload)

@router.patch("/{supplier_id}", response_model=SupplierResponse)
def update_supplier(
    supplier_id: int,
    payload: SupplierUpdate,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_admin)
):
    return SupplierService.update_supplier(db=db, supplier_id=supplier_id, data=payload)
