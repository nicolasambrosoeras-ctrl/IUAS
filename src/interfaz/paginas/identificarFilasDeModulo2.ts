// Agrupamiento de presentación para la vista principal de Módulo 2: qué
// Tramos representan la Distribución general del proyecto y cuál es el
// Tramo principal de cada (Local, Red). La clasificación estructural en sí
// (qué Tramo es "representativo" de un Local+Red) ahora vive en el motor
// -- motor/tuberias/topologia/identificarTramoRepresentativoDeLocal.ts,
// D-δ.44 -- porque acumularPerdidaDistribuidaDeCamino/
// acumularPerdidaLocalizadaDeCamino también la necesitan (granularidad
// 'simplificada'); este archivo solo la envuelve para producir las
// etiquetas/estructuras que la UI consume, sin duplicar el algoritmo.
import type { Proyecto, Local } from '../../modelo/proyecto'
import type { Nodo, RedDeTramo, Tramo } from '../../modelo/redHidraulica'
import { identificarTramosRepresentativosDeLocales } from '../../motor/tuberias/topologia/identificarTramoRepresentativoDeLocal'
import { identificarTramosDeDistribucionCompartida } from '../../motor/tuberias/topologia/identificarTramosDeDistribucionCompartida'

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

export type FilaDistribucionSecundaria = {
  // Denominación DERIVADA y estable sólo para presentación (M2-TOPO-B §6/§26):
  // "Distribución secundaria N", numerada por red. NO se persiste, NO es una
  // identidad ni un rol de montante -- eso queda para M2-TOPO-C. Nunca un
  // UUID ni el id técnico del Tramo.
  readonly etiqueta: string
  readonly red: RedDeTramo
  readonly tramoId: string
}

// Clasificación estructural de un Tramo como perteneciente a la
// Distribución general (raíz de toda la topología, o alimentación hacia
// produccionACS), sin depender de ningún id literal de la topología demo
// (t-general/t-af-acs). Usada solo para identificarFilasDistribucionGeneral
// -- identificarTramosRepresentativosDeLocales ya aplica el mismo criterio
// internamente para excluir estos Tramos de sus resultados.
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

// Tramo principal de cada (Local, Red): envuelve
// identificarTramosRepresentativosDeLocales (motor) agregando `red` --
// la única información que ese primitivo de dominio no necesita conocer,
// porque no participa de la clasificación (solo de la etiqueta de fila).
export function identificarFilasPrincipalesDeLocales(proyecto: Proyecto): readonly FilaPrincipalDeLocal[] {
  const { redHidraulica } = proyecto
  if (redHidraulica === undefined) {
    return []
  }

  const representativos = identificarTramosRepresentativosDeLocales(proyecto)
  const tramosPorId = new Map(redHidraulica.tramos.map((tramo) => [tramo.id, tramo]))

  const filas: FilaPrincipalDeLocal[] = []
  for (const [tramoId, identidad] of representativos) {
    const tramo = tramosPorId.get(tramoId)
    if (tramo === undefined) {
      continue
    }
    filas.push({
      unidadFuncionalId: identidad.unidadFuncionalId,
      localId: identidad.localId,
      red: tramo.red,
      tramoId,
    })
  }

  return filas
}

// Distribución secundaria (M2-TOPO-B): proyección derivada de la
// clasificación estructural del motor -- envuelve
// identificarTramosDeDistribucionCompartida (M2-TOPO-A) agregando `red` y
// una denominación de presentación. NO reimplementa la regla ("un Tramo que
// no es Alimentación general/ACS y alcanza artefactos de >1 (UF,Local)");
// la clasificación es la del motor y es la MISMA que consumirá VIS-TOPO.
//
// Nomenclatura NEUTRAL igual que en el motor: "distribución secundaria" NO
// afirma "montante". Cada fila representa UN Tramo físico real, no todo un
// montante ni un Local: un montante segmentado aparece como varias filas
// (una por segmento que todavía alcanza >1 Local), y cada segmento puede
// tener su propio Qc/DN/V/longitud/hf.
//
// Orden: el de `redHidraulica.tramos` (el que ya devuelve
// identificarTramosDeDistribucionCompartida; el mismo criterio que
// identificarFilasDistribucionGeneral) -- determinista y estable. La
// numeración "N" es POR RED, en ese mismo orden: mismo patrón que
// derivarOrdinalesDeLocal (numera dentro de cada categoría) y coherente con
// que la columna Red de la tabla ya desambigua AF/AC, igual que dos filas
// "Baño 1" (una AF, otra AC). No se persiste en ningún lado -- se recalcula
// en cada render.
export function identificarFilasDistribucionSecundaria(proyecto: Proyecto): readonly FilaDistribucionSecundaria[] {
  const contadorPorRed = new Map<RedDeTramo, number>()
  return identificarTramosDeDistribucionCompartida(proyecto).map((tramo) => {
    const ordinal = (contadorPorRed.get(tramo.red) ?? 0) + 1
    contadorPorRed.set(tramo.red, ordinal)
    return { etiqueta: `Distribución secundaria ${ordinal}`, red: tramo.red, tramoId: tramo.id }
  })
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
