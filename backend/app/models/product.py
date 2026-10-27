from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, Numeric, ForeignKey, CheckConstraint
from sqlalchemy.orm import relationship
from app.core.database import Base

class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    sku = Column(String(64), unique=True, nullable=False, index=True)
    name = Column(String(200), nullable=False, index=True)
    description = Column(Text, nullable=True)
    category_id = Column(Integer, ForeignKey("categories.id", ondelete="RESTRICT"), nullable=False, index=True)
    unit = Column(String(32), default="pcs", nullable=False)
    cost_price = Column(Numeric(12, 2), nullable=False)
    selling_price = Column(Numeric(12, 2), nullable=False)
    quantity = Column(Integer, default=0, nullable=False)
    reorder_level = Column(Integer, default=10, nullable=False)
    image_url = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        CheckConstraint("quantity >= 0", name="chk_product_quantity_nonnegative"),
        CheckConstraint("cost_price >= 0", name="chk_product_cost_nonnegative"),
        CheckConstraint("selling_price >= 0", name="chk_product_price_nonnegative"),
        CheckConstraint("reorder_level >= 0", name="chk_product_reorder_nonnegative"),
    )

    category = relationship("Category", back_populates="products")
    stock_movements = relationship("StockMovement", back_populates="product", cascade="all, delete-orphan")
    purchase_items = relationship("PurchaseItem", back_populates="product")
    sale_items = relationship("SaleItem", back_populates="product")
