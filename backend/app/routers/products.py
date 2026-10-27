from typing import Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, require_admin
from app.models.profile import Profile
from app.services.product_service import ProductService
from app.schemas.product import ProductCreate, ProductUpdate, ProductResponse, ProductListResponse

router = APIRouter(prefix="/products", tags=["Products"])

@router.get("", response_model=ProductListResponse)
def list_products(
    search: Optional[str] = Query(None, description="Search by name or SKU"),
    category_id: Optional[int] = Query(None),
    stock_status: Optional[str] = Query(None, description="IN_STOCK, LOW_STOCK, OUT_OF_STOCK"),
    is_active: Optional[bool] = Query(True),
    sort_by: str = Query("name", pattern="^(name|sku|quantity|cost_price|selling_price|created_at)$"),
    sort_order: str = Query("asc", pattern="^(asc|desc)$"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user)
):
    return ProductService.get_products(
        db=db,
        search=search,
        category_id=category_id,
        stock_status=stock_status,
        is_active=is_active,
        sort_by=sort_by,
        sort_order=sort_order,
        page=page,
        limit=limit
    )

@router.get("/{product_id}", response_model=ProductResponse)
def get_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user)
):
    return ProductService.get_product_by_id(db=db, product_id=product_id)

@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(
    payload: ProductCreate,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_admin)
):
    return ProductService.create_product(db=db, data=payload, created_by=current_user.id)

@router.patch("/{product_id}", response_model=ProductResponse)
def update_product(
    product_id: int,
    payload: ProductUpdate,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_admin)
):
    return ProductService.update_product(db=db, product_id=product_id, data=payload)

@router.delete("/{product_id}")
def archive_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_admin)
):
    return ProductService.archive_product(db=db, product_id=product_id)
