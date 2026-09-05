import { describe, it, expect } from 'vitest'
import { calcularCotaHidraulicaDefaultDeNivel, nombreDeNivel } from './nivelUnidadFuncional'

describe('calcularCotaHidraulicaDefaultDeNivel', () => {
  it('PB (nivel 0) -> 1,00 m', () => {
    expect(calcularCotaHidraulicaDefaultDeNivel(0)).toBe(1)
  })

  it('Piso 1 -> 4,00 m', () => {
    expect(calcularCotaHidraulicaDefaultDeNivel(1)).toBe(4)
  })

  it('Piso 2 -> 7,00 m', () => {
    expect(calcularCotaHidraulicaDefaultDeNivel(2)).toBe(7)
  })

  it('Piso 3 -> 10,00 m', () => {
    expect(calcularCotaHidraulicaDefaultDeNivel(3)).toBe(10)
  })
})

describe('nombreDeNivel', () => {
  it('nivel 0 -> "PB"', () => {
    expect(nombreDeNivel(0)).toBe('PB')
  })

  it('nivel 1 -> "Piso 1"', () => {
    expect(nombreDeNivel(1)).toBe('Piso 1')
  })

  it('nivel 3 -> "Piso 3"', () => {
    expect(nombreDeNivel(3)).toBe('Piso 3')
  })
})
