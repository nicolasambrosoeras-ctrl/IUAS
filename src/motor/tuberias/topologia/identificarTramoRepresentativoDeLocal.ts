// Clasificación estructural (sin heurística de string de id) de qué Tramo
// de RedHidraulica es el "representativo" de cada (UnidadFuncional, Local,
// Red) -- la unidad de relevamiento físico aprobada para Módulo 2 (D-δ.44,
// corrección de granularidad de D-δ.43). Promovido desde
// interfaz/paginas/identificarFilasDeModulo2.ts: originalmente era una
// selección de presentación (qué fila mostrar en la tabla), pero
// acumularPerdidaDistribuidaDeCamino/acumularPerdidaLocalizadaDeCamino
// necesitan la MISMA clasificación para decidir, en granularidadHidraulica
// 'simplificada', qué Tramos de un camino son "físicamente relevables" por
// el usuario (el representativo y todo lo aguas arriba de él) y cuáles son
// ramales internos hacia un Artefacto puntual (aguas abajo del
// representativo) que no requieren longitud/accesorios propios. Es
// exclusivamente domino/topología -- no sabe nada de UI, etiquetas ni
// ordinales (eso sigue en identificarFilasDeModulo2.ts, que ahora reutiliza
// esta función en vez de duplicar el algoritmo).
//
// Un Tramo es "puro" de un Local cuando la totalidad de los Artefactos
// alcanzables aguas abajo (ya deduplicados por obtenerArtefactosAguasAbajo)
// pertenece a un único Local. El Tramo representativo de un (Local, Red) es
// el Tramo puro de ese Local más cercano a la raíz -- aquel cuyo Tramo
// padre (si existe) ya no es puro de ese mismo Local (porque no es puro de
// ningún Local, al alcanzar más de uno, o porque es Distribución General).
// Los Tramos puros más profundos (terminales hacia cada Artefacto, o
// niveles intermedios de una tee anidada) quedan excluidos porque su padre
// ya cubre exactamente el mismo Local -- son ramales, no representativos.
import type { Proyecto } from '../../../modelo/proyecto'
import type { Nodo, RedHidraulica, Tramo } from '../../../modelo/redHidraulica'
import { obtenerArtefactosAguasAbajo } from './obtenerArtefactosAguasAbajo'
import {
  obtenerIndiceTopologicoDeContexto,
  obtenerTramosEntrantesIndexados,
  type ContextoDeCalculoM2,
} from '../contextoDeCalculoM2'
import { registrarConstruccionTramosRepresentativos } from './instrumentacionTopologica'

export type IdentidadDeLocal = {
  readonly unidadFuncionalId: string
  readonly localId: string
}

function localUnicoDeTramo(
  proyecto: Proyecto,
  tramoId: string,
  contexto: ContextoDeCalculoM2 | undefined,
): IdentidadDeLocal | undefined {
  const indiceTopologico =
    contexto === undefined || proyecto.redHidraulica === undefined
      ? undefined
      : obtenerIndiceTopologicoDeContexto(contexto, proyecto.redHidraulica)
  const referencias = obtenerArtefactosAguasAbajo(proyecto, tramoId, indiceTopologico)
  if (referencias.length === 0) {
    return undefined
  }

  // JSON.stringify de la tupla: un separador de texto simple no puede
  // descartar colisiones si el modelo no prohíbe "::" dentro de un id.
  const claves = new Set(referencias.map((r) => JSON.stringify([r.unidadFuncionalId, r.localId])))
  if (claves.size !== 1) {
    return undefined
  }

  const primera = referencias[0]!
  return { unidadFuncionalId: primera.unidadFuncionalId, localId: primera.localId }
}

// PERF-SCALE-01D: con contexto, reutiliza el índice nodoDestinoId->entrantes
// compartido de esta resolución (ver contextoDeCalculoM2.ts) en vez de un
// `Array.find` sobre TODOS los tramos por cada Tramo del Proyecto. Ausente ⇒
// comportamiento previo byte a byte.
function buscarTramoPadre(
  redHidraulica: RedHidraulica,
  tramo: Tramo,
  contexto: ContextoDeCalculoM2 | undefined,
): Tramo | undefined {
  if (contexto === undefined) {
    return redHidraulica.tramos.find((candidato) => candidato.nodoDestinoId === tramo.nodoOrigenId)
  }
  const entrantes = obtenerTramosEntrantesIndexados(contexto, redHidraulica.tramos).get(tramo.nodoOrigenId)
  return entrantes?.[0]
}

