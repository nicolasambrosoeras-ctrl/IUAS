import { describe, it, expect } from 'vitest'
import { catalogoArtefactos } from './index'
import {
  alturaHidraulicaIuasPorArtefacto,
  obtenerAlturaHidraulicaIuas,
} from './alturasHidraulicasIuas'

describe('alturasHidraulicasIuas (GEOM-UX-01, tabla IUAS v1 -- NO ERAS)', () => {
  it('COMPLETITUD: todo tipo del catálogo tiene exactamente una altura IUAS (número finito)', () => {
    for (const artefacto of catalogoArtefactos) {
      const altura = obtenerAlturaHidraulicaIuas(artefacto.id)
      expect(altura, `falta altura IUAS para "${artefacto.id}"`).toBeTypeOf('number')
      expect(Number.isFinite(altura as number), `altura IUAS no finita para "${artefacto.id}"`).toBe(true)
      expect(altura as number).toBeGreaterThan(0)
    }
  })

  it('COMPLETITUD: no hay entradas huérfanas (toda altura IUAS corresponde a un tipo del catálogo)', () => {
    const idsDeCatalogo = new Set(catalogoArtefactos.map((a) => a.id))
    for (const id of Object.keys(alturaHidraulicaIuasPorArtefacto)) {
      expect(idsDeCatalogo.has(id), `altura IUAS huérfana para "${id}"`).toBe(true)
    }
  })

  it('COMPLETITUD: exactamente 16/16 -- una entrada por tipo de catálogo, sin sobrantes', () => {
    expect(Object.keys(alturaHidraulicaIuasPorArtefacto).length).toBe(catalogoArtefactos.length)
    expect(catalogoArtefactos.length).toBe(16)
  })

  it('un artefactoId inexistente devuelve undefined (nunca un default silencioso de 0)', () => {
    expect(obtenerAlturaHidraulicaIuas('noExisteEnElCatalogo')).toBeUndefined()
    // Guard contra colisiones con el prototipo de Object.
    expect(obtenerAlturaHidraulicaIuas('toString')).toBeUndefined()
    expect(obtenerAlturaHidraulicaIuas('constructor')).toBeUndefined()
  })

  it('coincide con la Tabla IUAS v1 aprobada (GEOM-UX-01 §5)', () => {
    expect(alturaHidraulicaIuasPorArtefacto).toEqual({
      inodoroValvula: 1.0,
      banera: 0.7,
      receptaculoDucha: 2.0,
      bidet: 0.4,
      lavatorio: 0.9,
      inodoroDeposito: 0.4,
      piletaDeCocina: 0.9,
      maquinaLavavajillas: 0.6,
      piletaDeLavar: 1.1,
      maquinaLavarropas: 0.6,
      valvulaMingitorio: 1.0,
      piletaDeCocinaIndustrial: 0.9,
      lavavajillasIndustrial: 0.6,
      lavarropasIndustrial: 0.6,
      lavachatas: 1.1,
      canillaDeServicio: 0.6,
    })
  })
})
