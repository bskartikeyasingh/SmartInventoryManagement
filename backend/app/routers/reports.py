from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.profile import Profile
from app.services.report_service import ReportService
from app.schemas.report import (
    InventoryValuationItem,
    LowStockReportItem,
    MovementReportItem,
    SalesSummaryReport,
    ProductSalesReportItem
)

router = APIRouter(prefix="/reports", tags=["Reports"])

@router.get("/inventory", response_model=List[InventoryValuationItem])
def get_inventory_report(
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user)
):
    return ReportService.get_inventory_valuation(db=db)

@router.get("/low-stock", response_model=List[LowStockReportItem])
def get_low_stock_report(
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user)
):
    return ReportService.get_low_stock(db=db)

@router.get("/stock-movements", response_model=List[MovementReportItem])
def get_movements_report(
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user)
):
    return ReportService.get_stock_movements_report(db=db, start_date=start_date, end_date=end_date)

@router.get("/sales-summary", response_model=SalesSummaryReport)
def get_sales_summary_report(
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user)
):
    return ReportService.get_sales_summary_report(db=db, start_date=start_date, end_date=end_date)

@router.get("/sales-by-product", response_model=List[ProductSalesReportItem])
def get_product_sales_report(
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user)
):
    return ReportService.get_product_sales_report(db=db, start_date=start_date, end_date=end_date)

@router.get("/export")
def export_csv_report(
    report_type: str = Query(..., pattern="^(inventory|low-stock|movements|sales)$"),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    db: Session = Depends(get_db),
    current_user: Profile = Depends(get_current_user)
):
    csv_data = ReportService.export_csv(
        db=db,
        report_type=report_type,
        start_date=start_date,
        end_date=end_date
    )
    filename = f"stockpilot_{report_type}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )
