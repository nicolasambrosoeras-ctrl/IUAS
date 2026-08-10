import { describe, it, expect } from 'vitest'
import { formatearNumero } from './formatearNumero'

describe('formatearNumero — unidad "mm" (Di mínimo, predimensionamiento)', () => {
  it('formatea con 2 decimales, sin unidad en el texto', () => {
    expect(formatearNumero(5, 'mm')).toBe('5,00')
  })

  it('caso representativo de t-general: Di mínimo ≈ 21.518102875515787 mm -> "21,52"', () => {
    expect(formatearNumero(21.518102875515787, 'mm')).toBe('21,52')
  })
})
