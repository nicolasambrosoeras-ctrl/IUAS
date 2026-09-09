import { describe, it, expect } from 'vitest'
import { catalogoArtefactos } from './index'
import {
  politicaConectividadPorArtefacto,
  obtenerPoliticaDeConectividad,
  ARTEFACTOS_QUE_REQUIEREN_SELECCION,
} from './politicaConectividad'

describe('politicaConectividad (CAT-CONN-01, criterio IUAS)', () => {
  it('COMPLETITUD: todo artefacto del catálogo tiene exactamente una política', () => {
    for (const artefacto of catalogoArtefactos) {
      const politica = obtenerPoliticaDeConectividad(artefacto.id)
      expect(politica, `falta política para "${artefacto.id}"`).toBeDefined()
    }
  })

  it('COMPLETITUD: no hay políticas para ids que no existen en el catálogo', () => {
    const idsDeCatalogo = new Set(catalogoArtefactos.map((a) => a.id))
    for (const id of Object.keys(politicaConectividadPorArtefacto)) {
      expect(idsDeCatalogo.has(id), `política huérfana para "${id}"`).toBe(true)
    }
  })

  it('un artefactoId inexistente devuelve undefined (nunca un default silencioso)', () => {
    expect(obtenerPoliticaDeConectividad('noExisteEnElCatalogo')).toBeUndefined()
    // Guard contra colisiones con el prototipo de Object.
    expect(obtenerPoliticaDeConectividad('toString')).toBeUndefined()
    expect(obtenerPoliticaDeConectividad('constructor')).toBeUndefined()
  })

  it('coincide con la matriz CAT-CONN-01 aprobada', () => {
    const esperado: Record<string, string> = {
      inodoroValvula: 'automatica:soloAF',
      banera: 'automatica:ambas',
      receptaculoDucha: 'automatica:ambas',
      bidet: 'automatica:ambas',
      lavatorio: 'automatica:ambas',
      inodoroDeposito: 'automatica:soloAF',
      piletaDeCocina: 'automatica:ambas',
      maquinaLavavajillas: 'defaultConfigurable:soloAF',
      piletaDeLavar: 'automatica:ambas',
      maquinaLavarropas: 'defaultConfigurable:soloAF',
      valvulaMingitorio: 'automatica:soloAF',
      piletaDeCocinaIndustrial: 'automatica:ambas',
      lavavajillasIndustrial: 'requiereSeleccion',
      lavarropasIndustrial: 'requiereSeleccion',
      lavachatas: 'automatica:soloAF',
      canillaDeServicio: 'automatica:soloAF',
    }
    for (const artefacto of catalogoArtefactos) {
      const p = obtenerPoliticaDeConectividad(artefacto.id)!
      const clave = p.politica === 'requiereSeleccion' ? 'requiereSeleccion' : `${p.politica}:${p.referencia}`
      expect(clave, artefacto.id).toBe(esperado[artefacto.id])
    }
  })

  it('los tipos `defaultConfigurable` ofrecen exactamente [soloAF, ambas] (nunca AC sola)', () => {
    for (const artefacto of catalogoArtefactos) {
      const p = obtenerPoliticaDeConectividad(artefacto.id)!
      if (p.politica === 'defaultConfigurable') {
        expect([...p.opcionesPermitidas].sort()).toEqual(['ambas', 'soloAF'])
        expect(p.opcionesPermitidas).toContain(p.referencia)
      }
    }
  })

  it('los tipos `requiereSeleccion` ofrecen las tres opciones y no llevan referencia', () => {
    for (const artefacto of catalogoArtefactos) {
      const p = obtenerPoliticaDeConectividad(artefacto.id)!
      if (p.politica === 'requiereSeleccion') {
        expect([...p.opcionesPermitidas].sort()).toEqual(['ambas', 'soloAC', 'soloAF'])
        expect('referencia' in p).toBe(false)
      }
    }
  })

  it('ARTEFACTOS_QUE_REQUIEREN_SELECCION son exactamente los dos industriales', () => {
    expect([...ARTEFACTOS_QUE_REQUIEREN_SELECCION].sort()).toEqual(['lavarropasIndustrial', 'lavavajillasIndustrial'])
  })
})
