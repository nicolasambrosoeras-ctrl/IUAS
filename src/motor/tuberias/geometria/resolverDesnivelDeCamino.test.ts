import { describe, it, expect } from 'vitest'
import type { Nodo, Tramo } from '../../../modelo/redHidraulica'
import type { CaminoHaciaOrigen } from '../topologia/obtenerCaminoHaciaOrigen'
import { resolverDesnivelDeCamino } from './resolverDesnivelDeCamino'

function camino(nodos: readonly Nodo[]): CaminoHaciaOrigen {
  const tramos: Tramo[] = nodos.slice(1).map((nodo, i) => ({
    id: `t${i}`,
    nodoOrigenId: nodos[i]!.id,
    nodoDestinoId: nodo.id,
    red: 'AF',
  }))
  return {
    tipo: 'camino',
    nodos,
    tramos,
    raizId: nodos[0]!.id,
    terminalId: nodos[nodos.length - 1]!.id,
  }
}

describe('resolverDesnivelDeCamino', () => {
  it('ascenso: terminal mas alto que la raiz -> desnivel_m positivo', () => {
    const resultado = resolverDesnivelDeCamino(
      camino([
        { id: 'raiz', cota_m: 0 },
        { id: 'a', cota_m: 3 },
        { id: 'terminal', cota_m: 6 },
      ]),
    )

    expect(resultado).toEqual({ tipo: 'resuelto', desnivel_m: 6, cotaRaiz_m: 0, cotaTerminal_m: 6 })
  })

  it('descenso: terminal mas bajo que la raiz -> desnivel_m negativo (signo conservado)', () => {
    const resultado = resolverDesnivelDeCamino(
      camino([
        { id: 'raiz', cota_m: 10 },
        { id: 'terminal', cota_m: 4 },
      ]),
    )

    expect(resultado).toEqual({ tipo: 'resuelto', desnivel_m: -6, cotaRaiz_m: 10, cotaTerminal_m: 4 })
  })

  it('endpoint-only: nodos intermedios sin cota_m no impiden resolver el Δz de extremos', () => {
    const resultado = resolverDesnivelDeCamino(
      camino([
        { id: 'raiz', cota_m: 1 },
        { id: 'a' },
        { id: 'b' },
        { id: 'terminal', cota_m: 9 },
      ]),
    )

    expect(resultado).toEqual({ tipo: 'resuelto', desnivel_m: 8, cotaRaiz_m: 1, cotaTerminal_m: 9 })
  })

  it('raiz sin cota_m -> incompleto, ausencia nunca se interpreta como 0', () => {
    const resultado = resolverDesnivelDeCamino(
      camino([{ id: 'raiz' }, { id: 'terminal', cota_m: 5 }]),
    )

    expect(resultado).toEqual({ tipo: 'incompleto', nodosSinCota: ['raiz'] })
  })

  it('terminal sin cota_m -> incompleto', () => {
    const resultado = resolverDesnivelDeCamino(
      camino([{ id: 'raiz', cota_m: 5 }, { id: 'terminal' }]),
    )

    expect(resultado).toEqual({ tipo: 'incompleto', nodosSinCota: ['terminal'] })
  })

  it('raiz y terminal sin cota_m -> incompleto con ambos nodos', () => {
    const resultado = resolverDesnivelDeCamino(
      camino([{ id: 'raiz' }, { id: 'medio', cota_m: 2 }, { id: 'terminal' }]),
    )

    expect(resultado).toEqual({ tipo: 'incompleto', nodosSinCota: ['raiz', 'terminal'] })
  })

  it('raiz inmediata (un solo nodo) con cota_m -> desnivel_m 0', () => {
    const resultado = resolverDesnivelDeCamino({
      tipo: 'camino',
      nodos: [{ id: 'raiz', cota_m: 4 }],
      tramos: [],
      raizId: 'raiz',
      terminalId: 'raiz',
    })

    expect(resultado).toEqual({ tipo: 'resuelto', desnivel_m: 0, cotaRaiz_m: 4, cotaTerminal_m: 4 })
  })

  it('raiz inmediata sin cota_m -> incompleto con el nodo una sola vez', () => {
    const resultado = resolverDesnivelDeCamino({
      tipo: 'camino',
      nodos: [{ id: 'raiz' }],
      tramos: [],
      raizId: 'raiz',
      terminalId: 'raiz',
    })

    expect(resultado).toEqual({ tipo: 'incompleto', nodosSinCota: ['raiz'] })
  })

  it('cota_m = 0 es un valor valido, no ausencia', () => {
    const resultado = resolverDesnivelDeCamino(
      camino([{ id: 'raiz', cota_m: 0 }, { id: 'terminal', cota_m: 0 }]),
    )

    expect(resultado).toEqual({ tipo: 'resuelto', desnivel_m: 0, cotaRaiz_m: 0, cotaTerminal_m: 0 })
  })
})
