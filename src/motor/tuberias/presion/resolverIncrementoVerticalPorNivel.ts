// Longitud vertical tipica automatica por nivel de Unidad Funcional
// (D-δ.50), EXCLUSIVA de granularidadHidraulica='simplificada'.
//
// Paralelismo explicito con D-δ.46:
//
//   SIMPLIFICADA  -> cota terminal efectiva desde la UF
//                    + longitud vertical tipica automatica por nivel (ESTE modulo)
//   PROFESIONAL   -> cota terminal explicita (Nodo.cota_m)
//                    + longitud vertical explicita (Tramos reales / longitudes relevadas)
//
// En 'profesional' este modulo devuelve SIEMPRE incremento 0: uf.nivel
// puede existir como metadato/etiqueta pero no modifica hf; la geometria
// vertical la representa el proyectista con Tramos reales. No hay deteccion
// heuristica de montantes ni logica anti-doble-conteo -- las dos
// granularidades no se mezclan (decision roja de D-δ.50 resuelta:
// alternativa A).
//
// Semantica (convencion IUAS, NO atribuible a ERAS): con PB=0, Piso1=1,
// Piso2=2, ... el incremento derivado es
//
//   ΔLvertical(UF) = 3 m · nivel        (PB->0, Piso1->3, Piso2->6, ...)
//
// Es un valor DERIVADO: nunca se persiste, nunca se muta Tramo.longitud_m.
// Se suma a la longitud EFECTIVA del/de los Tramo(s) de Distribucion
// general del camino de esa UF:
//
//   - Alimentacion general  -> +ΔLvertical  (todo camino AF y AC)
//   - Alimentacion ACS      -> +ΔLvertical  (solo caminos AC -- ese Tramo
//                                            solo aparece en caminos AC)
//
// Como hfDistribuida es exactamente lineal en L tanto en Hazen-Williams
// (hf = J·L) como en Darcy-Weisbach (hf = f·(L/D)·v²/2g), el efecto sobre
// la perdida se compone de forma aditiva sin recalcular nada:
//
//   Δhf = (hf_base / longitud_base) · ΔLvertical
//
// (ver acumularPerdidaDistribuidaDeCamino, que consume el mapa que este
// modulo produce). "Dos UFs en el mismo piso" no acumula: cada camino
// deriva su propio ΔLvertical del nivel de SU terminal, nunca de cuantas
// UFs existan.
import type { Proyecto, UnidadFuncional } from '../../../modelo/proyecto'
import type { Nodo, Tramo } from '../../../modelo/redHidraulica'
import type { CaminoHaciaOrigen } from '../topologia/obtenerCaminoHaciaOrigen'

// Metros de altura libre tipica entre plantas asumidos por la convencion
// IUAS del modo rapido (mismo 3 que calcularCotaHidraulicaDefaultDeNivel
// usa para la cota: 1 + 3·nivel). Sin base normativa.
const ALTURA_LIBRE_TIPICA_ENTRE_PLANTAS_M = 3

export type IncrementoVerticalPorNivel = {
  // true solo si granularidad='simplificada' Y la UF tiene un nivel > 0.
  readonly aplica: boolean
  // nivel de la UF tal cual (undefined = "sin clasificar todavia", nunca 0).
  readonly nivel: number | undefined
  // ΔLvertical = 3·nivel (0 si nivel ausente/<=0 o granularidad profesional).
  readonly deltaLVertical_m: number
  // tramoId -> metros a sumar a la longitud efectiva de ese Tramo en ESTE
  // camino. A lo sumo dos entradas (Alimentacion general y, en caminos AC,
  // Alimentacion ACS). Vacio cuando aplica=false.
  readonly incrementoPorTramoId: ReadonlyMap<string, number>
  // Roles de los Tramos del mapa, para la traza auditable ("Ver calculo
  // del critico"): mismo orden que aparecen en el camino (raiz -> terminal).
  readonly tramosConIncremento: readonly {
    readonly tramoId: string
    readonly rol: 'alimentacionGeneral' | 'alimentacionAcs'
    readonly incremento_m: number
  }[]
  // M2-TOPO-C (§37): true cuando el incremento se anuló porque el camino
  // atraviesa al menos un segmento de un montante explícito
  // (Tramo.montanteId) -- el ascenso vertical ya está modelado por la
  // longitud real de ese montante, así que el +3·nivel automático de
  // D-δ.50 sería doble conteo (cierre de la limitación de D-δ.92). Se
  // distingue de "PB / UF sin clasificar" (donde tampoco aplica pero por
  // otro motivo) para la traza auditable. `deltaLVertical_m` conserva el
  // valor que HABRÍA tenido, sólo como referencia -- `incrementoPorTramoId`
  // queda vacío y `aplica` es false. Opcional: ausente equivale a `false`
  // (mismo criterio conservador que el resto del modelo), así los fixtures
  // previos a M2-TOPO-C no necesitan declararlo.
  readonly suprimidoPorMontante?: boolean
}

