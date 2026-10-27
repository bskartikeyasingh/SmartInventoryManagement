from datetime import datetime, timedelta, timezone
from decimal import Decimal
import logging

from app.core.database import SessionLocal, init_db
from app.models.profile import Profile, UserRole
from app.models.category import Category
from app.models.product import Product
from app.models.supplier import Supplier
from app.models.purchase import PurchaseOrder, PurchaseItem, PurchaseReceipt, PurchaseReceiptItem, PurchaseOrderStatus
from app.models.sale import Sale, SaleItem, SaleStatus
from app.models.stock_movement import StockMovement, MovementType

logger = logging.getLogger("stockpilot.seed")

def seed_database():
    init_db()
    db = SessionLocal()

    try:
        # 1. Admin & Staff Profiles
        admin_user = db.query(Profile).filter(Profile.email == "admin@stockpilot.io").first()
        if not admin_user:
            admin_user = Profile(
                id="admin-pilot-001",
                email="admin@stockpilot.io",
                full_name="Alex Mercer",
                role=UserRole.ADMIN,
                is_active=True
            )
            db.add(admin_user)

        staff_user = db.query(Profile).filter(Profile.email == "staff@stockpilot.io").first()
        if not staff_user:
            staff_user = Profile(
                id="staff-pilot-002",
                email="staff@stockpilot.io",
                full_name="Jordan Reed",
                role=UserRole.STAFF,
                is_active=True
            )
            db.add(staff_user)

        db.commit()

        # Check if already seeded
        if db.query(Product).count() > 0:
            print("Database already contains product data. Skipping seed.")
            return

        print("Seeding initial retail inventory categories, suppliers, products, and movements...")

        # 2. Categories
        categories_data = [
            ("Electronics", "Audio gear, smart gadgets, and consumer electronics"),
            ("Apparel", "Organic garments, casual wear, and footwear"),
            ("Accessories", "Bottles, bags, wallets, and lifestyle gear"),
            ("Home & Living", "Minimalist home office and living accessories"),
            ("Fitness", "Workout gear, yoga mats, and resistance bands")
        ]
        cat_map = {}
        for name, desc in categories_data:
            cat = Category(name=name, description=desc, is_active=True)
            db.add(cat)
            db.flush()
            cat_map[name] = cat.id

        # 3. Suppliers
        suppliers_data = [
            ("Apex Audio Innovations", "Marcus Vance", "marcus@apexaudio.com", "+1 (555) 234-8901", "102 Industrial Way, Austin, TX"),
            ("Nordic Textiles Ltd.", "Freja Lind", "orders@nordictextiles.se", "+46 8 123 4567", "Storgatan 44, Stockholm, Sweden"),
            ("Echo Lifestyle Co.", "Elena Gomez", "elena@echolifestyle.com", "+1 (555) 890-1234", "78 Harbor Blvd, Seattle, WA"),
            ("Zenith Manufacturing", "David Chen", "contact@zenithmfg.com", "+1 (555) 456-7890", "500 Tech Parkway, San Jose, CA")
        ]
        sup_map = {}
        for b_name, c_name, email, phone, addr in suppliers_data:
            sup = Supplier(
                business_name=b_name,
                contact_name=c_name,
                email=email,
                phone=phone,
                address=addr,
                is_active=True
            )
            db.add(sup)
            db.flush()
            sup_map[b_name] = sup.id

        # 4. Products (Matches reference design items: SKU-1842, SKU-2956, SKU-3421, etc.)
        products_data = [
            ("SKU-1842", "Wireless Bluetooth Headphones", "Over-ear noise cancelling wireless headphones with 30h battery", "Electronics", "pcs", Decimal("45.00"), Decimal("89.99"), 8, 20),
            ("SKU-2956", "Organic Cotton T-Shirt (M)", "100% GOTS certified organic heavyweight cotton crewneck", "Apparel", "pcs", Decimal("9.50"), Decimal("28.00"), 0, 50),
            ("SKU-3421", "Stainless Steel Water Bottle", "Double-wall vacuum insulated 750ml flask in matte charcoal", "Accessories", "pcs", Decimal("8.00"), Decimal("24.50"), 12, 30),
            ("SKU-4107", "Leather Laptop Sleeve (14\")", "Full-grain vegetable-tanned leather protective sleeve", "Accessories", "pcs", Decimal("22.00"), Decimal("55.00"), 4, 15),
            ("SKU-5022", "Mechanical Wireless Keyboard", "Compact 75% hot-swappable mechanical keyboard with RGB", "Electronics", "pcs", Decimal("52.00"), Decimal("110.00"), 35, 15),
            ("SKU-6190", "Merino Wool Beanie", "Ultra-fine ribbed knit merino wool beanie in forest olive", "Apparel", "pcs", Decimal("11.00"), Decimal("32.00"), 42, 20),
            ("SKU-7731", "Ergonomic Desk Mat", "Premium felt and vegan leather dual-sided desk protector", "Home & Living", "pcs", Decimal("14.00"), Decimal("38.00"), 18, 15),
            ("SKU-8204", "Ceramic Pour-Over Coffee Dripper", "Artisanal matte black stoneware pour-over dripper", "Home & Living", "pcs", Decimal("12.50"), Decimal("34.00"), 25, 10),
            ("SKU-9311", "Everyday Canvas Tote Bag", "Heavy-duty 16oz cotton canvas tote with reinforced handles", "Accessories", "pcs", Decimal("7.00"), Decimal("22.00"), 60, 25),
            ("SKU-1055", "USB-C Fast Charging Hub (6-in-1)", "Multiport aluminum adapter with 4K HDMI and 100W PD", "Electronics", "pcs", Decimal("18.00"), Decimal("49.99"), 50, 20)
        ]

        product_objects = {}
        for sku, name, desc, cat_name, unit, cost, price, qty, reorder in products_data:
            p = Product(
                sku=sku,
                name=name,
                description=desc,
                category_id=cat_map[cat_name],
                unit=unit,
                cost_price=cost,
                selling_price=price,
                quantity=qty,
                reorder_level=reorder,
                is_active=True
            )
            db.add(p)
            db.flush()
            product_objects[sku] = p

            # Opening stock movement
            if qty > 0:
                movement = StockMovement(
                    product_id=p.id,
                    movement_type=MovementType.OPENING_STOCK,
                    quantity_change=qty,
                    quantity_before=0,
                    quantity_after=qty,
                    reference_type="OPENING_STOCK",
                    reference_id=f"INIT-{sku}",
                    reason="Initial opening inventory baseline",
                    created_by=admin_user.id
                )
                db.add(movement)

        # 5. Seed Historical Purchase Orders & Receipts
        po = PurchaseOrder(
            order_number="PO-1001",
            supplier_id=sup_map["Apex Audio Innovations"],
            status=PurchaseOrderStatus.PARTIALLY_RECEIVED,
            order_date=datetime.now(timezone.utc) - timedelta(days=14),
            expected_date=datetime.now(timezone.utc) + timedelta(days=2),
            notes="Quarterly restock for electronics and audio gear",
            created_by=admin_user.id,
            total_amount=Decimal("45.00") * 50
        )
        db.add(po)
        db.flush()

        pi1 = PurchaseItem(
            purchase_order_id=po.id,
            product_id=product_objects["SKU-1842"].id,
            ordered_quantity=50,
            received_quantity=20,
            unit_cost=Decimal("45.00")
        )
        db.add(pi1)
        db.flush()

        pr1 = PurchaseReceipt(
            purchase_order_id=po.id,
            received_by=staff_user.id,
            received_at=datetime.now(timezone.utc) - timedelta(days=7),
            reference_number="REC-APEX-901"
        )
        db.add(pr1)
        db.flush()

        pri1 = PurchaseReceiptItem(
            receipt_id=pr1.id,
            purchase_item_id=pi1.id,
            quantity_received=20,
            unit_cost=Decimal("45.00")
        )
        db.add(pri1)

        # 6. Seed Historical Sales over past months to populate real charts
        now = datetime.now(timezone.utc)
        monthly_sales_volumes = [
            (11, 42000), (10, 38500), (9, 51200), (8, 48000),
            (7, 56300), (6, 61500), (5, 60200), (4, 66800),
            (3, 71200), (2, 68400), (1, 74500), (0, 84300)
        ]

        sale_idx = 1
        for months_ago, approx_target in monthly_sales_volumes:
            sale_date = now - timedelta(days=months_ago * 30 + 5)
            # Create a completed sale in that month
            s = Sale(
                sale_number=f"SO-{1000 + sale_idx}",
                status=SaleStatus.COMPLETED,
                subtotal=Decimal(str(approx_target)),
                discount_amount=Decimal("0.00"),
                total_amount=Decimal(str(approx_target)),
                notes="Retail store order batch",
                created_by=staff_user.id,
                created_at=sale_date
            )
            db.add(s)
            db.flush()

            # Add sale item
            s_item = SaleItem(
                sale_id=s.id,
                product_id=product_objects["SKU-5022"].id,
                quantity=10,
                unit_price=Decimal("110.00"),
                unit_cost_at_sale=Decimal("52.00")
            )
            db.add(s_item)
            sale_idx += 1

        db.commit()
        print("StockPilot database seeded successfully!")

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
