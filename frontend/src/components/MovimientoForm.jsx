import { useState, useRef } from 'react'
import { formatNumberInput, parseMoneyInput, formatMoney } from '../lib/format'
import { IconUpload, IconX } from './Icons'

const API_URL = '/api'
const VACIO = { date: new Date().toISOString().split('T')[0], amount: '', description: '', category: '', document_type: 'Factura' }

const IVA_TASA = 0.19

const estadoInicial = (editing) => (editing
  ? {
      date: (editing.date || '').slice(0, 10),
      amount: formatNumberInput(String(Math.round(editing.amount || 0))),
      description: editing.description || '',
      category: editing.category || '',
      document_type: editing.document_type || 'Factura',
    }
  : VACIO)

export default function MovimientoForm({ tipo, editing, onSaved, onCancelEdit }) {
  // El padre remonta el formulario con una key distinta al cambiar de movimiento
  const [form, setForm] = useState(() => estadoInicial(editing))
  const [receiptFile, setReceiptFile] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const fileInput = useRef(null)

  const monto = parseMoneyInput(form.amount)
  const iva = form.document_type === 'Factura' ? monto - monto / (1 + IVA_TASA) : 0
  const neto = monto - iva

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (monto <= 0) return alert('Monto inválido.')

    const formData = new FormData()
    formData.append('date', form.date + 'T12:00:00Z')
    formData.append('type', tipo)
    formData.append('amount', monto)
    formData.append('description', form.description)
    formData.append('category', form.category)
    formData.append('document_type', form.document_type)
    if (receiptFile) formData.append('receipt', receiptFile)
    if (editing && !receiptFile) formData.append('remove_receipt', editing.receipt_image ? 'false' : 'true')

    setGuardando(true)
    try {
      const url = editing ? `${API_URL}/transactions/${editing.id}` : `${API_URL}/transactions`
      const response = await fetch(url, { method: editing ? 'PUT' : 'POST', body: formData })
      if (response.ok) {
        setForm(VACIO)
        setReceiptFile(null)
        if (fileInput.current) fileInput.current.value = ''
        onSaved()
      } else {
        let errorMsg = 'Error al guardar el movimiento.'
        if (response.status === 413) errorMsg = 'El archivo es demasiado grande.'
        else { try { const d = await response.json(); if (d.detail) errorMsg = d.detail } catch { /* ignore */ } }
        alert(errorMsg)
      }
    } catch {
      alert('Error de conexión con el servidor.')
    } finally {
      setGuardando(false)
    }
  }

  const esIngreso = tipo === 'INGRESO'

  return (
    <div className="card">
      <div className="card-header-row">
        <h2 style={{ margin: 0, border: 'none', padding: 0 }}>
          {editing ? 'Editar movimiento' : `Registrar ${esIngreso ? 'ingreso' : 'egreso'}`}
        </h2>
        {editing && (
          <button type="button" className="btn-ghost" onClick={() => { onCancelEdit(); setForm(VACIO) }}>
            <IconX /> Cancelar edición
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="form-group">
            <label>Fecha</label>
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
          </div>
          <div className="form-group">
            <label>Monto total ($)</label>
            <input type="text" inputMode="numeric" value={form.amount}
              onChange={(e) => setForm({ ...form, amount: formatNumberInput(e.target.value) })}
              placeholder="Ej: 100.000" required />
          </div>
          <div className="form-group">
            <label>Tipo de documento</label>
            <select value={form.document_type} onChange={(e) => setForm({ ...form, document_type: e.target.value })}>
              <option value="Factura">Factura (afecta a IVA)</option>
              <option value="Boleta de Compra">Boleta de compra (no afecta a IVA)</option>
              <option value="Gasto sin Documento">Gasto sin documento</option>
            </select>
          </div>
        </div>

        {monto > 0 && form.document_type === 'Factura' && (
          <div className="iva-preview">
            <span>Neto: <strong>{formatMoney(neto)}</strong></span>
            <span>IVA 19%: <strong>{formatMoney(iva)}</strong></span>
            <span className={esIngreso ? 'text-blue' : 'text-yellow'}>
              {esIngreso ? 'IVA débito' : 'IVA crédito'}: <strong>{formatMoney(iva)}</strong>
            </span>
          </div>
        )}

        <div className="form-grid">
          <div className="form-group">
            <label>Categoría (opcional)</label>
            <input type="text" placeholder={esIngreso ? 'Ej: Ventas' : 'Ej: Sueldos, Arriendos'}
              value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          </div>
          {form.document_type !== 'Gasto sin Documento' && (
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label>Documento adjunto (PDF o foto)</label>
              <div className="file-upload-wrapper">
                <input ref={fileInput} type="file" id={`receipt-${tipo}`} accept=".pdf, image/*"
                  onChange={(e) => setReceiptFile(e.target.files[0])} />
                <label htmlFor={`receipt-${tipo}`} className={`file-upload-label ${receiptFile ? 'has-file' : ''}`}>
                  <IconUpload />
                  {receiptFile ? receiptFile.name : (editing?.receipt_image ? 'Reemplazar documento actual...' : 'Seleccionar archivo o tomar foto...')}
                </label>
              </div>
            </div>
          )}
        </div>

        <div className="form-group" style={{ marginBottom: '20px' }}>
          <label>Descripción</label>
          <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder={esIngreso ? 'Ej: Venta de servicios' : 'Ej: Compra de insumos'} required />
        </div>

        <button type="submit" className="btn-submit" disabled={guardando}>
          {guardando ? 'Guardando...' : (editing ? 'Guardar cambios' : 'Guardar movimiento')}
        </button>
      </form>
    </div>
  )
}
