import { describe, it, expect } from 'vitest'
import type { Nodo, RedHidraulica, ReferenciaDeArtefacto, Tramo } from '../../../modelo/redHidraulica'
import { hallarNodoDeInsercionDeLocal } from './hallarNodoDeInsercionDeLocal'

function referenciaA(unidadFuncionalId: string, localId: string, artefactoId: string): ReferenciaDeArtefacto {
  return { tipo: 'artefacto', unidadFuncionalId, localId, artefactoId }
}

describe('hallarNodoDeInsercionDeLocal', () => {
  it('Local con bifurcación explícita (>=2 artefactos de la Red): el nodo de bifurcación es el resultado', () => {
    const nodos: Nodo[] = [
      { id: 'n0' },
      { id: 'n-af-1' },
      { id: 'n-lavatorio', referencia: referenciaA('uf-1', 'local-bano', 'art-1') },
      { id: 'n-ducha', referencia: referenciaA('uf-1', 'local-bano', 'art-2') },
    ]
    const tramos: Tramo[] = [
      { id: 't0', nodoOrigenId: 'n0', nodoDestinoId: 'n-af-1', red: 'AF' },
      { id: 't1', nodoOrigenId: 'n-af-1', nodoDestinoId: 'n-lavatorio', red: 'AF' },
      { id: 't2', nodoOrigenId: 'n-af-1', nodoDestinoId: 'n-ducha', red: 'AF' },
    ]
    const red: RedHidraulica = { nodos, tramos }

    const resultado = hallarNodoDeInsercionDeLocal(red, 'uf-1', 'local-bano', 'AF')

    expect(resultado).toEqual({ tipo: 'nodo', nodoId: 'n-af-1' })
  })

  it('Local con exactamente 1 artefacto de la Red, sin nodo de bifurcación dedicado: el origen directo es el resultado (sin retrofit)', () => {
    const nodos: Nodo[] = [{ id: 'n0' }, { id: 'n-canilla', referencia: referenciaA('uf-1', 'local-patio', 'art-1') }]
    const tramos: Tramo[] = [{ id: 't0', nodoOrigenId: 'n0', nodoDestinoId: 'n-canilla', red: 'AF' }]
    const red: RedHidraulica = { nodos, tramos }

    const resultado = hallarNodoDeInsercionDeLocal(red, 'uf-1', 'local-patio', 'AF')

    expect(resultado).toEqual({ tipo: 'nodo', nodoId: 'n0' })
  })

  it('Local sin ningún terminal de esa Red todavía: sinConexionExistente, nunca se inventa un origen', () => {
    const nodos: Nodo[] = [{ id: 'n0' }, { id: 'n-lavatorio', referencia: referenciaA('uf-1', 'local-bano', 'art-1') }]
    // Solo hay conexion AF -- se consulta AC, que no tiene ningun terminal.
    const tramos: Tramo[] = [{ id: 't0', nodoOrigenId: 'n0', nodoDestinoId: 'n-lavatorio', red: 'AF' }]
    const red: RedHidraulica = { nodos, tramos }

    const resultado = hallarNodoDeInsercionDeLocal(red, 'uf-1', 'local-bano', 'AC')

    expect(resultado).toEqual({ tipo: 'sinConexionExistente' })
  })

  it('Local completamente nuevo (sin ningún nodo referenciándolo): sinConexionExistente', () => {
    const red: RedHidraulica = { nodos: [{ id: 'n0' }], tramos: [] }

    const resultado = hallarNodoDeInsercionDeLocal(red, 'uf-1', 'local-nuevo', 'AF')

    expect(resultado).toEqual({ tipo: 'sinConexionExistente' })
  })

  it('terminales del Local con orígenes distintos: ambiguo, nunca se elige uno arbitrariamente', () => {
    const nodos: Nodo[] = [
      { id: 'origen-a' },
      { id: 'origen-b' },
      { id: 'n-x', referencia: referenciaA('uf-1', 'local-raro', 'art-1') },
      { id: 'n-y', referencia: referenciaA('uf-1', 'local-raro', 'art-2') },
    ]
    const tramos: Tramo[] = [
      { id: 't1', nodoOrigenId: 'origen-a', nodoDestinoId: 'n-x', red: 'AF' },
      { id: 't2', nodoOrigenId: 'origen-b', nodoDestinoId: 'n-y', red: 'AF' },
    ]
    const red: RedHidraulica = { nodos, tramos }

    const resultado = hallarNodoDeInsercionDeLocal(red, 'uf-1', 'local-raro', 'AF')

    expect(resultado.tipo).toBe('ambiguo')
    if (resultado.tipo !== 'ambiguo') return
    expect([...resultado.nodosOrigenPosibles].sort()).toEqual(['origen-a', 'origen-b'])
  })

  it('ignora terminales de OTROS Locales al determinar el origen', () => {
    const nodos: Nodo[] = [
      { id: 'n-af-1' },
      { id: 'n-af-2' },
      { id: 'n-bano', referencia: referenciaA('uf-1', 'local-bano', 'art-1') },
      { id: 'n-cocina', referencia: referenciaA('uf-1', 'local-cocina', 'art-1') },
    ]
    const tramos: Tramo[] = [
      { id: 't1', nodoOrigenId: 'n-af-1', nodoDestinoId: 'n-bano', red: 'AF' },
      { id: 't2', nodoOrigenId: 'n-af-2', nodoDestinoId: 'n-cocina', red: 'AF' },
    ]
    const red: RedHidraulica = { nodos, tramos }

    const resultado = hallarNodoDeInsercionDeLocal(red, 'uf-1', 'local-bano', 'AF')

    expect(resultado).toEqual({ tipo: 'nodo', nodoId: 'n-af-1' })
  })

  it('ignora tramos de la Red contraria (AC no interfiere al consultar AF)', () => {
    const nodos: Nodo[] = [
      { id: 'n-af-1' },
      { id: 'n-acs', referencia: { tipo: 'produccionACS' } },
      { id: 'n-lavatorio-af', referencia: referenciaA('uf-1', 'local-bano', 'art-1') },
      { id: 'n-lavatorio-ac', referencia: referenciaA('uf-1', 'local-bano', 'art-1') },
    ]
    const tramos: Tramo[] = [
      { id: 't-af', nodoOrigenId: 'n-af-1', nodoDestinoId: 'n-lavatorio-af', red: 'AF' },
      { id: 't-ac', nodoOrigenId: 'n-acs', nodoDestinoId: 'n-lavatorio-ac', red: 'AC' },
    ]
    const red: RedHidraulica = { nodos, tramos }

    expect(hallarNodoDeInsercionDeLocal(red, 'uf-1', 'local-bano', 'AF')).toEqual({ tipo: 'nodo', nodoId: 'n-af-1' })
    expect(hallarNodoDeInsercionDeLocal(red, 'uf-1', 'local-bano', 'AC')).toEqual({ tipo: 'nodo', nodoId: 'n-acs' })
  })
})
