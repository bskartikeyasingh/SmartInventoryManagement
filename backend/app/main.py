import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.database import init_db
from app.routers import (
    auth,
    dashboard,
    products,
    categories,
    suppliers,
    inventory,
    purchases,
    sales,
    reports
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("stockpilot")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing StockPilot database schema...")
    try:
        init_db()
    except Exception as e:
        logger.error(f"Database initialization error: {e}")
    yield
    logger.info("StockPilot application shutting down...")

app = FastAPI(
    title="StockPilot API",
    description="Production-minded Inventory Management System API",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.APP_ENV != "production" else None,
    redoc_url="/redoc" if settings.APP_ENV != "production" else None
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global health check
@app.get("/health", tags=["System"])
def health_check():
    return {
        "status": "healthy",
        "app": "StockPilot",
        "environment": settings.APP_ENV,
        "version": "1.0.0"
    }

# Include API v1 Routers
api_v1_prefix = "/api/v1"
app.include_router(auth.router, prefix=api_v1_prefix)
app.include_router(dashboard.router, prefix=api_v1_prefix)
app.include_router(products.router, prefix=api_v1_prefix)
app.include_router(categories.router, prefix=api_v1_prefix)
app.include_router(suppliers.router, prefix=api_v1_prefix)
app.include_router(inventory.router, prefix=api_v1_prefix)
app.include_router(purchases.router, prefix=api_v1_prefix)
app.include_router(sales.router, prefix=api_v1_prefix)
app.include_router(reports.router, prefix=api_v1_prefix)

# Custom Exception Handler for unhandled errors
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception(f"Unhandled error processing {request.method} {request.url.path}: {exc}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An internal server error occurred. Please contact system administrator."}
    )
