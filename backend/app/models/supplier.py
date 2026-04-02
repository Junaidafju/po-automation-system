from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.sql import func
from ..core.database import Base

class Supplier(Base):
    __tablename__ = "suppliers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    code = Column(String(50))
    vat_number = Column(String(50))
    address = Column(Text)
    contact_person = Column(String(100))
    contact_email = Column(String(255))
    created_at = Column(DateTime, server_default=func.now())