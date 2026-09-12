import { describe, it, expect } from 'vitest'
import type { Artefacto, Local, Proyecto, UnidadFuncional } from '../../../modelo/proyecto'
import type { ReferenciaDeArtefacto } from '../../../modelo/redHidraulica'
import { resolverArtefactosReferenciados } from './resolverArtefactosReferenciados'

function proyectoCon(unidadesFuncionales: readonly UnidadFuncional[]): Proyecto {
  return {
    metadatos: {
      nombre: 'Proyecto de prueba',
      obra: 'Obra de prueba',
      comitente: 'Comitente de prueba',
      fecha: '2026-01-01',
      schemaVersion: '1.0.0',
      versionNormativa: 'eras-2023',
    },
    parametros: {
      tipoDeProyecto: 'oficinaPrivada',
      presionSobreAcera_m: 0,
      alturaArtefactoMasDesfavorable_m: 0,
    },
    unidadesFuncionales,
    configuracionHidraulica: { metodoPerdidaDistribuida: 'hazenWilliams', metodoPerdidaLocalizada: 'detallado', granularidadHidraulica: 'profesional', materialTuberiaId: 'ppr', sistemaDeTuberiaId: 'acquaSystemMagnumPn20' },
  }
}

function referenciaA(unidadFuncionalId: string, localId: string, artefactoId: string): ReferenciaDeArtefacto {
  return { tipo: 'artefacto', unidadFuncionalId, localId, artefactoId }
}

