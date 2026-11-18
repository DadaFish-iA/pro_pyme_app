import { useState, useEffect, useCallback } from 'react'
import './App.css'
import { MESES } from './lib/format'
import { IconChart, IconUsers, IconArrowDown, IconArrowUp, IconAlert } from './components/Icons'
import PeriodoSelector from './components/PeriodoSelector'
import MovimientosTab from './components/MovimientosTab'
import FlujoCaja from './components/FlujoCaja'
import Remuneraciones from './components/Remuneraciones'
import EmpresaModal from './components/EmpresaModal'

const API_URL = '/api'
const HOY = new Date()

const TABS = [
  { id: 'ingresos', label: 'Ingresos', Icon: IconArrowDown },
  { id: 'egresos', label: 'Egresos', Icon: IconArrowUp },
  { id: 'caja', label: 'Flujo de Caja', Icon: IconChart },
  { id: 'remuneraciones', label: 'Remuneraciones', Icon: IconUsers },
]

export default function App() {
  const [activeTab, setActiveTab] = useState('ingresos')
  const [mes, setMes] = useState((HOY.getMonth() + 1).toString().padStart(2, '0'))
  const [anio, setAnio] = useState(HOY.getFullYear().toString())

  const [transactions, setTransactions] = useState([])
  const [employees, setEmployees] = useState([])
  const [payrolls, setPayrolls] = useState([])
  const [company, setCompany] = useState(null)

  const [cargando, setCargando] = useState(true)
  const [errorConexion, setErrorConexion] = useState(false)
  const [empresaAbierta, setEmpresaAbierta] = useState(false)

  const loadData = useCallback(async () => {
    try {
      const [tx, emp, pay, comp] = await Promise.all([
        fetch(`${API_URL}/transactions`).then((r) => r.json()),
        fetch(`${API_URL}/employees`).then((r) => r.json()),
        fetch(`${API_URL}/payroll`).then((r) => r.json()),
        fetch(`${API_URL}/company`).then((r) => r.json()),
      ])
      setTransactions(Array.isArray(tx) ? tx : [])
      setEmployees(Array.isArray(emp) ? emp : [])
      setPayrolls(Array.isArray(pay) ? pay : [])
      setCompany(comp && !comp.detail ? comp : null)
      setErrorConexion(false)
    } catch {
      setErrorConexion(true)
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  const periodo = `${anio}-${mes}`
  const mesLabel = `${MESES[parseInt(mes, 10) - 1]} ${anio}`
  const delPeriodo = transactions.filter((t) => (t.date || '').startsWith(periodo))

  return (
    <div className="dashboard-container">
      <div className="header">
        <h1><span className="text-gradient">Pro Pyme</span></h1>
        <p>Régimen Art. 14 Letra D N°3 · Herramientas de gestión</p>
      </div>

      <nav className="main-tabs">
        {TABS.map(({ id, label, Icon }) => (
          <button key={id} className={`btn-main-tab ${activeTab === id ? 'active' : ''}`}
            onClick={() => setActiveTab(id)}>
            <Icon /> {label}
          </button>
        ))}
      </nav>

      {errorConexion && (
        <div className="banner-error">
          <IconAlert />
          <span>No se pudo conectar con el servidor. Revisa que el backend esté corriendo.</span>
          <button className="btn-secondary small" onClick={loadData}>Reintentar</button>
        </div>
      )}

      {activeTab !== 'remuneraciones' && (
        <PeriodoSelector
          mes={mes} anio={anio}
          onChange={(nuevoMes, nuevoAnio) => { setMes(nuevoMes); setAnio(nuevoAnio) }}
        />
      )}

      {cargando && <div className="loading-state">Cargando datos…</div>}

      {!cargando && activeTab === 'ingresos' && (
        <MovimientosTab
          tipo="INGRESO"
          mesLabel={mesLabel}
          movimientos={delPeriodo.filter((t) => t.type === 'INGRESO')}
          onChanged={loadData}
        />
      )}

      {!cargando && activeTab === 'egresos' && (
        <MovimientosTab
          tipo="EGRESO"
          mesLabel={mesLabel}
          movimientos={delPeriodo.filter((t) => t.type === 'EGRESO')}
          onChanged={loadData}
        />
      )}

      {!cargando && activeTab === 'caja' && (
        <FlujoCaja mesLabel={mesLabel} movimientos={delPeriodo} />
      )}

      {!cargando && activeTab === 'remuneraciones' && (
        <Remuneraciones
          employees={employees}
          payrolls={payrolls}
          company={company}
          onChanged={loadData}
          onOpenEmpresa={() => setEmpresaAbierta(true)}
        />
      )}

      {empresaAbierta && (
        <EmpresaModal
          company={company}
          onClose={() => setEmpresaAbierta(false)}
          onSaved={loadData}
        />
      )}

      <footer className="app-footer">
        Pro Pyme · {HOY.getFullYear()} · Los cálculos de IVA, PPM y descuentos legales son estimaciones.
      </footer>
    </div>
  )
}
