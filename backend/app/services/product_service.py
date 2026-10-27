import math
from decimal import Decimal
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, or_, desc, asc
from fastapi import HTTPException, status

from app.models.product import Product
from app.models.category import Category
from app.models.stock_movement import StockMovement, MovementType
from app.models.purchase import PurchaseItem, PurchaseOrder, PurchaseOrderStatus
from app.schemas.product import ProductCreate, ProductUpdate, ProductResponse, ProductListResponse

class ProductService:
    @staticmethod
    def _compute_stock_status(quantity: int, reorder_level: int) -> str:
        if quantity <= 0:
            return "OUT_OF_STOCK"
        elif quantity <= reorder_level:
            return "LOW_STOCK"
        return "IN_STOCK"

    @classmethod
    def _to_response(cls, p: Product) -> ProductResponse:
        stock_status = cls._compute_stock_status(p.quantity, p.reorder_level)
        cost_val = Decimal(str(p.cost_price)) * Decimal(str(p.quantity))
        sales_val = Decimal(str(p.selling_price)) * Decimal(str(p.quantity))
        cat_name = p.category.name if p.category else None

        return ProductResponse(
            id=p.id,
            name=p.name,
            sku=p.sku,
            description=p.description,
            category_id=p.category_id,
            category_name=cat_name,
            unit=p.unit,
            cost_price=p.cost_price,
            selling_price=p.selling_price,
            quantity=p.quantity,
            reorder_level=p.reorder_level,
            image_url=p.image_url,
            is_active=p.is_active,
            stock_status=stock_status,
            total_cost_value=cost_val,
            total_sales_value=sales_val,
            created_at=p.created_at,
            updated_at=p.updated_at
        )

    @classmethod
    def create_product(cls, db: Session, data: ProductCreate, created_by: Optional[str] = None) -> ProductResponse:
        # Check SKU uniqueness
        sku_clean = data.sku.strip().upper()
        existing_sku = db.query(Product).filter(func.upper(Product.sku) == sku_clean).first()
        if existing_sku:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Product with SKU '{sku_clean}' already exists"
            )

        # Check category exists and is active
        category = db.query(Category).filter(Category.id == data.category_id).first()
        if not category:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Specified category does not exist")

        # Create product
        product = Product(
            name=data.name.strip(),
            sku=sku_clean,
            description=data.description,
            category_id=data.category_id,
            unit=data.unit,
            cost_price=data.cost_price,
            selling_price=data.selling_price,
            quantity=data.opening_quantity,
            reorder_level=data.reorder_level,
            image_url=data.image_url,
            is_active=data.is_active
        )
        db.add(product)
        db.flush()  # get generated product.id

        # If opening quantity > 0, atomically create opening stock movement
        if data.opening_quantity > 0:
            movement = StockMovement(
                product_id=product.id,
                movement_type=MovementType.OPENING_STOCK,
                quantity_change=data.opening_quantity,
                quantity_before=0,
                quantity_after=data.opening_quantity,
                reference_type="OPENING_STOCK",
                reference_id=f"INIT-{product.sku}",
                reason="Initial opening inventory during product creation",
                created_by=created_by
            )
            db.add(movement)

        db.commit()
        db.refresh(product)
        return cls._to_response(product)

    @classmethod
    def get_products(
        cls,
        db: Session,
        search: Optional[str] = None,
        category_id: Optional[int] = None,
        stock_status: Optional[str] = None,
        is_active: Optional[bool] = True,
        sort_by: str = "name",
        sort_order: str = "asc",
        page: int = 1,
        limit: int = 20
    ) -> ProductListResponse:
        query = db.query(Product).options(joinedload(Product.category))

        if is_active is not None:
            query = query.filter(Product.is_active == is_active)

        if category_id:
            query = query.filter(Product.category_id == category_id)

        if search:
            search_term = f"%{search.strip().lower()}%"
            query = query.filter(
                or_(
                    func.lower(Product.name).like(search_term),
                    func.lower(Product.sku).like(search_term)
                )
            )

        if stock_status:
            status_upper = stock_status.upper()
            if status_upper == "OUT_OF_STOCK":
                query = query.filter(Product.quantity <= 0)
            elif status_upper == "LOW_STOCK":
                query = query.filter(Product.quantity > 0, Product.quantity <= Product.reorder_level)
            elif status_upper == "IN_STOCK":
                query = query.filter(Product.quantity > Product.reorder_level)

        # Sorting
        sort_column = getattr(Product, sort_by, Product.name)
        if sort_order.lower() == "desc":
            query = query.order_by(desc(sort_column))
        else:
            query = query.order_by(asc(sort_column))

        total = query.count()
        total_pages = math.ceil(total / limit) if total > 0 else 1

        offset = (page - 1) * limit
        products = query.offset(offset).limit(limit).all()

        items = [cls._to_response(p) for p in products]
        return ProductListResponse(
            items=items,
            total=total,
            page=page,
            limit=limit,
            total_pages=total_pages
        )

    @classmethod
    def get_product_by_id(cls, db: Session, product_id: int) -> ProductResponse:
        product = db.query(Product).options(joinedload(Product.category)).filter(Product.id == product_id).first()
        if not product:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
        return cls._to_response(product)

    @classmethod
    def update_product(cls, db: Session, product_id: int, data: ProductUpdate) -> ProductResponse:
        product = db.query(Product).options(joinedload(Product.category)).filter(Product.id == product_id).first()
        if not product:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

        # Check SKU uniqueness if changed
        if data.sku is not None and data.sku.strip():
            sku_clean = data.sku.strip().upper()
            if sku_clean != product.sku:
                existing = db.query(Product).filter(
                    func.upper(Product.sku) == sku_clean,
                    Product.id != product_id
                ).first()
                if existing:
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail=f"Another product with SKU '{sku_clean}' already exists"
                    )
                product.sku = sku_clean

        if data.name is not None:
            product.name = data.name.strip()
        if data.description is not None:
            product.description = data.description
        if data.category_id is not None:
            category = db.query(Category).filter(Category.id == data.category_id).first()
            if not category:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Specified category does not exist")
            product.category_id = data.category_id
        if data.unit is not None:
            product.unit = data.unit
        if data.cost_price is not None:
            product.cost_price = data.cost_price
        if data.selling_price is not None:
            product.selling_price = data.selling_price
        if data.reorder_level is not None:
            product.reorder_level = data.reorder_level
        if data.image_url is not None:
            product.image_url = data.image_url
        if data.is_active is not None:
            product.is_active = data.is_active

        db.commit()
        db.refresh(product)
        return cls._to_response(product)

    @classmethod
    def archive_product(cls, db: Session, product_id: int):
        product = db.query(Product).filter(Product.id == product_id).first()
        if not product:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

        # Check if there are active purchase orders pending receipt
        pending_po = db.query(PurchaseItem).join(PurchaseOrder).filter(
            PurchaseItem.product_id == product_id,
            PurchaseOrder.status.in_([PurchaseOrderStatus.ORDERED, PurchaseOrderStatus.PARTIALLY_RECEIVED])
        ).first()

        if pending_po:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot archive product: there are open purchase orders awaiting receipt for this item."
            )

        product.is_active = False
        db.commit()
        return {"success": True, "message": f"Product '{product.name}' archived successfully"}
