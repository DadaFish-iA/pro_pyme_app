import { useState } from 'react'
import { formatRut, isValidRut, formatMoney } from '../lib/format'
import { calcularLiquidacion, AFP_RATES } from '../lib/payroll'
import { IconX } from './Icons'

const API_URL = '/api'
const VACIO = {
  rut: '', first_name: '', last_name: '', position: '', afp_code: 'Habitat',
  health_system: 'Fonasa', health_plan_value: '', contract_type: 'Indefinido', base_salary: '',
}

export default function EmpleadoModal({ employee, onClose, onSaved }) {
  // El modal se monta solo cuando se abre, así que el formulario nace ya con los datos
  const [form, setForm] = useState(() => (employee
    ? { ...VACIO, ...employee, rut: formatRut(employee.rut) }
    : VACIO))
  const [rutError, setRutError] = useState('')
  const [guardando, setGuardando] = useState(false)

  const preview = calcularLiquidacion({
    base: parseFloat(form.base_salary) || 0,
    afpCode: form.afp_code,
    healthSystem: form.health_system,
    healthPlanValue: parseFloat(form.health_plan_value) || 0,
    contractType: form.contract_type,
  })

  const guardar = async (e) => {
    e.preventDefault()
    if (!isValidRut(form.rut)) { setRutError('El RUT ingresado no es válido.'); return }
    setRutError('')
    setGuardando(true)
    try {
      const payload = {
        ...form,
        base_salary: parseFloat(form.base_salary),
        health_plan_value: parseFloat(form.health_plan_value) || 0,
      }
      const url = employee ? `${API_URL}/employees/${employee.id}` : `${API_URL}/employees`
      const response = await fetch(url, {
        method: employee ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (response.ok) { onSaved(); onClose() }
      else { const err = await response.json(); alert(err.detail || 'Error al guardar') }
    } catch { alert('Error de conexión') } finally { setGuardando(false) }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>{employee ? 'Editar ficha del trabajador' : 'Nuevo trabajador'}</h2>
          <button className="btn-close" onClick={onClose}><IconX /></button>
        </div>

        <form onSubmit={guardar}>
          <div className="form-grid">
            <div className="form-group">
              <label>RUT</label>
              <input type="text" value={form.rut}
                onChange={(e) => { setForm({ ...form, rut: formatRut(e.target.value) }); if (rutError) setRutError('') }}
                className={rutError ? 'error' : ''} placeholder="12.345.678-9" required />
              {rutError && <span className="field-error">{rutError}</span>}
            </div>
            <div className="form-group">
              <label>Nombres</label>
              <input type="text" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Apellidos</label>
              <input type="text" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} required />
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label>Cargo</label>
              <input type="text" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Sueldo base bruto ($)</label>
              <input type="number" min="0" step="any" value={form.base_salary}
                onChange={(e) => setForm({ ...form, base_salary: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Tipo de contrato</label>
              <select value={form.contract_type} onChange={(e) => setForm({ ...form, contract_type: e.target.value })}>
                <option value="Indefinido">Indefinido</option>
                <option value="Plazo Fijo">Plazo fijo</option>
                <option value="Honorarios">Honorarios (boleta)</option>
              </select>
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label>AFP</label>
              <select value={form.afp_code} onChange={(e) => setForm({ ...form, afp_code: e.target.value })}>
                {Object.keys(AFP_RATES).map((afp) => <option key={afp} value={afp}>{afp}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Sistema de salud</label>
              <select value={form.health_system} onChange={(e) => setForm({ ...form, health_system: e.target.value })}>
                <option value="Fonasa">Fonasa</option>
                <option value="Isapre">Isapre</option>
              </select>
            </div>
            {form.health_system === 'Isapre' && (
              <div className="form-group">
                <label>Valor plan Isapre ($)</label>
                <input type="number" min="0" step="any" value={form.health_plan_value}
                  onChange={(e) => setForm({ ...form, health_plan_value: e.target.value })} required />
              </div>
            )}
          </div>

          {preview.bruto > 0 && (
            <div className="preview-box">
              <div className="preview-row">
                <span>Bruto mensual</span><strong>{formatMoney(preview.bruto)}</strong>
              </div>
              {preview.descuentos.map((d) => (
                <div className="preview-row deduction-row" key={d.label}>
                  <span>{d.label}</span><span>-{formatMoney(d.monto)}</span>
                </div>
              ))}
              <div className="preview-row preview-total">
                <span>Líquido estimado</span><strong>{formatMoney(preview.liquido)}</strong>
              </div>
              <p className="preview-note">
                Estimación con descuentos legales mínimos. El monto final puede variar según el plan de Isapre,
                cotizaciones adicionales o bonos imponibles.
              </p>
            </div>
          )}

          <button type="submit" className="btn-submit" style={{ marginTop: '20px' }} disabled={guardando}>
            {guardando ? 'Guardando...' : 'Guardar ficha'}
          </button>
        </form>
      </div>
    </div>
  )
}
