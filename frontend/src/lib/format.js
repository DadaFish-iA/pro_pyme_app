// Utilidades de formato compartidas (CLP, RUT, fechas)

export const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]

export const ANIOS = Array.from({ length: 16 }, (_, i) => 2020 + i)

export const formatMoney = (val) => {
  const n = Math.round(val || 0)
  const fmt = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(Math.abs(n))
  return n < 0 ? `-${fmt}` : fmt
}

export const formatNumber = (val) =>
  new Intl.NumberFormat('es-CL').format(Math.round(val || 0))

export const formatDate = (isoString) =>
  new Date(isoString).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })

export const formatDateLong = (isoString) =>
  new Date(isoString).toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' })

export const cleanRut = (rut) => (rut || '').replace(/[^0-9kK]/g, '').toUpperCase()

export const formatRut = (rut) => {
  const clean = cleanRut(rut)
  if (clean.length <= 1) return clean
  const dv = clean.slice(-1)
  const body = clean.slice(0, -1)
  let formattedBody = ''
  for (let i = body.length - 1, j = 0; i >= 0; i--, j++) {
    formattedBody = body[i] + formattedBody
    if (j === 2 && i !== 0) { formattedBody = '.' + formattedBody; j = -1 }
  }
  return `${formattedBody}-${dv}`
}

export const isValidRut = (rut) => {
  const clean = cleanRut(rut)
  if (clean.length < 2) return false
  const body = clean.slice(0, -1)
  const dv = clean.slice(-1)
  let sum = 0, multiplier = 2
  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i]) * multiplier
    multiplier = multiplier === 7 ? 2 : multiplier + 1
  }
  const mod = 11 - (sum % 11)
  const calculatedDv = mod === 11 ? '0' : mod === 10 ? 'K' : mod.toString()
  return calculatedDv === dv
}

export const formatNumberInput = (value) => {
  const cleanValue = (value || '').replace(/\D/g, '')
  return cleanValue.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

export const parseMoneyInput = (value) => {
  const clean = (value || '').toString().replace(/\./g, '').replace(',', '.')
  const num = parseFloat(clean)
  return Number.isFinite(num) ? num : 0
}

export const periodoLabel = (period) => {
  if (!period) return ''
  const [year, month] = period.split('-')
  return `${MESES[parseInt(month, 10) - 1]} ${year}`
}
