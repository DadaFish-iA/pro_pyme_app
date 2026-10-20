import { useState, useEffect } from 'react'
import './App.css'

const API_URL = 'http://127.0.0.1:8001/api'

function App() {
  const [transactions, setTransactions] = useState([])
  const [summary, setSummary] = useState({ total_ingresos: 0, total_egresos: 0, rli: 0, ppm: 0 })
  
  // Estado del formulario
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    type: 'INGRESO',
    amount: '',
    description: '',
    category: ''
  })

  const loadData = async () => {
    try {
      const [resTx, resSum] = await Promise.all([
        fetch(`${API_URL}/transactions`).then(r => r.json()),
        fetch(`${API_URL}/summary`).then(r => r.json())
      ])
      setTransactions(Array.isArray(resTx) ? resTx : [])
      setSummary(resSum)
    } catch (error) {
      console.error("Error cargando datos", error)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.amount || parseFloat(form.amount) <= 0) {
      alert("Por favor, ingresa un monto válido.")
      return
    }

    try {
      const response = await fetch(`${API_URL}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          amount: parseFloat(form.amount),
          date: form.date + 'T12:00:00Z'
        })
      })

      if (response.ok) {
        setForm({ ...form, amount: '', description: '', category: '' })
        loadData()
      }
    } catch (error) {
      alert("Error de conexión")
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm("¿Eliminar este movimiento?")) return
    try {
      const response = await fetch(`${API_URL}/transactions/${id}`, { method: 'DELETE' })
      if (response.ok) loadData()
    } catch (error) {
      alert("Error al eliminar")
    }
  }

  const formatMoney = (val) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(val || 0)
  const formatDate = (isoString) => new Date(isoString).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })

  return (
    <div className="dashboard-container">
      <div className="header">
        <h1><span className="text-gradient">Pro Pyme</span></h1>
        <p>Régimen Art. 14 Letra D N°3 - Flujo de Caja Simplificado</p>
      </div>

      {/* PANEL DE RESUMEN */}
      <div className="summary-grid">
        <div className="summary-card">
          <h3>Ingresos Percibidos</h3>
          <div className="value text-green">{formatMoney(summary.total_ingresos)}</div>
        </div>
        <div className="summary-card">
          <h3>Egresos Pagados</h3>
          <div className="value text-red">{formatMoney(summary.total_egresos)}</div>
        </div>
        <div className="summary-card">
          <h3>Renta Líquida (RLI)</h3>
          <div className={`value ${summary.rli >= 0 ? 'text-blue' : 'text-red'}`}>{formatMoney(summary.rli)}</div>
        </div>
        <div className="summary-card">
          <h3>PPM Estimado (0,25%)</h3>
          <div className="value text-yellow">{formatMoney(summary.ppm)}</div>
        </div>
      </div>

      {/* FORMULARIO DE INGRESO/EGRESO */}
      <div className="card">
        <h2>Registrar un Movimiento</h2>
        <form onSubmit={handleSubmit}>
          
          <div className="type-selector">
            <button 
              type="button" 
              className={`btn-type ${form.type === 'INGRESO' ? 'active-ingreso' : ''}`}
              onClick={() => setForm({...form, type: 'INGRESO'})}
            >
              ⬇️ Ingreso (Venta / Cobro)
            </button>
            <button 
              type="button" 
              className={`btn-type ${form.type === 'EGRESO' ? 'active-egreso' : ''}`}
              onClick={() => setForm({...form, type: 'EGRESO'})}
            >
              ⬆️ Egreso (Compra / Gasto)
            </button>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label>Fecha</label>
              <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} required />
            </div>
            <div className="form-group">
              <label>Monto ($)</label>
              <input type="number" min="1" step="any" placeholder="Ej: 50000" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} required />
            </div>
            <div className="form-group">
              <label>Categoría (Opcional)</label>
              <input type="text" placeholder="Ej: Ventas, Sueldos, Arriendo" value={form.category} onChange={e => setForm({...form, category: e.target.value})} />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label>Descripción / Detalle</label>
            <input type="text" placeholder="Ej: Pago de factura N°123 o Venta de mostrador" value={form.description} onChange={e => setForm({...form, description: e.target.value})} required />
          </div>

          <button type="submit" className="btn-submit">Guardar Movimiento</button>
        </form>
      </div>

      {/* HISTORIAL */}
      <div className="card">
        <h2>Historial de Movimientos</h2>
        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>Descripción</th>
                <th>Categoría</th>
                <th style={{ textAlign: 'right' }}>Monto</th>
                <th style={{ textAlign: 'center' }}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 && (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>No hay movimientos registrados aún.</td></tr>
              )}
              {transactions.map(tx => (
                <tr key={tx.id}>
                  <td>{formatDate(tx.date)}</td>
                  <td>
                    <span className={`badge ${tx.type === 'INGRESO' ? 'ingreso' : 'egreso'}`}>
                      {tx.type}
                    </span>
                  </td>
                  <td>{tx.description}</td>
                  <td style={{ color: '#94a3b8' }}>{tx.category || '-'}</td>
                  <td style={{ textAlign: 'right', fontWeight: 'bold', color: tx.type === 'INGRESO' ? '#4ade80' : '#f87171' }}>
                    {tx.type === 'INGRESO' ? '+' : '-'} {formatMoney(tx.amount)}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button className="btn-delete" onClick={() => handleDelete(tx.id)} title="Eliminar">🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default App