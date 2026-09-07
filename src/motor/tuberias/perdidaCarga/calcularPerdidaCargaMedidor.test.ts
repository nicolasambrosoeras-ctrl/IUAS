import { describe, it, expect } from 'vitest'
import { calcularPerdidaCargaMedidor } from './calcularPerdidaCargaMedidor'

describe('calcularPerdidaCargaMedidor (ERAS-2023 §2.12, formula 6)', () => {
  // Verificación ARITMÉTICA de la fórmula (6) con los valores numéricos del
  // ejemplo de "vivienda tipo" de §2.12 (Qcl=42,1 l/min, C=7 m3/h -> 1,3
  // m.c.a.). NO es una propiedad normativa del medidor DN19: el ejemplo
  // oficial empareja DN19 con C=7, pero Tabla N°6 asigna C=5 a DN19 (C=7
  // corresponde a DN25) -- inconsistencia oficial documentada en CRIT-A32.
  // El emparejamiento DN -> C correcto se testea en tabla-06-medidores y en
  // seleccionarMedidorGeneral; acá sólo se comprueba que la fórmula, dados
  // Qcl y C, produce el número del ejemplo.
  it('fórmula (6): Qcl=42,1 l/min y C=7 m3/h -> Jm=1,3 m.c.a. (aritmética del ejemplo oficial de §2.12)', () => {
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
