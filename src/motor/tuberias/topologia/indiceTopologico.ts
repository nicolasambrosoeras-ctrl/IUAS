// Índice topológico DERIVADO e inmutable de una RedHidraulica
// (PERF-SCALE-01A). No es una segunda topología: RedHidraulica sigue siendo
// la única fuente de verdad física (M2-TOPO-01). Este índice sólo
// materializa, UNA vez por resolución, las tres proyecciones que los
// traversals del motor reconstruían en CADA llamada:
//
//   nodosPorId              : id -> Nodo            (reemplaza red.nodos.find)
//   tramosPorId             : id -> Tramo           (reemplaza red.tramos.find)
//   tramosSalientesPorNodo  : nodoOrigenId -> Tramo[]  (adyacencia aguas abajo)
//
// `tramosSalientesPorNodo` PRESERVA el orden de declaración de
// `red.tramos`: los DFS del motor dependen de recorrer los salientes en
// orden inverso al de la pila LIFO para visitar primero el primer tramo
// declarado (mismo criterio que obtenerArtefactosAguasAbajo /
// determinarCondicionHidraulicaDeCaudal antes de este slice).
//
// Coste O(nodos + tramos). El índice es de sólo lectura: no se muta tras
// construirlo, así que compartirlo dentro de una resolución no introduce
// estado stale (no hay invalidación que gestionar -- si la red cambia, se
// construye otro índice).
import type { Nodo, RedHidraulica, Tramo } from '../../../modelo/redHidraulica'
import { registrarIndiceTopologicoCreado } from './instrumentacionTopologica'

export interface IndiceTopologico {
  readonly nodosPorId: ReadonlyMap<string, Nodo>
  readonly tramosPorId: ReadonlyMap<string, Tramo>
  readonly tramosSalientesPorNodo: ReadonlyMap<string, readonly Tramo[]>
}

export function crearIndiceTopologico(redHidraulica: RedHidraulica): IndiceTopologico {
  registrarIndiceTopologicoCreado()

  const nodosPorId = new Map<string, Nodo>()
  for (const nodo of redHidraulica.nodos) {
    nodosPorId.set(nodo.id, nodo)
  }

  const tramosPorId = new Map<string, Tramo>()
  const tramosSalientesPorNodo = new Map<string, Tramo[]>()
  for (const tramo of redHidraulica.tramos) {
    tramosPorId.set(tramo.id, tramo)
    const salientes = tramosSalientesPorNodo.get(tramo.nodoOrigenId)
    if (salientes === undefined) {
      tramosSalientesPorNodo.set(tramo.nodoOrigenId, [tramo])
    } else {
      salientes.push(tramo)
    }
  }

  return { nodosPorId, tramosPorId, tramosSalientesPorNodo }
}
