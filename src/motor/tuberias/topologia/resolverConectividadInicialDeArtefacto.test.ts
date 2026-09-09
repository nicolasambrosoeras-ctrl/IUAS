import { describe, it, expect } from 'vitest'
import { catalogoArtefactos } from '../../../normativa/eras-2023/catalogo-artefactos'
import { obtenerPoliticaDeConectividad } from '../../../normativa/eras-2023/catalogo-artefactos/politicaConectividad'
import {
  resolverConectividadInicialDeArtefacto,
  redesDeConectividadFisica,
  conectividadFisicaDeRedes,
} from './resolverConectividadInicialDeArtefacto'

describe('redesDeConectividadFisica / conectividadFisicaDeRedes (conversión pura, round-trip)', () => {
  it('mapea cada ConectividadFisica a sus Redes', () => {
    expect(redesDeConectividadFisica('soloAF')).toEqual(['AF'])
    expect(redesDeConectividadFisica('soloAC')).toEqual(['AC'])
    expect(redesDeConectividadFisica('ambas')).toEqual(['AF', 'AC'])
  })

  it('inversa, en cualquier orden de Redes', () => {
    expect(conectividadFisicaDeRedes(['AF'])).toBe('soloAF')
    expect(conectividadFisicaDeRedes(['AC'])).toBe('soloAC')
    expect(conectividadFisicaDeRedes(['AF', 'AC'])).toBe('ambas')
    expect(conectividadFisicaDeRedes(['AC', 'AF'])).toBe('ambas')
  })

  it('round-trip para las tres', () => {
    for (const c of ['soloAF', 'soloAC', 'ambas'] as const) {
      expect(conectividadFisicaDeRedes(redesDeConectividadFisica(c))).toBe(c)
    }
  })
})

describe('resolverConectividadInicialDeArtefacto (CAT-CONN-01)', () => {
  it('automatica: resuelve con la referencia de la política, sin preguntar', () => {
    expect(resolverConectividadInicialDeArtefacto('banera')).toEqual({
      tipo: 'resuelta',
      conectividad: 'ambas',
      redes: ['AF', 'AC'],
    })
    expect(resolverConectividadInicialDeArtefacto('inodoroValvula')).toEqual({
      tipo: 'resuelta',
      conectividad: 'soloAF',
      redes: ['AF'],
    })
    expect(resolverConectividadInicialDeArtefacto('piletaDeCocinaIndustrial')).toEqual({
      tipo: 'resuelta',
      conectividad: 'ambas',
      redes: ['AF', 'AC'],
    })
  })

  it('automatica: ignora cualquier override de instancia (no hay UI para setearlo; suele ser stale del tipo anterior)', () => {
    expect(resolverConectividadInicialDeArtefacto('banera', 'soloAF')).toEqual({
      tipo: 'resuelta',
      conectividad: 'ambas',
      redes: ['AF', 'AC'],
    })
    expect(resolverConectividadInicialDeArtefacto('inodoroValvula', 'ambas')).toEqual({
      tipo: 'resuelta',
      conectividad: 'soloAF',
      redes: ['AF'],
    })
  })

  it('defaultConfigurable: sin override -> referencia (AF); con override válido -> el override', () => {
    expect(resolverConectividadInicialDeArtefacto('maquinaLavavajillas')).toEqual({
      tipo: 'resuelta',
      conectividad: 'soloAF',
      redes: ['AF'],
    })
    expect(resolverConectividadInicialDeArtefacto('maquinaLavavajillas', 'ambas')).toEqual({
      tipo: 'resuelta',
      conectividad: 'ambas',
      redes: ['AF', 'AC'],
    })
    expect(resolverConectividadInicialDeArtefacto('maquinaLavarropas', 'soloAF')).toEqual({
      tipo: 'resuelta',
      conectividad: 'soloAF',
      redes: ['AF'],
    })
  })

  it('defaultConfigurable: un override NO permitido (AC sola) se ignora -> referencia', () => {
    expect(resolverConectividadInicialDeArtefacto('maquinaLavavajillas', 'soloAC')).toEqual({
      tipo: 'resuelta',
      conectividad: 'soloAF',
      redes: ['AF'],
    })
  })

  it('requiereSeleccion: sin override -> requiereSeleccion con las opciones; con override -> resuelta', () => {
    expect(resolverConectividadInicialDeArtefacto('lavavajillasIndustrial')).toEqual({
      tipo: 'requiereSeleccion',
      opcionesPermitidas: ['soloAF', 'soloAC', 'ambas'],
    })
    expect(resolverConectividadInicialDeArtefacto('lavarropasIndustrial', 'soloAC')).toEqual({
      tipo: 'resuelta',
      conectividad: 'soloAC',
      redes: ['AC'],
    })
    expect(resolverConectividadInicialDeArtefacto('lavavajillasIndustrial', 'ambas')).toEqual({
      tipo: 'resuelta',
      conectividad: 'ambas',
      redes: ['AF', 'AC'],
    })
  })

  it('tipoDesconocido para un artefactoId sin política (falla visible, nunca default silencioso)', () => {
    expect(resolverConectividadInicialDeArtefacto('noExiste')).toEqual({ tipo: 'tipoDesconocido' })
    expect(resolverConectividadInicialDeArtefacto('')).toEqual({ tipo: 'tipoDesconocido' })
  })

  it('TABLA COMPLETA: los 16 artefactos del catálogo resuelven según su política', () => {
    for (const artefacto of catalogoArtefactos) {
      const politica = obtenerPoliticaDeConectividad(artefacto.id)!
      const resol = resolverConectividadInicialDeArtefacto(artefacto.id)
      if (politica.politica === 'requiereSeleccion') {
        expect(resol, artefacto.id).toEqual({
          tipo: 'requiereSeleccion',
          opcionesPermitidas: politica.opcionesPermitidas,
        })
      } else {
        expect(resol, artefacto.id).toEqual({
          tipo: 'resuelta',
          conectividad: politica.referencia,
          redes: redesDeConectividadFisica(politica.referencia),
        })
      }
    }
  })

  it('es puro: mismas entradas -> misma salida, sin efectos (no muta nada observable)', () => {
    const a = resolverConectividadInicialDeArtefacto('maquinaLavavajillas', 'ambas')
    const b = resolverConectividadInicialDeArtefacto('maquinaLavavajillas', 'ambas')
    expect(a).toEqual(b)
    // Referencias nuevas cada vez (no un singleton mutable compartido).
    expect(a).not.toBe(b)
  })
})
