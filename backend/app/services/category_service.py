from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException, status
from app.models.category import Category
from app.models.product import Product
from app.schemas.category import CategoryCreate, CategoryUpdate, CategoryResponse

class CategoryService:
    @staticmethod
    def get_categories(db: Session, include_inactive: bool = False) -> List[CategoryResponse]:
        query = db.query(Category)
        if not include_inactive:
            query = query.filter(Category.is_active == True)
        categories = query.order_by(Category.name.asc()).all()

        results = []
        for cat in categories:
            # Count active products linked to this category
            p_count = db.query(func.count(Product.id)).filter(
                Product.category_id == cat.id,
                Product.is_active == True
            ).scalar() or 0

            results.append(CategoryResponse(
                id=cat.id,
                name=cat.name,
                description=cat.description,
                is_active=cat.is_active,
                product_count=p_count,
                created_at=cat.created_at,
                updated_at=cat.updated_at
            ))
        return results

    @staticmethod
    def create_category(db: Session, data: CategoryCreate) -> CategoryResponse:
        # Case-insensitive duplicate check
        existing = db.query(Category).filter(
            func.lower(Category.name) == data.name.strip().lower()
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Category with name '{data.name.strip()}' already exists"
            )

        category = Category(
            name=data.name.strip(),
            description=data.description,
            is_active=data.is_active
        )
        db.add(category)
        db.commit()
        db.refresh(category)

        return CategoryResponse(
            id=category.id,
            name=category.name,
            description=category.description,
            is_active=category.is_active,
            product_count=0,
            created_at=category.created_at,
            updated_at=category.updated_at
        )

    @staticmethod
    def update_category(db: Session, category_id: int, data: CategoryUpdate) -> CategoryResponse:
        category = db.query(Category).filter(Category.id == category_id).first()
        if not category:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")

        if data.name is not None and data.name.strip():
            existing = db.query(Category).filter(
                func.lower(Category.name) == data.name.strip().lower(),
                Category.id != category_id
            ).first()
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Another category with name '{data.name.strip()}' already exists"
                )
            category.name = data.name.strip()

        if data.description is not None:
            category.description = data.description
        if data.is_active is not None:
            category.is_active = data.is_active

        db.commit()
        db.refresh(category)

        p_count = db.query(func.count(Product.id)).filter(
            Product.category_id == category.id,
            Product.is_active == True
        ).scalar() or 0

        return CategoryResponse(
            id=category.id,
            name=category.name,
            description=category.description,
            is_active=category.is_active,
            product_count=p_count,
            created_at=category.created_at,
            updated_at=category.updated_at
        )

    @staticmethod
    def delete_category(db: Session, category_id: int):
        category = db.query(Category).filter(Category.id == category_id).first()
        if not category:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")

        # Check if products exist
        count = db.query(func.count(Product.id)).filter(Product.category_id == category_id).scalar() or 0
        if count > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot delete category: {count} product(s) are associated with it. Please reassign products first."
            )

        db.delete(category)
        db.commit()
        return {"success": True, "message": "Category deleted successfully"}
