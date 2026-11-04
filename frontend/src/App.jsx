import { useState, useEffect } from 'react'
import './App.css'
import { jsPDF } from 'jspdf'
import 'jspdf-autotable'

const API_URL = `/api`

// --- COMPONENTES SVG ---
const IconChart = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
const IconUsers = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
const IconPlus = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
const IconMoney = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
const IconEdit = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
const IconTrash = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
const IconFile = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
const IconDownload = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
const IconX = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
const IconArrowDown = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>
const IconArrowUp = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>

// --- UTILIDADES DE RUT ---
const cleanRut = (rut) => rut.replace(/[^0-9kK]/g, '').toUpperCase();
const formatRut = (rut) => {
  const clean = cleanRut(rut);
  if (clean.length <= 1) return clean;
  const dv = clean.slice(-1);
  const body = clean.slice(0, -1);
  let formattedBody = '';
  for (let i = body.length - 1, j = 0; i >= 0; i--, j++) {
    formattedBody = body[i] + formattedBody;
    if (j === 2 && i !== 0) { formattedBody = '.' + formattedBody; j = -1; }
  }
  return `${formattedBody}-${dv}`;
};
const isValidRut = (rut) => {
  const clean = cleanRut(rut);
  if (clean.length < 2) return false;
  const body = clean.slice(0, -1);
  const dv = clean.slice(-1);
  let sum = 0, multiplier = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }
  const mod = 11 - (sum % 11);
  const calculatedDv = mod === 11 ? '0' : mod === 10 ? 'K' : mod.toString();
  return calculatedDv === dv;
};

