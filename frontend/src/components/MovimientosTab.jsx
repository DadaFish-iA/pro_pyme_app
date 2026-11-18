import { useState } from 'react'
import { formatMoney, formatDate } from '../lib/format'
import { IconEye, IconEdit, IconTrash, IconArrowDown, IconArrowUp } from './Icons'
import MovimientoForm from './MovimientoForm'

const API_URL = '/api'

export default function MovimientosTab({ tipo, mesLabel, movimientos, onChanged }) {
  const [editando, setEditando] = useState(null)
  const esIngreso = tipo === 'INGRESO'
  const total = movimientos.reduce((acc, t) => acc + (t.amount || 0), 0)

  const eliminar = async (id) => {
    if (!window.confirm('¿Eliminar este movimiento?')) return
    try {
      await fetch(`${API_URL}/transactions/${id}`, { method: 'DELETE' })
      if (editando?.id === id) setEditando(null)
      onChanged()
    } catch {
      alert('Error al eliminar')
    }
  }

  return (
    <>
      <MovimientoForm
        key={editando?.id ?? 'nuevo'}
        tipo={tipo}
        editing={editando}
        onSaved={() => { setEditando(null); onChanged() }}
        onCancelEdit={() => setEditando(null)}
      />

      <div className="card">
        <div className="card-header-row">
          <h2>
            {esIngreso ? 'Ingresos' : 'Egresos'} de {mesLabel}
          </h2>
          <div className={`total-chip ${esIngreso ? 'chip-ingreso' : 'chip-egreso'}`}>
            {esIngreso ? <IconArrowDown /> : <IconArrowUp />}
            Total: {formatMoney(total)}
          </div>
        </div>

        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th style={{ width: '12%' }}>Fecha</th>
                <th style={{ width: '13%' }}>Documento</th>
                <th style={{ width: '30%' }}>Descripción</th>
                <th style={{ width: '14%' }}>Categoría</th>
                <th style={{ width: '15%', textAlign: 'right' }}>Monto</th>
                <th style={{ width: '16%', textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {movimientos.length === 0 && (
                <tr>
                  <td colSpan="6" className="empty-row">
                    No hay {esIngreso ? 'ingresos' : 'egresos'} registrados en este periodo.
                  </td>
                </tr>
              )}
              {movimientos.map((tx) => (
                <tr key={tx.id} className={editando?.id === tx.id ? 'row-editing' : ''}>
                  <td data-label="Fecha">{formatDate(tx.date)}</td>
                  <td data-label="Documento" style={{ color: '#94a3b8', fontSize: '0.75rem' }}>{tx.document_type || 'Factura'}</td>
                  <td data-label="Descripción" title={tx.description}>{tx.description}</td>
                  <td data-label="Categoría" style={{ color: '#94a3b8' }}>{tx.category || '—'}</td>
                  <td data-label="Monto" style={{ fontWeight: 'bold', color: esIngreso ? '#4ade80' : '#f87171', textAlign: 'right' }}>
                    {formatMoney(tx.amount)}
                  </td>
                  <td data-label="Acciones">
                    <div className="actions-wrapper">
                      {tx.receipt_image && (
                        <a href={tx.receipt_image} target="_blank" rel="noreferrer" className="btn-action view-img" title="Ver documento">
                          <IconEye />
                        </a>
                      )}
                      <button className="btn-icon edit" title="Editar" onClick={() => setEditando(tx)}><IconEdit /></button>
                      <button className="btn-icon delete" title="Eliminar" onClick={() => eliminar(tx.id)}><IconTrash /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
