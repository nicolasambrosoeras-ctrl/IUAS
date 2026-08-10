import { describe, it, expect } from 'vitest'
import {
  calcularPerdidaCargaUnitariaHazenWilliams,
  calcularPerdidaCargaHazenWilliams,
} from './calcularPerdidaCargaHazenWilliams'

describe('calcularPerdidaCargaUnitariaHazenWilliams — CRIT-A17', () => {
  it('1. caso base: Qc=1 l/s, D=25mm, C=100 -> J≈0.3717034373 m/m', () => {
    // J = 10.67 * (0.001)^1.852 / (100^1.852 * 0.025^4.87), derivado
    // independientemente con la fórmula adoptada: 0.37170343727543875
    const J = calcularPerdidaCargaUnitariaHazenWilliams(1, 100, 25)
    expect(J).toBeCloseTo(0.37170343727543875, 9)
  })

  it('2. sensibilidad al diámetro: mismo Qc y C, D=25mm vs D=50mm; razón ≈ 2^4.87', () => {
    const J25 = calcularPerdidaCargaUnitariaHazenWilliams(1, 100, 25)
    const J50 = calcularPerdidaCargaUnitariaHazenWilliams(1, 100, 50)

    expect(J25).toBeCloseTo(0.37170343727543875, 9)
    expect(J50).toBeCloseTo(0.012711022817108718, 9)
    expect(J25 / J50).toBeCloseTo(Math.pow(2, 4.87), 9)
  })

  it('3. sensibilidad a C: mismo Qc y D, C=100 vs C=150; razón ≈ 1.5^1.852', () => {
    const J100 = calcularPerdidaCargaUnitariaHazenWilliams(1, 100, 25)
    const J150 = calcularPerdidaCargaUnitariaHazenWilliams(1, 150, 25)

    expect(J100).toBeCloseTo(0.37170343727543875, 9)
    expect(J150).toBeCloseTo(0.17541856962523106, 9)
    expect(J100 / J150).toBeCloseTo(Math.pow(1.5, 1.852), 9)
  })

  it('4. caso representativo de laboratorio: Qc=0.7273238618387272 l/s, D=25mm (arbitrario, no Di mínimo), C=100', () => {
    // Derivado independientemente: 0.20611828937787163
    const J = calcularPerdidaCargaUnitariaHazenWilliams(0.7273238618387272, 100, 25)
    expect(J).toBeCloseTo(0.20611828937787163, 9)
  })

  it('6a. lanza excepción si qc_lps <= 0', () => {
    expect(() => calcularPerdidaCargaUnitariaHazenWilliams(0, 100, 25)).toThrow()
    expect(() => calcularPerdidaCargaUnitariaHazenWilliams(-1, 100, 25)).toThrow()
  })

  it('6b. lanza excepción si coeficienteC <= 0', () => {
    expect(() => calcularPerdidaCargaUnitariaHazenWilliams(1, 0, 25)).toThrow()
    expect(() => calcularPerdidaCargaUnitariaHazenWilliams(1, -100, 25)).toThrow()
  })

  it('6c. lanza excepción si diametroInterior_mm <= 0', () => {
    expect(() => calcularPerdidaCargaUnitariaHazenWilliams(1, 100, 0)).toThrow()
    expect(() => calcularPerdidaCargaUnitariaHazenWilliams(1, 100, -25)).toThrow()
  })
})

describe('calcularPerdidaCargaHazenWilliams — hf = J * L', () => {
  it('5. pérdida total: caso base (J≈0.3717034373) con L=10m -> hf≈3.7170343728 m', () => {
    const J = calcularPerdidaCargaUnitariaHazenWilliams(1, 100, 25)
    const hf = calcularPerdidaCargaHazenWilliams(J, 10)
    expect(hf).toBeCloseTo(3.7170343727543873, 9)
  })

  it('caso representativo de laboratorio con L=10m -> hf≈2.0611828938 m', () => {
    const J = calcularPerdidaCargaUnitariaHazenWilliams(0.7273238618387272, 100, 25)
    const hf = calcularPerdidaCargaHazenWilliams(J, 10)
    expect(hf).toBeCloseTo(2.0611828937787164, 9)
  })

  it('6d. lanza excepción si J_m_m <= 0', () => {
    expect(() => calcularPerdidaCargaHazenWilliams(0, 10)).toThrow()
    expect(() => calcularPerdidaCargaHazenWilliams(-0.1, 10)).toThrow()
  })

  it('6e. lanza excepción si longitud_m <= 0', () => {
    expect(() => calcularPerdidaCargaHazenWilliams(0.1, 0)).toThrow()
    expect(() => calcularPerdidaCargaHazenWilliams(0.1, -10)).toThrow()
  })
})
