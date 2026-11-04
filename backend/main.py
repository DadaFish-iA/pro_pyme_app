from fastapi import FastAPI, Depends, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from database import engine, Base, SessionLocal
import models
from pydantic import BaseModel
from typing import Optional, List
import datetime
import calendar

Base.metadata.create_all(bind=engine)
app = FastAPI(title="Pro Pyme API")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

def get_db():
    db = SessionLocal()
    try: yield db
    finally: db.close()

# --- MODELOS PYDANTIC ---
class TransactionInput(BaseModel):
    date: str; type: str; amount: float; description: str; category: Optional[str] = None

class EmployeeInput(BaseModel):
    rut: str; first_name: str; last_name: str; position: str
    afp_code: str; health_system: str; health_plan_value: float
    contract_type: str; base_salary: float

class PayrollInput(BaseModel):
    employee_id: int
    period: str
    gross_salary: float
    bonuses: float = 0.0
    overtime: float = 0.0

# --- RUTAS DE TRANSACCIONES ---
@app.get("/api/transactions")
def get_transactions(db: Session = Depends(get_db)):
    return db.query(models.Transaction).order_by(models.Transaction.date.desc()).all()

@app.post("/api/transactions")
def create_transaction(data: TransactionInput, db: Session = Depends(get_db)):
    nueva_tx = models.Transaction(
        date=datetime.datetime.fromisoformat(data.date.replace("Z", "+00:00")),
        type=data.type, amount=data.amount, description=data.description, category=data.category
    )
    db.add(nueva_tx); db.commit(); db.refresh(nueva_tx)
    return nueva_tx

@app.delete("/api/transactions/{tx_id}")
def delete_transaction(tx_id: int, db: Session = Depends(get_db)):
    tx = db.query(models.Transaction).filter(models.Transaction.id == tx_id).first()
    if not tx: raise HTTPException(status_code=404, detail="No encontrada")
    db.delete(tx); db.commit()
    return {"status": "success"}

# --- RUTAS DE EMPLEADOS ---
@app.get("/api/employees")
def get_employees(db: Session = Depends(get_db)):
    return db.query(models.Employee).all()

@app.post("/api/employees")
def create_employee(data: EmployeeInput, db: Session = Depends(get_db)):
    if db.query(models.Employee).filter(models.Employee.rut == data.rut).first():
        raise HTTPException(status_code=400, detail="El RUT ya está registrado")
    nuevo_emp = models.Employee(**data.dict())
    db.add(nuevo_emp); db.commit(); db.refresh(nuevo_emp)
    return nuevo_emp

@app.put("/api/employees/{emp_id}")
def update_employee(emp_id: int, data: EmployeeInput, db: Session = Depends(get_db)):
    emp = db.query(models.Employee).filter(models.Employee.id == emp_id).first()
    if not emp: raise HTTPException(status_code=404, detail="Empleado no encontrado")
    for key, value in data.dict().items(): setattr(emp, key, value)
    db.commit(); db.refresh(emp)
    return emp

@app.delete("/api/employees/{emp_id}")
def delete_employee(emp_id: int, db: Session = Depends(get_db)):
    emp = db.query(models.Employee).filter(models.Employee.id == emp_id).first()
    if not emp: raise HTTPException(status_code=404, detail="Empleado no encontrado")
    db.delete(emp); db.commit()
    return {"status": "success"}

# --- RUTAS DE LIQUIDACIONES ---
AFP_RATES = {"Habitat": 0.1127, "Cuprum": 0.1144, "Modelo": 0.1058, "Capital": 0.1144, "Provida": 0.1145, "PlanVital": 0.1116, "Uno": 0.1069}
HONORARIOS_RETENTION = 0.1525

@app.get("/api/payroll")
def get_payrolls(db: Session = Depends(get_db)):
    payrolls = db.query(models.Payroll).order_by(models.Payroll.date.desc()).all()
    result = []
    for p in payrolls:
        emp = db.query(models.Employee).filter(models.Employee.id == p.employee_id).first()
        result.append({
            "id": p.id, "employee_name": f"{emp.first_name} {emp.last_name}", "rut": emp.rut,
            "period": p.period, "gross_salary": p.gross_salary, "net_salary": p.net_salary,
            "afp_amount": p.afp_amount, "health_amount": p.health_amount, "unemployment_amount": p.unemployment_amount
        })
    return result

