import { describe, it, expect } from 'vitest'
import type { Nodo, RedHidraulica, Tramo } from '../../../modelo/redHidraulica'
import { resolverClasificacionDeTee } from './resolverClasificacionDeTee'

// n0 --t-entrada--> n-tee --t-recta--> n1
//                          --t-lateral--> n2
function redConBifurcacion(tee?: Nodo['tee']): RedHidraulica {
  const nodos: Nodo[] = [
    { id: 'n0' },
    { id: 'n-tee', ...(tee !== undefined ? { tee } : {}) },
    { id: 'n1' },
    { id: 'n2' },
  ]
  const tramos: Tramo[] = [
    { id: 't-entrada', nodoOrigenId: 'n0', nodoDestinoId: 'n-tee', red: 'AF' },
    { id: 't-recta', nodoOrigenId: 'n-tee', nodoDestinoId: 'n1', red: 'AF' },
    { id: 't-lateral', nodoOrigenId: 'n-tee', nodoDestinoId: 'n2', red: 'AF' },
  ]
  return { nodos, tramos }
}

describe('resolverClasificacionDeTee', () => {
  it('entradaPorExtremo: el tramo declarado como recto clasifica teePasoRecto', () => {
    const red = redConBifurcacion({ tipo: 'entradaPorExtremo', tramoSalidaRectaId: 't-recta' })

    expect(resolverClasificacionDeTee(red, 'n-tee', 't-recta')).toEqual({
      tipo: 'clasificado',
      idAccesorioTabla07: 'teePasoRecto',
    })
  })

  it('entradaPorExtremo: el OTRO tramo saliente (no declarado como recto) clasifica teeSalidaLateral automáticamente -- una sola elección determina ambas', () => {
    const red = redConBifurcacion({ tipo: 'entradaPorExtremo', tramoSalidaRectaId: 't-recta' })

    expect(resolverClasificacionDeTee(red, 'n-tee', 't-lateral')).toEqual({
      tipo: 'clasificado',
      idAccesorioTabla07: 'teeSalidaLateral',
    })
  })

  it('entradaCentral: AMBOS tramos salientes clasifican teeEntradaCentralSalidasLaterales, sin necesidad de elegir cuál es cuál', () => {
    const red = redConBifurcacion({ tipo: 'entradaCentral' })

    expect(resolverClasificacionDeTee(red, 'n-tee', 't-recta')).toEqual({
      tipo: 'clasificado',
      idAccesorioTabla07: 'teeEntradaCentralSalidasLaterales',
    })
    expect(resolverClasificacionDeTee(red, 'n-tee', 't-lateral')).toEqual({
      tipo: 'clasificado',
      idAccesorioTabla07: 'teeEntradaCentralSalidasLaterales',
    })
  })

  it('Nodo.tee ausente en una bifurcación real -> sinConfigurar (nunca infiere una clasificación)', () => {
    const red = redConBifurcacion(undefined)

    expect(resolverClasificacionDeTee(red, 'n-tee', 't-recta')).toEqual({ tipo: 'sinConfigurar' })
    expect(resolverClasificacionDeTee(red, 'n-tee', 't-lateral')).toEqual({ tipo: 'sinConfigurar' })
  })

  it('Nodo sin exactamente 1 entrante + 2 salientes -> noEsBifurcacionDeTee (fuera de alcance, no incompletitud)', () => {
    const nodos: Nodo[] = [{ id: 'n0' }, { id: 'n-simple' }, { id: 'n1' }]
    const tramos: Tramo[] = [
      { id: 't0', nodoOrigenId: 'n0', nodoDestinoId: 'n-simple', red: 'AF' },
      { id: 't1', nodoOrigenId: 'n-simple', nodoDestinoId: 'n1', red: 'AF' },
    ]
    const red: RedHidraulica = { nodos, tramos }

    expect(resolverClasificacionDeTee(red, 'n-simple', 't1')).toEqual({ tipo: 'noEsBifurcacionDeTee' })
  })

  it('nodoId inexistente: throw (precondición imposible)', () => {
    const red = redConBifurcacion({ tipo: 'entradaCentral' })

    expect(() => resolverClasificacionDeTee(red, 'n-inexistente', 't-recta')).toThrow(
      /no existe ningún nodo con id "n-inexistente"/,
    )
  })

  it('tramoSalienteId que no es un saliente real de ese nodo: throw (precondición imposible)', () => {
    const red = redConBifurcacion({ tipo: 'entradaCentral' })

    expect(() => resolverClasificacionDeTee(red, 'n-tee', 't-entrada')).toThrow(
      /el tramo "t-entrada" no es un tramo saliente del nodo "n-tee"/,
    )
  })

  it('configuración inválida (tramoSalidaRectaId no pertenece a los dos salientes reales): throw (precondición imposible tras validarRedHidraulica)', () => {
    const red = redConBifurcacion({ tipo: 'entradaPorExtremo', tramoSalidaRectaId: 'tramo-inexistente' })

    expect(() => resolverClasificacionDeTee(red, 'n-tee', 't-recta')).toThrow(
      /tramoSalidaRectaId \("tramo-inexistente"\) que no es ninguno de sus dos tramos salientes/,
    )
  })
})
