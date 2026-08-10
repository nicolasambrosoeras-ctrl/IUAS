import { describe, it, expect } from 'vitest'
import { calcularFactorFriccionDarcy, UMBRAL_REYNOLDS_TURBULENTO } from './calcularFactorFriccionDarcy'

describe('calcularFactorFriccionDarcy — Haaland (CRIT-A18)', () => {
  it('caso A — turbulento hidráulicamente liso: Re≈50929.58, epsilon=0, D=25mm -> f≈0.0206278936', () => {
    const f = calcularFactorFriccionDarcy(50929.58178940652, 0, 25)
    expect(f).toBeCloseTo(0.02062789364669543, 9)
  })

  it('epsilon=0 es válido explícitamente (caso hidráulicamente liso)', () => {
    expect(() => calcularFactorFriccionDarcy(50929.58178940652, 0, 25)).not.toThrow()
  })

  it('caso B — rugosidad apreciable: Re≈50929.58, epsilon=0.1mm, D=25mm -> f≈0.0303280590', () => {
    const f = calcularFactorFriccionDarcy(50929.58178940652, 0.1, 25)
    expect(f).toBeCloseTo(0.030328058965982133, 9)
  })

  it('caso C — representativo: Re≈37042.30, epsilon=0.0015mm (ilustrativo de laboratorio, sin material asociado), D=25mm -> f≈0.0223182464', () => {
    const f = calcularFactorFriccionDarcy(37042.30010890246, 0.0015, 25)
    expect(f).toBeCloseTo(0.02231824636614258, 9)
  })

  it('umbral: Re=4000 exacto es válido (límite operativo, no zona de transición)', () => {
    expect(UMBRAL_REYNOLDS_TURBULENTO).toBe(4000)
    const f = calcularFactorFriccionDarcy(4000, 0, 25)
    expect(f).toBeCloseTo(0.04042284932911365, 9)
  })

  it('umbral: Re apenas por debajo de 4000 lanza excepción de fuera de alcance', () => {
    expect(() => calcularFactorFriccionDarcy(3999.999999, 0, 25)).toThrow(/fuera de alcance/)
  })

  it('lanza excepción si numeroReynolds < 4000 (régimen laminar/transicional, fuera de alcance)', () => {
    expect(() => calcularFactorFriccionDarcy(2000, 0, 25)).toThrow(/fuera de alcance/)
  })

  it('lanza excepción si rugosidadAbsoluta_mm < 0', () => {
    expect(() => calcularFactorFriccionDarcy(50929.58178940652, -0.1, 25)).toThrow()
  })

  it('lanza excepción si diametroInterior_mm <= 0', () => {
    expect(() => calcularFactorFriccionDarcy(50929.58178940652, 0, 0)).toThrow()
    expect(() => calcularFactorFriccionDarcy(50929.58178940652, 0, -25)).toThrow()
  })
})