@app.post("/api/payroll")
def calculate_payroll(data: PayrollInput, db: Session = Depends(get_db)):
    emp = db.query(models.Employee).filter(models.Employee.id == data.employee_id).first()
    if not emp: raise HTTPException(status_code=404, detail="Empleado no encontrado")
    
    existing = db.query(models.Payroll).filter(
        models.Payroll.employee_id == data.employee_id,
        models.Payroll.period == data.period
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Ya existe una liquidación para este trabajador en el periodo seleccionado.")
    
    bruto_total = data.gross_salary + data.bonuses + data.overtime
    
    if emp.contract_type == 'Honorarios':
        retencion = 0 if bruto_total < 220417 else bruto_total * HONORARIOS_RETENTION
        net_salary = bruto_total - retencion
        afp_amount = 0.0; health_amount = 0.0; unemployment_amount = 0.0
    else:
        afp_rate = AFP_RATES.get(emp.afp_code, 0.1144)
        afp_amount = bruto_total * afp_rate
        health_amount = bruto_total * 0.07 if emp.health_system == "Fonasa" else max(bruto_total * 0.07, emp.health_plan_value)
        unemployment_amount = bruto_total * 0.006 if emp.contract_type == "Indefinido" else 0
        net_salary = bruto_total - afp_amount - health_amount - unemployment_amount
    
    nueva_liq = models.Payroll(
        employee_id=emp.id, period=data.period, gross_salary=bruto_total,
        afp_amount=afp_amount, health_amount=health_amount,
        unemployment_amount=unemployment_amount, net_salary=net_salary
    )
    db.add(nueva_liq)
    
    # CORRECCIÓN: CALCULAR EL ÚLTIMO DÍA DEL MES
    try:
        year, month = map(int, data.period.split('-'))
        last_day = calendar.monthrange(year, month)[1]
        # Fecha a las 12:00 PM del último día del mes para evitar problemas de zona horaria
        tx_date = datetime.datetime(year, month, last_day, 12, 0, 0)
    except ValueError:
        tx_date = datetime.datetime.now()

    new_tx = models.Transaction(
        date=tx_date, type="EGRESO", amount=net_salary,
        description=f"Pago de sueldo {emp.first_name} {emp.last_name} - Periodo {data.period}",
        category="Sueldos"
    )
    db.add(new_tx)
    db.commit(); db.refresh(nueva_liq)
    
    return {
        "id": nueva_liq.id, "employee_name": f"{emp.first_name} {emp.last_name}", "period": nueva_liq.period,
        "gross_salary": bruto_total, "afp_amount": afp_amount, "health_amount": health_amount,
        "unemployment_amount": unemployment_amount, "net_salary": net_salary
    }

# NUEVA RUTA: Eliminar Liquidación y su Transacción Asociada
@app.delete("/api/payroll/{payroll_id}")
def delete_payroll(payroll_id: int, db: Session = Depends(get_db)):
    payroll = db.query(models.Payroll).filter(models.Payroll.id == payroll_id).first()
    if not payroll: raise HTTPException(status_code=404, detail="Liquidación no encontrada")
    
    emp = db.query(models.Employee).filter(models.Employee.id == payroll.employee_id).first()
    
    # Buscar y eliminar la transacción asociada en el flujo de caja
    if emp:
        desc_match = f"Pago de sueldo {emp.first_name} {emp.last_name} - Periodo {payroll.period}"
        tx = db.query(models.Transaction).filter(models.Transaction.description == desc_match).first()
        if tx:
            db.delete(tx)
            
    db.delete(payroll)
    db.commit()
    return {"status": "success"}

@app.get("/api/payroll/export-previred")
def export_previred(period: str, db: Session = Depends(get_db)):
    payrolls = db.query(models.Payroll).filter(models.Payroll.period == period).all()
    if not payrolls: raise HTTPException(status_code=404, detail="No hay liquidaciones para este periodo")
    lines = []
    for p in payrolls:
        emp = db.query(models.Employee).filter(models.Employee.id == p.employee_id).first()
        rut_clean = emp.rut.replace(".", "").replace("-", "")
        line = f"{rut_clean[:-1]}|{rut_clean[-1]}|{emp.last_name}|{emp.first_name}|{p.period}|{int(p.gross_salary)}|{int(p.afp_amount)}|{int(p.health_amount)}|{int(p.unemployment_amount)}"
        lines.append(line)
    content = "\n".join(lines)
    return Response(content=content, media_type="text/plain", headers={"Content-Disposition": f"attachment; filename=Previred_{period}.txt"})