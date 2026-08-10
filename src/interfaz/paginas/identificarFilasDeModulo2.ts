// Agrupamiento de topología física para la vista principal de Módulo 2:
// identifica, de forma puramente estructural (sin heurísticas de string
// de ID de Tramo/Nodo), qué Tramos representan la Distribución general del
// proyecto y cuál es el Tramo principal de cada (Local, Red). No calcula
// nada hidráulico ni reimplementa el traversal topológico: usa
// obtenerArtefactosAguasAbajo tal cual para decidir, por Tramo, a qué
// Local pertenece en exclusiva. Esto es exclusivamente una selección de
// presentación -- la topología completa (incluidos los Tramos terminales
// que esta selección deja fuera de la vista principal) sigue existiendo
// íntegra en RedHidraulica para el motor.
import type { Local, Proyecto } from '../../modelo/proyecto'
import type { Nodo, RedDeTramo, RedHidraulica, Tramo } from '../../modelo/redHidraulica'
import { obtenerArtefactosAguasAbajo } from '../../motor/tuberias/topologia/obtenerArtefactosAguasAbajo'

export type FilaDistribucionGeneral = {
  readonly etiqueta: string
  readonly red: RedDeTramo
  readonly tramoId: string
}

export type FilaPrincipalDeLocal = {
  readonly unidadFuncionalId: string
  readonly localId: string
  readonly red: RedDeTramo
  readonly tramoId: string
}

type IdentidadDeLocal = {
  readonly unidadFuncionalId: string
  readonly localId: string
}

// Un Tramo es "puro" de un Local cuando la totalidad de los Artefactos
// alcanzables aguas abajo (ya deduplicados por obtenerArtefactosAguasAbajo)
// pertenece a un único Local. No se compara contra el inventario completo
// del Local: un Tramo AC puro solo alcanza los Artefactos con conectividad
// física AC de ese Local (CRIT-A15), y eso es exactamente lo esperado --
// un Local sin ningún Artefacto conectado a AC simplemente no produce
// ningún Tramo "puro" en esa Red.
function localUnicoDeTramo(proyecto: Proyecto, tramoId: string): IdentidadDeLocal | undefined {
  const referencias = obtenerArtefactosAguasAbajo(proyecto, tramoId)
  if (referencias.length === 0) {
    return undefined
  }

  // JSON.stringify de la tupla, mismo criterio que obtenerArtefactosAguasAbajo:
  // un separador de texto simple no puede descartar colisiones si el modelo
  // no prohíbe "::" dentro de un id.
  const claves = new Set(referencias.map((r) => JSON.stringify([r.unidadFuncionalId, r.localId])))
  if (claves.size !== 1) {
    return undefined
  }

  const primera = referencias[0]!
  return { unidadFuncionalId: primera.unidadFuncionalId, localId: primera.localId }
}

function buscarTramoPadre(redHidraulica: RedHidraulica, tramo: Tramo): Tramo | undefined {
  return redHidraulica.tramos.find((candidato) => candidato.nodoDestinoId === tramo.nodoOrigenId)
}

// Clasificación estructural de un Tramo como perteneciente a la
// Distribución general (raíz de toda la topología, o alimentación hacia
// produccionACS), sin depender de ningún id literal de la topología demo
// (t-general/t-af-acs). Se calcula una sola vez y se comparte entre
// identificarFilasDistribucionGeneral e identificarFilasPrincipalesDeLocales:
// un Tramo de Distribución general nunca debe además aparecer como
// principal de un Local, aunque su conjunto aguas abajo resulte "puro" de
// un único Local (caso límite: un proyecto donde un único Local concentra
// toda el agua caliente del edificio -- t-af-acs seguiría siendo la fila
// de Alimentación ACS, nunca una fila de ese Local).
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

