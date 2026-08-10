import { describe, it, expect } from 'vitest'
import { calcularNumeroReynolds } from './calcularNumeroReynolds'

describe('calcularNumeroReynolds — CRIT-A18', () => {
  it('V≈2.0371832716 m/s, D=25mm, nu=1e-6 -> Re≈50929.58', () => {
    // Re = V*D_m/nu = 2.0371832715762603*0.025/1e-6
    expect(calcularNumeroReynolds(2.0371832715762603, 25, 1e-6)).toBeCloseTo(50929.58178940652, 5)
  })

  it('caso representativo: V≈1.4816920044 m/s, D=25mm, nu=1e-6 -> Re≈37042.30', () => {
    expect(calcularNumeroReynolds(1.4816920043560982, 25, 1e-6)).toBeCloseTo(37042.30010890246, 5)
  })

  it('lanza excepción si velocidad_mps <= 0', () => {
    expect(() => calcularNumeroReynolds(0, 25, 1e-6)).toThrow()
    expect(() => calcularNumeroReynolds(-1, 25, 1e-6)).toThrow()
  })

  it('lanza excepción si diametroInterior_mm <= 0', () => {
    expect(() => calcularNumeroReynolds(1, 0, 1e-6)).toThrow()
    expect(() => calcularNumeroReynolds(1, -25, 1e-6)).toThrow()
  })

  it('lanza excepción si viscosidadCinematica_m2s <= 0', () => {
    expect(() => calcularNumeroReynolds(1, 25, 0)).toThrow()
    expect(() => calcularNumeroReynolds(1, 25, -1e-6)).toThrow()
  })
})
