// Determina la conectividad física global de un Artefacto en la
// RedHidraulica (CRIT-A15): a diferencia de determinarCondicionHidraulicaDeCaudal
// (que responde "desde este Tramo, ¿cómo se alcanza este Artefacto?", una
// pregunta relativa al Tramo evaluado), esta función responde una pregunta
// distinta y no relativa a ningún Tramo: "¿qué terminales físicos existen
// para esta referencia en toda la red?". Inspección estructural directa
// (Nodo → tramo entrante → Tramo.red), sin reutilizar el traversal de
// determinarCondicionHidraulicaDeCaudal ni el catálogo normativo.
import type { RedDeTramo, RedHidraulica, ReferenciaDeArtefacto } from '../../../modelo/redHidraulica'

export type ConectividadFisica = 'soloAF' | 'soloAC' | 'ambas'

function esMismaReferencia(a: ReferenciaDeArtefacto, b: ReferenciaDeArtefacto): boolean {
  return a.unidadFuncionalId === b.unidadFuncionalId && a.localId === b.localId && a.artefactoId === b.artefactoId
}

export function determinarConectividadFisica(
  redHidraulica: RedHidraulica,
  referencia: ReferenciaDeArtefacto,
): ConectividadFisica {
  const nodosTerminales = redHidraulica.nodos.filter(
    (nodo) => nodo.referencia?.tipo === 'artefacto' && esMismaReferencia(nodo.referencia, referencia),
  )
  const idsDeNodosTerminales = new Set(nodosTerminales.map((nodo) => nodo.id))

  // Nodos terminales sin ningún Tramo que los tenga como nodoDestinoId no
  // aportan ninguna red a la clasificación (equivalen a "no conectados" a
  // efectos de conectividad física): no es un estado inventado, surge
  // directamente de no encontrar coincidencias en este filtro.
  const redesDeConexion = new Set<RedDeTramo>(
    redHidraulica.tramos.filter((tramo) => idsDeNodosTerminales.has(tramo.nodoDestinoId)).map((tramo) => tramo.red),
  )

  // Precondición imposible en el uso real: resolverAportesHidraulicosDeTramo
  // solo invoca esta función para referencias ya alcanzadas por
  // obtenerArtefactosAguasAbajo, que garantiza al menos un Tramo entrante
  // vivo hacia algún terminal de esa referencia. Error explícito en vez de
  // una política silenciosa para una referencia sin ningún terminal
  // físicamente conectado -- mismo criterio que el resto del motor.
  if (redesDeConexion.size === 0) {
    throw new Error(
      `determinarConectividadFisica: no existe ningún terminal físico alcanzable para la referencia ` +
        `(unidadFuncionalId="${referencia.unidadFuncionalId}", localId="${referencia.localId}", ` +
        `artefactoId="${referencia.artefactoId}")`,
    )
  }

  if (redesDeConexion.size === 2) {
    return 'ambas'
  }

  return redesDeConexion.has('AF') ? 'soloAF' : 'soloAC'
}
