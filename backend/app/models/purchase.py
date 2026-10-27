import enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, Numeric, ForeignKey, Enum, CheckConstraint
from sqlalchemy.orm import relationship
from app.core.database import Base

class PurchaseOrderStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    ORDERED = "ORDERED"
    PARTIALLY_RECEIVED = "PARTIALLY_RECEIVED"
    RECEIVED = "RECEIVED"
    CANCELLED = "CANCELLED"

class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    order_number = Column(String(64), unique=True, nullable=False, index=True)
    supplier_id = Column(Integer, ForeignKey("suppliers.id", ondelete="RESTRICT"), nullable=False, index=True)
    status = Column(Enum(PurchaseOrderStatus), default=PurchaseOrderStatus.DRAFT, nullable=False)
    order_date = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    expected_date = Column(DateTime, nullable=True)
    total_amount = Column(Numeric(12, 2), default=0.00, nullable=False)
    notes = Column(Text, nullable=True)
    created_by = Column(String(64), ForeignKey("profiles.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    supplier = relationship("Supplier", back_populates="purchase_orders")
    items = relationship("PurchaseItem", back_populates="purchase_order", cascade="all, delete-orphan")
    receipts = relationship("PurchaseReceipt", back_populates="purchase_order", cascade="all, delete-orphan")

class PurchaseItem(Base):
    __tablename__ = "purchase_items"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    purchase_order_id = Column(Integer, ForeignKey("purchase_orders.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="RESTRICT"), nullable=False, index=True)
    ordered_quantity = Column(Integer, nullable=False)
    received_quantity = Column(Integer, default=0, nullable=False)
    unit_cost = Column(Numeric(12, 2), nullable=False)

    __table_args__ = (
        CheckConstraint("ordered_quantity > 0", name="chk_purchase_item_ordered_positive"),
        CheckConstraint("received_quantity >= 0", name="chk_purchase_item_received_nonnegative"),
        CheckConstraint("received_quantity <= ordered_quantity", name="chk_purchase_item_not_over_received"),
    )

    purchase_order = relationship("PurchaseOrder", back_populates="items")
    product = relationship("Product", back_populates="purchase_items")
    receipt_items = relationship("PurchaseReceiptItem", back_populates="purchase_item")

class PurchaseReceipt(Base):
    __tablename__ = "purchase_receipts"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    purchase_order_id = Column(Integer, ForeignKey("purchase_orders.id", ondelete="CASCADE"), nullable=False, index=True)
    received_by = Column(String(64), ForeignKey("profiles.id", ondelete="SET NULL"), nullable=True)
    received_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    reference_number = Column(String(100), nullable=True)

    purchase_order = relationship("PurchaseOrder", back_populates="receipts")
    items = relationship("PurchaseReceiptItem", back_populates="receipt", cascade="all, delete-orphan")

class PurchaseReceiptItem(Base):
    __tablename__ = "purchase_receipt_items"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    receipt_id = Column(Integer, ForeignKey("purchase_receipts.id", ondelete="CASCADE"), nullable=False, index=True)
    purchase_item_id = Column(Integer, ForeignKey("purchase_items.id", ondelete="RESTRICT"), nullable=False, index=True)
    quantity_received = Column(Integer, nullable=False)
    unit_cost = Column(Numeric(12, 2), nullable=False)

    receipt = relationship("PurchaseReceipt", back_populates="items")
    purchase_item = relationship("PurchaseItem", back_populates="receipt_items")