// Distribución general: dos señales puramente estructurales.
//
// - "Alimentación general": el Tramo raíz de toda la topología -- el único
//   cuyo nodoOrigenId nunca aparece como nodoDestinoId de otro Tramo.
// - "Alimentación ACS": el Tramo cuyo nodo de destino referencia
//   produccionACS (misma señal estructural que ya usaba derivarCaneria en
//   este archivo antes de este incremento).
export function identificarFilasDistribucionGeneral(proyecto: Proyecto): readonly FilaDistribucionGeneral[] {
  const { redHidraulica } = proyecto
  if (redHidraulica === undefined) {
    return []
  }

  const idsConTramoEntrante = new Set(redHidraulica.tramos.map((tramo) => tramo.nodoDestinoId))
  const nodosPorId = new Map(redHidraulica.nodos.map((nodo) => [nodo.id, nodo]))

  const filas: FilaDistribucionGeneral[] = []

  for (const tramo of redHidraulica.tramos) {
    const clasificacion = clasificarTramoDeDistribucionGeneral(idsConTramoEntrante, nodosPorId, tramo)
    if (clasificacion === 'general') {
      filas.push({ etiqueta: 'Alimentación general', red: tramo.red, tramoId: tramo.id })
    } else if (clasificacion === 'acs') {
      filas.push({ etiqueta: 'Alimentación ACS', red: tramo.red, tramoId: tramo.id })
    }
  }

  return filas
}

// Tramo principal de cada (Local, Red): el Tramo "puro" de ese Local más
// cercano a la raíz -- aquel cuyo Tramo padre (si existe) ya no es puro de
// ese mismo Local (porque no es puro de ningún Local, al alcanzar más de
// uno). Los Tramos puros más profundos (terminales hacia cada Artefacto)
// quedan excluidos porque su padre ya cubre exactamente el mismo Local.
export function identificarFilasPrincipalesDeLocales(proyecto: Proyecto): readonly FilaPrincipalDeLocal[] {
  const { redHidraulica } = proyecto
  if (redHidraulica === undefined) {
    return []
  }

  const idsConTramoEntrante = new Set(redHidraulica.tramos.map((tramo) => tramo.nodoDestinoId))
  const nodosPorId = new Map(redHidraulica.nodos.map((nodo) => [nodo.id, nodo]))
  const esDeDistribucionGeneral = (tramo: Tramo): boolean =>
    clasificarTramoDeDistribucionGeneral(idsConTramoEntrante, nodosPorId, tramo) !== undefined

  const filas: FilaPrincipalDeLocal[] = []

  for (const tramo of redHidraulica.tramos) {
    // Un Tramo de Distribución general (raíz, o alimentación a
    // produccionACS) nunca es la fila principal de un Local, aunque su
    // conjunto aguas abajo resulte "puro" de uno solo -- ver el comentario
    // de clasificarTramoDeDistribucionGeneral.
    if (esDeDistribucionGeneral(tramo)) {
      continue
    }

    const identidad = localUnicoDeTramo(proyecto, tramo.id)
    if (identidad === undefined) {
      continue
    }

    const padre = buscarTramoPadre(redHidraulica, tramo)
    const padreEsMismoLocal =
      padre !== undefined && !esDeDistribucionGeneral(padre) && localUnicoDeTramo(proyecto, padre.id) !== undefined
    if (padreEsMismoLocal) {
      continue
    }

    filas.push({
      unidadFuncionalId: identidad.unidadFuncionalId,
      localId: identidad.localId,
      red: tramo.red,
      tramoId: tramo.id,
    })
  }

  return filas
}

// Ordinal de presentación por Local dentro de una Unidad Funcional, según
// el orden de `locales` agrupado por tipo. Siempre numera, incluso con un
// único Local de ese tipo (consistencia visual), y no se persiste en
// ningún lado -- se recalcula en cada render, igual que etiquetasDeLocales
// en MotorDemandaPantalla.tsx (mismo criterio, distinta política de
// numeración: acá no hay caso "sin número").
export function derivarOrdinalesDeLocal(locales: readonly Local[]): ReadonlyMap<string, number> {
  const contadorPorTipo = new Map<Local['tipo'], number>()
  const ordinales = new Map<string, number>()

  for (const local of locales) {
    const siguiente = (contadorPorTipo.get(local.tipo) ?? 0) + 1
    contadorPorTipo.set(local.tipo, siguiente)
    ordinales.set(local.id, siguiente)
  }

  return ordinales
}
