from typing import List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.profile import Profile
from app.services.dashboard_service import DashboardService
from app.schemas.dashboard import (
    DashboardSummaryResponse,
    SalesTrendItem,
    StockDistributionItem,
    NeedsAttentionItem,
    RecentActivityItem
)

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/summary", response_model=DashboardSummaryResponse)
def get_dashboard_summary(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user)
):
    return DashboardService.get_summary(db, days=days)

@router.get("/sales-trend", response_model=List[SalesTrendItem])
def get_sales_trend(
    months: int = Query(12, ge=1, le=24),
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user)
):
    return DashboardService.get_sales_trend(db, months=months)

@router.get("/stock-distribution", response_model=List[StockDistributionItem])
def get_stock_distribution(
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user)
):
    return DashboardService.get_stock_distribution(db)

@router.get("/needs-attention", response_model=List[NeedsAttentionItem])
def get_needs_attention(
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user)
):
    return DashboardService.get_needs_attention(db, limit=limit)

@router.get("/recent-activity", response_model=List[RecentActivityItem])
def get_recent_activity(
    limit: int = Query(8, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user)
):
    return DashboardService.get_recent_activity(db, limit=limit)
