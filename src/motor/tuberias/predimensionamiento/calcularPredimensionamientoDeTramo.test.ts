import { describe, it, expect } from 'vitest'
import { calcularSeccionEscurrimiento, calcularDiametroInteriorMinimo } from '../../../normativa/eras-2023/seccion-escurrimiento'
import { calcularPredimensionamientoDeTramo, VE_PREDIMENSIONAMIENTO_MPS } from './calcularPredimensionamientoDeTramo'

describe('calcularPredimensionamientoDeTramo', () => {
  it('usa Ve = 2.0 m/s (CRIT-A16)', () => {
    expect(VE_PREDIMENSIONAMIENTO_MPS).toBe(2.0)
    expect(calcularPredimensionamientoDeTramo(1).ve_mps).toBe(2.0)
  })

  it('ae_cm2 coincide con calcularSeccionEscurrimiento(qc_lps, 2.0)', () => {
    const qc_lps = 0.9
    const resultado = calcularPredimensionamientoDeTramo(qc_lps)

    expect(resultado.ae_cm2).toBe(calcularSeccionEscurrimiento(qc_lps, VE_PREDIMENSIONAMIENTO_MPS))
  })

  it('diReferenciaPredimensionamiento_mm coincide con calcularDiametroInteriorMinimo(ae_cm2)', () => {
    const qc_lps = 0.9
    const resultado = calcularPredimensionamientoDeTramo(qc_lps)

    expect(resultado.diReferenciaPredimensionamiento_mm).toBe(calcularDiametroInteriorMinimo(resultado.ae_cm2))
  })

  it('caso representativo del proyecto (t-general M2): Qc=0.7273238618387272 l/s', () => {
    const resultado = calcularPredimensionamientoDeTramo(0.7273238618387272)

    // Valores derivados matemáticamente por las primitivas normativas
    // reales, no copiados: Ae = 10*0.7273238618387272/2.0 =
    // 3.636619309193636; Di = sqrt(4*3.636619309193636/pi)*10 =
    // 21.518102875515787 (ya verificados en seccion-escurrimiento/index.test.ts).
    expect(resultado.ae_cm2).toBeCloseTo(3.636619309193636, 9)
    expect(resultado.diReferenciaPredimensionamiento_mm).toBeCloseTo(21.518102875515787, 9)
  })

  it('propaga la excepción de la primitiva normativa para qc_lps <= 0 (sin inventar valores sintéticos)', () => {
    expect(() => calcularPredimensionamientoDeTramo(0)).toThrow()
    expect(() => calcularPredimensionamientoDeTramo(-1)).toThrow()
  })
})
