import { describe, it, expect } from 'vitest'
import { resolverPresionDeCalculoDeConexion } from './resolverPresionDeCalculoDeConexion'

describe('resolverPresionDeCalculoDeConexion (§2.7, CRIT-A37)', () => {
  it('P1: punto por encima de la acera resta el ascenso (10 − 3 = 7)', () => {
    expect(resolverPresionDeCalculoDeConexion({ presionSobreAcera_m: 10, desnivelConexion_m: 3 })).toBe(7)
  })

  it('P2: misma cota deja la presión intacta (10 − 0 = 10)', () => {
    expect(resolverPresionDeCalculoDeConexion({ presionSobreAcera_m: 10, desnivelConexion_m: 0 })).toBe(10)
  })

  it('P3: punto por debajo de la acera suma el descenso (10 − (−3) = 13)', () => {
    expect(resolverPresionDeCalculoDeConexion({ presionSobreAcera_m: 10, desnivelConexion_m: -3 })).toBe(13)
  })

  it('P4: no redondea (10,4 − 1,25 = 9,15)', () => {
    expect(
      resolverPresionDeCalculoDeConexion({ presionSobreAcera_m: 10.4, desnivelConexion_m: 1.25 }),
    ).toBeCloseTo(9.15, 12)
  })

  it('no aplica clamp ni conoce el rango [4, 35] de Tabla N°1: puede devolver 2', () => {
    expect(resolverPresionDeCalculoDeConexion({ presionSobreAcera_m: 2, desnivelConexion_m: 0 })).toBe(2)
    expect(resolverPresionDeCalculoDeConexion({ presionSobreAcera_m: 5, desnivelConexion_m: 40 })).toBe(-35)
  })

  it('P5: inputs no finitos -> throw', () => {
    expect(() =>
      resolverPresionDeCalculoDeConexion({ presionSobreAcera_m: Number.NaN, desnivelConexion_m: 0 }),
    ).toThrow(/presionSobreAcera_m debe ser un número finito/)
    expect(() =>
      resolverPresionDeCalculoDeConexion({ presionSobreAcera_m: 10, desnivelConexion_m: Number.POSITIVE_INFINITY }),
    ).toThrow(/desnivelConexion_m debe ser un número finito/)
  })
})
