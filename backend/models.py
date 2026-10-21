from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from database import Base
import datetime

class Transaction(Base):
    __tablename__ = "transactions"
    id = Column(Integer, primary_key=True, index=True)
    date = Column(DateTime, default=datetime.datetime.utcnow)
    type = Column(String) # "INGRESO" o "EGRESO"
    amount = Column(Float, default=0.0)
    description = Column(String)
    category = Column(String, nullable=True)

# NUEVO: Ficha del Trabajador
class Employee(Base):
    __tablename__ = "employees"
    id = Column(Integer, primary_key=True, index=True)
    rut = Column(String, unique=True, index=True)
    first_name = Column(String)
    last_name = Column(String)
    position = Column(String) # Cargo
    
    # Datos Previsionales
    afp_code = Column(String) # Habitat, Cuprum, etc.
    health_system = Column(String) # Fonasa o Isapre
    health_plan_value = Column(Float, default=0.0) # Valor en $ (si es Isapre)
    
    # Datos Contractuales
    contract_type = Column(String) # Indefinido o Plazo Fijo
    base_salary = Column(Float) # Sueldo base pactado
    
    payrolls = relationship("Payroll", back_populates="employee", cascade="all, delete-orphan")

# ACTUALIZADO: Liquidación vinculada al trabajador
class Payroll(Base):
    __tablename__ = "payrolls"
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id"))
    date = Column(DateTime, default=datetime.datetime.utcnow)
    period = Column(String) # Formato "YYYY-MM" (Ej: "2026-10")
    
    gross_salary = Column(Float)
    afp_amount = Column(Float)
    health_amount = Column(Float)
    unemployment_amount = Column(Float)
    net_salary = Column(Float)

    employee = relationship("Employee", back_populates="payrolls")