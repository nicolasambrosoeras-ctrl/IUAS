// Punto de inserción físico deducible para un nuevo terminal de un Local
// en una Red dada (M2-D, sincronización funcional -> hidráulica): NO
// introduce ningún concepto nuevo de "cabecera" persistida -- deriva,
// desde la topología ya existente, el único nodo del que dependerían
// hoy TODOS los terminales ya conectados de ese (unidadFuncionalId,
// localId) en esa Red.
//
// Generalización robusta de "ancestro común inmediato": cuando un Local
// tiene >=2 artefactos de una Red comparte un nodo de bifurcación
// explícito (p. ej. n-af-1 del demo), ese nodo ES el resultado. Cuando
// tiene exactamente 1, no existe ningún nodo de bifurcación dedicado --
// el resultado es directamente el nodo del que cuelga ese único terminal
// (p. ej. n-0/n-acs), sin necesidad de "retrofit" ninguno: agregar un
// nuevo hermano ahí es topológicamente valido sin tocar la rama
// existente. Si los terminales ya conectados de ese Local no comparten
// un único origen (dato manualmente editado en una forma inusual), o si
// el Local todavía no tiene ningún terminal de esa Red, no hay resultado
// -- nunca se elige arbitrariamente entre varias posibilidades ni se
// inventa un punto de inserción.
import type { RedDeTramo, RedHidraulica } from '../../../modelo/redHidraulica'

export type ResultadoInsercionDeLocal =
  | {
      readonly tipo: 'nodo'
      readonly nodoId: string
    }
  | {
      // El Local todavía no tiene ningún terminal conectado a esa Red:
      // no hay de dónde derivar el punto de inserción sin inventarlo.
      readonly tipo: 'sinConexionExistente'
    }
  | {
      // Los terminales ya conectados de ese Local en esa Red no
      // comparten un único nodo de origen -- topología real pero
      // ambigua para este propósito. Nunca se elige uno arbitrariamente.
      readonly tipo: 'ambiguo'
      readonly nodosOrigenPosibles: readonly string[]
    }

export function hallarNodoDeInsercionDeLocal(
  redHidraulica: RedHidraulica,
  unidadFuncionalId: string,
  localId: string,
  red: RedDeTramo,
): ResultadoInsercionDeLocal {
  const idsNodosDelLocal = new Set(
    redHidraulica.nodos
      .filter(
        (nodo) =>
          nodo.referencia?.tipo === 'artefacto' &&
          nodo.referencia.unidadFuncionalId === unidadFuncionalId &&
          nodo.referencia.localId === localId,
      )
      .map((nodo) => nodo.id),
  )

  const nodosOrigen = new Set<string>()
  for (const tramo of redHidraulica.tramos) {
    if (tramo.red === red && idsNodosDelLocal.has(tramo.nodoDestinoId)) {
      nodosOrigen.add(tramo.nodoOrigenId)
    }
  }

  if (nodosOrigen.size === 0) {
    return { tipo: 'sinConexionExistente' }
  }
  if (nodosOrigen.size > 1) {
    return { tipo: 'ambiguo', nodosOrigenPosibles: [...nodosOrigen] }
  }

  return { tipo: 'nodo', nodoId: [...nodosOrigen][0] as string }
}
