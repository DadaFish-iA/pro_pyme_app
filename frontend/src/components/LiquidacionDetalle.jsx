import { formatMoney, formatDate, periodoLabel, formatRut } from '../lib/format'
import { IconX, IconDownload } from './Icons'

export default function LiquidacionDetalle({ payroll, company, onClose, onDescargar }) {
  if (!payroll) return null

  const esHonorarios = payroll.contract_type === 'Honorarios'

  const haberes = [
    { label: 'Sueldo base', monto: payroll.base_salary || 0 },
    { label: 'Bonos imponibles', monto: payroll.bonuses || 0 },
    { label: 'Horas extras', monto: payroll.overtime || 0 },
  ].filter((h) => h.monto > 0)

  if (haberes.length === 0 && payroll.gross_salary) {
    haberes.push({ label: 'Sueldo bruto', monto: payroll.gross_salary })
  }

  const descuentos = esHonorarios
    ? [{ label: 'Retención honorarios (15,25%)', monto: payroll.retention_amount || 0 }]
    : [
        {
          label: `AFP ${payroll.afp_code || ''}${payroll.afp_rate ? ` (${(payroll.afp_rate * 100).toFixed(2)}%)` : ''}`,
          monto: payroll.afp_amount || 0,
        },
        {
          label: `Salud ${payroll.health_system === 'Isapre' ? 'Isapre' : 'Fonasa (7%)'}`,
          monto: payroll.health_amount || 0,
        },
        ...(payroll.unemployment_amount > 0
          ? [{ label: 'Seguro de cesantía (0,6%)', monto: payroll.unemployment_amount }]
          : []),
      ]

  const totalHaberes = haberes.reduce((acc, h) => acc + h.monto, 0)
  const totalDescuentos = descuentos.reduce((acc, d) => acc + d.monto, 0)

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '720px' }}>
        <div className="modal-header">
          <h2>Liquidación N° {String(payroll.id).padStart(6, '0')}</h2>
          <button className="btn-close" onClick={onClose}><IconX /></button>
        </div>

        <div className="doc-empresa">
          <strong>{company?.name || 'Empresa no configurada'}</strong>
          <span>
            {company?.rut ? `RUT ${company.rut}` : 'Sin RUT'}
            {company?.activity ? ` · ${company.activity}` : ''}
          </span>
        </div>

        <div className="detail-grid">
          <div><span>Trabajador</span><strong>{payroll.employee_name}</strong></div>
          <div><span>RUT</span><strong>{formatRut(payroll.rut)}</strong></div>
          <div><span>Cargo</span><strong>{payroll.position || '—'}</strong></div>
          <div><span>Contrato</span><strong>{payroll.contract_type || '—'}</strong></div>
          <div><span>Periodo</span><strong>{periodoLabel(payroll.period)}</strong></div>
          <div><span>Emisión</span><strong>{formatDate(payroll.date)}</strong></div>
        </div>

        <div className="liq-columns">
          <div className="liq-block">
            <h3>Haberes</h3>
            {haberes.map((h) => (
              <div className="liq-row" key={h.label}><span>{h.label}</span><span>{formatMoney(h.monto)}</span></div>
            ))}
            <div className="liq-row liq-total"><span>Total haberes</span><span>{formatMoney(totalHaberes)}</span></div>
          </div>

          <div className="liq-block">
            <h3>Descuentos</h3>
            {descuentos.map((d) => (
              <div className="liq-row deduction-row" key={d.label}><span>{d.label}</span><span>-{formatMoney(d.monto)}</span></div>
            ))}
            <div className="liq-row liq-total"><span>Total descuentos</span><span>-{formatMoney(totalDescuentos)}</span></div>
          </div>
        </div>

        <div className="liq-neto">
          <span>Líquido a pagar</span>
          <strong>{formatMoney(payroll.net_salary)}</strong>
        </div>

        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose}>Cerrar</button>
          <button className="btn-submit btn-inline" onClick={() => onDescargar(payroll)}>
            <IconDownload /> Descargar PDF
          </button>
        </div>
      </div>
    </div>
  )
}
