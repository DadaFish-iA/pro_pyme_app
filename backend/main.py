from fastapi import FastAPI, Depends, HTTPException, Form, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from database import engine, Base, SessionLocal, run_light_migrations
import models
from pydantic import BaseModel
from typing import Optional
import datetime
import calendar
import os
import shutil
import uuid

Base.metadata.create_all(bind=engine)
run_light_migrations()

app = FastAPI(title="Pro Pyme API")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

os.makedirs("static/uploads", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class EmployeeInput(BaseModel):
    rut: str; first_name: str; last_name: str; position: str
    afp_code: str; health_system: str; health_plan_value: float
    contract_type: str; base_salary: float


class PayrollInput(BaseModel):
    employee_id: int; period: str; gross_salary: float; bonuses: float = 0.0; overtime: float = 0.0


class CompanyInput(BaseModel):
    name: str = ""; rut: str = ""; address: str = ""
    city: str = ""; activity: str = ""; representative: str = ""


# --- TRANSACCIONES ---
@app.get("/api/transactions")
def get_transactions(db: Session = Depends(get_db)):
    return db.query(models.Transaction).order_by(models.Transaction.date.desc()).all()


def _calcular_iva(amount: float, document_type: str) -> float:
    """El monto que se ingresa es el TOTAL (bruto); el IVA se despeja de ahí."""
    if document_type == "Factura":
        return round(amount - (amount / 1.19), 2)
    return 0.0


def _guardar_adjunto(receipt: UploadFile) -> str:
    ext = os.path.splitext(receipt.filename)[1]
    name = f"{uuid.uuid4()}{ext}"
    with open(f"static/uploads/{name}", "wb") as buffer:
        shutil.copyfileobj(receipt.file, buffer)
    return f"/static/uploads/{name}"


@app.post("/api/transactions")
def create_transaction(
    date: str = Form(...), type: str = Form(...), amount: float = Form(...),
    description: str = Form(...), category: str = Form(None),
    document_type: str = Form("Factura"),
    receipt: UploadFile = File(None), db: Session = Depends(get_db)
):
    image_path = None
    if receipt and document_type != "Gasto sin Documento":
        image_path = _guardar_adjunto(receipt)

    nueva_tx = models.Transaction(
        date=datetime.datetime.fromisoformat(date.replace("Z", "+00:00")),
        type=type, amount=amount, description=description, category=category,
        document_type=document_type, tax_amount=_calcular_iva(amount, document_type),
        receipt_image=image_path
    )
    db.add(nueva_tx); db.commit(); db.refresh(nueva_tx)
    return nueva_tx


@app.put("/api/transactions/{tx_id}")
def update_transaction(
    tx_id: int,
    date: str = Form(...), type: str = Form(...), amount: float = Form(...),
    description: str = Form(...), category: str = Form(None),
    document_type: str = Form("Factura"),
    receipt: UploadFile = File(None),
    remove_receipt: bool = Form(False),
    db: Session = Depends(get_db)
):
    tx = db.query(models.Transaction).filter(models.Transaction.id == tx_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Movimiento no encontrado")

    tx.date = datetime.datetime.fromisoformat(date.replace("Z", "+00:00"))
    tx.type = type
    tx.amount = amount
    tx.description = description
    tx.category = category
    tx.document_type = document_type
    tx.tax_amount = _calcular_iva(amount, document_type)

    if remove_receipt and tx.receipt_image:
        try:
            os.remove(tx.receipt_image.lstrip('/'))
        except OSError:
            pass
        tx.receipt_image = None

    if receipt and document_type != "Gasto sin Documento":
        if tx.receipt_image:
            try:
                os.remove(tx.receipt_image.lstrip('/'))
            except OSError:
                pass
        tx.receipt_image = _guardar_adjunto(receipt)
    elif document_type == "Gasto sin Documento":
        tx.receipt_image = None

    db.commit(); db.refresh(tx)
    return tx


@app.delete("/api/transactions/{tx_id}")
def delete_transaction(tx_id: int, db: Session = Depends(get_db)):
    tx = db.query(models.Transaction).filter(models.Transaction.id == tx_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="No encontrada")
    if tx.receipt_image:
        try:
            os.remove(tx.receipt_image.lstrip('/'))
        except OSError:
            pass
    db.delete(tx); db.commit()
    return {"status": "success"}


# --- EMPLEADOS ---
@app.get("/api/employees")
def get_employees(db: Session = Depends(get_db)):
    return db.query(models.Employee).all()


@app.post("/api/employees")
def create_employee(data: EmployeeInput, db: Session = Depends(get_db)):
    if db.query(models.Employee).filter(models.Employee.rut == data.rut).first():
        raise HTTPException(status_code=400, detail="El RUT ya está registrado")
    nuevo = models.Employee(**data.model_dump())
    db.add(nuevo); db.commit(); db.refresh(nuevo)
    return nuevo


@app.put("/api/employees/{emp_id}")
def update_employee(emp_id: int, data: EmployeeInput, db: Session = Depends(get_db)):
    emp = db.query(models.Employee).filter(models.Employee.id == emp_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")
    duplicado = db.query(models.Employee).filter(
        models.Employee.rut == data.rut, models.Employee.id != emp_id
    ).first()
    if duplicado:
        raise HTTPException(status_code=400, detail="Ese RUT pertenece a otro trabajador")
    for key, value in data.model_dump().items():
        setattr(emp, key, value)
    db.commit(); db.refresh(emp)
    return emp


@app.delete("/api/employees/{emp_id}")
def delete_employee(emp_id: int, db: Session = Depends(get_db)):
    emp = db.query(models.Employee).filter(models.Employee.id == emp_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")
    db.delete(emp); db.commit()
    return {"status": "success"}


# --- LIQUIDACIONES ---
AFP_RATES = {"Habitat": 0.1127, "Cuprum": 0.1144, "Modelo": 0.1058, "Capital": 0.1144,
             "Provida": 0.1145, "PlanVital": 0.1116, "Uno": 0.1069}
HONORARIOS_RETENTION = 0.1525
HONORARIOS_MINIMO = 220417


@app.get("/api/payroll")
def get_payrolls(db: Session = Depends(get_db)):
    payrolls = db.query(models.Payroll).order_by(models.Payroll.date.desc()).all()
    result = []
    for p in payrolls:
        emp = p.employee
        result.append({
            "id": p.id, "employee_id": p.employee_id,
            "employee_name": f"{emp.first_name} {emp.last_name}" if emp else "",
            "rut": emp.rut if emp else "",
            "position": emp.position if emp else "",
            "contract_type": emp.contract_type if emp else "",
            "afp_code": emp.afp_code if emp else "",
            "health_system": emp.health_system if emp else "",
            "period": p.period,
            "base_salary": p.base_salary or 0.0,
            "bonuses": p.bonuses or 0.0,
            "overtime": p.overtime or 0.0,
            "gross_salary": p.gross_salary,
            "afp_rate": p.afp_rate or 0.0,
            "afp_amount": p.afp_amount,
            "health_amount": p.health_amount,
            "unemployment_amount": p.unemployment_amount,
            "retention_amount": p.retention_amount or 0.0,
            "net_salary": p.net_salary,
            "date": p.date,
        })
    return result


@app.post("/api/payroll")
def calculate_payroll(data: PayrollInput, db: Session = Depends(get_db)):
    emp = db.query(models.Employee).filter(models.Employee.id == data.employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")

    existing = db.query(models.Payroll).filter(
        models.Payroll.employee_id == data.employee_id,
        models.Payroll.period == data.period
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Ya existe una liquidación para este periodo.")

    base = data.gross_salary
    bonos = data.bonuses
    extras = data.overtime
    bruto_total = base + bonos + extras

    afp_rate = 0.0
    retention = 0.0
    if emp.contract_type == 'Honorarios':
        afp_amount = 0.0
        health_amount = 0.0
        unemployment_amount = 0.0
        retention = 0.0 if bruto_total < HONORARIOS_MINIMO else round(bruto_total * HONORARIOS_RETENTION, 2)
        net_salary = bruto_total - retention
    else:
        afp_rate = AFP_RATES.get(emp.afp_code, 0.1144)
        afp_amount = round(bruto_total * afp_rate, 2)
        if emp.health_system == "Fonasa":
            health_amount = round(bruto_total * 0.07, 2)
        else:
            health_amount = round(max(bruto_total * 0.07, emp.health_plan_value or 0), 2)
        unemployment_amount = round(bruto_total * 0.006, 2) if emp.contract_type == "Indefinido" else 0.0
        net_salary = round(bruto_total - afp_amount - health_amount - unemployment_amount, 2)

    nueva_liq = models.Payroll(
        employee_id=emp.id, period=data.period,
        base_salary=base, bonuses=bonos, overtime=extras,
        gross_salary=bruto_total, afp_rate=afp_rate, afp_amount=afp_amount,
        health_amount=health_amount, unemployment_amount=unemployment_amount,
        retention_amount=retention, net_salary=net_salary
    )
    db.add(nueva_liq)

    try:
        year, month = map(int, data.period.split('-'))
        last_day = calendar.monthrange(year, month)[1]
        tx_date = datetime.datetime(year, month, last_day, 12, 0, 0)
    except ValueError:
        tx_date = datetime.datetime.now()

    new_tx = models.Transaction(
        date=tx_date, type="EGRESO", amount=net_salary,
        description=f"Pago de sueldo {emp.first_name} {emp.last_name} - Periodo {data.period}",
        category="Sueldos", document_type="Liquidación", tax_amount=0.0
    )
    db.add(new_tx)
    db.commit(); db.refresh(nueva_liq)
    return {"status": "success", "id": nueva_liq.id}


@app.delete("/api/payroll/{payroll_id}")
def delete_payroll(payroll_id: int, db: Session = Depends(get_db)):
    payroll = db.query(models.Payroll).filter(models.Payroll.id == payroll_id).first()
    if not payroll:
        raise HTTPException(status_code=404, detail="Liquidación no encontrada")
    emp = payroll.employee
    if emp:
        desc_match = f"Pago de sueldo {emp.first_name} {emp.last_name} - Periodo {payroll.period}"
        tx = db.query(models.Transaction).filter(models.Transaction.description == desc_match).first()
        if tx:
            db.delete(tx)
    db.delete(payroll); db.commit()
    return {"status": "success"}


# --- EMPRESA (datos del emisor para la liquidación) ---
def _get_or_create_company(db: Session) -> models.Company:
    company = db.query(models.Company).first()
    if not company:
        company = models.Company(name="", rut="", address="", city="", activity="", representative="")
        db.add(company); db.commit(); db.refresh(company)
    return company


@app.get("/api/company")
def get_company(db: Session = Depends(get_db)):
    return _get_or_create_company(db)


@app.put("/api/company")
def update_company(data: CompanyInput, db: Session = Depends(get_db)):
    company = _get_or_create_company(db)
    for key, value in data.model_dump().items():
        setattr(company, key, value)
    db.commit(); db.refresh(company)
    return company
