// Clasificación estructural (sin heurística de string de id) de qué Tramos
// de RedHidraulica representan DISTRIBUCIÓN COMPARTIDA / SECUNDARIA:
// transportan agua hacia artefactos de MÁS DE UN Local sin ser la
// Alimentación general (raíz de toda la topología) ni la Alimentación ACS.
// Primera pieza de M2-TOPO-01 (slice A).
//
// Nomenclatura deliberadamente NEUTRAL: "distribución compartida" NO es
// sinónimo de "montante". Un Tramo así puede ser un montante vertical, un
// colector, un ramal común horizontal o cualquier tronco que sirva a
// varios Locales. Este slice sólo identifica la condición estructural; la
// identidad física ("esto es el Montante AF 1"), su denominación amigable
// y cualquier rol persistido quedan diferidos a M2-TOPO-C (ver
// PENDIENTES-DE-ARQUITECTURA.md, M2-TOPO-01). Esta función NO participa
// todavía de ningún cálculo hidráulico ni de la enumeración de filas de la
// UI de Módulo 2 (eso es M2-TOPO-B): hoy es sólo un clasificador de
// dominio.
//
// Un montante SEGMENTADO produce VARIOS Tramos compartidos -- uno por cada
// segmento que todavía alcanza >1 Local. El último segmento, que ya sólo
// alimenta un Local, deja de ser compartido y pasa a ser feed de ese Local
// (lo reconoce identificarTramoRepresentativoDeLocal.ts). No se asume "un
// único Tramo por montante".
//
// Reutiliza obtenerArtefactosAguasAbajo (traversal DFS ya cerrado, protege
// ciclos) y la MISMA señal estructural de "Distribución general / ACS" que
// identificarFilasDeModulo2.ts e identificarTramoRepresentativoDeLocal.ts
// (raíz = Tramo cuyo nodoOrigenId nunca es nodoDestinoId de otro Tramo;
// ACS = destino con referencia produccionACS) -- sin depender de ningún id
// literal de la topología del proyecto de ejemplo. Ese criterio se
// re-deriva acá en unas pocas líneas, mismo patrón que ya usa
// identificarTramoRepresentativoDeLocal.ts, en vez de extraer una
// infraestructura compartida que hoy tendría un contrato todavía en
// formación.
import type { Proyecto } from '../../../modelo/proyecto'
import type { Nodo, Tramo } from '../../../modelo/redHidraulica'
import { obtenerArtefactosAguasAbajo } from './obtenerArtefactosAguasAbajo'

// Un Tramo pertenece a la Distribución general cuando su nodo de origen no
// tiene ningún tramo entrante (raíz de toda la topología) o cuando su nodo
// de destino referencia produccionACS (Alimentación ACS, D-δ.7). Ninguno
// de los dos es "distribución compartida secundaria" aunque su conjunto
// aguas abajo alcance varios Locales.
function esAlimentacionGeneralOAcs(
  idsConTramoEntrante: ReadonlySet<string>,
  nodosPorId: ReadonlyMap<string, Nodo>,
  tramo: Tramo,
): boolean {
  if (!idsConTramoEntrante.has(tramo.nodoOrigenId)) {
    return true
  }
  return nodosPorId.get(tramo.nodoDestinoId)?.referencia?.tipo === 'produccionACS'
}

function alcanzaMasDeUnLocal(proyecto: Proyecto, tramoId: string): boolean {
  const referencias = obtenerArtefactosAguasAbajo(proyecto, tramoId)
  // JSON.stringify de la tupla (unidadFuncionalId, localId): la identidad
  // real del Local -- localId solo no es globalmente único entre UF
  // (UF1/Baño y UF2/Baño son Locales distintos). Mismo criterio de clave
  // que el resto del motor.
  const localesAguasAbajo = new Set(
    referencias.map((referencia) => JSON.stringify([referencia.unidadFuncionalId, referencia.localId])),
  )
  return localesAguasAbajo.size > 1
}

function clasificarTramo(
  proyecto: Proyecto,
  idsConTramoEntrante: ReadonlySet<string>,
  nodosPorId: ReadonlyMap<string, Nodo>,
  tramo: Tramo,
): boolean {
  if (esAlimentacionGeneralOAcs(idsConTramoEntrante, nodosPorId, tramo)) {
    return false
  }
  return alcanzaMasDeUnLocal(proyecto, tramo.id)
}

// ¿Este Tramo puntual es de distribución compartida? Precondición (mismo
// contrato que el resto del motor de tuberías): el Proyecto ya pasó
// validarRedHidraulica -- un tramoId inexistente es un error de uso, no un
// estado del dominio.
export function esTramoDeDistribucionCompartida(proyecto: Proyecto, tramoId: string): boolean {
  const { redHidraulica } = proyecto
  if (redHidraulica === undefined) {
    throw new Error('esTramoDeDistribucionCompartida requiere un proyecto con redHidraulica definida')
  }

  const tramo = redHidraulica.tramos.find((candidato) => candidato.id === tramoId)
  if (tramo === undefined) {
    throw new Error(`esTramoDeDistribucionCompartida: no existe ningún tramo con id "${tramoId}"`)
  }

  const idsConTramoEntrante = new Set(redHidraulica.tramos.map((candidato) => candidato.nodoDestinoId))
  const nodosPorId = new Map(redHidraulica.nodos.map((nodo) => [nodo.id, nodo]))
  return clasificarTramo(proyecto, idsConTramoEntrante, nodosPorId, tramo)
}

// Todos los Tramos de distribución compartida de la red, en el orden de
// `redHidraulica.tramos` (determinista, estable; este slice NO diseña
// todavía un orden de presentación). Proyecto sin redHidraulica -> [].
export function identificarTramosDeDistribucionCompartida(proyecto: Proyecto): readonly Tramo[] {
  const { redHidraulica } = proyecto
  if (redHidraulica === undefined) {
    return []
  }

  const idsConTramoEntrante = new Set(redHidraulica.tramos.map((tramo) => tramo.nodoDestinoId))
  const nodosPorId: ReadonlyMap<string, Nodo> = new Map(redHidraulica.nodos.map((nodo) => [nodo.id, nodo]))

  return redHidraulica.tramos.filter((tramo) =>
    clasificarTramo(proyecto, idsConTramoEntrante, nodosPorId, tramo),
  )
}
