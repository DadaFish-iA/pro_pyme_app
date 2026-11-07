from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from database import Base
import datetime

class Transaction(Base):
    __tablename__ = "transactions"
    id = Column(Integer, primary_key=True, index=True)
    date = Column(DateTime, default=datetime.datetime.utcnow)
    type = Column(String) # "INGRESO" o "EGRESO"
    amount = Column(Float, default=0.0) # Monto total
    description = Column(String)
    category = Column(String, nullable=True)
    
    # NUEVOS CAMPOS TRIBUTARIOS
    document_type = Column(String, default="Boleta") # Factura, Boleta, Honorarios, Exento
    tax_amount = Column(Float, default=0.0) # Monto del IVA
    receipt_image = Column(String, nullable=True) # Ruta de la foto adjunta

class Employee(Base):
    __tablename__ = "employees"
    id = Column(Integer, primary_key=True, index=True)
    rut = Column(String, unique=True, index=True)
    first_name = Column(String)
    last_name = Column(String)
    position = Column(String)
    afp_code = Column(String)
    health_system = Column(String)
    health_plan_value = Column(Float, default=0.0)
    contract_type = Column(String)
    base_salary = Column(Float)
    
    payrolls = relationship("Payroll", back_populates="employee", cascade="all, delete-orphan")

class Payroll(Base):
    __tablename__ = "payrolls"
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"))
    date = Column(DateTime, default=datetime.utcnow)
    period = Column(String)
    gross_salary = Column(Float)
    afp_amount = Column(Float)
    health_amount = Column(Float)
    unemployment_amount = Column(Float)
    net_salary = Column(Float)

    employee = relationship("Employee", back_populates="payrolls")