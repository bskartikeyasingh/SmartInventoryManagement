import enum
from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, Numeric, ForeignKey, Enum, CheckConstraint
from sqlalchemy.orm import relationship
from app.core.database import Base

class SaleStatus(str, enum.Enum):
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"

class Sale(Base):
    __tablename__ = "sales"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    sale_number = Column(String(64), unique=True, nullable=False, index=True)
    status = Column(Enum(SaleStatus), default=SaleStatus.COMPLETED, nullable=False)
    subtotal = Column(Numeric(12, 2), default=0.00, nullable=False)
    discount_amount = Column(Numeric(12, 2), default=0.00, nullable=False)
    total_amount = Column(Numeric(12, 2), default=0.00, nullable=False)
    notes = Column(Text, nullable=True)
    created_by = Column(String(64), ForeignKey("profiles.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        CheckConstraint("subtotal >= 0", name="chk_sale_subtotal_nonnegative"),
        CheckConstraint("discount_amount >= 0", name="chk_sale_discount_nonnegative"),
        CheckConstraint("total_amount >= 0", name="chk_sale_total_nonnegative"),
    )

    items = relationship("SaleItem", back_populates="sale", cascade="all, delete-orphan")
    creator = relationship("Profile", foreign_keys=[created_by])

class SaleItem(Base):
    __tablename__ = "sale_items"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    sale_id = Column(Integer, ForeignKey("sales.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="RESTRICT"), nullable=False, index=True)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Numeric(12, 2), nullable=False)
    unit_cost_at_sale = Column(Numeric(12, 2), nullable=False)

    __table_args__ = (
        CheckConstraint("quantity > 0", name="chk_sale_item_quantity_positive"),
        CheckConstraint("unit_price >= 0", name="chk_sale_item_price_nonnegative"),
        CheckConstraint("unit_cost_at_sale >= 0", name="chk_sale_item_cost_nonnegative"),
    )

    sale = relationship("Sale", back_populates="items")
    product = relationship("Product", back_populates="sale_items")
