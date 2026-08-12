import { describe, it, expect } from 'vitest'
import type { Artefacto, Local, Proyecto, UnidadFuncional } from '../../../modelo/proyecto'
import type { Nodo, RedHidraulica } from '../../../modelo/redHidraulica'
import { auditarCoberturaFisica } from './auditarCoberturaFisica'

function proyectoCon(unidadesFuncionales: readonly UnidadFuncional[], redHidraulica?: RedHidraulica): Proyecto {
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
    configuracionHidraulica: { metodoPerdidaDistribuida: 'hazenWilliams', materialTuberiaId: 'ppr', sistemaDeTuberiaId: 'acquaSystemMagnumPn20' },
    ...(redHidraulica !== undefined ? { redHidraulica } : {}),
  }
}

function nodoReferenciando(id: string, unidadFuncionalId: string, localId: string, artefactoId: string): Nodo {
  return { id, referencia: { tipo: 'artefacto', unidadFuncionalId, localId, artefactoId } }
}

describe('auditarCoberturaFisica', () => {
  it('S1-A: todos los artefactos normativos referenciados -> completa', () => {
    const artefacto: Artefacto = { id: 'a1', artefactoId: 'lavatorio', cantidad: 1, origen: 'normativo' }
    const local: Local = { id: 'local-bano', tipo: 'bano', regimen: 'domiciliario', artefactos: [artefacto] }
    const uf: UnidadFuncional = { id: 'uf-1', nombre: 'UF 1', locales: [local] }
    const redHidraulica: RedHidraulica = {
      nodos: [nodoReferenciando('n1', 'uf-1', 'local-bano', 'a1')],
      tramos: [],
    }

    const resultado = auditarCoberturaFisica(proyectoCon([uf], redHidraulica))

    expect(resultado).toEqual({ completa: true, artefactosSinReferencia: [] })
  })

  it('S1-B: artefacto normativo nuevo sin referencia -> incompleta, con esa identidad exacta', () => {
    const artefactoCubierto: Artefacto = { id: 'a1', artefactoId: 'lavatorio', cantidad: 1, origen: 'normativo' }
    const artefactoNuevo: Artefacto = { id: 'a2', artefactoId: 'bidet', cantidad: 1, origen: 'normativo' }
    const local: Local = {
      id: 'local-bano',
      tipo: 'bano',
      regimen: 'domiciliario',
      artefactos: [artefactoCubierto, artefactoNuevo],
    }
    const uf: UnidadFuncional = { id: 'uf-1', nombre: 'UF 1', locales: [local] }
    const redHidraulica: RedHidraulica = {
      nodos: [nodoReferenciando('n1', 'uf-1', 'local-bano', 'a1')],
      tramos: [],
    }

    const resultado = auditarCoberturaFisica(proyectoCon([uf], redHidraulica))

    expect(resultado).toEqual({
      completa: false,
      artefactosSinReferencia: [{ tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'local-bano', artefactoId: 'a2' }],
    })
  })

  it('S1-C: cambio de cantidad de un artefacto ya referenciado no altera la cobertura', () => {
    const artefacto: Artefacto = { id: 'a1', artefactoId: 'lavatorio', cantidad: 3, origen: 'normativo' }
    const local: Local = { id: 'local-bano', tipo: 'bano', regimen: 'domiciliario', artefactos: [artefacto] }
    const uf: UnidadFuncional = { id: 'uf-1', nombre: 'UF 1', locales: [local] }
    const redHidraulica: RedHidraulica = {
      nodos: [nodoReferenciando('n1', 'uf-1', 'local-bano', 'a1')],
      tramos: [],
    }

    const resultado = auditarCoberturaFisica(proyectoCon([uf], redHidraulica))

    expect(resultado).toEqual({ completa: true, artefactosSinReferencia: [] })
  })

  it('S1-D: dos referencias fisicas (AF + AC) del mismo artefacto no producen duplicados', () => {
    const artefacto: Artefacto = { id: 'a1', artefactoId: 'lavatorio', cantidad: 1, origen: 'normativo' }
    const local: Local = { id: 'local-bano', tipo: 'bano', regimen: 'domiciliario', artefactos: [artefacto] }
    const uf: UnidadFuncional = { id: 'uf-1', nombre: 'UF 1', locales: [local] }
    const redHidraulica: RedHidraulica = {
      nodos: [
        nodoReferenciando('n-af', 'uf-1', 'local-bano', 'a1'),
        nodoReferenciando('n-ac', 'uf-1', 'local-bano', 'a1'),
      ],
      tramos: [],
    }

    const resultado = auditarCoberturaFisica(proyectoCon([uf], redHidraulica))

    expect(resultado).toEqual({ completa: true, artefactosSinReferencia: [] })
  })

  it('S1-E: artefacto origen usuario sin referencia no vuelve incompleta la cobertura', () => {
    const artefactoUsuario: Artefacto = { id: 'a3', artefactoId: 'lavatorio', cantidad: 1, origen: 'usuario' }
    const local: Local = { id: 'local-bano', tipo: 'bano', regimen: 'domiciliario', artefactos: [artefactoUsuario] }
    const uf: UnidadFuncional = { id: 'uf-1', nombre: 'UF 1', locales: [local] }
    const redHidraulica: RedHidraulica = { nodos: [], tramos: [] }

    const resultado = auditarCoberturaFisica(proyectoCon([uf], redHidraulica))

    expect(resultado).toEqual({ completa: true, artefactosSinReferencia: [] })
  })

  it('proyecto sin redHidraulica: cualquier artefacto normativo queda sin referencia', () => {
    const artefacto: Artefacto = { id: 'a1', artefactoId: 'lavatorio', cantidad: 1, origen: 'normativo' }
    const local: Local = { id: 'local-bano', tipo: 'bano', regimen: 'domiciliario', artefactos: [artefacto] }
    const uf: UnidadFuncional = { id: 'uf-1', nombre: 'UF 1', locales: [local] }

    const resultado = auditarCoberturaFisica(proyectoCon([uf]))

    expect(resultado).toEqual({
      completa: false,
      artefactosSinReferencia: [{ tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'local-bano', artefactoId: 'a1' }],
    })
  })

  it('proyecto sin unidades funcionales y sin redHidraulica: completa (nada que auditar)', () => {
    const resultado = auditarCoberturaFisica(proyectoCon([]))

    expect(resultado).toEqual({ completa: true, artefactosSinReferencia: [] })
  })
})
