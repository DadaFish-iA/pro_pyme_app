from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from database import engine, Base, SessionLocal
import models
from pydantic import BaseModel
from typing import Optional
import datetime

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Pro Pyme API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class TransactionInput(BaseModel):
    date: str
    type: str # INGRESO o EGRESO
    amount: float
    description: str
    category: Optional[str] = None

@app.get("/api/transactions")
def get_transactions(db: Session = Depends(get_db)):
    return db.query(models.Transaction).order_by(models.Transaction.date.desc()).all()

@app.post("/api/transactions")
def create_transaction(data: TransactionInput, db: Session = Depends(get_db)):
    if data.amount <= 0:
        raise HTTPException(status_code=400, detail="El monto debe ser mayor a cero.")
    if data.type not in ["INGRESO", "EGRESO"]:
        raise HTTPException(status_code=400, detail="El tipo debe ser INGRESO o EGRESO.")

    nueva_tx = models.Transaction(
        date=datetime.datetime.fromisoformat(data.date.replace("Z", "+00:00")),
        type=data.type,
        amount=data.amount,
        description=data.description,
        category=data.category
    )
    db.add(nueva_tx)
    db.commit()
    db.refresh(nueva_tx)
    return nueva_tx

@app.delete("/api/transactions/{tx_id}")
def delete_transaction(tx_id: int, db: Session = Depends(get_db)):
    tx = db.query(models.Transaction).filter(models.Transaction.id == tx_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transacción no encontrada")
    db.delete(tx)
    db.commit()
    return {"status": "success"}

@app.get("/api/summary")
def get_summary(db: Session = Depends(get_db)):
    txs = db.query(models.Transaction).all()
    
    # Cálculo Pro Pyme (Flujo de Caja)
    total_ingresos = sum(t.amount for t in txs if t.type == "INGRESO")
    total_egresos = sum(t.amount for t in txs if t.type == "EGRESO")
    
    # Renta Líquida Imponible (RLI)
    rli = total_ingresos - total_egresos
    
    # PPM (0.25% sobre ventas brutas)
    ppm = total_ingresos * 0.0025

    return {
        "total_ingresos": total_ingresos,
        "total_egresos": total_egresos,
        "rli": rli,
        "ppm": ppm,
        "cantidad_movimientos": len(txs)
    }