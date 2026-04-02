from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from io import StringIO
import csv

from ....core.database import get_db
from sqlalchemy.orm import Session
from ....models.purchase_order import PurchaseOrder

router = APIRouter()


@router.get("/")
def export_orders(db: Session = Depends(get_db)):
    orders = db.query(PurchaseOrder).all()
    buf = StringIO()
    writer = csv.writer(buf)
    writer.writerow(["id","po_number","supplier","brand","buyer_name","qty","value_gbp","delivery_date","status"])
    for o in orders:
        writer.writerow([
            o.id, o.po_number, o.supplier, o.brand, o.buyer_name,
            o.total_order_qty or 0, float(o.total_gbp_value or 0),
            o.delivery_date, o.extraction_status
        ])
    buf.seek(0)
    return StreamingResponse(buf, media_type="text/csv", headers={"Content-Disposition": "attachment; filename=purchase_orders.csv"})
