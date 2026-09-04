import { describe, it, expect } from 'vitest'
import { calcularPerdidaCargaMedidor } from './calcularPerdidaCargaMedidor'

describe('calcularPerdidaCargaMedidor (ERAS-2023 §2.12, formula 6)', () => {
  it('Golden -- ejemplo oficial de la guia: Qc=0,71 l/s (42,1 l/min), medidor 19mm C=7 m3/h -> Jm=1,3 m.c.a.', () => {
    expect(calcularPerdidaCargaMedidor(42.1, 7)).toBeCloseTo(1.3, 2)
  })

  it('caudal mayor con misma capacidad de medidor produce mayor perdida', () => {
    const jmBajo = calcularPerdidaCargaMedidor(20, 7)
    const jmAlto = calcularPerdidaCargaMedidor(40, 7)
    expect(jmAlto).toBeGreaterThan(jmBajo)
  })

  it('medidor de mayor capacidad reduce la perdida para el mismo caudal', () => {
    const jmMedidorChico = calcularPerdidaCargaMedidor(42.1, 7)
    const jmMedidorGrande = calcularPerdidaCargaMedidor(42.1, 10)
    expect(jmMedidorGrande).toBeLessThan(jmMedidorChico)
  })

  it('caudalMaximoProbable_lpm <= 0: throw', () => {
    expect(() => calcularPerdidaCargaMedidor(0, 7)).toThrow(/caudalMaximoProbable_lpm debe ser mayor a 0/)
    expect(() => calcularPerdidaCargaMedidor(-1, 7)).toThrow(/caudalMaximoProbable_lpm debe ser mayor a 0/)
  })

  it('capacidadMaximaMedidor_m3h <= 0: throw', () => {
    expect(() => calcularPerdidaCargaMedidor(42.1, 0)).toThrow(/capacidadMaximaMedidor_m3h debe ser mayor a 0/)
    expect(() => calcularPerdidaCargaMedidor(42.1, -1)).toThrow(/capacidadMaximaMedidor_m3h debe ser mayor a 0/)
  })
})