describe('resolverArtefactosReferenciados', () => {
  it('resuelve una referencia valida a las instancias reales de UnidadFuncional, Local y Artefacto', () => {
    const artefacto: Artefacto = {
      id: 'artefacto-ducha',
      artefactoId: 'receptaculoDucha',
      cantidad: 1,
      origen: 'normativo',
    }
    const local: Local = { id: 'local-bano', tipo: 'bano', regimen: 'domiciliario', artefactos: [artefacto] }
    const uf: UnidadFuncional = { id: 'uf-1', nombre: 'UF 1', niveles: [{ id: 'nivel-1', nombre: 'Nivel 1', locales: [local] }] }
    const proyecto = proyectoCon([uf])
    const referencia = referenciaA('uf-1', 'local-bano', 'artefacto-ducha')

    const [resuelto] = resolverArtefactosReferenciados(proyecto, [referencia])

    expect(resuelto).toBeDefined()
    expect(resuelto?.referencia).toBe(referencia)
    expect(resuelto?.unidadFuncional).toBe(uf)
    expect(resuelto?.local).toBe(local)
    expect(resuelto?.artefacto).toBe(artefacto)
  })

  it('unidadFuncionalId inexistente lanza excepcion', () => {
    const proyecto = proyectoCon([])
    const referencia = referenciaA('uf-inexistente', 'local-x', 'artefacto-x')

    expect(() => resolverArtefactosReferenciados(proyecto, [referencia])).toThrow()
  })

  it('UF valida + localId inexistente lanza excepcion', () => {
    const uf: UnidadFuncional = { id: 'uf-1', nombre: 'UF 1', niveles: [{ id: 'nivel-1', nombre: 'Nivel 1', locales: [] }] }
    const proyecto = proyectoCon([uf])
    const referencia = referenciaA('uf-1', 'local-inexistente', 'artefacto-x')

    expect(() => resolverArtefactosReferenciados(proyecto, [referencia])).toThrow()
  })

  it('UF/Local validos + artefactoId inexistente lanza excepcion', () => {
    const local: Local = { id: 'local-bano', tipo: 'bano', regimen: 'domiciliario', artefactos: [] }
    const uf: UnidadFuncional = { id: 'uf-1', nombre: 'UF 1', niveles: [{ id: 'nivel-1', nombre: 'Nivel 1', locales: [local] }] }
    const proyecto = proyectoCon([uf])
    const referencia = referenciaA('uf-1', 'local-bano', 'artefacto-inexistente')

    expect(() => resolverArtefactosReferenciados(proyecto, [referencia])).toThrow()
  })

  it('dos referencias con mismo localId y artefactoId pero UF distintas resuelven objetos funcionales distintos', () => {
    const artefacto1: Artefacto = { id: 'artefacto-x', artefactoId: 'receptaculoDucha', cantidad: 1, origen: 'normativo' }
    const local1: Local = { id: 'local-x', tipo: 'bano', regimen: 'domiciliario', artefactos: [artefacto1] }
    const uf1: UnidadFuncional = { id: 'uf-1', nombre: 'UF 1', niveles: [{ id: 'nivel-1', nombre: 'Nivel 1', locales: [local1] }] }

    const artefacto2: Artefacto = { id: 'artefacto-x', artefactoId: 'receptaculoDucha', cantidad: 1, origen: 'normativo' }
    const local2: Local = { id: 'local-x', tipo: 'bano', regimen: 'domiciliario', artefactos: [artefacto2] }
    const uf2: UnidadFuncional = { id: 'uf-2', nombre: 'UF 2', niveles: [{ id: 'nivel-1', nombre: 'Nivel 1', locales: [local2] }] }

    const proyecto = proyectoCon([uf1, uf2])
    const referencia1 = referenciaA('uf-1', 'local-x', 'artefacto-x')
    const referencia2 = referenciaA('uf-2', 'local-x', 'artefacto-x')

    const [primero, segundo] = resolverArtefactosReferenciados(proyecto, [referencia1, referencia2])

    expect(primero).toBeDefined()
    expect(segundo).toBeDefined()
    expect(primero?.unidadFuncional).toBe(uf1)
    expect(primero?.artefacto).toBe(artefacto1)
    expect(segundo?.unidadFuncional).toBe(uf2)
    expect(segundo?.artefacto).toBe(artefacto2)
    expect(primero?.artefacto).not.toBe(segundo?.artefacto)
  })

  it('preserva el orden de entrada de las referencias', () => {
    const artefactoA: Artefacto = { id: 'artefacto-a', artefactoId: 'lavatorio', cantidad: 1, origen: 'normativo' }
    const artefactoB: Artefacto = { id: 'artefacto-b', artefactoId: 'bidet', cantidad: 1, origen: 'normativo' }
    const local: Local = {
      id: 'local-bano',
      tipo: 'bano',
      regimen: 'domiciliario',
      artefactos: [artefactoA, artefactoB],
    }
    const uf: UnidadFuncional = { id: 'uf-1', nombre: 'UF 1', niveles: [{ id: 'nivel-1', nombre: 'Nivel 1', locales: [local] }] }
    const proyecto = proyectoCon([uf])

    const referenciaB = referenciaA('uf-1', 'local-bano', 'artefacto-b')
    const referenciaAA = referenciaA('uf-1', 'local-bano', 'artefacto-a')

    const [primero, segundo] = resolverArtefactosReferenciados(proyecto, [referenciaB, referenciaAA])

    expect(primero?.artefacto).toBe(artefactoB)
    expect(segundo?.artefacto).toBe(artefactoA)
  })

  it('no deduplica si recibe deliberadamente la misma referencia dos veces', () => {
    const artefacto: Artefacto = {
      id: 'artefacto-ducha',
      artefactoId: 'receptaculoDucha',
      cantidad: 1,
      origen: 'normativo',
    }
    const local: Local = { id: 'local-bano', tipo: 'bano', regimen: 'domiciliario', artefactos: [artefacto] }
    const uf: UnidadFuncional = { id: 'uf-1', nombre: 'UF 1', niveles: [{ id: 'nivel-1', nombre: 'Nivel 1', locales: [local] }] }
    const proyecto = proyectoCon([uf])
    const referencia = referenciaA('uf-1', 'local-bano', 'artefacto-ducha')

    const [primero, segundo] = resolverArtefactosReferenciados(proyecto, [referencia, referencia])

    expect(primero?.artefacto).toBe(artefacto)
    expect(segundo?.artefacto).toBe(artefacto)
  })
})
