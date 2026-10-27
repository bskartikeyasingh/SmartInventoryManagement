# StockPilot — Production-Minded Inventory Management System

**StockPilot** is a complete, modern, retail operations and inventory management platform built with **React (Vite) + Tailwind CSS**, **FastAPI (Python 3.12)**, and **Supabase (PostgreSQL & Supabase Auth)**.

Designed with an editorial retail aesthetic inspired by modern enterprise operations dashboards: restrained charcoal and vermilion accents, clean typography, responsive data tables, live financial and stock KPI analytics, and audit logging.

---

## 1. System Architecture

```mermaid
graph TD
    Client["React 19 + Vite (Port 5173)\nTailwind CSS, Recharts, Lucide"]
    Backend["FastAPI API v1 (Port 8000)\nPydantic v2, SQLAlchemy 2.0, Uvicorn"]
    SupabaseAuth["Supabase Auth\n(https://dcnpylkjncogzsfuvoyq.supabase.co)"]
    DB["Supabase PostgreSQL / Local WAL DB\nNormalized Schema, Strict Constraints, Check Rules"]

    Client -->|Bearer JWT Header| Backend
    Client -->|User Sign-In / Token Refresh| SupabaseAuth
    Backend -->|Auth Token Verification| SupabaseAuth
    Backend -->|Transactions & Row Locks| DB
```

- **Frontend (`frontend/`)**: React with Vite, Tailwind CSS, React Router, Axios with interceptors, Recharts for dynamic analytics, Lucide React icons.
- **Backend (`backend/`)**: FastAPI with versioned routes (`/api/v1`), SQLAlchemy 2.x ORM models, Pydantic v2 validation schemas, service layer architecture isolating atomic business rules, and Pytest test suite.
- **Database & Identity**: Supabase PostgreSQL with complete migrations (`backend/supabase_schema.sql`), Supabase Auth for JWT tokens, and resilient local SQLite fallback with WAL mode and foreign keys enabled if the PostgreSQL password has not been supplied.

---

## 2. Key Features

- **Dashboard & Real Database Analytics**:
  - Live KPIs: Total Revenue, Total Orders, Low Stock Alert Count, Active Products Count.
  - Inventory Cost Valuation ($) and Projected Retail Valuation ($).
  - Monthly Revenue bar chart (12M, 6M, 3M toggles) styled in vermilion.
  - Category stock volume distribution progress bars.
  - *Needs Attention* urgent table with one-click restock modals.
- **Product Catalog & Taxonomy**:
  - Full CRUD with unique SKU validation (case-insensitive).
  - Creation automatically writes auditable opening stock movement records.
  - Direct quantity editing is strictly forbidden on ordinary update endpoints.
  - Safe archive semantics prevent deleting products with pending purchase receipts.
- **Inventory Control & Audit Trails**:
  - Direct receiving and manual adjustments.
  - Mandatory reason required for adjustments.
  - Strict negative stock prevention with database check constraints and row-level checks.
  - Immutable movement audit log (`stock_movements`) tracking `quantity_before`, `quantity_change`, `quantity_after`, reference ID, reason, user, and timestamp.
- **Procurement & Purchase Orders**:
  - Full order lifecycle: `DRAFT` → `ORDERED` → `PARTIALLY_RECEIVED` → `RECEIVED` / `CANCELLED`.
  - Itemized receiving tracking ordered, received, and remaining quantities.
  - Over-receipt rejection and duplicate intake prevention.
- **Sales & Retail POS**:
  - Multi-item checkout with real-time stock availability preview.
  - Atomic database transactions: if any single line item has insufficient stock, the entire sale rolls back immediately.
  - Historical price and cost snapshots preserved at the time of sale.
  - Sale cancellation restores stock and logs auditable reverse movements.
- **Reports & Exporting**:
  - Tabbed reports: Inventory Valuation, Low-Stock Breaches, Movement History, Sales Summary & Gross Margin, Product-wise Sales.
  - Standard RFC-4180 CSV file export handling commas, quotes, and line breaks.
- **Role-Based Access Control (RBAC)**:
  - `ADMIN`: full catalog management, user role control, adjustments, supplier edits, purchase order approvals.
  - `STAFF`: sales checkouts, viewing products and stock levels, intake receiving.

---

## 3. Project Directory Structure

```
c:\Users\HP\Desktop\api/
├── backend/
│   ├── app/
│   │   ├── core/
│   │   │   ├── config.py         # Pydantic Settings
│   │   │   ├── database.py       # Engine, SessionLocal, fallback
│   │   │   └── security.py       # Supabase JWT & RBAC dependencies
│   │   ├── models/               # SQLAlchemy 2.0 entities
│   │   │   ├── profile.py        # Profiles linked to auth
│   │   │   ├── category.py       # Categories taxonomy
│   │   │   ├── product.py        # Products with constraints
│   │   │   ├── supplier.py       # Vendors
│   │   │   ├── purchase.py       # POs, items, and receipts
│   │   │   ├── sale.py           # Sales and item snapshots
│   │   │   └── stock_movement.py # Immutable movement audit log
│   │   ├── schemas/              # Pydantic v2 schemas
│   │   ├── services/             # Atomic business domain services
│   │   ├── routers/              # Versioned API routes (/api/v1/*)
│   │   ├── main.py               # FastAPI application entrypoint
│   │   └── seed.py               # Retail inventory demo seeder
│   ├── tests/                    # Pytest test suite (9 test suites)
│   ├── requirements.txt
│   ├── supabase_schema.sql       # PostgreSQL DDL and RLS
│   ├── .env.example
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── api/                  # Axios and Supabase JS clients
│   │   ├── context/              # AuthContext and ToastContext
│   │   ├── components/
│   │   │   ├── layout/           # AppShell, Sidebar, Header
│   │   │   └── ui/               # StatCard, DataTable, Modal, StatusBadge
│   │   ├── pages/                # Overview, Products, Inventory, Purchases, Sales, Reports, Settings, Login
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   ├── tailwind.config.js
│   ├── package.json
│   ├── .env.example
│   └── .env
└── README.md
```

