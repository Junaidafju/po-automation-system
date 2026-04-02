from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from ....core.database import get_db
from ....models.purchase_order import PurchaseOrder

router = APIRouter()


@router.get("/")
def delivery_timeline(db: Session = Depends(get_db)):
    orders = db.query(PurchaseOrder).filter(PurchaseOrder.delivery_date != None, PurchaseOrder.confirmed_ex_factory != None).all()
    on_time = 0
    delayed = 0
    for o in orders:
        if o.delivery_date and o.confirmed_ex_factory:
            if o.delivery_date <= o.confirmed_ex_factory:
                on_time += 1
            else:
                delayed += 1

    total = on_time + delayed
    return {"on_time": on_time, "delayed": delayed, "total": total}
