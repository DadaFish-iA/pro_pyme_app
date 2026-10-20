from sqlalchemy import Column, Integer, String, Float, DateTime
from database import Base
import datetime

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(DateTime, default=datetime.datetime.utcnow)
    type = Column(String) # "INGRESO" o "EGRESO"
    amount = Column(Float, default=0.0)
    description = Column(String)
    category = Column(String, nullable=True) # Opcional (Ej: Sueldos, Proveedores)