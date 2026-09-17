import { describe, it, expect } from 'vitest'
import { clasificarSaltoDeReduccion } from './clasificarSaltoDeReduccion'

describe('clasificarSaltoDeReduccion', () => {
  it.each([
    ['25 mm', '20 mm', 'inmediata'],
    ['32 mm', '25 mm', 'inmediata'],
    ['32 mm', '20 mm', 'mediata'],
    ['50 mm', '40 mm', 'inmediata'],
    ['50 mm', '32 mm', 'mediata'],
  ] as const)('%s -> %s: %s', (dnA, dnB, esperado) => {
    expect(clasificarSaltoDeReduccion(dnA, dnB)).toBe(esperado)
  })

  it('el mismo DN de ambos lados: mismoDn (no existe reducción)', () => {
    expect(clasificarSaltoDeReduccion('25 mm', '25 mm')).toBe('mismoDn')
  })

  it('es simétrica: el orden de los argumentos no cambia la clasificación', () => {
    expect(clasificarSaltoDeReduccion('20 mm', '25 mm')).toBe(clasificarSaltoDeReduccion('25 mm', '20 mm'))
    expect(clasificarSaltoDeReduccion('20 mm', '32 mm')).toBe(clasificarSaltoDeReduccion('32 mm', '20 mm'))
  })

  it('DN fuera de la serie nominal comercial: pendiente, nunca una clasificación arbitraria', () => {
    expect(clasificarSaltoDeReduccion('17 mm', '20 mm')).toBe('pendiente')
    expect(clasificarSaltoDeReduccion('20 mm', '200 mm')).toBe('pendiente')
  })

  it('denominación no parseable: pendiente', () => {
    expect(clasificarSaltoDeReduccion('sin DN', '20 mm')).toBe('pendiente')
    expect(clasificarSaltoDeReduccion('20 mm', '')).toBe('pendiente')
  })
})
