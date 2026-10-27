from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, require_admin
from app.models.profile import Profile
from app.services.category_service import CategoryService
from app.schemas.category import CategoryCreate, CategoryUpdate, CategoryResponse

router = APIRouter(prefix="/categories", tags=["Categories"])

@router.get("", response_model=List[CategoryResponse])
def list_categories(
    include_inactive: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user)
):
    return CategoryService.get_categories(db=db, include_inactive=include_inactive)

@router.post("", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
def create_category(
    payload: CategoryCreate,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_admin)
):
    return CategoryService.create_category(db=db, data=payload)

@router.patch("/{category_id}", response_model=CategoryResponse)
def update_category(
    category_id: int,
    payload: CategoryUpdate,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_admin)
):
    return CategoryService.update_category(db=db, category_id=category_id, data=payload)

@router.delete("/{category_id}")
def delete_category(
    category_id: int,
    db: Session = Depends(get_db),
    current_user: Profile = Depends(require_admin)
):
    return CategoryService.delete_category(db=db, category_id=category_id)
