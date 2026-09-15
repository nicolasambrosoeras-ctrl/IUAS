import { describe, it, expect } from 'vitest'
import { calcularCotaHidraulicaDefaultDeNivel, nombreDeNivel, resumenDeNivel } from './nivelUnidadFuncional'

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

describe('resumenDeNivel (UX-HIERARCHY-POLISH-01: cabecera colapsada del Nivel)', () => {
  it('PB con cota 0 y 5 locales -> "PB · +0,00 m · 5 locales"', () => {
    expect(resumenDeNivel({ nombre: 'PB', cotaHidraulicaReferencia_m: 0, locales: [1, 2, 3, 4, 5] })).toBe(
      'PB · +0,00 m · 5 locales',
    )
  })

  it('Piso 1 con cota positiva y 2 locales -> signo "+"', () => {
    expect(resumenDeNivel({ nombre: 'Piso 1', cotaHidraulicaReferencia_m: 3, locales: [1, 2] })).toBe(
      'Piso 1 · +3,00 m · 2 locales',
    )
  })

  it('cota negativa -> signo "-"', () => {
    expect(resumenDeNivel({ nombre: 'Subsuelo', cotaHidraulicaReferencia_m: -1.5, locales: [1] })).toBe(
      'Subsuelo · -1,50 m · 1 local',
    )
  })

  it('sin cota -> "sin cota", no NaN (brief §41)', () => {
    expect(resumenDeNivel({ nombre: 'Piso 2', locales: [] })).toBe('Piso 2 · sin cota · 0 locales')
  })

  it('singular/plural correcto de locales', () => {
    expect(resumenDeNivel({ nombre: 'PB', cotaHidraulicaReferencia_m: 0, locales: [1] })).toContain('1 local')
    expect(resumenDeNivel({ nombre: 'PB', cotaHidraulicaReferencia_m: 0, locales: [] })).toContain('0 locales')
    expect(resumenDeNivel({ nombre: 'PB', cotaHidraulicaReferencia_m: 0, locales: [1, 2] })).toContain('2 locales')
  })
})
