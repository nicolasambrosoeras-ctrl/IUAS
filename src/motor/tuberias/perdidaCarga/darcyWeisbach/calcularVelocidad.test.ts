import { describe, it, expect } from 'vitest'
import { calcularVelocidad } from './calcularVelocidad'

describe('calcularVelocidad — CRIT-A18', () => {
  it('Qc=1 l/s, D=25mm -> V≈2.0371832716 m/s', () => {
    // Q_m3s=0.001, D_m=0.025, A=pi*0.025^2/4=4.9087385212e-4, V=Q/A
    expect(calcularVelocidad(1, 25)).toBeCloseTo(2.0371832715762603, 9)
  })

  it('caso representativo: Qc=0.7273238618387272 l/s, D=25mm -> V≈1.4816920044 m/s', () => {
    expect(calcularVelocidad(0.7273238618387272, 25)).toBeCloseTo(1.4816920043560982, 9)
  })

  it('lanza excepción si qc_lps <= 0', () => {
    expect(() => calcularVelocidad(0, 25)).toThrow()
    expect(() => calcularVelocidad(-1, 25)).toThrow()
  })

  it('lanza excepción si diametroInterior_mm <= 0', () => {
    expect(() => calcularVelocidad(1, 0)).toThrow()
    expect(() => calcularVelocidad(1, -25)).toThrow()
  })
})
