import { describe, it, expect } from 'vitest'
import type { Local } from '../../../modelo/proyecto'
import type { Nodo, RedHidraulica, Tramo } from '../../../modelo/redHidraulica'
import { contarSobrepasosDeLocalPorRed } from './contarSobrepasosDeLocalPorRed'

function local(artefactos: Local['artefactos']): Local {
  return { id: 'local-1', tipo: 'bano', regimen: 'domiciliario', artefactos }
}

describe('contarSobrepasosDeLocalPorRed', () => {
  it('Artefacto sólo AF -> 1 sobrepaso asignado a AF, ninguno a AC', () => {
    const nodos: Nodo[] = [{ id: 'n0' }, { id: 'n1', referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'local-1', artefactoId: 'inst-1' } }]
    const tramos: Tramo[] = [{ id: 't0', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AF', longitud_m: 1 }]
    const redHidraulica: RedHidraulica = { nodos, tramos }
    const l = local([{ id: 'inst-1', artefactoId: 'lavatorio', cantidad: 1, origen: 'normativo' }])

    expect(contarSobrepasosDeLocalPorRed(redHidraulica, l, 'uf-1', 'local-1', 'AF')).toBe(1)
    expect(contarSobrepasosDeLocalPorRed(redHidraulica, l, 'uf-1', 'local-1', 'AC')).toBe(0)
  })

  it('Artefacto sólo AC -> 1 sobrepaso asignado a AC, ninguno a AF', () => {
    const nodos: Nodo[] = [{ id: 'n0' }, { id: 'n1', referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'local-1', artefactoId: 'inst-1' } }]
    const tramos: Tramo[] = [{ id: 't0', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AC', longitud_m: 1 }]
    const redHidraulica: RedHidraulica = { nodos, tramos }
    const l = local([{ id: 'inst-1', artefactoId: 'receptaculoDucha', cantidad: 1, origen: 'normativo' }])

    expect(contarSobrepasosDeLocalPorRed(redHidraulica, l, 'uf-1', 'local-1', 'AC')).toBe(1)
    expect(contarSobrepasosDeLocalPorRed(redHidraulica, l, 'uf-1', 'local-1', 'AF')).toBe(0)
  })

  it('Artefacto AF+AC -> un único sobrepaso, siempre asignado a AC (nunca 2, nunca a AF)', () => {
    const nodos: Nodo[] = [
      { id: 'n0' },
      { id: 'n1af', referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'local-1', artefactoId: 'inst-1' } },
      { id: 'n1ac', referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'local-1', artefactoId: 'inst-1' } },
    ]
    const tramos: Tramo[] = [
      { id: 't0af', nodoOrigenId: 'n0', nodoDestinoId: 'n1af', red: 'AF', longitud_m: 1 },
      { id: 't0ac', nodoOrigenId: 'n0', nodoDestinoId: 'n1ac', red: 'AC', longitud_m: 1 },
    ]
    const redHidraulica: RedHidraulica = { nodos, tramos }
    const l = local([{ id: 'inst-1', artefactoId: 'receptaculoDucha', cantidad: 1, origen: 'normativo' }])

    expect(contarSobrepasosDeLocalPorRed(redHidraulica, l, 'uf-1', 'local-1', 'AC')).toBe(1)
    expect(contarSobrepasosDeLocalPorRed(redHidraulica, l, 'uf-1', 'local-1', 'AF')).toBe(0)
  })

  it('pondera por Artefacto.cantidad (cantidad=3 pesa 3, no 1)', () => {
    const nodos: Nodo[] = [{ id: 'n0' }, { id: 'n1', referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'local-1', artefactoId: 'inst-1' } }]
    const tramos: Tramo[] = [{ id: 't0', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AF', longitud_m: 1 }]
    const redHidraulica: RedHidraulica = { nodos, tramos }
    const l = local([{ id: 'inst-1', artefactoId: 'lavatorio', cantidad: 3, origen: 'normativo' }])

    expect(contarSobrepasosDeLocalPorRed(redHidraulica, l, 'uf-1', 'local-1', 'AF')).toBe(3)
  })

  it('sin terminales físicos en la red -> 0, no requiere ningún dato adicional', () => {
    const redHidraulica: RedHidraulica = { nodos: [], tramos: [] }
    const l = local([])
    expect(contarSobrepasosDeLocalPorRed(redHidraulica, l, 'uf-1', 'local-1', 'AF')).toBe(0)
  })
})
