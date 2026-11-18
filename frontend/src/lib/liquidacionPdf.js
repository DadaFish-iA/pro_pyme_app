import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { periodoLabel, formatRut } from './format'

const clp = (val) => '$ ' + new Intl.NumberFormat('es-CL').format(Math.round(val || 0))

const SLATE = [30, 41, 59]
const GRIS = [241, 245, 249]
const LINEA = [203, 213, 225]

const fmtFecha = (d) => (d ? new Date(d) : new Date())
  .toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })

// Compatibilidad entre versiones del plugin: dónde terminó la última tabla
const finalY = (doc, fallback) =>
  doc.lastAutoTable?.finalY ?? doc.previousAutoTable?.finalY ?? fallback

/**
 * Genera una "Liquidación de Remuneraciones" formal en PDF: datos del emisor,
 * identificación del trabajador, haberes, descuentos, líquido y firmas.
 */
export function generarLiquidacionPDF(payroll, company, employee) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const M = 14
  const ANCHO = 210 - M * 2
  const empresa = company || {}
  const razonSocial = empresa.name?.trim() || 'EMPRESA NO CONFIGURADA'
  const esHonorarios = (employee?.contract_type || payroll.contract_type) === 'Honorarios'

  // ---------- Encabezado ----------
  doc.setFillColor(...SLATE)
  doc.rect(M, 12, ANCHO, 24, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text(razonSocial, M + 4, 20)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  const lineasEmpresa = [
    [empresa.rut ? `RUT: ${empresa.rut}` : '', empresa.activity ? `Giro: ${empresa.activity}` : '']
      .filter(Boolean).join('   |   '),
    [empresa.address, empresa.city].filter(Boolean).join(', '),
  ].filter(Boolean)
  lineasEmpresa.forEach((linea, i) => doc.text(linea, M + 4, 25 + i * 4))

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('LIQUIDACIÓN DE REMUNERACIONES', 210 - M - 4, 19, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.text(`N° ${String(payroll.id).padStart(6, '0')}`, 210 - M - 4, 24, { align: 'right' })
  doc.text(`Periodo: ${periodoLabel(payroll.period)}`, 210 - M - 4, 28.5, { align: 'right' })
  doc.text(`Emisión: ${fmtFecha(payroll.date)}`, 210 - M - 4, 33, { align: 'right' })

  doc.setTextColor(0, 0, 0)

  // ---------- Identificación del trabajador ----------
  autoTable(doc, {
    startY: 42,
    margin: { left: M, right: M },
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2, lineColor: LINEA, lineWidth: 0.1, textColor: [30, 41, 59] },
    body: [
      ['Trabajador', payroll.employee_name || '', 'RUT', formatRut(payroll.rut || '')],
      ['Cargo', payroll.position || employee?.position || '', 'Contrato',
        payroll.contract_type || employee?.contract_type || ''],
      ['AFP', esHonorarios ? 'No aplica' : (payroll.afp_code || ''),
        'Salud', esHonorarios ? 'No aplica' : (payroll.health_system || '')],
    ],
    columnStyles: {
      0: { fontStyle: 'bold', fillColor: GRIS, cellWidth: 24 },
      1: { cellWidth: 63 },
      2: { fontStyle: 'bold', fillColor: GRIS, cellWidth: 24 },
      3: { cellWidth: 57 },
    },
  })

  const yTabla = finalY(doc, 42) + 6

  // ---------- Haberes (valores numéricos) ----------
  const base = payroll.base_salary || 0
  const bonos = payroll.bonuses || 0
  const extras = payroll.overtime || 0
  let haberes
  if (base === 0 && bonos === 0 && extras === 0 && payroll.gross_salary) {
    haberes = [{ label: 'Sueldo bruto', monto: payroll.gross_salary }]
  } else {
    haberes = [
      { label: 'Sueldo base', monto: base },
      { label: 'Bonos imponibles', monto: bonos },
      { label: 'Horas extras', monto: extras },
    ].filter((h) => h.monto > 0)
  }
  const totalHaberes = haberes.reduce((acc, h) => acc + h.monto, 0)

  // ---------- Descuentos ----------
  const descuentos = []
  if (esHonorarios) {
    descuentos.push({ label: 'Retención honorarios (15,25%)', monto: payroll.retention_amount || 0 })
  } else {
    const tasa = payroll.afp_rate ? ` (${(payroll.afp_rate * 100).toFixed(2)}%)` : ''
    descuentos.push({ label: `AFP ${payroll.afp_code || ''}${tasa}`.trim(), monto: payroll.afp_amount || 0 })
    descuentos.push({
      label: `Salud ${payroll.health_system === 'Isapre' ? 'Isapre' : 'Fonasa (7%)'}`,
      monto: payroll.health_amount || 0,
    })
    if ((payroll.unemployment_amount || 0) > 0) {
      descuentos.push({ label: 'Seguro de cesantía (0,6%)', monto: payroll.unemployment_amount })
    }
  }
  const totalDescuentos = descuentos.reduce((acc, d) => acc + d.monto, 0)

  const estiloLado = {
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2, lineColor: LINEA, lineWidth: 0.1, textColor: [30, 41, 59] },
    headStyles: { fillColor: SLATE, textColor: 255, fontSize: 8, fontStyle: 'bold', halign: 'left' },
    columnStyles: { 0: { cellWidth: 56 }, 1: { cellWidth: 32, halign: 'right' } },
  }

  autoTable(doc, {
    ...estiloLado,
    startY: yTabla,
    margin: { left: M, right: 108 },
    head: [['HABERES', 'MONTO']],
    body: haberes.map((h) => [h.label, clp(h.monto)]),
    foot: [['Total haberes', clp(totalHaberes)]],
    footStyles: { fillColor: GRIS, textColor: [30, 41, 59], fontStyle: 'bold' },
  })
  const yIzquierda = finalY(doc, yTabla)

  autoTable(doc, {
    ...estiloLado,
    startY: yTabla,
    margin: { left: 108, right: M },
    head: [['DESCUENTOS', 'MONTO']],
    body: descuentos.map((d) => [d.label, clp(d.monto)]),
    foot: [['Total descuentos', clp(totalDescuentos)]],
    footStyles: { fillColor: GRIS, textColor: [30, 41, 59], fontStyle: 'bold' },
  })
  const yDerecha = finalY(doc, yTabla)

  const yFin = Math.max(yIzquierda, yDerecha) + 6

  // ---------- Líquido a pagar ----------
  doc.setFillColor(...SLATE)
  doc.rect(M, yFin, ANCHO, 14, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.text('LÍQUIDO A PAGAR', M + 4, yFin + 9)
  doc.setFontSize(13)
  doc.text(clp(payroll.net_salary), 210 - M - 4, yFin + 9.5, { align: 'right' })
  doc.setTextColor(0, 0, 0)

  // ---------- Nota legal ----------
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(100, 116, 139)
  const nota = esHonorarios
    ? 'El presente documento corresponde a una liquidación de honorarios. La retención de impuestos se aplica según la normativa vigente y no constituye cotización previsional.'
    : 'Los descuentos legales consideran AFP, cotización de salud y seguro de cesantía según la normativa vigente. El monto líquido es el resultado de haberes menos descuentos.'
  doc.text(doc.splitTextToSize(nota, ANCHO), M, yFin + 22)

  // ---------- Firmas ----------
  const yFirma = Math.min(250, yFin + 46)
  doc.setDrawColor(...LINEA)
  doc.line(M, yFirma, M + 70, yFirma)
  doc.line(210 - M - 70, yFirma, 210 - M, yFirma)
  doc.setTextColor(30, 41, 59)
  doc.setFontSize(7.5)
  doc.text(empresa.representative || razonSocial, M, yFirma + 4.5)
  doc.text('Empleador', M, yFirma + 8.5)
  doc.text(payroll.employee_name || '', 210 - M - 70, yFirma + 4.5)
  doc.text(`Recibí conforme — RUT ${formatRut(payroll.rut || '')}`, 210 - M - 70, yFirma + 8.5)

  // ---------- Pie ----------
  doc.setFontSize(6.5)
  doc.setTextColor(148, 163, 184)
  doc.text(`Documento generado el ${fmtFecha()} por Pro Pyme · ${razonSocial}`,
    105, 285, { align: 'center' })

  doc.save(`Liquidacion_${(payroll.rut || 'trabajador').replace(/[^\dkK]/g, '')}_${payroll.period}.pdf`)
}
