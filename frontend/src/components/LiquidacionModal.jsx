import { useState } from 'react'
import { formatMoney, periodoLabel } from '../lib/format'
import { calcularLiquidacion } from '../lib/payroll'
import { IconX } from './Icons'

const API_URL = '/api'

const periodoActual = () => {
  const hoy = new Date()
  return `${hoy.getFullYear()}-${(hoy.getMonth() + 1).toString().padStart(2, '0')}`
}

export default function LiquidacionModal({ employee, onClose, onSaved }) {
  const [form, setForm] = useState(() => ({
    period: periodoActual(),
    gross_salary: String(Math.round(employee?.base_salary || 0)),
    bonuses: '0',
    overtime: '0',
  }))
  const [guardando, setGuardando] = useState(false)

  if (!employee) return null

  const base = parseFloat(form.gross_salary) || 0
  const bonos = parseFloat(form.bonuses) || 0
  const extras = parseFloat(form.overtime) || 0
  const preview = calcularLiquidacion({
    base, bonos, extras,
    afpCode: employee.afp_code,
    healthSystem: employee.health_system,
    healthPlanValue: employee.health_plan_value,
    contractType: employee.contract_type,
  })

  const emitir = async (e) => {
    e.preventDefault()
    if (base <= 0) return alert('El sueldo base debe ser mayor a cero.')
    setGuardando(true)
    try {
      const response = await fetch(`${API_URL}/payroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: employee.id,
          period: form.period,
          gross_salary: base,
          bonuses: bonos,
          overtime: extras,
        }),
      })
      if (response.ok) { onSaved(); onClose() }
      else { const err = await response.json(); alert(err.detail || 'Error al generar la liquidación') }
    } catch { alert('Error de conexión') } finally { setGuardando(false) }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '640px' }}>
        <div className="modal-header">
          <h2>Emitir liquidación</h2>
          <button className="btn-close" onClick={onClose}><IconX /></button>
        </div>

        <div className="worker-chip">
          <strong>{employee.first_name} {employee.last_name}</strong>
          <span>{employee.position} · {employee.contract_type}</span>
        </div>

        <form onSubmit={emitir}>
          <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div className="form-group">
              <label>Periodo</label>
              <input type="month" value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Sueldo base ({periodoLabel(form.period)})</label>
              <input type="number" min="0" step="any" value={form.gross_salary}
                onChange={(e) => setForm({ ...form, gross_salary: e.target.value })} required />
            </div>
          </div>
          <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div className="form-group">
              <label>Bonos imponibles ($)</label>
              <input type="number" min="0" step="any" value={form.bonuses}
                onChange={(e) => setForm({ ...form, bonuses: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Horas extras ($)</label>
              <input type="number" min="0" step="any" value={form.overtime}
                onChange={(e) => setForm({ ...form, overtime: e.target.value })} />
            </div>
          </div>

          {preview.bruto > 0 && (
            <div className="preview-box">
              <div className="preview-row">
                <span>Total haberes</span><strong>{formatMoney(preview.bruto)}</strong>
              </div>
              {preview.descuentos.map((d) => (
                <div className="preview-row deduction-row" key={d.label}>
                  <span>{d.label}</span><span>-{formatMoney(d.monto)}</span>
                </div>
              ))}
              <div className="preview-row preview-total">
                <span>Líquido a pagar</span><strong>{formatMoney(preview.liquido)}</strong>
              </div>
            </div>
          )}

          <button type="submit" className="btn-submit" disabled={guardando}>
            {guardando ? 'Emitiendo...' : 'Calcular y emitir liquidación'}
          </button>
        </form>
      </div>
    </div>
  )
}
