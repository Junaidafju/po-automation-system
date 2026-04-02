from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ....core.database import get_db
from ....models.purchase_order import PurchaseOrder

router = APIRouter()

@router.get("/")
async def get_purchase_orders(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    orders = db.query(PurchaseOrder).offset(skip).limit(limit).all()
    return [
        {
            "id": o.id,
            "po_number": o.po_number,
            "supplier": o.supplier,
            "brand": o.brand,
            "buyer_name": o.buyer_name,
            "total_order_qty": o.total_order_qty,
            "total_gbp_value": float(o.total_gbp_value) if o.total_gbp_value else 0,
            "delivery_date": o.delivery_date,
            "confirmed_ex_factory": o.confirmed_ex_factory,
            "status": o.extraction_status
        }
        for o in orders
    ]
