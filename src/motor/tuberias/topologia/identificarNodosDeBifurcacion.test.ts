import { describe, it, expect } from 'vitest'
import type { Nodo, RedHidraulica, Tramo } from '../../../modelo/redHidraulica'
import { identificarNodosDeBifurcacion } from './identificarNodosDeBifurcacion'

describe('identificarNodosDeBifurcacion', () => {
  it('nodo con 1 entrante y 2 salientes -> bifurcacion identificada', () => {
    const nodos: Nodo[] = [{ id: 'raiz' }, { id: 'mid' }, { id: 'a' }, { id: 'b' }]
    const tramos: Tramo[] = [
      { id: 't0', nodoOrigenId: 'raiz', nodoDestinoId: 'mid', red: 'AF' },
      { id: 't1', nodoOrigenId: 'mid', nodoDestinoId: 'a', red: 'AF' },
      { id: 't2', nodoOrigenId: 'mid', nodoDestinoId: 'b', red: 'AF' },
    ]
    const red: RedHidraulica = { nodos, tramos }

    expect(identificarNodosDeBifurcacion(red)).toEqual([
      { nodoId: 'mid', tramoEntranteId: 't0', tramosSalientesIds: ['t1', 't2'] },
    ])
  })

  it('nodo con 1 entrante y 1 saliente (sin bifurcar) -> no se identifica', () => {
    const nodos: Nodo[] = [{ id: 'raiz' }, { id: 'mid' }, { id: 'terminal' }]
    const tramos: Tramo[] = [
      { id: 't0', nodoOrigenId: 'raiz', nodoDestinoId: 'mid', red: 'AF' },
      { id: 't1', nodoOrigenId: 'mid', nodoDestinoId: 'terminal', red: 'AF' },
    ]
    const red: RedHidraulica = { nodos, tramos }

    expect(identificarNodosDeBifurcacion(red)).toEqual([])
  })

  it('nodo con 3 salientes (fuera de alcance de tee) -> no se identifica', () => {
    const nodos: Nodo[] = [{ id: 'raiz' }, { id: 'mid' }, { id: 'a' }, { id: 'b' }, { id: 'c' }]
    const tramos: Tramo[] = [
      { id: 't0', nodoOrigenId: 'raiz', nodoDestinoId: 'mid', red: 'AF' },
      { id: 't1', nodoOrigenId: 'mid', nodoDestinoId: 'a', red: 'AF' },
      { id: 't2', nodoOrigenId: 'mid', nodoDestinoId: 'b', red: 'AF' },
      { id: 't3', nodoOrigenId: 'mid', nodoDestinoId: 'c', red: 'AF' },
    ]
    const red: RedHidraulica = { nodos, tramos }

    expect(identificarNodosDeBifurcacion(red)).toEqual([])
  })

  it('raiz sin ningun tramo entrante (0 entrantes) -> no se identifica aunque tenga 2 salientes', () => {
    const nodos: Nodo[] = [{ id: 'raiz' }, { id: 'a' }, { id: 'b' }]
    const tramos: Tramo[] = [
      { id: 't1', nodoOrigenId: 'raiz', nodoDestinoId: 'a', red: 'AF' },
      { id: 't2', nodoOrigenId: 'raiz', nodoDestinoId: 'b', red: 'AF' },
    ]
    const red: RedHidraulica = { nodos, tramos }

    expect(identificarNodosDeBifurcacion(red)).toEqual([])
  })
})
