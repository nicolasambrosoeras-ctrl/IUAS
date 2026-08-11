import { describe, it, expect } from 'vitest'
import { calcularDiferenciaDeCota } from './calcularDiferenciaDeCota'

describe('calcularDiferenciaDeCota', () => {
  it('0 -> 3: asciende, Δz=3', () => {
    expect(calcularDiferenciaDeCota(0, 3)).toBe(3)
  })

  it('3 -> 0: desciende, Δz=-3', () => {
    expect(calcularDiferenciaDeCota(3, 0)).toBe(-3)
  })

  it('5 -> 5: mismo nivel, Δz=0', () => {
    expect(calcularDiferenciaDeCota(5, 5)).toBe(0)
  })

  it('2.5 -> 7.25: Δz=4.75', () => {
    expect(calcularDiferenciaDeCota(2.5, 7.25)).toBe(4.75)
  })

  it('-2 -> 3: Δz=5', () => {
    expect(calcularDiferenciaDeCota(-2, 3)).toBe(5)
  })
})
