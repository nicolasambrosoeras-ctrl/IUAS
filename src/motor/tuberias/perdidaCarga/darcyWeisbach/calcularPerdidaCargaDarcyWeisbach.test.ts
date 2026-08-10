import { describe, it, expect } from 'vitest'
import { calcularPerdidaCargaDarcyWeisbach } from './calcularPerdidaCargaDarcyWeisbach'

describe('calcularPerdidaCargaDarcyWeisbach — hf = f*(L/D)*(V²/(2g)) (CRIT-A18)', () => {
  it('caso A: f≈0.0206278936, L=10m, D=25mm, V≈2.0371832716 -> hf≈1.7453240552 m', () => {
    const hf = calcularPerdidaCargaDarcyWeisbach(0.02062789364669543, 10, 25, 2.0371832715762603)
    expect(hf).toBeCloseTo(1.7453240552410967, 9)
  })

  it('caso B: f≈0.0303280590, L=10m, D=25mm, V≈2.0371832716 -> hf≈2.5660540901 m', () => {
    const hf = calcularPerdidaCargaDarcyWeisbach(0.030328058965982133, 10, 25, 2.0371832715762603)
    expect(hf).toBeCloseTo(2.566054090092652, 9)
  })

  it('caso C: f≈0.0223182464, L=10m, D=25mm, V≈1.4816920044 -> hf≈0.9989343107 m', () => {
    const hf = calcularPerdidaCargaDarcyWeisbach(0.02231824636614258, 10, 25, 1.4816920043560982)
    expect(hf).toBeCloseTo(0.9989343107491304, 9)
  })

  it('lanza excepción si factorFriccion <= 0', () => {
    expect(() => calcularPerdidaCargaDarcyWeisbach(0, 10, 25, 2)).toThrow()
    expect(() => calcularPerdidaCargaDarcyWeisbach(-0.02, 10, 25, 2)).toThrow()
  })

  it('lanza excepción si longitud_m <= 0', () => {
    expect(() => calcularPerdidaCargaDarcyWeisbach(0.02, 0, 25, 2)).toThrow()
    expect(() => calcularPerdidaCargaDarcyWeisbach(0.02, -10, 25, 2)).toThrow()
  })

  it('lanza excepción si diametroInterior_mm <= 0', () => {
    expect(() => calcularPerdidaCargaDarcyWeisbach(0.02, 10, 0, 2)).toThrow()
    expect(() => calcularPerdidaCargaDarcyWeisbach(0.02, 10, -25, 2)).toThrow()
  })

  it('lanza excepción si velocidad_mps <= 0', () => {
    expect(() => calcularPerdidaCargaDarcyWeisbach(0.02, 10, 25, 0)).toThrow()
    expect(() => calcularPerdidaCargaDarcyWeisbach(0.02, 10, 25, -2)).toThrow()
  })
})
