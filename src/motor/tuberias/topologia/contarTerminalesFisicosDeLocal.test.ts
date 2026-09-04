import { describe, it, expect } from 'vitest'
import type { Nodo, RedHidraulica, ReferenciaDeArtefacto, Tramo } from '../../../modelo/redHidraulica'
import { contarTerminalesFisicosDeLocal } from './contarTerminalesFisicosDeLocal'

function referenciaDe(unidadFuncionalId: string, localId: string, artefactoId: string): ReferenciaDeArtefacto {
  return { tipo: 'artefacto', unidadFuncionalId, localId, artefactoId }
}

describe('contarTerminalesFisicosDeLocal', () => {
  it('1 terminal fisico en la red -> n=1', () => {
    const nodos: Nodo[] = [{ id: 'raiz' }, { id: 't1', referencia: referenciaDe('uf-1', 'local-1', 'lavatorio') }]
    const tramos: Tramo[] = [{ id: 'tr1', nodoOrigenId: 'raiz', nodoDestinoId: 't1', red: 'AF' }]
    const red: RedHidraulica = { nodos, tramos }

    expect(contarTerminalesFisicosDeLocal(red, 'uf-1', 'local-1', 'AF')).toBe(1)
  })

  it('2 terminales fisicos (2 artefactos distintos) en la red -> n=2', () => {
    const nodos: Nodo[] = [
      { id: 'raiz' },
      { id: 't1', referencia: referenciaDe('uf-1', 'local-1', 'lavatorio') },
      { id: 't2', referencia: referenciaDe('uf-1', 'local-1', 'inodoro') },
    ]
    const tramos: Tramo[] = [
      { id: 'tr1', nodoOrigenId: 'raiz', nodoDestinoId: 't1', red: 'AF' },
      { id: 'tr2', nodoOrigenId: 'raiz', nodoDestinoId: 't2', red: 'AF' },
    ]
    const red: RedHidraulica = { nodos, tramos }

    expect(contarTerminalesFisicosDeLocal(red, 'uf-1', 'local-1', 'AF')).toBe(2)
  })

  it('4 terminales fisicos en la red -> n=4', () => {
    const nodos: Nodo[] = [
      { id: 'raiz' },
      { id: 't1', referencia: referenciaDe('uf-1', 'local-1', 'lavatorio') },
      { id: 't2', referencia: referenciaDe('uf-1', 'local-1', 'inodoro') },
      { id: 't3', referencia: referenciaDe('uf-1', 'local-1', 'bidet') },
      { id: 't4', referencia: referenciaDe('uf-1', 'local-1', 'ducha') },
    ]
    const tramos: Tramo[] = [
      { id: 'tr1', nodoOrigenId: 'raiz', nodoDestinoId: 't1', red: 'AF' },
      { id: 'tr2', nodoOrigenId: 'raiz', nodoDestinoId: 't2', red: 'AF' },
      { id: 'tr3', nodoOrigenId: 'raiz', nodoDestinoId: 't3', red: 'AF' },
      { id: 'tr4', nodoOrigenId: 'raiz', nodoDestinoId: 't4', red: 'AF' },
    ]
    const red: RedHidraulica = { nodos, tramos }

    expect(contarTerminalesFisicosDeLocal(red, 'uf-1', 'local-1', 'AF')).toBe(4)
  })

  it('AF y AC se cuentan de forma independiente, no como una unica red', () => {
    const nodos: Nodo[] = [
      { id: 'raiz' },
      { id: 't1', referencia: referenciaDe('uf-1', 'local-1', 'lavatorio') },
      { id: 't2', referencia: referenciaDe('uf-1', 'local-1', 'inodoro') },
      { id: 't3', referencia: referenciaDe('uf-1', 'local-1', 'ducha') },
    ]
    const tramos: Tramo[] = [
      { id: 'tr1', nodoOrigenId: 'raiz', nodoDestinoId: 't1', red: 'AF' },
      { id: 'tr2', nodoOrigenId: 'raiz', nodoDestinoId: 't2', red: 'AF' },
      { id: 'tr3', nodoOrigenId: 'raiz', nodoDestinoId: 't3', red: 'AC' },
    ]
    const red: RedHidraulica = { nodos, tramos }

    expect(contarTerminalesFisicosDeLocal(red, 'uf-1', 'local-1', 'AF')).toBe(2)
    expect(contarTerminalesFisicosDeLocal(red, 'uf-1', 'local-1', 'AC')).toBe(1)
  })

  it('artefacto con conectividad fisica AF+AC (CRIT-A15, dos Nodos con la misma referencia) cuenta una vez por cada red, nunca como dos artefactos ni colapsado en una sola red', () => {
    // 'ducha' tiene DOS nodos terminales (misma referencia), uno por red
    // -- exactamente como determinarConectividadFisica ya modela AF+AC.
    const nodos: Nodo[] = [
      { id: 'raiz' },
      { id: 't1', referencia: referenciaDe('uf-1', 'local-1', 'lavatorio') },
      { id: 't2-af', referencia: referenciaDe('uf-1', 'local-1', 'ducha') },
      { id: 't2-ac', referencia: referenciaDe('uf-1', 'local-1', 'ducha') },
    ]
    const tramos: Tramo[] = [
      { id: 'tr1', nodoOrigenId: 'raiz', nodoDestinoId: 't1', red: 'AF' },
      { id: 'tr2af', nodoOrigenId: 'raiz', nodoDestinoId: 't2-af', red: 'AF' },
      { id: 'tr2ac', nodoOrigenId: 'raiz', nodoDestinoId: 't2-ac', red: 'AC' },
    ]
    const red: RedHidraulica = { nodos, tramos }

    expect(contarTerminalesFisicosDeLocal(red, 'uf-1', 'local-1', 'AF')).toBe(2)
    expect(contarTerminalesFisicosDeLocal(red, 'uf-1', 'local-1', 'AC')).toBe(1)
  })

  it('nodos de otro Local u otra UF no se cuentan', () => {
    const nodos: Nodo[] = [
      { id: 'raiz' },
      { id: 't1', referencia: referenciaDe('uf-1', 'local-1', 'lavatorio') },
      { id: 't2', referencia: referenciaDe('uf-1', 'local-2', 'inodoro') },
      { id: 't3', referencia: referenciaDe('uf-2', 'local-1', 'lavatorio') },
    ]
    const tramos: Tramo[] = [
      { id: 'tr1', nodoOrigenId: 'raiz', nodoDestinoId: 't1', red: 'AF' },
      { id: 'tr2', nodoOrigenId: 'raiz', nodoDestinoId: 't2', red: 'AF' },
      { id: 'tr3', nodoOrigenId: 'raiz', nodoDestinoId: 't3', red: 'AF' },
    ]
    const red: RedHidraulica = { nodos, tramos }

    expect(contarTerminalesFisicosDeLocal(red, 'uf-1', 'local-1', 'AF')).toBe(1)
  })

  it('0 terminales fisicos en la red (Local sin artefactos de esa red) -> n=0', () => {
    const nodos: Nodo[] = [{ id: 'raiz' }, { id: 't1', referencia: referenciaDe('uf-1', 'local-1', 'lavatorio') }]
    const tramos: Tramo[] = [{ id: 'tr1', nodoOrigenId: 'raiz', nodoDestinoId: 't1', red: 'AF' }]
    const red: RedHidraulica = { nodos, tramos }

    expect(contarTerminalesFisicosDeLocal(red, 'uf-1', 'local-1', 'AC')).toBe(0)
  })
})
