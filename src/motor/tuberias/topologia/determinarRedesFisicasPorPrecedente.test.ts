import { describe, it, expect } from 'vitest'
import type { Artefacto, MetadatosProyecto, ParametrosProyecto, Proyecto, UnidadFuncional } from '../../../modelo/proyecto'
import type { Nodo, RedHidraulica, Tramo } from '../../../modelo/redHidraulica'
import { determinarRedesFisicasPorPrecedente } from './determinarRedesFisicasPorPrecedente'

function metadatos(): MetadatosProyecto {
  return {
    nombre: 'Proyecto precedente',
    obra: 'Obra',
    comitente: 'Comitente',
    fecha: '2026-01-01',
    schemaVersion: '1.0.0',
    versionNormativa: 'eras-2023',
  }
}

function parametros(): ParametrosProyecto {
  return { tipoDeProyecto: 'viviendaIndividual', presionSobreAcera_m: 0, alturaArtefactoMasDesfavorable_m: 0 }
}

function artefacto(id: string, artefactoId: string): Artefacto {
  return { id, artefactoId, cantidad: 1, origen: 'normativo' }
}

function proyectoCon(unidadesFuncionales: readonly UnidadFuncional[], redHidraulica?: RedHidraulica): Proyecto {
  return {
    metadatos: metadatos(),
    parametros: parametros(),
    unidadesFuncionales,
    ...(redHidraulica !== undefined ? { redHidraulica } : {}),
    configuracionHidraulica: {
      metodoPerdidaDistribuida: 'hazenWilliams',
      materialTuberiaId: 'ppr',
      sistemaDeTuberiaId: 'acquaSystemMagnumPn20',
    },
  }
}

