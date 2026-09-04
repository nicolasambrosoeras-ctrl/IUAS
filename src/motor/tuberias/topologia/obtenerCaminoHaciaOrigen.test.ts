import { describe, it, expect } from 'vitest'
import type { Nodo, RedHidraulica, Tramo } from '../../../modelo/redHidraulica'
import { obtenerCaminoHaciaOrigen } from './obtenerCaminoHaciaOrigen'

function red(nodos: readonly Nodo[], tramos: readonly Tramo[]): RedHidraulica {
  return { nodos, tramos }
}

function tramo(id: string, nodoOrigenId: string, nodoDestinoId: string): Tramo {
  return { id, nodoOrigenId, nodoDestinoId, red: 'AF' }
}

describe('obtenerCaminoHaciaOrigen', () => {
  it('A. camino simple raiz -> A -> B -> terminal: devuelve el camino en orden hidraulico', () => {
    const nodos: Nodo[] = [{ id: 'raiz' }, { id: 'a' }, { id: 'b' }, { id: 'terminal' }]
    const tramos: Tramo[] = [
      tramo('t1', 'raiz', 'a'),
      tramo('t2', 'a', 'b'),
      tramo('t3', 'b', 'terminal'),
    ]

    const resultado = obtenerCaminoHaciaOrigen(red(nodos, tramos), 'terminal')

    expect(resultado.tipo).toBe('camino')
    if (resultado.tipo !== 'camino') return
    expect(resultado.raizId).toBe('raiz')
    expect(resultado.terminalId).toBe('terminal')
    expect(resultado.nodos.map((nodo) => nodo.id)).toEqual(['raiz', 'a', 'b', 'terminal'])
    expect(resultado.tramos.map((t) => t.id)).toEqual(['t1', 't2', 't3'])
    // Invariante de orden: tramos[i] conecta nodos[i] -> nodos[i+1].
    resultado.tramos.forEach((t, i) => {
      expect(t.nodoOrigenId).toBe(resultado.nodos[i]!.id)
      expect(t.nodoDestinoId).toBe(resultado.nodos[i + 1]!.id)
    })
  })

  it('B. bifurcacion aguas abajo: una raiz alimenta dos ramas; cada terminal conserva un camino unico', () => {
    const nodos: Nodo[] = [{ id: 'raiz' }, { id: 'hub' }, { id: 'term-1' }, { id: 'term-2' }]
    const tramos: Tramo[] = [
      tramo('t0', 'raiz', 'hub'),
      tramo('t1', 'hub', 'term-1'),
      tramo('t2', 'hub', 'term-2'),
    ]

    const r1 = obtenerCaminoHaciaOrigen(red(nodos, tramos), 'term-1')
    const r2 = obtenerCaminoHaciaOrigen(red(nodos, tramos), 'term-2')

    expect(r1.tipo).toBe('camino')
    expect(r2.tipo).toBe('camino')
    if (r1.tipo !== 'camino' || r2.tipo !== 'camino') return
    expect(r1.nodos.map((n) => n.id)).toEqual(['raiz', 'hub', 'term-1'])
    expect(r1.tramos.map((t) => t.id)).toEqual(['t0', 't1'])
    expect(r2.nodos.map((n) => n.id)).toEqual(['raiz', 'hub', 'term-2'])
    expect(r2.tramos.map((t) => t.id)).toEqual(['t0', 't2'])
  })

  it('C. dos componentes independientes: consultar un terminal resuelve solo su componente', () => {
    const nodos: Nodo[] = [
      { id: 'raiz-x' },
      { id: 'term-x' },
      { id: 'raiz-y' },
      { id: 'term-y' },
    ]
    const tramos: Tramo[] = [tramo('tx', 'raiz-x', 'term-x'), tramo('ty', 'raiz-y', 'term-y')]

    const resultado = obtenerCaminoHaciaOrigen(red(nodos, tramos), 'term-x')

    expect(resultado.tipo).toBe('camino')
    if (resultado.tipo !== 'camino') return
    expect(resultado.raizId).toBe('raiz-x')
    expect(resultado.nodos.map((n) => n.id)).toEqual(['raiz-x', 'term-x'])
    expect(resultado.tramos.map((t) => t.id)).toEqual(['tx'])
  })

  it('D. convergencia: dos tramos distintos entran a un nodo aguas arriba del terminal -> no resoluble', () => {
    const nodos: Nodo[] = [
      { id: 'raiz-a' },
      { id: 'raiz-b' },
      { id: 'union' },
      { id: 'terminal' },
    ]
    const tramos: Tramo[] = [
      tramo('ta', 'raiz-a', 'union'),
      tramo('tb', 'raiz-b', 'union'),
      tramo('tt', 'union', 'terminal'),
    ]

    const resultado = obtenerCaminoHaciaOrigen(red(nodos, tramos), 'terminal')

    expect(resultado.tipo).toBe('multiplesTramosEntrantes')
    if (resultado.tipo !== 'multiplesTramosEntrantes') return
    expect(resultado.nodoId).toBe('union')
    expect([...resultado.tramosEntrantesIds].sort()).toEqual(['ta', 'tb'])
  })

  it('D bis. convergencia directamente en el nodo terminal consultado -> no resoluble', () => {
    const nodos: Nodo[] = [{ id: 'raiz-a' }, { id: 'raiz-b' }, { id: 'terminal' }]
    const tramos: Tramo[] = [tramo('ta', 'raiz-a', 'terminal'), tramo('tb', 'raiz-b', 'terminal')]

    const resultado = obtenerCaminoHaciaOrigen(red(nodos, tramos), 'terminal')

    expect(resultado.tipo).toBe('multiplesTramosEntrantes')
    if (resultado.tipo !== 'multiplesTramosEntrantes') return
    expect(resultado.nodoId).toBe('terminal')
    expect([...resultado.tramosEntrantesIds].sort()).toEqual(['ta', 'tb'])
  })

  it('E. tramos paralelos A -> B: dos Tramo distintos entre los mismos nodos -> no se elige uno arbitrariamente', () => {
    const nodos: Nodo[] = [{ id: 'raiz' }, { id: 'a' }, { id: 'terminal' }]
    const tramos: Tramo[] = [
      tramo('t-raiz', 'raiz', 'a'),
      tramo('t-par-1', 'a', 'terminal'),
      tramo('t-par-2', 'a', 'terminal'),
    ]

    const resultado = obtenerCaminoHaciaOrigen(red(nodos, tramos), 'terminal')

    expect(resultado.tipo).toBe('multiplesTramosEntrantes')
    if (resultado.tipo !== 'multiplesTramosEntrantes') return
    expect(resultado.nodoId).toBe('terminal')
    expect([...resultado.tramosEntrantesIds].sort()).toEqual(['t-par-1', 't-par-2'])
  })

  it('F. ciclo en la ascendencia: se detecta la repeticion de nodo y termina sin loop infinito', () => {
    // a -> b -> c -> a (ciclo), y c -> terminal. Ningun nodo del ciclo es raiz.
    const nodos: Nodo[] = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'terminal' }]
    const tramos: Tramo[] = [
      tramo('t-ab', 'a', 'b'),
      tramo('t-bc', 'b', 'c'),
      tramo('t-ca', 'c', 'a'),
      tramo('t-ct', 'c', 'terminal'),
    ]

    const resultado = obtenerCaminoHaciaOrigen(red(nodos, tramos), 'terminal')

    expect(resultado.tipo).toBe('ciclo')
    if (resultado.tipo !== 'ciclo') return
    // El walk vuelve a 'c' tras recorrer terminal <- c <- b <- a <- (c):
    // 'c' es el nodo ya visitado al que se regresa.
    expect(resultado.nodoId).toBe('c')
  })

  it('F bis. ciclo puro sin ninguna raiz: termina en estado ciclo, no en loop infinito', () => {
    const nodos: Nodo[] = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
    const tramos: Tramo[] = [tramo('t-ab', 'a', 'b'), tramo('t-bc', 'b', 'c'), tramo('t-ca', 'c', 'a')]

    const resultado = obtenerCaminoHaciaOrigen(red(nodos, tramos), 'c')

    expect(resultado.tipo).toBe('ciclo')
  })

  it('G. raiz inmediata: el nodo consultado no tiene tramo entrante -> camino de un solo nodo', () => {
    const nodos: Nodo[] = [{ id: 'raiz' }, { id: 'otro' }]
    const tramos: Tramo[] = [tramo('t1', 'raiz', 'otro')]

    const resultado = obtenerCaminoHaciaOrigen(red(nodos, tramos), 'raiz')

    expect(resultado.tipo).toBe('camino')
    if (resultado.tipo !== 'camino') return
    expect(resultado.raizId).toBe('raiz')
    expect(resultado.terminalId).toBe('raiz')
    expect(resultado.nodos.map((n) => n.id)).toEqual(['raiz'])
    expect(resultado.tramos).toEqual([])
  })

  it('H. nodoTerminalId inexistente lanza excepcion', () => {
    const nodos: Nodo[] = [{ id: 'raiz' }]
    const tramos: Tramo[] = []

    expect(() => obtenerCaminoHaciaOrigen(red(nodos, tramos), 'inexistente')).toThrow()
  })

  it('I. nodos intermedios se preservan con su referencia (produccionACS y artefacto) en el camino', () => {
    const nodos: Nodo[] = [
      { id: 'raiz', cota_m: 0 },
      { id: 'n-acs', referencia: { tipo: 'produccionACS' }, cota_m: 3 },
      {
        id: 'terminal',
        referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'l-1', artefactoId: 'art-1' },
        cota_m: 6,
      },
    ]
    const tramos: Tramo[] = [
      { id: 't-af-acs', nodoOrigenId: 'raiz', nodoDestinoId: 'n-acs', red: 'AF' },
      { id: 't-ac', nodoOrigenId: 'n-acs', nodoDestinoId: 'terminal', red: 'AC' },
    ]

    const resultado = obtenerCaminoHaciaOrigen(red(nodos, tramos), 'terminal')

    expect(resultado.tipo).toBe('camino')
    if (resultado.tipo !== 'camino') return
    expect(resultado.nodos.map((n) => n.id)).toEqual(['raiz', 'n-acs', 'terminal'])
    expect(resultado.nodos[1]!.referencia).toEqual({ tipo: 'produccionACS' })
    expect(resultado.nodos.map((n) => n.cota_m)).toEqual([0, 3, 6])
    expect(resultado.tramos.map((t) => t.red)).toEqual(['AF', 'AC'])
  })
})
