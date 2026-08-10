import { describe, it, expect } from 'vitest'
import type { Nodo, RedHidraulica, ReferenciaDeArtefacto, Tramo } from '../../../modelo/redHidraulica'
import { determinarConectividadFisica } from './determinarConectividadFisica'

function referenciaDe(unidadFuncionalId: string, localId: string, artefactoId: string): ReferenciaDeArtefacto {
  return { tipo: 'artefacto', unidadFuncionalId, localId, artefactoId }
}

describe('determinarConectividadFisica', () => {
  it('A. único terminal alimentado por Tramo AF: soloAF', () => {
    const lavatorio = referenciaDe('uf-1', 'local-bano', 'lavatorio')
    const nodos: Nodo[] = [{ id: 'n0' }, { id: 'n1', referencia: lavatorio }]
    const tramos: Tramo[] = [{ id: 't0', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AF' }]
    const red: RedHidraulica = { nodos, tramos }

    expect(determinarConectividadFisica(red, lavatorio)).toBe('soloAF')
  })

  it('B. único terminal alimentado por Tramo AC: soloAC', () => {
    const lavatorio = referenciaDe('uf-1', 'local-bano', 'lavatorio')
    const nodos: Nodo[] = [{ id: 'n0' }, { id: 'n1', referencia: lavatorio }]
    const tramos: Tramo[] = [{ id: 't0', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AC' }]
    const red: RedHidraulica = { nodos, tramos }

    expect(determinarConectividadFisica(red, lavatorio)).toBe('soloAC')
  })

  it('C. dos nodos terminales con la misma referencia, uno AF y uno AC: ambas', () => {
    const lavatorio = referenciaDe('uf-1', 'local-bano', 'lavatorio')
    const nodos: Nodo[] = [
      { id: 'n0' },
      { id: 'n1', referencia: lavatorio },
      { id: 'n2', referencia: { tipo: 'produccionACS' } },
      { id: 'n3', referencia: lavatorio },
    ]
    const tramos: Tramo[] = [
      { id: 't0', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AF' },
      { id: 't1', nodoOrigenId: 'n0', nodoDestinoId: 'n2', red: 'AF' },
      { id: 't2', nodoOrigenId: 'n2', nodoDestinoId: 'n3', red: 'AC' },
    ]
    const red: RedHidraulica = { nodos, tramos }

    expect(determinarConectividadFisica(red, lavatorio)).toBe('ambas')
  })

  it('D. identidad completa: dos artefactos con mismo artefactoId pero distinta UF/Local no se confunden', () => {
    const refUf1 = referenciaDe('uf-1', 'local-x', 'artefacto-x')
    const refUf2 = referenciaDe('uf-2', 'local-x', 'artefacto-x')
    const nodos: Nodo[] = [
      { id: 'n0' },
      { id: 'n1', referencia: refUf1 },
      { id: 'n2', referencia: refUf2 },
    ]
    const tramos: Tramo[] = [
      { id: 't0', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AF' },
      { id: 't1', nodoOrigenId: 'n0', nodoDestinoId: 'n2', red: 'AC' },
    ]
    const red: RedHidraulica = { nodos, tramos }

    expect(determinarConectividadFisica(red, refUf1)).toBe('soloAF')
    expect(determinarConectividadFisica(red, refUf2)).toBe('soloAC')
  })

  it('nodo terminal sin ningún Tramo entrante: no aporta a la clasificación (equivale a no conectado)', () => {
    const lavatorio = referenciaDe('uf-1', 'local-bano', 'lavatorio')
    // n1 tiene la referencia pero ningún Tramo lo tiene como nodoDestinoId;
    // n2 sí tiene un Tramo entrante AF -- la clasificación depende solo de
    // los terminales efectivamente alcanzables, no de la mera presencia del Nodo.
    const nodos: Nodo[] = [{ id: 'n0' }, { id: 'n1', referencia: lavatorio }, { id: 'n2', referencia: lavatorio }]
    const tramos: Tramo[] = [{ id: 't0', nodoOrigenId: 'n0', nodoDestinoId: 'n2', red: 'AF' }]
    const red: RedHidraulica = { nodos, tramos }

    expect(determinarConectividadFisica(red, lavatorio)).toBe('soloAF')
  })

  it('referencia sin ningún terminal en la red: lanza excepción explícita', () => {
    const inexistente = referenciaDe('uf-1', 'local-bano', 'no-existe')
    const red: RedHidraulica = { nodos: [{ id: 'n0' }], tramos: [] }

    expect(() => determinarConectividadFisica(red, inexistente)).toThrow(/ningún terminal físico alcanzable/)
  })
})