---

## 4. Setup & Local Development

### Prerequisites
- Python 3.12+
- Node.js 18+ & npm

### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install Python dependencies:
   ```bash
   python -m pip install -r requirements.txt
   ```
3. Configure `.env` (pre-configured with Supabase settings):
   ```env
   APP_ENV=development
   DATABASE_URL=postgresql://postgres:[PASSWORD]@db.dcnpylkjncogzsfuvoyq.supabase.co:5432/postgres
   SUPABASE_URL=https://dcnpylkjncogzsfuvoyq.supabase.co
   SUPABASE_PUBLISHABLE_KEY=sb_publishable_NhLPHJIuofNsp7Q3vPf22g_4i6q-2RN
   ALLOW_SQLITE_FALLBACK=true
   ```
   *(Note: If the PostgreSQL password is not yet configured, the system automatically falls back to `./stockpilot.db` so you can test immediately.)*

4. Seed initial retail products and historical sales:
   ```bash
   python -m app.seed
   ```

5. Run automated tests:
   ```bash
   python -m pytest -v
   ```

6. Start FastAPI dev server:
   ```bash
   python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
   ```
   Swagger API docs: `http://127.0.0.1:8000/docs`  
   Health check: `http://127.0.0.1:8000/health`

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install Node dependencies:
   ```bash
   npm install
   ```
3. Build for production verification:
   ```bash
   npm run build
   ```
4. Start Vite dev server:
   ```bash
   npm run dev -- --host 127.0.0.1 --port 5173
   ```
   Open `http://127.0.0.1:5173/` in your browser.

---

## 5. Supabase Configuration & Migrations

1. Log into your Supabase Dashboard at `https://dcnpylkjncogzsfuvoyq.supabase.co`.
2. Open the **SQL Editor** tab.
3. Paste and run the entire contents of `backend/supabase_schema.sql`.
4. To connect directly via PostgreSQL connection string:
   - Obtain your database password from Supabase Project Settings → Database.
   - Set in `backend/.env`:
     ```env
     DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.dcnpylkjncogzsfuvoyq.supabase.co:5432/postgres
     ```
   - If using the Supabase Connection Pooler on port 6543, append `?sslmode=require`.

---

## 6. Testing Results

The automated Pytest test suite verifies 9 critical integration workflows:
- `test_unauthenticated_request_rejected`: Unauthenticated requests to protected endpoints return HTTP 401.
- `test_authenticated_profile`: Valid JWT returns profile and role.
- `test_role_enforcement_admin_required`: Staff accounts attempting admin mutations are rejected with HTTP 403.
- `test_health_check`: `/health` returns status without exposing secrets.
- `test_category_and_product_workflow`: Category creation, case-insensitive duplicate rejection, product creation with opening quantity, and SKU uniqueness.
- `test_inventory_adjust_and_receive`: Stock receiving, manual adjustment with mandatory reason, and prevention of negative stock.
- `test_purchase_order_full_workflow`: Purchase order drafting, placement, over-receipt rejection, partial receipt, and full receipt status transitions.
- `test_sales_and_atomic_rollback`: Insufficient-stock sale rollback (neither item is deducted), successful multi-product sale, and sale cancellation restoring inventory.
- `test_dashboard_and_reports_endpoints`: Live summary KPIs, sales trend calculation, and RFC-4180 CSV export.

Run tests anytime with:
```bash
python -m pytest -v
```

---

## 7. Deployment Instructions

### Deploying the Backend (Render / Railway / Fly.io)
1. Set Environment Variables on host:
   - `APP_ENV=production`
   - `DATABASE_URL=postgresql://postgres:[PASSWORD]@db.dcnpylkjncogzsfuvoyq.supabase.co:5432/postgres`
   - `SUPABASE_URL=https://dcnpylkjncogzsfuvoyq.supabase.co`
   - `SUPABASE_PUBLISHABLE_KEY=sb_publishable_NhLPHJIuofNsp7Q3vPf22g_4i6q-2RN`
   - `FRONTEND_ORIGINS=https://your-stockpilot-app.vercel.app`
2. Start Command:
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port $PORT
   ```
3. Health check path: `/health`

### Deploying the Frontend (Vercel / Netlify)
1. Set Build Command: `npm run build`
2. Set Output Directory: `dist`
3. Set Environment Variables:
   - `VITE_API_BASE_URL=https://your-backend.onrender.com/api/v1`
   - `VITE_SUPABASE_URL=https://dcnpylkjncogzsfuvoyq.supabase.co`
   - `VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_NhLPHJIuofNsp7Q3vPf22g_4i6q-2RN`

---

## 8. Status & Limitations

- **Completed**:
  - Complete backend API with role enforcement and database transactions.
  - Complete frontend interface styled to the InRetail design reference.
  - Automated tests passing 100%.
  - Both servers running locally and verified via browser agent.
- **External Dependency Note**:
  - The Supabase database connection string provided in the prompt (`postgresql://postgreskartikeyasingh@db.dcnpylkjncogzsfuvoyq.supabase.co:5432/postgres`) lacks the database password (`fe_sendauth: no password supplied`).
  - The backend safely handles this by falling back to local SQLite with WAL mode and foreign keys enabled for development, while remaining 100% ready to switch to Supabase PostgreSQL as soon as the user supplies their password in `DATABASE_URL`.
