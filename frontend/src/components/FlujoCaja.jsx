import { formatMoney, formatDate } from '../lib/format'

export default function FlujoCaja({ mesLabel, movimientos }) {
  const ingresos = movimientos.filter((t) => t.type === 'INGRESO')
  const egresos = movimientos.filter((t) => t.type === 'EGRESO')

  const totalIngresos = ingresos.reduce((acc, t) => acc + (t.amount || 0), 0)
  const totalEgresos = egresos.reduce((acc, t) => acc + (t.amount || 0), 0)
  const rli = totalIngresos - totalEgresos
  const ppm = totalIngresos * 0.0025

  const ivaDebito = ingresos.reduce((acc, t) => acc + (t.tax_amount || 0), 0)
  const ivaCredito = egresos.reduce((acc, t) => acc + (t.tax_amount || 0), 0)
  const ivaAPagar = Math.max(0, ivaDebito - ivaCredito)
  const ivaAFavor = Math.max(0, ivaCredito - ivaDebito)

  const ordenados = [...movimientos].sort((a, b) => new Date(b.date) - new Date(a.date))

  return (
    <>
      <div className="summary-grid">
        <div className="summary-card">
          <h3>Ingresos<br />({mesLabel})</h3>
          <div className="value text-green">{formatMoney(totalIngresos)}</div>
        </div>
        <div className="summary-card">
          <h3>Egresos<br />({mesLabel})</h3>
          <div className="value text-red">{formatMoney(totalEgresos)}</div>
        </div>
        <div className="summary-card">
          <h3>Renta líquida<br />(RLI)</h3>
          <div className={`value ${rli >= 0 ? 'text-blue' : 'text-red'}`}>{formatMoney(rli)}</div>
        </div>
        <div className="summary-card">
          <h3>PPM estimado<br />(0,25%)</h3>
          <div className="value text-yellow">{formatMoney(ppm)}</div>
        </div>
      </div>

      <div className="iva-grid">
        <div className="iva-card">
          <h3>IVA débito (ventas)</h3>
          <div className="value text-blue">{formatMoney(ivaDebito)}</div>
        </div>
        <div className="iva-card">
          <h3>IVA crédito (compras)</h3>
          <div className="value text-green">{formatMoney(ivaCredito)}</div>
        </div>
        <div className="iva-card" style={{ borderTopColor: ivaAPagar > 0 ? '#f87171' : '#4ade80' }}>
          <h3>Remanente</h3>
          <div className={`value ${ivaAPagar > 0 ? 'text-red' : 'text-green'}`}>
            {ivaAPagar > 0 ? `A pagar: ${formatMoney(ivaAPagar)}` : `A favor: ${formatMoney(ivaAFavor)}`}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header-row">
          <h2 style={{ margin: 0, border: 'none', padding: 0 }}>
            Movimientos consolidados de {mesLabel}
          </h2>
          <span className="total-chip">{movimientos.length} {movimientos.length === 1 ? 'movimiento' : 'movimientos'}</span>
        </div>

        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th style={{ width: '12%' }}>Fecha</th>
                <th style={{ width: '11%' }}>Tipo</th>
                <th style={{ width: '12%' }}>Documento</th>
                <th style={{ width: '31%' }}>Descripción</th>
                <th style={{ width: '16%', textAlign: 'right' }}>Monto</th>
                <th style={{ width: '18%', textAlign: 'right' }}>IVA</th>
              </tr>
            </thead>
            <tbody>
              {ordenados.length === 0 && (
                <tr><td colSpan="6" className="empty-row">No hay movimientos en este periodo.</td></tr>
              )}
              {ordenados.map((tx) => (
                <tr key={tx.id}>
                  <td data-label="Fecha">{formatDate(tx.date)}</td>
                  <td data-label="Tipo">
                    <span className={`badge ${tx.type === 'INGRESO' ? 'ingreso' : 'egreso'}`}>{tx.type}</span>
                  </td>
                  <td data-label="Documento" style={{ color: '#94a3b8', fontSize: '0.75rem' }}>{tx.document_type || 'Factura'}</td>
                  <td data-label="Descripción" title={tx.description}>{tx.description}</td>
                  <td data-label="Monto" style={{ fontWeight: 'bold', textAlign: 'right', color: tx.type === 'INGRESO' ? '#4ade80' : '#f87171' }}>
                    {formatMoney(tx.amount)}
                  </td>
                  <td data-label="IVA" style={{ textAlign: 'right', color: '#94a3b8' }}>
                    {tx.tax_amount > 0 ? formatMoney(tx.tax_amount) : '—'}
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
