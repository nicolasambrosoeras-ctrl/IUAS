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

  it('Nodo que no bifurca (1->1) -> noEsBifurcacionDeTee (contribución 0 genuina, no incompletitud)', () => {
    const nodos: Nodo[] = [{ id: 'n0' }, { id: 'n-simple' }, { id: 'n1' }]
    const tramos: Tramo[] = [
      { id: 't0', nodoOrigenId: 'n0', nodoDestinoId: 'n-simple', red: 'AF' },
      { id: 't1', nodoOrigenId: 'n-simple', nodoDestinoId: 'n1', red: 'AF' },
    ]
    const red: RedHidraulica = { nodos, tramos }

    expect(resolverClasificacionDeTee(red, 'n-simple', 't1')).toEqual({ tipo: 'noEsBifurcacionDeTee' })
  })

  // M2-TOPO-E §8: 1 entrante + >2 salientes NO es "no aplica" -- es una
  // singularidad real cuya pérdida localizada el modelo actual no puede
  // representar (fuera del alcance 1->2 de ConfiguracionDeTee). Se
  // distingue con su propio `tipo` para que acumularPerdidaLocalizadaDeCamino
  // marque el camino como incompleto en vez de sumar un 0 silencioso.
  it('§8: fan-out 1->3 -> derivacionMultipleNoModelada con cantidadSalidas, nunca noEsBifurcacionDeTee', () => {
    const nodos: Nodo[] = [{ id: 'n0' }, { id: 'n-fan' }, { id: 'n1' }, { id: 'n2' }, { id: 'n3' }]
    const tramos: Tramo[] = [
      { id: 't-in', nodoOrigenId: 'n0', nodoDestinoId: 'n-fan', red: 'AF' },
      { id: 't-a', nodoOrigenId: 'n-fan', nodoDestinoId: 'n1', red: 'AF' },
      { id: 't-b', nodoOrigenId: 'n-fan', nodoDestinoId: 'n2', red: 'AF' },
      { id: 't-c', nodoOrigenId: 'n-fan', nodoDestinoId: 'n3', red: 'AF' },
    ]
    const red: RedHidraulica = { nodos, tramos }

    expect(resolverClasificacionDeTee(red, 'n-fan', 't-a')).toEqual({
      tipo: 'derivacionMultipleNoModelada',
      cantidadSalidas: 3,
    })
    expect(resolverClasificacionDeTee(red, 'n-fan', 't-c')).toEqual({
      tipo: 'derivacionMultipleNoModelada',
      cantidadSalidas: 3,
    })
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

  // M2-TOPO-D §29: el ORDEN del array `tramos` (y por tanto el orden en que
  // aparecen los salientes) NO tiene significado físico recto/lateral -- la
  // clasificación depende sólo de `tramoSalidaRectaId`.
  it('§29: invertir el orden de los tramos salientes en el array no cambia la clasificación', () => {
    const base = redConBifurcacion({ tipo: 'entradaPorExtremo', tramoSalidaRectaId: 't-lateral' })
    const invertida: RedHidraulica = {
      nodos: base.nodos,
      tramos: [base.tramos[0]!, base.tramos[2]!, base.tramos[1]!], // t-lateral antes que t-recta
    }
    for (const red of [base, invertida]) {
      expect(resolverClasificacionDeTee(red, 'n-tee', 't-lateral')).toEqual({
        tipo: 'clasificado',
        idAccesorioTabla07: 'teePasoRecto',
      })
      expect(resolverClasificacionDeTee(red, 'n-tee', 't-recta')).toEqual({
        tipo: 'clasificado',
        idAccesorioTabla07: 'teeSalidaLateral',
      })
    }
  })

  // M2-TOPO-D §35 / M2-TOPO-E §8: si el nodo dejó de ser 1->2 (p. ej. le
  // agregaron una tercera salida), NUNCA lanza -- clasifica sin mirar
  // `tramoSalidaRectaId` de la `tee` vieja, aunque siga presente (defensa
  // en profundidad; `reconciliarTeesTrasCambioTopologico` ya la limpia en
  // el flujo normal). Desde M2-TOPO-E el resultado es
  // `derivacionMultipleNoModelada` (1->3), no `noEsBifurcacionDeTee`: el
  // camino que lo atraviesa queda incompleto, no aparenta relevamiento
  // completo con 0.
  it('§35: nodo que dejó de ser 1->2 con una tee vieja todavía presente -> derivacionMultipleNoModelada, sin throw', () => {
    const red = redConBifurcacion({ tipo: 'entradaPorExtremo', tramoSalidaRectaId: 't-recta' })
    const con1a3: RedHidraulica = {
      nodos: [...red.nodos, { id: 'n3' }],
      tramos: [...red.tramos, { id: 't-extra', nodoOrigenId: 'n-tee', nodoDestinoId: 'n3', red: 'AF' }],
    }
    expect(resolverClasificacionDeTee(con1a3, 'n-tee', 't-recta')).toEqual({
      tipo: 'derivacionMultipleNoModelada',
      cantidadSalidas: 3,
    })
  })
})
