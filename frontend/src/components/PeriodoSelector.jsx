import { MESES, ANIOS } from '../lib/format'

export default function PeriodoSelector({ mes, anio, onChange }) {
  return (
    <div className="date-filter-container">
      <div className="date-filter">
        <label>Periodo:</label>
        <select value={mes} onChange={(e) => onChange(e.target.value, anio)}>
          {MESES.map((nombre, i) => (
            <option key={nombre} value={(i + 1).toString().padStart(2, '0')}>{nombre}</option>
          ))}
        </select>
        <select value={anio} onChange={(e) => onChange(mes, e.target.value)}>
          {ANIOS.map((a) => <option key={a} value={a.toString()}>{a}</option>)}
        </select>
      </div>
    </div>
  )
}
