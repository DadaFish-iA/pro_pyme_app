// Reglas de cálculo de remuneraciones (deben coincidir con backend/main.py)

export const AFP_RATES = {
  Habitat: 0.1127, Cuprum: 0.1144, Modelo: 0.1058, Capital: 0.1144,
  Provida: 0.1145, PlanVital: 0.1116, Uno: 0.1069,
}

export const HONORARIOS_RETENTION = 0.1525
export const HONORARIOS_MINIMO = 220417

/**
 * Calcula el desglose de una liquidación en el cliente, para la vista previa.
 * La fuente de verdad sigue siendo el backend al emitir la liquidación.
 */
export function calcularLiquidacion({ base, bonos = 0, extras = 0, afpCode, healthSystem, healthPlanValue = 0, contractType }) {
  const bruto = (base || 0) + (bonos || 0) + (extras || 0)
  const haberes = [
    { label: 'Sueldo base', monto: base || 0 },
    { label: 'Bonos imponibles', monto: bonos || 0 },
    { label: 'Horas extras', monto: extras || 0 },
  ].filter((h) => h.monto > 0)

  if (contractType === 'Honorarios') {
    const retencion = bruto < HONORARIOS_MINIMO ? 0 : bruto * HONORARIOS_RETENTION
    return {
      bruto,
      haberes,
      afpRate: 0,
      afp: 0,
      salud: 0,
      cesantia: 0,
      retencion,
      descuentos: retencion > 0 ? [{ label: 'Retención honorarios (15,25%)', monto: retencion }] : [],
      totalDescuentos: retencion,
      liquido: bruto - retencion,
    }
  }

  const afpRate = AFP_RATES[afpCode] || 0.1144
  const afp = bruto * afpRate
  const salud = healthSystem === 'Fonasa'
    ? bruto * 0.07
    : Math.max(bruto * 0.07, healthPlanValue || 0)
  const cesantia = contractType === 'Indefinido' ? bruto * 0.006 : 0

  const descuentos = [
    { label: `AFP ${afpCode} (${(afpRate * 100).toFixed(2)}%)`, monto: afp },
    { label: `Salud ${healthSystem === 'Fonasa' ? 'Fonasa (7%)' : 'Isapre'}`, monto: salud },
  ]
  if (cesantia > 0) descuentos.push({ label: 'Seguro de cesantía (0,6%)', monto: cesantia })

  return {
    bruto,
    haberes,
    afpRate,
    afp,
    salud,
    cesantia,
    retencion: 0,
    descuentos,
    totalDescuentos: afp + salud + cesantia,
    liquido: bruto - afp - salud - cesantia,
  }
}