function App() {
  const [activeTab, setActiveTab] = useState('caja')

  const [transactions, setTransactions] = useState([])
  const [selectedMonth, setSelectedMonth] = useState((new Date().getMonth() + 1).toString().padStart(2, '0'))
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString())
  const [form, setForm] = useState({ date: new Date().toISOString().split('T')[0], type: 'INGRESO', amount: '', description: '', category: '' })

  const [employees, setEmployees] = useState([])
  const [payrolls, setPayrolls] = useState([])
  const [isEmpModalOpen, setIsEmpModalOpen] = useState(false)
  const [editingEmpId, setEditingEmpId] = useState(null)
  const [empForm, setEmpForm] = useState({
    rut: '', first_name: '', last_name: '', position: '',
    afp_code: 'Habitat', health_system: 'Fonasa', health_plan_value: '',
    contract_type: 'Indefinido', base_salary: ''
  })
  const [rutError, setRutError] = useState('')

  const [isPayrollModalOpen, setIsPayrollModalOpen] = useState(false)
  const [selectedEmp, setSelectedEmp] = useState(null)
  const [payrollForm, setPayrollForm] = useState({
    period: `${new Date().getFullYear()}-${(new Date().getMonth() + 1).toString().padStart(2, '0')}`,
    gross_salary: '', bonuses: '', overtime: ''
  })

  const loadData = async () => {
    try {
      const [resTx, resEmp, resPay] = await Promise.all([
        fetch(`${API_URL}/transactions`).then(r => r.json()),
        fetch(`${API_URL}/employees`).then(r => r.json()),
        fetch(`${API_URL}/payroll`).then(r => r.json())
      ])
      setTransactions(Array.isArray(resTx) ? resTx : [])
      setEmployees(Array.isArray(resEmp) ? resEmp : [])
      setPayrolls(Array.isArray(resPay) ? resPay : [])
    } catch (error) { console.error(error) }
  }

  useEffect(() => { loadData() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.amount || parseFloat(form.amount) <= 0) return alert("Monto inválido.")
    try {
      const response = await fetch(`${API_URL}/transactions`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, amount: parseFloat(form.amount), date: form.date + 'T12:00:00Z' })
      })
      if (response.ok) { setForm({ ...form, amount: '', description: '', category: '' }); loadData() }
    } catch (error) { alert("Error de conexión") }
  }

  const handleDeleteTx = async (id) => {
    if (!window.confirm("¿Eliminar este movimiento?")) return
    try { await fetch(`${API_URL}/transactions/${id}`, { method: 'DELETE' }); loadData() } catch (error) { alert("Error al eliminar") }
  }

  const handleEditTx = (tx) => {
    alert("Próximamente: Edición de movimientos en el flujo de caja.")
  }

  const handleSaveEmployee = async (e) => {
    e.preventDefault()
    if (!isValidRut(empForm.rut)) {
      setRutError('El RUT ingresado no es válido. Verifique el dígito verificador.');
      return;
    }
    setRutError('');
    const payload = { ...empForm, base_salary: parseFloat(empForm.base_salary), health_plan_value: parseFloat(empForm.health_plan_value) || 0 }
    const url = editingEmpId ? `${API_URL}/employees/${editingEmpId}` : `${API_URL}/employees`
    const method = editingEmpId ? 'PUT' : 'POST'

    try {
      const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (response.ok) {
        setIsEmpModalOpen(false); setEditingEmpId(null)
        setEmpForm({ rut: '', first_name: '', last_name: '', position: '', afp_code: 'Habitat', health_system: 'Fonasa', health_plan_value: '', contract_type: 'Indefinido', base_salary: '' })
        loadData()
      } else {
        const err = await response.json(); alert(err.detail || "Error al guardar")
      }
    } catch (error) { alert("Error de conexión") }
  }

  const handleDeleteEmployee = async (id) => {
    if (!window.confirm("¿Eliminar esta ficha? Se borrarán sus liquidaciones asociadas.")) return
    try { await fetch(`${API_URL}/employees/${id}`, { method: 'DELETE' }); loadData() } catch (error) { alert("Error al eliminar") }
  }

  const openEmpModal = (emp = null) => {
    if (emp) {
      setEmpForm({ ...emp, rut: formatRut(emp.rut) }); setEditingEmpId(emp.id)
    } else {
      setEditingEmpId(null)
      setEmpForm({ rut: '', first_name: '', last_name: '', position: '', afp_code: 'Habitat', health_system: 'Fonasa', health_plan_value: '', contract_type: 'Indefinido', base_salary: '' })
    }
    setRutError('');
    setIsEmpModalOpen(true)
  }

  const openPayrollModal = (emp) => {
    setSelectedEmp(emp)
    setPayrollForm({ period: `${new Date().getFullYear()}-${(new Date().getMonth() + 1).toString().padStart(2, '0')}`, gross_salary: emp.base_salary.toString(), bonuses: '0', overtime: '0' })
    setIsPayrollModalOpen(true)
  }

  const handleGeneratePayroll = async (e) => {
    e.preventDefault()
    try {
      const response = await fetch(`${API_URL}/payroll`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: selectedEmp.id,
          period: payrollForm.period,
          gross_salary: parseFloat(payrollForm.gross_salary),
          bonuses: parseFloat(payrollForm.bonuses) || 0,
          overtime: parseFloat(payrollForm.overtime) || 0
        })
      })
      if (response.ok) {
        setIsPayrollModalOpen(false); loadData()
        alert("Liquidación generada con éxito.")
      } else {
        const err = await response.json(); alert(err.detail || "Error al generar")
      }
    } catch (error) { alert("Error de conexión") }
  }

  const handleDeletePayroll = async (id) => {
    if (!window.confirm("¿Eliminar esta liquidación? También se borrará el egreso asociado en el flujo de caja.")) return
    try { 
      const res = await fetch(`${API_URL}/payroll/${id}`, { method: 'DELETE' })
      if (res.ok) loadData()
    } catch (error) { alert("Error al eliminar") }
  }

  const downloadPDF = (payroll) => {
    const doc = new jsPDF()
    doc.setFontSize(18); doc.text("Liquidación de Sueldo", 14, 20)
    doc.setFontSize(10); doc.text(`Trabajador: ${payroll.employee_name}`, 14, 30)
    doc.text(`RUT: ${payroll.rut} | Periodo: ${payroll.period}`, 14, 36)
    doc.text(`Sueldo Bruto: $${payroll.gross_salary.toLocaleString('es-CL')}`, 14, 46)
    doc.text(`Descuento AFP: -$${payroll.afp_amount.toLocaleString('es-CL')}`, 14, 52)
    doc.text(`Descuento Salud: -$${payroll.health_amount.toLocaleString('es-CL')}`, 14, 58)
    doc.text(`Seguro Cesantía: -$${payroll.unemployment_amount.toLocaleString('es-CL')}`, 14, 64)
    doc.setFontSize(12); doc.text(`Sueldo Líquido: $${payroll.net_salary.toLocaleString('es-CL')}`, 14, 74)
    doc.save(`Liquidacion_${payroll.rut}_${payroll.period}.pdf`)
  }

  const downloadPrevired = async (payroll) => {
    try {
      const response = await fetch(`${API_URL}/payroll/export-previred?period=${payroll.period}`)
      if (!response.ok) throw new Error("Error al generar archivo")
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Previred_${payroll.period}.txt`
      a.click()
    } catch (error) { alert("Error al descargar archivo para Previred") }
  }

  const formatMoney = (val) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(val || 0)
  const formatDate = (isoString) => new Date(isoString).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })
  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]
  const yearsList = Array.from({ length: 16 }, (_, i) => 2020 + i)
  const currentMonthName = monthNames[parseInt(selectedMonth) - 1]

  const filterString = `${selectedYear}-${selectedMonth}`
  const monthlyTransactions = transactions.filter(tx => tx.date.startsWith(filterString))
  const total_ingresos = monthlyTransactions.filter(t => t.type === 'INGRESO').reduce((acc, t) => acc + t.amount, 0)
  const total_egresos = monthlyTransactions.filter(t => t.type === 'EGRESO').reduce((acc, t) => acc + t.amount, 0)
  const rli = total_ingresos - total_egresos
  const ppm = total_ingresos * 0.0025

  const estimatedGross = parseFloat(empForm.base_salary) || 0;
  const afpRates = { "Habitat": 0.1127, "Cuprum": 0.1144, "Modelo": 0.1058, "Capital": 0.1144, "Provida": 0.1145, "PlanVital": 0.1116, "Uno": 0.1069 };
  const afpRate = afpRates[empForm.afp_code] || 0.1144;
  const estimatedAfp = estimatedGross * afpRate;
  const estimatedHealth = empForm.health_system === 'Fonasa' ? estimatedGross * 0.07 : Math.max(estimatedGross * 0.07, parseFloat(empForm.health_plan_value) || 0);
  const estimatedAfc = empForm.contract_type === 'Indefinido' ? estimatedGross * 0.006 : 0;
  const estimatedNet = estimatedGross - estimatedAfp - estimatedHealth - estimatedAfc;

  return (
    <div className="dashboard-container">
      <div className="header">
        <h1><span className="text-gradient">Pro Pyme</span></h1>
        <p>Régimen Art. 14 Letra D N°3 - Herramientas de Gestión</p>
      </div>

      <div className="main-tabs">
        <button className={`btn-main-tab ${activeTab === 'caja' ? 'active' : ''}`} onClick={() => setActiveTab('caja')}><IconChart /> Flujo de Caja</button>
        <button className={`btn-main-tab ${activeTab === 'remuneraciones' ? 'active' : ''}`} onClick={() => setActiveTab('remuneraciones')}><IconUsers /> Remuneraciones</button>
      </div>

      {activeTab === 'caja' && (
        <>
          <div className="date-filter-container">
            <div className="date-filter">
              <label>Periodo:</label>
              <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
                {monthNames.map((name, index) => <option key={index} value={(index + 1).toString().padStart(2, '0')}>{name}</option>)}
              </select>
              <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
                {yearsList.map(year => <option key={year} value={year.toString()}>{year}</option>)}
              </select>
            </div>
          </div>

          <div className="summary-grid">
            <div className="summary-card"><h3>Ingresos<br/>({currentMonthName})</h3><div className="value text-green">{formatMoney(total_ingresos)}</div></div>
            <div className="summary-card"><h3>Egresos<br/>({currentMonthName})</h3><div className="value text-red">{formatMoney(total_egresos)}</div></div>
            <div className="summary-card"><h3>Renta Líquida<br/>(RLI)</h3><div className={`value ${rli >= 0 ? 'text-blue' : 'text-red'}`}>{formatMoney(rli)}</div></div>
            <div className="summary-card"><h3>PPM Estimado<br/>(0,25%)</h3><div className="value text-yellow">{formatMoney(ppm)}</div></div>
          </div>

          <div className="card">
            <h2>Registrar un Movimiento</h2>
            <form onSubmit={handleSubmit}>
              <div className="type-selector">
                <button type="button" className={`btn-type ${form.type === 'INGRESO' ? 'active-ingreso' : ''}`} onClick={() => setForm({...form, type: 'INGRESO'})}><IconArrowDown /> Ingreso (Venta / Cobro)</button>
                <button type="button" className={`btn-type ${form.type === 'EGRESO' ? 'active-egreso' : ''}`} onClick={() => setForm({...form, type: 'EGRESO'})}><IconArrowUp /> Egreso (Compra / Gasto)</button>
              </div>
              <div className="form-grid">
                <div className="form-group"><label>Fecha</label><input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} required /></div>
                <div className="form-group"><label>Monto ($)</label><input type="number" min="1" step="any" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} required /></div>
                <div className="form-group"><label>Categoría (Opcional)</label><input type="text" placeholder="Ej: Ventas, Sueldos" value={form.category} onChange={e => setForm({...form, category: e.target.value})} /></div>
              </div>
              <div className="form-group" style={{ marginBottom: '20px' }}><label>Descripción</label><input type="text" value={form.description} onChange={e => setForm({...form, description: e.target.value})} required /></div>
              <button type="submit" className="btn-submit">Guardar Movimiento</button>
            </form>
          </div>

          <div className="card">
            <h2>Historial de Movimientos ({currentMonthName} {selectedYear})</h2>
            <div className="table-responsive">
              <table>
                <thead><tr><th>Fecha</th><th>Tipo</th><th>Descripción</th><th>Categoría</th><th style={{ textAlign: 'right' }}>Monto</th><th style={{ textAlign: 'center' }}>Acción</th></tr></thead>
                <tbody>
                  {monthlyTransactions.length === 0 && <tr><td colSpan="6" style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>No hay movimientos en este periodo.</td></tr>}
                  {monthlyTransactions.map(tx => (
                    <tr key={tx.id}>
                      <td data-label="Fecha">{formatDate(tx.date)}</td>
                      <td data-label="Tipo"><span className={`badge ${tx.type === 'INGRESO' ? 'ingreso' : 'egreso'}`}>{tx.type}</span></td>
                      <td data-label="Descripción">{tx.description}</td>
                      <td data-label="Categoría" style={{ color: '#94a3b8' }}>{tx.category || '-'}</td>
                      <td data-label="Monto" style={{ fontWeight: 'bold', color: tx.type === 'INGRESO' ? '#4ade80' : '#f87171' }}>{tx.type === 'INGRESO' ? '+' : '-'} {formatMoney(tx.amount)}</td>
                      <td data-label="Acción">
                        <div className="actions-wrapper">
                          <button className="btn-icon edit" onClick={() => handleEditTx(tx)}><IconEdit /></button>
                          <button className="btn-icon delete" onClick={() => handleDeleteTx(tx.id)}><IconTrash /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {activeTab === 'remuneraciones' && (
        <>
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
              <h2 style={{ margin: 0, border: 'none', padding: 0 }}>Gestión de Personal</h2>
              
              {/* BOTÓN NUEVO TRABAJADOR (MÁS PEQUEÑO) */}
              <button className="btn-submit" style={{ width: 'auto', marginTop: 0, padding: '0 15px', height: '32px', fontSize: '0.8rem' }} onClick={() => openEmpModal()}>
                <IconPlus style={{ width: '14px', height: '14px' }} /> Nuevo Trabajador
              </button>
            </div>
            
            <div className="table-responsive">
              <table>
                <thead>
                  <tr>
                    <th>RUT</th><th>Nombre</th><th>Cargo</th><th>Sueldo Base</th><th>AFP / Salud</th><th style={{ textAlign: 'center' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.length === 0 && <tr><td colSpan="6" style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>No hay trabajadores registrados.</td></tr>}
                  {employees.map(emp => (
                    <tr key={emp.id}>
                      <td data-label="RUT" style={{ fontWeight: '500' }}>{formatRut(emp.rut)}</td>
                      <td data-label="Nombre">{emp.first_name} {emp.last_name}</td>
                      <td data-label="Cargo">{emp.position}</td>
                      <td data-label="Sueldo Base">{formatMoney(emp.base_salary)}</td>
                      <td data-label="AFP / Salud" style={{ color: '#94a3b8', fontSize: '0.8rem' }}>{emp.afp_code} / {emp.health_system}</td>
                      <td data-label="Acciones">
                        <div className="actions-wrapper">
                          <button className="btn-liquidar" onClick={() => openPayrollModal(emp)}><IconMoney /> Liquidar</button>
                          <button className="btn-icon edit" onClick={() => openEmpModal(emp)}><IconEdit /></button>
                          <button className="btn-icon delete" onClick={() => handleDeleteEmployee(emp.id)}><IconTrash /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card">
            <h2>Historial de Liquidaciones Emitidas</h2>
            <div className="table-responsive">
              <table className="payroll-table">
                <thead>
                  <tr>
                    <th>Periodo</th>
                    <th>Trabajador</th>
                    <th>Sueldo Bruto</th>
                    <th>AFP</th>
                    <th>Salud</th>
                    <th>Cesantía</th>
                    <th style={{ textAlign: 'center' }}>Sueldo Líquido</th>
                    <th style={{ textAlign: 'center' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {payrolls.length === 0 && <tr><td colSpan="8" style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>No hay liquidaciones emitidas.</td></tr>}
                  {payrolls.map(p => (
                    <tr key={p.id}>
                      <td data-label="Periodo" style={{ fontWeight: '500' }}>{p.period}</td>
                      <td data-label="Trabajador" style={{ color: '#fff' }}>{p.employee_name}</td>
                      <td data-label="Sueldo Bruto">{formatMoney(p.gross_salary)}</td>
                      <td data-label="AFP" className="deduction">-{formatMoney(p.afp_amount)}</td>
                      <td data-label="Salud" className="deduction">-{formatMoney(p.health_amount)}</td>
                      <td data-label="Cesantía" className="deduction">-{formatMoney(p.unemployment_amount)}</td>
                      <td data-label="Sueldo Líquido">
                        <span className="net-salary-box">{formatMoney(p.net_salary)}</span>
                      </td>
                      <td data-label="Acciones">
                        <div className="actions-wrapper">
                          <button className="btn-action pdf" title="Descargar PDF" onClick={() => downloadPDF(p)}><IconFile /> PDF</button>
                          <button className="btn-action previred" title="Descargar para Previred" onClick={() => downloadPrevired(p)}><IconDownload /> Previred</button>
                          <button className="btn-icon delete" title="Eliminar Liquidación" onClick={() => handleDeletePayroll(p.id)}><IconTrash /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {isEmpModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{editingEmpId ? 'Editar Ficha' : 'Nueva Ficha de Trabajador'}</h2>
              <button className="btn-close" onClick={() => setIsEmpModalOpen(false)}><IconX /></button>
            </div>
            <form onSubmit={handleSaveEmployee}>
              <div className="form-grid">
                <div className="form-group">
                  <label>RUT</label>
                  <input type="text" value={empForm.rut} onChange={e => { setEmpForm({...empForm, rut: formatRut(e.target.value)}); if (rutError) setRutError(''); }} className={rutError ? 'error' : ''} placeholder="Ej: 12.345.678-9" required />
                  {rutError && <span style={{ color: '#f87171', fontSize: '0.7rem', marginTop: '4px' }}>{rutError}</span>}
                </div>
                <div className="form-group"><label>Nombres</label><input type="text" value={empForm.first_name} onChange={e => setEmpForm({...empForm, first_name: e.target.value})} required /></div>
                <div className="form-group"><label>Apellidos</label><input type="text" value={empForm.last_name} onChange={e => setEmpForm({...empForm, last_name: e.target.value})} required /></div>
              </div>
              <div className="form-grid">
                <div className="form-group"><label>Cargo</label><input type="text" value={empForm.position} onChange={e => setEmpForm({...empForm, position: e.target.value})} required /></div>
                <div className="form-group"><label>Sueldo Base Bruto ($)</label><input type="number" min="0" step="any" value={empForm.base_salary} onChange={e => setEmpForm({...empForm, base_salary: e.target.value})} required /></div>
                <div className="form-group">
                  <label>Tipo de Contrato</label>
                  <select value={empForm.contract_type} onChange={e => setEmpForm({...empForm, contract_type: e.target.value})}>
                    <option value="Indefinido">Indefinido</option><option value="Plazo Fijo">Plazo Fijo</option><option value="Honorarios">Honorarios (Boleta)</option>
                  </select>
                </div>
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label>AFP</label>
                  <select value={empForm.afp_code} onChange={e => setEmpForm({...empForm, afp_code: e.target.value})}>
                    <option value="Habitat">Habitat</option><option value="Cuprum">Cuprum</option><option value="Modelo">Modelo</option><option value="Capital">Capital</option><option value="Provida">Provida</option><option value="PlanVital">PlanVital</option><option value="Uno">Uno</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Sistema de Salud</label>
                  <select value={empForm.health_system} onChange={e => setEmpForm({...empForm, health_system: e.target.value})}>
                    <option value="Fonasa">Fonasa</option><option value="Isapre">Isapre</option>
                  </select>
                </div>
                {empForm.health_system === 'Isapre' && (
                  <div className="form-group"><label>Plan Isapre ($)</label><input type="number" min="0" step="any" value={empForm.health_plan_value} onChange={e => setEmpForm({...empForm, health_plan_value: e.target.value})} required /></div>
                )}
              </div>

              {estimatedGross > 0 && (
                <div style={{ marginTop: '15px', padding: '15px', backgroundColor: 'rgba(72, 202, 228, 0.05)', border: '1px solid rgba(72, 202, 228, 0.2)', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Sueldo Líquido Estimado:</span>
                    <strong style={{ fontSize: '1.2rem', color: '#4ade80' }}>{formatMoney(estimatedNet)}</strong>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.7rem', color: '#64748b', fontStyle: 'italic', lineHeight: '1.4' }}>
                    <strong>IMPORTANTE:</strong> El sueldo líquido mostrado es una estimación basada en los descuentos legales mínimos (AFP, Salud 7% y Cesantía). El monto final puede variar según el plan de Isapre contratado, cotizaciones adicionales o bonos imponibles.
                  </p>
                </div>
              )}

              <button type="submit" className="btn-submit" style={{ marginTop: '20px' }}>Guardar Ficha</button>
            </form>
          </div>
        </div>
      )}

      {isPayrollModalOpen && selectedEmp && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2>Generar Liquidación</h2>
              <button className="btn-close" onClick={() => setIsPayrollModalOpen(false)}><IconX /></button>
            </div>
            <p style={{ color: '#94a3b8', marginBottom: '20px' }}>Trabajador: <strong style={{ color: '#fff' }}>{selectedEmp.first_name} {selectedEmp.last_name}</strong></p>
            
            <form onSubmit={handleGeneratePayroll}>
              <div className="form-grid">
                <div className="form-group">
                  <label>Periodo a Liquidar (Mes/Año)</label>
                  <input type="month" value={payrollForm.period} onChange={e => setPayrollForm({...payrollForm, period: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label>Sueldo Base Bruto ($)</label>
                  <input type="number" min="0" step="any" value={payrollForm.gross_salary} onChange={e => setPayrollForm({...payrollForm, gross_salary: e.target.value})} required />
                </div>
              </div>
              <div className="form-grid">
                <div className="form-group"><label>Bonos Imponibles ($)</label><input type="number" min="0" step="any" value={payrollForm.bonuses} onChange={e => setPayrollForm({...payrollForm, bonuses: e.target.value})} placeholder="Ej: 50000" /></div>
                <div className="form-group"><label>Horas Extras ($)</label><input type="number" min="0" step="any" value={payrollForm.overtime} onChange={e => setPayrollForm({...payrollForm, overtime: e.target.value})} placeholder="Ej: 30000" /></div>
              </div>
              <button type="submit" className="btn-submit">Calcular y Emitir Liquidación</button>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}

export default App