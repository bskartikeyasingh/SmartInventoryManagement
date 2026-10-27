-- StockPilot PostgreSQL Schema for Supabase
-- Can be executed directly in the Supabase SQL Editor

-- 1. Profiles (linked with auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'STAFF' CHECK (role IN ('ADMIN', 'STAFF')),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Categories
CREATE TABLE IF NOT EXISTS public.categories (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
CREATE INDEX IF NOT EXISTS idx_categories_name_lower ON public.categories (LOWER(name));

-- 3. Products
CREATE TABLE IF NOT EXISTS public.products (
    id SERIAL PRIMARY KEY,
    sku TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    category_id INTEGER NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
    unit TEXT NOT NULL DEFAULT 'pcs',
    cost_price NUMERIC(12, 2) NOT NULL CHECK (cost_price >= 0),
    selling_price NUMERIC(12, 2) NOT NULL CHECK (selling_price >= 0),
    quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    reorder_level INTEGER NOT NULL DEFAULT 10 CHECK (reorder_level >= 0),
    image_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products (sku);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products (category_id);
CREATE INDEX IF NOT EXISTS idx_products_quantity ON public.products (quantity);

-- 4. Suppliers
CREATE TABLE IF NOT EXISTS public.suppliers (
    id SERIAL PRIMARY KEY,
    business_name TEXT NOT NULL,
    contact_name TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. Purchase Orders
CREATE TABLE IF NOT EXISTS public.purchase_orders (
    id SERIAL PRIMARY KEY,
    order_number TEXT NOT NULL UNIQUE,
    supplier_id INTEGER NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'ORDERED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED')),
    order_date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    expected_date TIMESTAMPTZ,
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (total_amount >= 0),
    notes TEXT,
    created_by TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. Purchase Items
CREATE TABLE IF NOT EXISTS public.purchase_items (
    id SERIAL PRIMARY KEY,
    purchase_order_id INTEGER NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    ordered_quantity INTEGER NOT NULL CHECK (ordered_quantity > 0),
    received_quantity INTEGER NOT NULL DEFAULT 0 CHECK (received_quantity >= 0),
    unit_cost NUMERIC(12, 2) NOT NULL CHECK (unit_cost >= 0),
    CONSTRAINT chk_purchase_item_not_over_received CHECK (received_quantity <= ordered_quantity)
);

-- 7. Purchase Receipts
CREATE TABLE IF NOT EXISTS public.purchase_receipts (
    id SERIAL PRIMARY KEY,
    purchase_order_id INTEGER NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
    received_by TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
    received_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    reference_number TEXT
);

-- 8. Purchase Receipt Items
CREATE TABLE IF NOT EXISTS public.purchase_receipt_items (
    id SERIAL PRIMARY KEY,
    receipt_id INTEGER NOT NULL REFERENCES public.purchase_receipts(id) ON DELETE CASCADE,
    purchase_item_id INTEGER NOT NULL REFERENCES public.purchase_items(id) ON DELETE RESTRICT,
    quantity_received INTEGER NOT NULL CHECK (quantity_received > 0),
    unit_cost NUMERIC(12, 2) NOT NULL CHECK (unit_cost >= 0)
);

-- 9. Sales
CREATE TABLE IF NOT EXISTS public.sales (
    id SERIAL PRIMARY KEY,
    sale_number TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'COMPLETED' CHECK (status IN ('COMPLETED', 'CANCELLED')),
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (subtotal >= 0),
    discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (discount_amount >= 0),
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (total_amount >= 0),
    notes TEXT,
    created_by TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 10. Sale Items
CREATE TABLE IF NOT EXISTS public.sale_items (
    id SERIAL PRIMARY KEY,
    sale_id INTEGER NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
    unit_cost_at_sale NUMERIC(12, 2) NOT NULL CHECK (unit_cost_at_sale >= 0)
);

-- 11. Stock Movements
CREATE TABLE IF NOT EXISTS public.stock_movements (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    movement_type TEXT NOT NULL CHECK (movement_type IN ('OPENING_STOCK', 'PURCHASE_RECEIPT', 'SALE', 'ADJUSTMENT_INCREASE', 'ADJUSTMENT_DECREASE', 'RETURN')),
    quantity_change INTEGER NOT NULL,
    quantity_before INTEGER NOT NULL,
    quantity_after INTEGER NOT NULL,
    reference_type TEXT,
    reference_id TEXT,
    reason TEXT,
    created_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON public.stock_movements (product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON public.stock_movements (movement_type);
CREATE INDEX IF NOT EXISTS idx_stock_movements_date ON public.stock_movements (created_at);

-- RLS (Row Level Security) Configuration
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_receipt_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS automatically. For authenticated users via direct client:
CREATE POLICY "Allow authenticated read on products" ON public.products FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read on categories" ON public.categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read on suppliers" ON public.suppliers FOR SELECT TO authenticated USING (true);