// Clasificación estructural de un Tramo como perteneciente a la
// Distribución general (raíz de toda la topología, o alimentación hacia
// produccionACS): un Tramo de Distribución general nunca es representativo
// de un Local, aunque su conjunto aguas abajo resulte "puro" de uno solo
// (caso límite: un proyecto donde un único Local concentra toda el agua
// caliente del edificio -- t-af-acs seguiría sin ser representativo de ese
// Local).
function clasificarTramoDeDistribucionGeneral(
  idsConTramoEntrante: ReadonlySet<string>,
  nodosPorId: ReadonlyMap<string, Nodo>,
  tramo: Tramo,
): 'general' | 'acs' | undefined {
  if (!idsConTramoEntrante.has(tramo.nodoOrigenId)) {
    return 'general'
  }

  const nodoDestino = nodosPorId.get(tramo.nodoDestinoId)
  if (nodoDestino?.referencia?.tipo === 'produccionACS') {
    return 'acs'
  }

  return undefined
}

// Tramo representativo de cada (Local, Red): ver comentario de archivo.
// Devuelve un Map tramoId -> identidad (solo los Tramos que califican),
// para que un consumidor de un camino puntual (acumuladores de pérdida)
// pueda preguntar `representativos.has(tramoId)` en O(1) sin recorrer todo
// el grafo por cada Tramo del camino.
export function identificarTramosRepresentativosDeLocales(
  proyecto: Proyecto,
  // PERF-SCALE-01D: contexto de cálculo local a la resolución (ver
  // contextoDeCalculoM2.ts) -- se propaga a `obtenerArtefactosAguasAbajo` y
  // al índice de tramos entrantes para no reconstruirlos por cada Tramo.
  // Ausente ⇒ comportamiento previo byte a byte.
  contexto?: ContextoDeCalculoM2,
): ReadonlyMap<string, IdentidadDeLocal> {
  registrarConstruccionTramosRepresentativos()
  const { redHidraulica } = proyecto
  if (redHidraulica === undefined) {
    return new Map()
  }

  const idsConTramoEntrante = new Set(redHidraulica.tramos.map((tramo) => tramo.nodoDestinoId))
  const nodosPorId = new Map(redHidraulica.nodos.map((nodo) => [nodo.id, nodo]))
  const esDeDistribucionGeneral = (tramo: Tramo): boolean =>
    clasificarTramoDeDistribucionGeneral(idsConTramoEntrante, nodosPorId, tramo) !== undefined

  const representativos = new Map<string, IdentidadDeLocal>()

  for (const tramo of redHidraulica.tramos) {
    if (esDeDistribucionGeneral(tramo)) {
      continue
    }

    const identidad = localUnicoDeTramo(proyecto, tramo.id, contexto)
    if (identidad === undefined) {
      continue
    }

    const padre = buscarTramoPadre(redHidraulica, tramo, contexto)
    const padreEsMismoLocal =
      padre !== undefined &&
      !esDeDistribucionGeneral(padre) &&
      localUnicoDeTramo(proyecto, padre.id, contexto) !== undefined
    if (padreEsMismoLocal) {
      continue
    }

    representativos.set(tramo.id, identidad)
  }

  return representativos
}

// PERF-SCALE-01D: memoiza el resultado COMPLETO en `contexto` (una sola vez
// por resolución) -- se llama una vez POR TERMINAL desde
// `seleccionarTramosDeAcumulacion` (una vez para pérdida distribuida, otra
// para localizada), y en 'simplificada' es el hotspot dominante a escala
// 20+ UF si se recalcula desde cero cada vez.
export function obtenerTramosRepresentativosDeLocalesDeContexto(
  contexto: ContextoDeCalculoM2,
  proyecto: Proyecto,
): ReadonlyMap<string, IdentidadDeLocal> {
  if (contexto.tramosRepresentativosDeLocales === undefined) {
    contexto.tramosRepresentativosDeLocales = identificarTramosRepresentativosDeLocales(proyecto, contexto)
  }
  return contexto.tramosRepresentativosDeLocales
}
