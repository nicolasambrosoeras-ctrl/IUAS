import { describe, it, expect } from 'vitest'
import type { Nodo, RedHidraulica, Tramo } from '../../modelo/redHidraulica'
import { podarNodosSinSalida } from './podarNodosSinSalida'

describe('podarNodosSinSalida', () => {
  it('elimina una cabecera de bifurcación que quedó sin ningún tramo saliente', () => {
    const nodos: Nodo[] = [{ id: 'n0' }, { id: 'n-af-1' }]
    const tramos: Tramo[] = [{ id: 't0', nodoOrigenId: 'n0', nodoDestinoId: 'n-af-1', red: 'AF' }]
    const red: RedHidraulica = { nodos, tramos }

    const resultado = podarNodosSinSalida(red)

    expect(resultado.nodos.map((n) => n.id)).not.toContain('n-af-1')
    expect(resultado.tramos).toEqual([])
  })

  it('poda en cascada varios niveles de cabeceras childless', () => {
    // n0 -> n1 -> n2 (n2 sin salida): al podar n2 se cae su tramo entrante,
    // n1 queda sin salida y se poda en la siguiente vuelta, y así con n0.
    const nodos: Nodo[] = [{ id: 'n0' }, { id: 'n1' }, { id: 'n2' }]
    const tramos: Tramo[] = [
      { id: 't0', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AF' },
      { id: 't1', nodoOrigenId: 'n1', nodoDestinoId: 'n2', red: 'AF' },
    ]
    const red: RedHidraulica = { nodos, tramos }

    const resultado = podarNodosSinSalida(red)

    expect(resultado.nodos).toEqual([])
    expect(resultado.tramos).toEqual([])
  })

  it('nunca poda un nodo con referencia, aunque quede sin salida', () => {
    const nodos: Nodo[] = [
      { id: 'n0' },
      {
        id: 'n-af-lavatorio',
        referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'local-bano', artefactoId: 'a-1' },
      },
    ]
    const tramos: Tramo[] = [{ id: 't0', nodoOrigenId: 'n0', nodoDestinoId: 'n-af-lavatorio', red: 'AF' }]
    const red: RedHidraulica = { nodos, tramos }

    const resultado = podarNodosSinSalida(red)

    expect(resultado).toEqual(red)
  })

  it('preserva un nodo de produccionACS aunque quede sin ninguna rama AC', () => {
    const nodos: Nodo[] = [{ id: 'n0' }, { id: 'n-acs', referencia: { tipo: 'produccionACS' } }]
    const tramos: Tramo[] = [{ id: 't-af-acs', nodoOrigenId: 'n0', nodoDestinoId: 'n-acs', red: 'AF' }]
    const red: RedHidraulica = { nodos, tramos }

    const resultado = podarNodosSinSalida(red)

    expect(resultado).toEqual(red)
  })

  it('no toca nodos que ya tienen tramos salientes', () => {
    const nodos: Nodo[] = [{ id: 'n0' }, { id: 'n-af-1' }, { id: 'n-af-lavatorio', referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'l-1', artefactoId: 'a-1' } }]
    const tramos: Tramo[] = [
      { id: 't0', nodoOrigenId: 'n0', nodoDestinoId: 'n-af-1', red: 'AF' },
      { id: 't1', nodoOrigenId: 'n-af-1', nodoDestinoId: 'n-af-lavatorio', red: 'AF' },
    ]
    const red: RedHidraulica = { nodos, tramos }

    const resultado = podarNodosSinSalida(red)

    expect(resultado).toEqual(red)
  })
})
