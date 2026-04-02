from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from ....core.database import get_db
from ....models.purchase_order import PurchaseOrder

router = APIRouter()

@router.get("/kpi")
async def get_kpi_metrics(db: Session = Depends(get_db)):
    total_orders = db.query(PurchaseOrder).count()
    total_value = db.query(func.sum(PurchaseOrder.total_gbp_value)).scalar() or 0
    avg_value = total_value / total_orders if total_orders > 0 else 0
    active_suppliers = db.query(PurchaseOrder.supplier).distinct().count()
    active_brands = db.query(PurchaseOrder.brand).distinct().count()
    return {
        "total_orders": total_orders,
        "total_value": float(total_value),
        "avg_value": float(avg_value),
        "active_suppliers": active_suppliers,
        "active_brands": active_brands
    }

@router.get("/orders-by-supplier")
async def get_orders_by_supplier(db: Session = Depends(get_db)):
    results = db.query(
        PurchaseOrder.supplier,
        func.count(PurchaseOrder.id).label('order_count'),
        func.sum(PurchaseOrder.total_gbp_value).label('total_value')
    ).group_by(PurchaseOrder.supplier).all()
    return [
        {"supplier": r[0] or "Unknown", "order_count": r[1], "total_value": float(r[2]) if r[2] else 0}
        for r in results
    ]

@router.get("/orders-by-brand")
async def get_orders_by_brand(db: Session = Depends(get_db)):
    results = db.query(
        PurchaseOrder.brand,
        func.count(PurchaseOrder.id).label('order_count'),
        func.sum(PurchaseOrder.total_gbp_value).label('total_value')
    ).group_by(PurchaseOrder.brand).all()
    return [
        {"brand": r[0] or "Unknown", "order_count": r[1], "total_value": float(r[2]) if r[2] else 0}
        for r in results
    ]
