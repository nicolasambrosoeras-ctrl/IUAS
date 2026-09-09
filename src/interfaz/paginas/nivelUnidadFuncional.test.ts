import { describe, it, expect } from 'vitest'
import { calcularCotaHidraulicaDefaultDeNivel, nombreDeNivel } from './nivelUnidadFuncional'

describe('calcularCotaHidraulicaDefaultDeNivel (GEOM-UX-01: cota de PISO, 3·nivel)', () => {
  it('PB (nivel 0) -> 0,00 m (el +1 m de altura de conexión lo aporta ahora la Tabla IUAS)', () => {
    expect(calcularCotaHidraulicaDefaultDeNivel(0)).toBe(0)
  })

  it('Piso 1 -> 3,00 m', () => {
    expect(calcularCotaHidraulicaDefaultDeNivel(1)).toBe(3)
  })

  it('Piso 2 -> 6,00 m', () => {
    expect(calcularCotaHidraulicaDefaultDeNivel(2)).toBe(6)
  })

  it('Piso 3 -> 9,00 m', () => {
    expect(calcularCotaHidraulicaDefaultDeNivel(3)).toBe(9)
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
