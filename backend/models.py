from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from database import Base
import datetime


class Transaction(Base):
    __tablename__ = "transactions"
    id = Column(Integer, primary_key=True, index=True)
    date = Column(DateTime, default=datetime.datetime.now)
    type = Column(String)  # INGRESO | EGRESO
    amount = Column(Float, default=0.0)
    description = Column(String)
    category = Column(String, nullable=True)
    document_type = Column(String, default="Factura")
    tax_amount = Column(Float, default=0.0)
    receipt_image = Column(String, nullable=True)


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
    date = Column(DateTime, default=datetime.datetime.now)
    period = Column(String)
    gross_salary = Column(Float)                # bruto total (base + bonos + extras)
    base_salary = Column(Float, default=0.0)    # sueldo base del mes
    bonuses = Column(Float, default=0.0)        # bonos imponibles
    overtime = Column(Float, default=0.0)       # horas extras
    afp_amount = Column(Float)
    afp_rate = Column(Float, default=0.0)       # tasa aplicada, para el comprobante
    health_amount = Column(Float)
    unemployment_amount = Column(Float)
    retention_amount = Column(Float, default=0.0)  # retención de honorarios
    net_salary = Column(Float)

    employee = relationship("Employee", back_populates="payrolls")


class Company(Base):
    """Datos del emisor: sin esto la liquidación no es un documento formal."""
    __tablename__ = "company"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, default="")
    rut = Column(String, default="")
    address = Column(String, default="")
    city = Column(String, default="")
    activity = Column(String, default="")      # giro comercial
    representative = Column(String, default="")
