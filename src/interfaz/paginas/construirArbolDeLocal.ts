// Reconstrucción de la topología de un (Local, Red) como árbol, partiendo
// del Tramo principal ya identificado por identificarFilasPrincipalesDeLocales
// (ResultadoHidraulicoDeTramo/identificarFilasDeModulo2.ts). Puramente
// estructural, sin heurística de string de id: cada Tramo principal de un
// Local es "puro" de ese Local (todos los Artefactos aguas abajo
// pertenecen a él, ver localUnicoDeTramo), así que caminar sus Tramos
// salientes recursivamente nunca escapa a otro Local -- no hace falta
// re-verificar pureza en cada nivel.
//
// No asume binariedad: un Nodo con más de 2 salientes (manifold plano,
// como el Baño del proyecto de ejemplo) simplemente aparece con más de 2
// hijos y sin `bifurcacion` (CRIT-A31 solo modela 1→2 -- fuera de ese
// alcance no hay tee que declarar, no es una limitación de este árbol).
import type { RedHidraulica } from '../../modelo/redHidraulica'
import { identificarNodosDeBifurcacion, type NodoDeBifurcacion } from '../../motor/tuberias/topologia/identificarNodosDeBifurcacion'

export type NodoDelArbolDeLocal = {
  readonly tramoId: string
  readonly nodoDestinoId: string
  // Nodo destino terminal (referencia a Artefacto): sin hijos.
  readonly esTerminal: boolean
  // Presente solo si el nodo destino es estructuralmente una tee
  // (CRIT-A31: exactamente 1 tramo entrante + 2 salientes).
  readonly bifurcacion?: NodoDeBifurcacion
  readonly hijos: readonly NodoDelArbolDeLocal[]
}

export function construirArbolDeLocal(redHidraulica: RedHidraulica, tramoRaizId: string): NodoDelArbolDeLocal {
  const nodosPorId = new Map(redHidraulica.nodos.map((nodo) => [nodo.id, nodo]))
  const tramosPorId = new Map(redHidraulica.tramos.map((tramo) => [tramo.id, tramo]))
  const bifurcacionesPorNodo = new Map(identificarNodosDeBifurcacion(redHidraulica).map((b) => [b.nodoId, b]))

  const salientesPorNodo = new Map<string, string[]>()
  for (const tramo of redHidraulica.tramos) {
    const lista = salientesPorNodo.get(tramo.nodoOrigenId) ?? []
    lista.push(tramo.id)
    salientesPorNodo.set(tramo.nodoOrigenId, lista)
  }

  function construir(tramoId: string): NodoDelArbolDeLocal {
    const tramo = tramosPorId.get(tramoId)
    if (tramo === undefined) {
      throw new Error(`construirArbolDeLocal: no existe ningún tramo con id "${tramoId}"`)
    }

    const nodoDestino = nodosPorId.get(tramo.nodoDestinoId)
    const esTerminal = nodoDestino?.referencia?.tipo === 'artefacto'
    if (esTerminal) {
      return { tramoId, nodoDestinoId: tramo.nodoDestinoId, esTerminal: true, hijos: [] }
    }

    const salientesIds = salientesPorNodo.get(tramo.nodoDestinoId) ?? []
    const bifurcacion = bifurcacionesPorNodo.get(tramo.nodoDestinoId)
    return {
      tramoId,
      nodoDestinoId: tramo.nodoDestinoId,
      esTerminal: false,
      ...(bifurcacion !== undefined ? { bifurcacion } : {}),
      hijos: salientesIds.map((id) => construir(id)),
    }
  }

  return construir(tramoRaizId)
}
