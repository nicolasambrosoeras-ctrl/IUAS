import { describe, it, expect } from 'vitest'
import { esLongitudGeometricamenteValida } from './esLongitudGeometricamenteValida'

describe('esLongitudGeometricamenteValida', () => {
  it('diagonal: L=5, Δz=3 -> true', () => {
    expect(esLongitudGeometricamenteValida(5, 3)).toBe(true)
  })

  it('vertical exacto: L=3, Δz=3 -> true', () => {
    expect(esLongitudGeometricamenteValida(3, 3)).toBe(true)
  })

  it('imposible: L=2.9, Δz=3 -> false', () => {
    expect(esLongitudGeometricamenteValida(2.9, 3)).toBe(false)
  })

  it('mismo nivel: L=5, Δz=0 -> true', () => {
    expect(esLongitudGeometricamenteValida(5, 0)).toBe(true)
  })

  it('descenso: L suficiente, Δz=-3 -> true', () => {
    expect(esLongitudGeometricamenteValida(3, -3)).toBe(true)
  })

  it('ruido floating-point: L=3, Δz=3.0000000000000004 -> true', () => {
    expect(esLongitudGeometricamenteValida(3, 3.0000000000000004)).toBe(true)
  })
})
