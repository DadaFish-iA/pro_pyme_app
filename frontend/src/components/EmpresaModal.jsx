import { useState } from 'react'
import { formatRut } from '../lib/format'
import { IconX } from './Icons'

const API_URL = '/api'
const VACIO = { name: '', rut: '', activity: '', address: '', city: '', representative: '' }

export default function EmpresaModal({ company, onClose, onSaved }) {
  const [form, setForm] = useState(() => ({
    ...VACIO,
    ...(company || {}),
    rut: company?.rut ? formatRut(company.rut) : '',
  }))
  const [guardando, setGuardando] = useState(false)

  const guardar = async (e) => {
    e.preventDefault()
    setGuardando(true)
    try {
      const response = await fetch(`${API_URL}/company`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (response.ok) { onSaved(); onClose() } else alert('Error al guardar los datos de la empresa')
    } catch { alert('Error de conexión') } finally { setGuardando(false) }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>Datos de la empresa</h2>
          <button className="btn-close" onClick={onClose}><IconX /></button>
        </div>
        <p className="modal-hint">
          Estos datos son el encabezado de cada liquidación. Sin ellos el documento no se puede emitir de forma formal.
        </p>
        <form onSubmit={guardar}>
          <div className="form-grid">
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label>Razón social</label>
              <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>RUT empresa</label>
              <input type="text" value={form.rut} onChange={(e) => setForm({ ...form, rut: formatRut(e.target.value) })} placeholder="76.543.210-K" />
            </div>
          </div>
          <div className="form-grid">
            <div className="form-group">
              <label>Giro</label>
              <input type="text" value={form.activity} onChange={(e) => setForm({ ...form, activity: e.target.value })} placeholder="Ej: Servicios de consultoría" />
            </div>
            <div className="form-group">
              <label>Dirección</label>
              <input type="text" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Comuna / Ciudad</label>
              <input type="text" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label>Representante legal</label>
            <input type="text" value={form.representative} onChange={(e) => setForm({ ...form, representative: e.target.value })}
              placeholder="Nombre de quien firma" />
          </div>
          <button type="submit" className="btn-submit" disabled={guardando}>
            {guardando ? 'Guardando...' : 'Guardar datos'}
          </button>
        </form>
      </div>
    </div>
  )
}
