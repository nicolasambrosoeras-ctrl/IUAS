// QA-FUZZ-01 · determinismo del PRNG (brief §35, §36).
import { describe, it, expect } from 'vitest'
import { crearPrng, normalizarSeed, seedDesdeTexto } from './prng'

describe('crearPrng', () => {
  it('misma seed produce la misma secuencia (§36)', () => {
    const a = crearPrng(12345)
    const b = crearPrng(12345)
    const sa = Array.from({ length: 200 }, () => a.siguiente())
    const sb = Array.from({ length: 200 }, () => b.siguiente())
    expect(sa).toEqual(sb)
  })

  it('seeds distintas producen secuencias distintas', () => {
    const a = crearPrng(1)
    const b = crearPrng(2)
    const sa = Array.from({ length: 50 }, () => a.siguiente())
    const sb = Array.from({ length: 50 }, () => b.siguiente())
    expect(sa).not.toEqual(sb)
  })

  it('seed textual es reproducible y estable', () => {
    const a = crearPrng('catalogo:banera')
    const b = crearPrng('catalogo:banera')
    expect(Array.from({ length: 20 }, () => a.enteroHasta(1000))).toEqual(
      Array.from({ length: 20 }, () => b.enteroHasta(1000)),
    )
  })

  it('devuelve flotantes en [0, 1)', () => {
    const p = crearPrng(99)
    for (let i = 0; i < 10000; i++) {
      const v = p.siguiente()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })

  it('enteroHasta respeta el rango y valida la entrada', () => {
    const p = crearPrng(7)
    for (let i = 0; i < 1000; i++) {
      const v = p.enteroHasta(5)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(5)
      expect(Number.isInteger(v)).toBe(true)
    }
    expect(() => p.enteroHasta(0)).toThrow()
    expect(() => p.enteroHasta(-3)).toThrow()
    expect(() => p.enteroHasta(2.5)).toThrow()
  })

  it('enteroEntre incluye ambos extremos', () => {
    const p = crearPrng(42)
    const vistos = new Set<number>()
    for (let i = 0; i < 2000; i++) vistos.add(p.enteroEntre(3, 6))
    expect([...vistos].sort()).toEqual([3, 4, 5, 6])
  })

  it('elegirIndicePorPeso nunca elige un peso 0 (salvo que todos sean 0)', () => {
    const p = crearPrng(123)
    const pesos = [0, 5, 0, 2, 0]
    for (let i = 0; i < 5000; i++) {
      const idx = p.elegirIndicePorPeso(pesos)
      expect([1, 3]).toContain(idx)
    }
    // Todos 0 -> uniforme sobre todos los índices.
    const q = crearPrng(1)
    const idxs = new Set<number>()
    for (let i = 0; i < 2000; i++) idxs.add(q.elegirIndicePorPeso([0, 0, 0]))
    expect([...idxs].sort()).toEqual([0, 1, 2])
  })

  it('elegirIndicePorPeso favorece los pesos altos', () => {
    const p = crearPrng(2024)
    const conteo = [0, 0, 0]
    for (let i = 0; i < 30000; i++) conteo[p.elegirIndicePorPeso([1, 10, 1])]!++
    expect(conteo[1]!).toBeGreaterThan(conteo[0]! * 3)
    expect(conteo[1]!).toBeGreaterThan(conteo[2]! * 3)
  })

  it('barajar es determinista y no muta el original', () => {
    const original = [1, 2, 3, 4, 5, 6, 7, 8]
    const a = crearPrng(5).barajar(original)
    const b = crearPrng(5).barajar(original)
    expect(a).toEqual(b)
    expect(original).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
    expect([...a].sort((x, y) => x - y)).toEqual(original)
  })
})

describe('normalizarSeed', () => {
  it('acepta número, string numérico y texto', () => {
    expect(normalizarSeed(7)).toBe(7)
    expect(normalizarSeed('7')).toBe(7)
    expect(normalizarSeed('abc')).toBe(seedDesdeTexto('abc'))
  })
  it('undefined / vacío cae a una seed fija no nula', () => {
    expect(normalizarSeed(undefined)).toBe(0x9e3779b9)
    expect(normalizarSeed('')).toBe(0x9e3779b9)
    expect(normalizarSeed('   ')).toBe(0x9e3779b9)
  })
})
