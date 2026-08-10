import { describe, it, expect } from 'vitest'
import { calcularSeccionEscurrimiento, calcularDiametroInteriorMinimo } from './index'

describe('calcularSeccionEscurrimiento — CRIT-A10', () => {
  it('caso simple conocido: Qc=1 l/s, Ve=2 m/s -> Ae=5 cm2', () => {
    expect(calcularSeccionEscurrimiento(1, 2)).toBe(5)
  })

  it('lanza excepción si Qc_lps <= 0', () => {
    expect(() => calcularSeccionEscurrimiento(0, 2)).toThrow()
    expect(() => calcularSeccionEscurrimiento(-1, 2)).toThrow()
  })

  it('lanza excepción si Ve_mps <= 0', () => {
    expect(() => calcularSeccionEscurrimiento(1, 0)).toThrow()
    expect(() => calcularSeccionEscurrimiento(1, -2)).toThrow()
  })
})

describe('calcularDiametroInteriorMinimo — geometría circular', () => {
  it('caso simple conocido: Ae=pi cm2 -> Di=20 mm (D=2cm de sqrt(4*pi/pi))', () => {
    expect(calcularDiametroInteriorMinimo(Math.PI)).toBeCloseTo(20, 9)
  })

  it('lanza excepción si Ae_cm2 <= 0', () => {
    expect(() => calcularDiametroInteriorMinimo(0)).toThrow()
    expect(() => calcularDiametroInteriorMinimo(-1)).toThrow()
  })
})

describe('caso combinado: Qc y Ve -> Ae -> Di', () => {
  it('Qc=1.5 l/s, Ve=1.5 m/s -> Ae=10 cm2 -> Di≈35.68248232 mm', () => {
    const ae = calcularSeccionEscurrimiento(1.5, 1.5)
    expect(ae).toBe(10)

    const di = calcularDiametroInteriorMinimo(ae)
    expect(di).toBeCloseTo(35.682482323055424, 9)
  })
})

describe('caso representativo del proyecto (t-general M2): Qc=0.7273238618387272 l/s, Ve=2.0 m/s (CRIT-A16)', () => {
  it('produce Ae≈3.636619309 cm2 y Di≈21.518102876 mm', () => {
    const qc_lps = 0.7273238618387272
    const ve_mps = 2.0

    // Valores derivados matemáticamente de la fórmula CRIT-A10
    // (Ae = 10*Qc/Ve) y de la geometría circular (D = sqrt(4*A/pi)*10),
    // no copiados: Ae = 10*0.7273238618387272/2.0 = 3.636619309193636;
    // Di = sqrt(4*3.636619309193636/pi)*10 = 21.518102875515787.
    const ae = calcularSeccionEscurrimiento(qc_lps, ve_mps)
    expect(ae).toBeCloseTo(3.636619309193636, 9)

    const di = calcularDiametroInteriorMinimo(ae)
    expect(di).toBeCloseTo(21.518102875515787, 9)
  })
})