const SIN_INCREMENTO: IncrementoVerticalPorNivel = {
  aplica: false,
  nivel: undefined,
  deltaLVertical_m: 0,
  incrementoPorTramoId: new Map(),
  tramosConIncremento: [],
  suprimidoPorMontante: false,
}

// Clasificacion estructural de un Tramo como Distribucion general, sin
// depender de ningun id literal (t-general/t-af-acs). Reimplementada acá
// -- mismo criterio que identificarTramoRepresentativoDeLocal.ts (motor,
// D-δ.44, protegido) e identificarFilasDeModulo2.ts (UI) y asegurarRaizDeRed.ts
// (UI): cada consumidor mantiene su propia copia de esta pregunta chica
// para no reabrir los archivos de D-δ.44.
function clasificarTramoDeDistribucionGeneral(
  idsConTramoEntrante: ReadonlySet<string>,
  nodosPorId: ReadonlyMap<string, Nodo>,
  tramo: Tramo,
): 'alimentacionGeneral' | 'alimentacionAcs' | undefined {
  if (!idsConTramoEntrante.has(tramo.nodoOrigenId)) {
    return 'alimentacionGeneral'
  }
  if (nodosPorId.get(tramo.nodoDestinoId)?.referencia?.tipo === 'produccionACS') {
    return 'alimentacionAcs'
  }
  return undefined
}

export function resolverIncrementoVerticalPorNivel(
  proyecto: Proyecto,
  camino: CaminoHaciaOrigen,
  unidadFuncional: UnidadFuncional,
): IncrementoVerticalPorNivel {
  if (proyecto.configuracionHidraulica.granularidadHidraulica !== 'simplificada') {
    return { ...SIN_INCREMENTO, nivel: unidadFuncional.nivel }
  }

  const { nivel } = unidadFuncional
  if (nivel === undefined || nivel <= 0) {
    // PB (0) o UF sin clasificar: sin caño vertical adicional. La longitud
    // base sigue rigiendo tal cual (CRIT-A20: ausencia != 0, pero un
    // incremento derivado de 0 metros SI es legitimo -- ver brief 44).
    return { ...SIN_INCREMENTO, nivel, deltaLVertical_m: ALTURA_LIBRE_TIPICA_ENTRE_PLANTAS_M * Math.max(nivel ?? 0, 0) }
  }

  const deltaLVertical_m = ALTURA_LIBRE_TIPICA_ENTRE_PLANTAS_M * nivel

  // M2-TOPO-C (§37-§39): si el camino atraviesa al menos un segmento de un
  // montante explícito (Tramo.montanteId definido), el ascenso vertical ya
  // está representado por la longitud REAL de ese/esos segmento(s) -- sumar
  // además el +3·nivel automático de D-δ.50 sería doble conteo (cierra la
  // limitación registrada en D-δ.92). La señal es exclusivamente
  // `Tramo.montanteId`; NO se usa `esTramoDeDistribucionCompartida` (§38).
  // Si un segmento explícito del camino no tiene longitud, el camino queda
  // incompleto por la vía normal de hfDistribuida
  // (acumularPerdidaDistribuidaDeCamino) -- acá NUNCA se reactiva el
  // 3·nivel como fallback (§39).
  if (camino.tramos.some((tramo) => tramo.montanteId !== undefined)) {
    return { ...SIN_INCREMENTO, nivel, deltaLVertical_m, suprimidoPorMontante: true }
  }

  const { redHidraulica } = proyecto
  if (redHidraulica === undefined) {
    return { ...SIN_INCREMENTO, nivel, deltaLVertical_m }
  }

  const idsConTramoEntrante = new Set(redHidraulica.tramos.map((t) => t.nodoDestinoId))
  const nodosPorId = new Map(redHidraulica.nodos.map((n) => [n.id, n]))

  const incrementoPorTramoId = new Map<string, number>()
  const tramosConIncremento: {
    tramoId: string
    rol: 'alimentacionGeneral' | 'alimentacionAcs'
    incremento_m: number
  }[] = []

  for (const tramo of camino.tramos) {
    const rol = clasificarTramoDeDistribucionGeneral(idsConTramoEntrante, nodosPorId, tramo)
    if (rol === undefined) {
      continue
    }
    incrementoPorTramoId.set(tramo.id, deltaLVertical_m)
    tramosConIncremento.push({ tramoId: tramo.id, rol, incremento_m: deltaLVertical_m })
  }

  return {
    aplica: incrementoPorTramoId.size > 0,
    nivel,
    deltaLVertical_m,
    incrementoPorTramoId,
    tramosConIncremento,
    suprimidoPorMontante: false,
  }
}