describe('determinarRedesFisicasPorPrecedente', () => {
  it('proyecto sin redHidraulica: sinPrecedente', () => {
    const uf: UnidadFuncional = { id: 'uf-1', nombre: 'uf-1', locales: [{ id: 'l-1', tipo: 'bano', artefactos: [artefacto('a-1', 'lavatorio')] }] }
    const proyecto = proyectoCon([uf])

    expect(determinarRedesFisicasPorPrecedente(proyecto, 'lavatorio')).toEqual({ tipo: 'sinPrecedente' })
  })

  it('ninguna instancia conectada de ese artefactoId: sinPrecedente', () => {
    const uf: UnidadFuncional = { id: 'uf-1', nombre: 'uf-1', locales: [{ id: 'l-1', tipo: 'bano', artefactos: [artefacto('a-1', 'lavatorio')] }] }
    const nodos: Nodo[] = [{ id: 'n0' }] // sin ningun nodo que referencie a-1
    const proyecto = proyectoCon([uf], { nodos, tramos: [] })

    expect(determinarRedesFisicasPorPrecedente(proyecto, 'lavatorio')).toEqual({ tipo: 'sinPrecedente' })
  })

  it('una instancia previa conectada solo a AF: determinado con [AF]', () => {
    const uf: UnidadFuncional = { id: 'uf-1', nombre: 'uf-1', locales: [{ id: 'l-1', tipo: 'bano', artefactos: [artefacto('a-1', 'inodoroDeposito')] }] }
    const nodos: Nodo[] = [{ id: 'n0' }, { id: 'n1', referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'l-1', artefactoId: 'a-1' } }]
    const tramos: Tramo[] = [{ id: 't0', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AF' }]
    const proyecto = proyectoCon([uf], { nodos, tramos })

    expect(determinarRedesFisicasPorPrecedente(proyecto, 'inodoroDeposito')).toEqual({ tipo: 'determinado', redes: ['AF'] })
  })

  it('una instancia previa conectada a AF+AC: determinado con [AF, AC]', () => {
    const uf: UnidadFuncional = { id: 'uf-1', nombre: 'uf-1', locales: [{ id: 'l-1', tipo: 'bano', artefactos: [artefacto('a-1', 'lavatorio')] }] }
    const nodos: Nodo[] = [
      { id: 'n0' },
      { id: 'n-acs', referencia: { tipo: 'produccionACS' } },
      { id: 'n-af', referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'l-1', artefactoId: 'a-1' } },
      { id: 'n-ac', referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'l-1', artefactoId: 'a-1' } },
    ]
    const tramos: Tramo[] = [
      { id: 't-af', nodoOrigenId: 'n0', nodoDestinoId: 'n-af', red: 'AF' },
      { id: 't-ac', nodoOrigenId: 'n-acs', nodoDestinoId: 'n-ac', red: 'AC' },
    ]
    const proyecto = proyectoCon([uf], { nodos, tramos })

    expect(determinarRedesFisicasPorPrecedente(proyecto, 'lavatorio')).toEqual({ tipo: 'determinado', redes: ['AF', 'AC'] })
  })

  it('varias instancias del mismo tipo, mismo patron, en distintas UF/Locales: determinado (coinciden)', () => {
    const uf1: UnidadFuncional = { id: 'uf-1', nombre: 'uf-1', locales: [{ id: 'l-1', tipo: 'bano', artefactos: [artefacto('a-1', 'lavatorio')] }] }
    const uf2: UnidadFuncional = { id: 'uf-2', nombre: 'uf-2', locales: [{ id: 'l-2', tipo: 'toilette', artefactos: [artefacto('a-2', 'lavatorio')] }] }
    const nodos: Nodo[] = [
      { id: 'n0' },
      { id: 'n-1', referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'l-1', artefactoId: 'a-1' } },
      { id: 'n-2', referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-2', localId: 'l-2', artefactoId: 'a-2' } },
    ]
    const tramos: Tramo[] = [
      { id: 't1', nodoOrigenId: 'n0', nodoDestinoId: 'n-1', red: 'AF' },
      { id: 't2', nodoOrigenId: 'n0', nodoDestinoId: 'n-2', red: 'AF' },
    ]
    const proyecto = proyectoCon([uf1, uf2], { nodos, tramos })

    expect(determinarRedesFisicasPorPrecedente(proyecto, 'lavatorio')).toEqual({ tipo: 'determinado', redes: ['AF'] })
  })

  it('dos instancias del mismo tipo con patrones distintos (una soloAF, otra ambas): inconsistente', () => {
    const uf1: UnidadFuncional = { id: 'uf-1', nombre: 'uf-1', locales: [{ id: 'l-1', tipo: 'bano', artefactos: [artefacto('a-1', 'lavatorio')] }] }
    const uf2: UnidadFuncional = { id: 'uf-2', nombre: 'uf-2', locales: [{ id: 'l-2', tipo: 'toilette', artefactos: [artefacto('a-2', 'lavatorio')] }] }
    const nodos: Nodo[] = [
      { id: 'n0' },
      { id: 'n-acs', referencia: { tipo: 'produccionACS' } },
      { id: 'n-1', referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'l-1', artefactoId: 'a-1' } },
      { id: 'n-2af', referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-2', localId: 'l-2', artefactoId: 'a-2' } },
      { id: 'n-2ac', referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-2', localId: 'l-2', artefactoId: 'a-2' } },
    ]
    const tramos: Tramo[] = [
      { id: 't1', nodoOrigenId: 'n0', nodoDestinoId: 'n-1', red: 'AF' }, // uf-1: soloAF
      { id: 't2af', nodoOrigenId: 'n0', nodoDestinoId: 'n-2af', red: 'AF' },
      { id: 't2ac', nodoOrigenId: 'n-acs', nodoDestinoId: 'n-2ac', red: 'AC' }, // uf-2: ambas
    ]
    const proyecto = proyectoCon([uf1, uf2], { nodos, tramos })

    const resultado = determinarRedesFisicasPorPrecedente(proyecto, 'lavatorio')

    expect(resultado.tipo).toBe('inconsistente')
    if (resultado.tipo !== 'inconsistente') return
    expect([...resultado.patronesEncontrados].sort()).toEqual(['ambas', 'soloAF'])
  })

  it('ignora instancias de OTROS artefactoId de catálogo (aunque compartan Local)', () => {
    const uf: UnidadFuncional = {
      id: 'uf-1',
      nombre: 'uf-1',
      locales: [{ id: 'l-1', tipo: 'bano', artefactos: [artefacto('a-1', 'lavatorio'), artefacto('a-2', 'inodoroDeposito')] }],
    }
    const nodos: Nodo[] = [
      { id: 'n0' },
      { id: 'n-acs', referencia: { tipo: 'produccionACS' } },
      { id: 'n-af', referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'l-1', artefactoId: 'a-1' } },
      { id: 'n-ac', referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'l-1', artefactoId: 'a-1' } },
      { id: 'n-inodoro', referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'l-1', artefactoId: 'a-2' } },
    ]
    const tramos: Tramo[] = [
      { id: 't-af', nodoOrigenId: 'n0', nodoDestinoId: 'n-af', red: 'AF' },
      { id: 't-ac', nodoOrigenId: 'n-acs', nodoDestinoId: 'n-ac', red: 'AC' },
      { id: 't-inodoro', nodoOrigenId: 'n0', nodoDestinoId: 'n-inodoro', red: 'AF' },
    ]
    const proyecto = proyectoCon([uf], { nodos, tramos })

    // lavatorio (a-1) esta AF+AC; inodoroDeposito (a-2) esta soloAF -- no
    // deben mezclarse al consultar por 'lavatorio'.
    expect(determinarRedesFisicasPorPrecedente(proyecto, 'lavatorio')).toEqual({ tipo: 'determinado', redes: ['AF', 'AC'] })
  })
})
