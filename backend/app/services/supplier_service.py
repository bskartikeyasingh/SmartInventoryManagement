from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException, status

from app.models.supplier import Supplier
from app.models.purchase import PurchaseOrder
from app.schemas.supplier import SupplierCreate, SupplierUpdate, SupplierResponse

class SupplierService:
    @classmethod
    def get_suppliers(cls, db: Session, include_inactive: bool = False, search: Optional[str] = None) -> List[SupplierResponse]:
        query = db.query(Supplier)
        if not include_inactive:
            query = query.filter(Supplier.is_active == True)
        if search:
            s = f"%{search.strip().lower()}%"
            query = query.filter(
                (func.lower(Supplier.business_name).like(s)) |
                (func.lower(Supplier.contact_name).like(s)) |
                (func.lower(Supplier.email).like(s))
            )
        suppliers = query.order_by(Supplier.business_name.asc()).all()

        results = []
        for sup in suppliers:
            po_count = db.query(func.count(PurchaseOrder.id)).filter(PurchaseOrder.supplier_id == sup.id).scalar() or 0
            results.append(SupplierResponse(
                id=sup.id,
                business_name=sup.business_name,
                contact_name=sup.contact_name,
                email=sup.email,
                phone=sup.phone,
                address=sup.address,
                notes=sup.notes,
                is_active=sup.is_active,
                orders_count=po_count,
                created_at=sup.created_at,
                updated_at=sup.updated_at
            ))
        return results

    @classmethod
    def get_supplier_by_id(cls, db: Session, supplier_id: int) -> SupplierResponse:
        sup = db.query(Supplier).filter(Supplier.id == supplier_id).first()
        if not sup:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Supplier not found")
        po_count = db.query(func.count(PurchaseOrder.id)).filter(PurchaseOrder.supplier_id == sup.id).scalar() or 0
        return SupplierResponse(
            id=sup.id,
            business_name=sup.business_name,
            contact_name=sup.contact_name,
            email=sup.email,
            phone=sup.phone,
            address=sup.address,
            notes=sup.notes,
            is_active=sup.is_active,
            orders_count=po_count,
            created_at=sup.created_at,
            updated_at=sup.updated_at
        )

    @classmethod
    def create_supplier(cls, db: Session, data: SupplierCreate) -> SupplierResponse:
        supplier = Supplier(
            business_name=data.business_name.strip(),
            contact_name=data.contact_name.strip() if data.contact_name else None,
            email=data.email,
            phone=data.phone,
            address=data.address,
            notes=data.notes,
            is_active=data.is_active
        )
        db.add(supplier)
        db.commit()
        db.refresh(supplier)
        return SupplierResponse(
            id=supplier.id,
            business_name=supplier.business_name,
            contact_name=supplier.contact_name,
            email=supplier.email,
            phone=supplier.phone,
            address=supplier.address,
            notes=supplier.notes,
            is_active=supplier.is_active,
            orders_count=0,
            created_at=supplier.created_at,
            updated_at=supplier.updated_at
        )

    @classmethod
    def update_supplier(cls, db: Session, supplier_id: int, data: SupplierUpdate) -> SupplierResponse:
        supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
        if not supplier:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Supplier not found")

        if data.business_name is not None:
            supplier.business_name = data.business_name.strip()
        if data.contact_name is not None:
            supplier.contact_name = data.contact_name.strip() if data.contact_name else None
        if data.email is not None:
            supplier.email = data.email
        if data.phone is not None:
            supplier.phone = data.phone
        if data.address is not None:
            supplier.address = data.address
        if data.notes is not None:
            supplier.notes = data.notes
        if data.is_active is not None:
            supplier.is_active = data.is_active

        db.commit()
        db.refresh(supplier)
        po_count = db.query(func.count(PurchaseOrder.id)).filter(PurchaseOrder.supplier_id == supplier.id).scalar() or 0
        return SupplierResponse(
            id=supplier.id,
            business_name=supplier.business_name,
            contact_name=supplier.contact_name,
            email=supplier.email,
            phone=supplier.phone,
            address=supplier.address,
            notes=supplier.notes,
            is_active=supplier.is_active,
            orders_count=po_count,
            created_at=supplier.created_at,
            updated_at=supplier.updated_at
        )
