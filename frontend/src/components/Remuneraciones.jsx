import { useState } from 'react'
import { formatMoney, formatRut, periodoLabel } from '../lib/format'
import { generarLiquidacionPDF } from '../lib/liquidacionPdf'
import { IconPlus, IconMoney, IconEdit, IconTrash, IconFile, IconEye, IconSettings } from './Icons'
import EmpleadoModal from './EmpleadoModal'
import LiquidacionModal from './LiquidacionModal'
import LiquidacionDetalle from './LiquidacionDetalle'

const API_URL = '/api'

export default function Remuneraciones({ employees, payrolls, company, onChanged, onOpenEmpresa }) {
  const [empleadoModal, setEmpleadoModal] = useState({ open: false, employee: null })
  const [liquidacionModal, setLiquidacionModal] = useState({ open: false, employee: null })
  const [detalle, setDetalle] = useState(null)

  const empresasSinConfigurar = !company?.name || !company?.rut

  const eliminarEmpleado = async (id) => {
    if (!window.confirm('¿Eliminar esta ficha? Se eliminarán también sus liquidaciones.')) return
    try { await fetch(`${API_URL}/employees/${id}`, { method: 'DELETE' }); onChanged() }
    catch { alert('Error al eliminar') }
  }

  const eliminarLiquidacion = async (id) => {
    if (!window.confirm('¿Eliminar esta liquidación? También se quitará el egreso asociado.')) return
    try {
      const res = await fetch(`${API_URL}/payroll/${id}`, { method: 'DELETE' })
      if (res.ok) onChanged()
    } catch { alert('Error al eliminar') }
  }

  const descargarPDF = (payroll) => {
    const empleado = employees.find((e) => e.id === payroll.employee_id)
    generarLiquidacionPDF(payroll, company, empleado)
  }

  const totalDescuentos = (p) =>
    (p.afp_amount || 0) + (p.health_amount || 0) + (p.unemployment_amount || 0) + (p.retention_amount || 0)

  return (
    <>
      {empresasSinConfigurar && (
        <div className="banner-warning">
          <span>
            <strong>Falta configurar la empresa.</strong> Las liquidaciones necesitan razón social y RUT para emitirse formalmente.
          </span>
          <button className="btn-secondary small" onClick={onOpenEmpresa}>
            <IconSettings /> Configurar ahora
          </button>
        </div>
      )}

      <div className="card">
        <div className="card-header-row">
          <h2 style={{ margin: 0, border: 'none', padding: 0 }}>Personal</h2>
          <div className="header-actions">
            <button className="btn-secondary small" onClick={onOpenEmpresa}>
              <IconSettings /> Datos de empresa
            </button>
            <button className="btn-small-add" onClick={() => setEmpleadoModal({ open: true, employee: null })}>
              <IconPlus /> Nuevo trabajador
            </button>
          </div>
        </div>

        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th style={{ width: '13%' }}>RUT</th>
                <th style={{ width: '22%' }}>Nombre</th>
                <th style={{ width: '15%' }}>Cargo</th>
                <th style={{ width: '13%' }}>Sueldo base</th>
                <th style={{ width: '14%' }}>AFP / Salud</th>
                <th style={{ width: '23%', textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {employees.length === 0 && (
                <tr><td colSpan="6" className="empty-row">No hay trabajadores registrados.</td></tr>
              )}
              {employees.map((emp) => (
                <tr key={emp.id}>
                  <td data-label="RUT" style={{ fontWeight: 500 }}>{formatRut(emp.rut)}</td>
                  <td data-label="Nombre">{emp.first_name} {emp.last_name}</td>
                  <td data-label="Cargo">{emp.position}</td>
                  <td data-label="Sueldo base">{formatMoney(emp.base_salary)}</td>
                  <td data-label="AFP / Salud" style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
                    {emp.afp_code} / {emp.health_system}
                  </td>
                  <td data-label="Acciones">
                    <div className="actions-wrapper">
                      <button className="btn-liquidar" onClick={() => setLiquidacionModal({ open: true, employee: emp })}>
                        <IconMoney /> Liquidar
                      </button>
                      <button className="btn-icon edit" title="Editar"
                        onClick={() => setEmpleadoModal({ open: true, employee: emp })}><IconEdit /></button>
                      <button className="btn-icon delete" title="Eliminar"
                        onClick={() => eliminarEmpleado(emp.id)}><IconTrash /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="card-header-row">
          <h2 style={{ margin: 0, border: 'none', padding: 0 }}>Liquidaciones emitidas</h2>
          <span className="total-chip">{payrolls.length} {payrolls.length === 1 ? 'documento' : 'documentos'}</span>
        </div>

        <div className="table-responsive">
          <table className="payroll-table">
            <thead>
              <tr>
                <th style={{ width: '14%' }}>Periodo</th>
                <th style={{ width: '21%' }}>Trabajador</th>
                <th style={{ width: '12%', textAlign: 'right' }}>Haberes</th>
                <th style={{ width: '13%', textAlign: 'right' }}>Descuentos</th>
                <th style={{ width: '14%', textAlign: 'right' }}>Líquido</th>
                <th style={{ width: '26%', textAlign: 'center' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {payrolls.length === 0 && (
                <tr><td colSpan="6" className="empty-row">No hay liquidaciones emitidas.</td></tr>
              )}
              {payrolls.map((p) => (
                <tr key={p.id}>
                  <td data-label="Periodo" style={{ fontWeight: 500 }}>{periodoLabel(p.period)}</td>
                  <td data-label="Trabajador">{p.employee_name}</td>
                  <td data-label="Haberes" style={{ textAlign: 'right' }}>{formatMoney(p.gross_salary)}</td>
                  <td data-label="Descuentos" className="deduction" style={{ textAlign: 'right' }}>
                    -{formatMoney(totalDescuentos(p))}
                  </td>
                  <td data-label="Líquido" style={{ textAlign: 'right' }}>
                    <span className="net-salary-box">{formatMoney(p.net_salary)}</span>
                  </td>
                  <td data-label="Acciones">
                    <div className="actions-wrapper">
                      <button className="btn-action detalle" title="Ver detalle" onClick={() => setDetalle(p)}>
                        <IconEye /> Detalle
                      </button>
                      <button className="btn-action pdf" title="Descargar PDF" onClick={() => descargarPDF(p)}>
                        <IconFile /> PDF
                      </button>
                      <button className="btn-icon delete" title="Eliminar liquidación"
                        onClick={() => eliminarLiquidacion(p.id)}><IconTrash /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {empleadoModal.open && (
        <EmpleadoModal
          employee={empleadoModal.employee}
          onClose={() => setEmpleadoModal({ open: false, employee: null })}
          onSaved={onChanged}
        />
      )}

      {liquidacionModal.open && (
        <LiquidacionModal
          employee={liquidacionModal.employee}
          onClose={() => setLiquidacionModal({ open: false, employee: null })}
          onSaved={onChanged}
        />
      )}

      {detalle && (
        <LiquidacionDetalle
          payroll={detalle}
          company={company}
          onClose={() => setDetalle(null)}
          onDescargar={descargarPDF}
        />
      )}
    </>
  )
}
