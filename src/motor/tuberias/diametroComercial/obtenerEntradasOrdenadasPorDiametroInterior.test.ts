import { describe, it, expect } from 'vitest'
import { obtenerEntradasOrdenadasPorDiametroInterior } from './obtenerEntradasOrdenadasPorDiametroInterior'
import type { SistemaDeTuberia } from './obtenerCandidatosDeDiametroComercial'

const SISTEMA_LABORATORIO: SistemaDeTuberia = {
  id: 'sistema-laboratorio',
  denominacion: 'Sistema de laboratorio (ficticio, sin material ni norma asociados)',
  entradas: [
    { denominacionComercial: 'A', diametroInteriorEfectivo_mm: 15 },
    { denominacionComercial: 'B', diametroInteriorEfectivo_mm: 20 },
    { denominacionComercial: 'C', diametroInteriorEfectivo_mm: 25 },
  ],
}

describe('obtenerEntradasOrdenadasPorDiametroInterior', () => {
  it('devuelve todas las entradas, sin descartar ninguna', () => {
    const resultado = obtenerEntradasOrdenadasPorDiametroInterior(SISTEMA_LABORATORIO)

    expect(resultado).toHaveLength(3)
  })

  it('catálogo declarado desordenado: la salida queda ordenada ascendente por diámetro interior efectivo', () => {
    const sistemaDesordenado: SistemaDeTuberia = {
      id: 'sistema-desordenado',
      denominacion: 'Sistema de laboratorio desordenado (ficticio)',
      entradas: [
        { denominacionComercial: 'C', diametroInteriorEfectivo_mm: 25 },
        { denominacionComercial: 'A', diametroInteriorEfectivo_mm: 15 },
        { denominacionComercial: 'B', diametroInteriorEfectivo_mm: 20 },
      ],
    }

    const resultado = obtenerEntradasOrdenadasPorDiametroInterior(sistemaDesordenado)

    expect(resultado.map((entrada) => entrada.denominacionComercial)).toEqual(['A', 'B', 'C'])
  })

  it('no muta el catálogo original', () => {
    const copiaEntradas = [...SISTEMA_LABORATORIO.entradas]

    obtenerEntradasOrdenadasPorDiametroInterior(SISTEMA_LABORATORIO)

    expect(SISTEMA_LABORATORIO.entradas).toEqual(copiaEntradas)
  })

  it('dos entradas con el mismo diámetro interior: se conservan ambas, orden original como desempate (estable)', () => {
    const sistemaConEmpate: SistemaDeTuberia = {
      id: 'sistema-empate',
      denominacion: 'Sistema de laboratorio con empate (ficticio)',
      entradas: [
        { denominacionComercial: 'X1', diametroInteriorEfectivo_mm: 25 },
        { denominacionComercial: 'X2', diametroInteriorEfectivo_mm: 25 },
        { denominacionComercial: 'X3', diametroInteriorEfectivo_mm: 20 },
      ],
    }

    const resultado = obtenerEntradasOrdenadasPorDiametroInterior(sistemaConEmpate)

    expect(resultado.map((entrada) => entrada.denominacionComercial)).toEqual(['X3', 'X1', 'X2'])
  })

  it('sistema sin entradas: devuelve []', () => {
    const sistemaVacio: SistemaDeTuberia = {
      id: 'sistema-vacio',
      denominacion: 'Sistema de laboratorio vacío (ficticio)',
      entradas: [],
    }

    expect(obtenerEntradasOrdenadasPorDiametroInterior(sistemaVacio)).toEqual([])
  })

  it('lanza excepción si cualquier entrada del catálogo tiene diametroInteriorEfectivo_mm <= 0', () => {
    const sistemaInvalido: SistemaDeTuberia = {
      id: 'sistema-invalido',
      denominacion: 'Sistema de laboratorio inválido (ficticio)',
      entradas: [
        { denominacionComercial: 'A', diametroInteriorEfectivo_mm: 15 },
        { denominacionComercial: 'Z', diametroInteriorEfectivo_mm: 0 },
      ],
    }

    expect(() => obtenerEntradasOrdenadasPorDiametroInterior(sistemaInvalido)).toThrow()
  })
})
