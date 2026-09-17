// HYD-EST-NETWORK-01: fuente única de verdad de los accesorios FÍSICOS
// estimados (DREZA) de Montante y Colector principal, con identidad
// estable y UBICACIÓN topológica concreta (un Tramo o un Nodo real de
// `RedHidraulica`) -- a diferencia de `resolverAccesoriosConstructivosDreza.ts`
// (que hasta este incremento sólo producía cantidades agregadas para
// materiales, sin ubicación consultable por un recorrido de camino), cada
// pieza de este módulo sabe EXACTAMENTE dónde vive, así que su incidencia
// hidráulica sobre un camino cualquiera (`CaminoHaciaOrigen`) se resuelve
// por pertenencia topológica (¿el camino atraviesa este Tramo/Nodo?), sin
// mantener una lista frágil de terminales afectados.
//
// Alcance (decisión roja resuelta por el usuario, HYD-EST-NETWORK-01): esto
// cubre ÚNICAMENTE Montante y Colector principal -- sectores con topología
// real de Tramo/Nodo (ADR-0001). El interior de un Local NO se toca: sigue
// modelado exclusivamente por el agregado `(Local, red)` de
// `resolverPerdidaLocalizadaEstimadaDeLocal.ts` (D-δ.40/D-δ.45,
// FIX-HYD-EST-SIMPLIFIED-01) -- reabrir ese modelo fue explícitamente
// rechazado por el usuario en D-δ.112/D-δ.113 (exigía topología 1→2 real y
// dejaba `Incompleto` cualquier fan-out 1→N, como un baño de 4 artefactos).
//
// Cantidad física vs. incidencia hidráulica: cada entrada de este módulo
// es UNA pieza física (nunca un agregado con `cantidad>1`) -- una Tee que
// afecta varios caminos sigue siendo una sola entrada con una sola
// `ubicacion`; la cardinalidad para el listado de materiales se obtiene
// agrupando estas entradas por (tipo, sector/ubicación amplia, red, DN),
// nunca recalculando una segunda vez.
//
// Distribución de accesorios periódicos (uniones cada 4 m, codos de
// recorrido cada 2 m): convención de distancia acumulada desde el ORIGEN
// de la cadena (ver `distribuirPeriodico`). Grupo de agrupación: cada
// Montante y el tronco de Colector calculan su propia cantidad periódica
// sobre SU PROPIA longitud (decisión del usuario, HYD-EST-NETWORK-01) --
// ya NO se agrupan varios Montantes/el Colector del mismo sector amplio
// para sumar longitudes y cruzar el umbral de 4 m artificialmente (eso
// cambia el total histórico de materiales del proyecto de referencia de
// 88 a 86 unidades base -- ver docs/HYD-EST-NETWORK-01.md, corrección
// legítima explícita, no un defecto de este incremento).
import type { Proyecto, Montante } from '../../../modelo/proyecto'
import type { RedDeTramo, Tramo } from '../../../modelo/redHidraulica'
import type { ArtefactoNormativo } from '../../../normativa/eras-2023/catalogo-artefactos'
import { catalogoSistemasDeTuberia } from '../sistemaDeTuberia'
import type { ContextoDeCalculoM2 } from '../contextoDeCalculoM2'
import { resolverDiametroComercialDeTramo } from '../resolverDiametroComercialDeTramo'
import { derivarLocalesServidos, reconstruirCadena } from '../../../interfaz/paginas/reconciliarMontante'
import { derivacionesDeMontante } from '../../../interfaz/paginas/montantesDelProyecto'
import {
  identificarFilasDistribucionGeneral,
  identificarFilasPrincipalesDeLocales,
  ETIQUETA_COLECTOR_PRINCIPAL,
} from '../../../interfaz/paginas/identificarFilasDeModulo2'

export type IdAccesorioFisicoEstimado =
  | 'llaveDePaso'
  | 'teeDerivacion'
  | 'codoUltimoLocal'
  | 'codoUltimaSalida'
  | 'codoRecorrido'
  | 'unionRecta'
  | 'teeAcs'
  | 'teeRuptor'
  | 'unionTanque'

export type SectorAccesorioFisico = 'montante' | 'colectorPrincipal'

// Ubicación topológica concreta: un Tramo real (accesorio "en línea" --
// llaves, codos, uniones, reducciones) o un Nodo real (accesorio de
// derivación -- tees). La pertenencia a un camino se resuelve por simple
// membresía en `camino.tramos` / `camino.nodos` (CaminoHaciaOrigen) --
// nunca por una lista de terminales mantenida a mano.
export type UbicacionFisicaAccesorio =
  | { readonly tipo: 'tramo'; readonly tramoId: string }
  | { readonly tipo: 'nodo'; readonly nodoId: string }

export type AccesorioFisicoEstimado = {
  readonly idFisico: string
  readonly tipo: IdAccesorioFisicoEstimado
  readonly sector: SectorAccesorioFisico
  readonly red: RedDeTramo
  readonly montanteId?: string
  readonly ubicacion: UbicacionFisicaAccesorio
  readonly dnComercial: string
}

export type ResultadoAccesoriosFisicosEstimadosDeRed = {
  readonly items: readonly AccesorioFisicoEstimado[]
  readonly pendientes: readonly string[]
}

// Distribuye `cantidad = floor(longitudTotal_m / periodo_m)` piezas a lo
// largo de una cadena de segmentos ordenada origen -> punta, por distancia
// acumulada desde el origen (4 m, 8 m, 12 m... / 2 m, 4 m, 6 m...). Cada
// pieza se asigna al PRIMER segmento cuya longitud acumulada (incluyéndolo)
// alcanza o supera esa distancia -- si la distancia coincide EXACTAMENTE
// con el nodo que cierra un segmento, la pieza queda de ese lado (el
// segmento que la cierra), nunca en el siguiente ni duplicada: convención
// única y determinista (HYD-EST-NETWORK-01).
export function distribuirAccesorioPeriodico(
  segmentos: readonly { readonly tramoId: string; readonly longitud_m: number }[],
  periodo_m: number,
): readonly string[] {
  if (segmentos.length === 0) {
    return []
  }
  const longitudTotal_m = segmentos.reduce((acumulado, segmento) => acumulado + segmento.longitud_m, 0)
  const cantidad = Math.floor(longitudTotal_m / periodo_m)
  const resultado: string[] = []
  let acumulado = 0
  let indice = 0
  for (let i = 1; i <= cantidad; i += 1) {
    const distancia = i * periodo_m
    while (indice < segmentos.length - 1 && acumulado + segmentos[indice]!.longitud_m < distancia) {
      acumulado += segmentos[indice]!.longitud_m
      indice += 1
    }
    resultado.push(segmentos[indice]!.tramoId)
  }
  return resultado
}

function resolverAccesoriosFisicosDeMontante(
  proyecto: Proyecto,
  montante: Montante,
  catalogoArtefactos: readonly ArtefactoNormativo[],
  contexto: ContextoDeCalculoM2 | undefined,
  pendientes: string[],
): AccesorioFisicoEstimado[] {
  const { redHidraulica } = proyecto
  if (redHidraulica === undefined) {
    return []
  }
  const cadena = reconstruirCadena(redHidraulica, montante.id)
  const segmentos: readonly Tramo[] = cadena?.segmentos ?? redHidraulica.tramos.filter((t) => t.montanteId === montante.id)
  if (segmentos.length === 0) {
    // Montante sin topología todavía (0 Locales, estado válido de
    // M2-TOPO-C): nada que estimar, no es un pendiente.
    return []
  }
  const n = derivarLocalesServidos(proyecto, montante.id).length
  if (n === 0) {
    return []
  }

  const primerSegmento = segmentos[0]!
  const resultadoDn = resolverDiametroComercialDeTramo(proyecto, primerSegmento.id, catalogoArtefactos, catalogoSistemasDeTuberia, contexto)
  const dnComercial = resultadoDn.tipo === 'conCandidato' ? resultadoDn.candidato.denominacionComercial : undefined
  if (dnComercial === undefined) {
    pendientes.push(`Montante ${montante.nombre ?? montante.id} — accesorios estimados con DN pendiente de definición`)
    return []
  }

  const items: AccesorioFisicoEstimado[] = []
  const base = { sector: 'montante' as const, red: montante.red, montanteId: montante.id, dnComercial }

  items.push({ ...base, idFisico: `montante:${montante.id}:llave`, tipo: 'llaveDePaso', ubicacion: { tipo: 'tramo', tramoId: primerSegmento.id } })

  // Tee de derivación: una por cada bifurcación 1→2 real del montante que
  // TODAVÍA no tiene `Nodo.tee` configurado (opción A, MATERIALS-ACCESSORIES-01
  // -- una Tee real ya resuelta por `resolverTees()` no se vuelve a contar
  // acá). Cada una vive en su propio Nodo: sólo los caminos que atraviesan
  // ESE nodo la ven (un camino a un Local servido por una derivación
  // anterior nunca llega a este nodo).
  let indiceTee = 0
  for (const derivacion of derivacionesDeMontante(proyecto, montante.id)) {
    if (derivacion.tipo === 'bifurcacion' && !derivacion.teeConfigurada) {
      items.push({ ...base, idFisico: `montante:${montante.id}:tee:${indiceTee}`, tipo: 'teeDerivacion', ubicacion: { tipo: 'nodo', nodoId: derivacion.nodoId } })
      indiceTee += 1
    }
  }

  // Codo del último Local: punto físico distinto de cualquier Tee, en el
  // ÚLTIMO segmento de la cadena -- sólo el camino hacia ese Local final lo
  // atraviesa (nunca los caminos hacia Locales servidos más abajo).
  const ultimoSegmento = segmentos[segmentos.length - 1]!
  items.push({ ...base, idFisico: `montante:${montante.id}:codoUltimoLocal`, tipo: 'codoUltimoLocal', ubicacion: { tipo: 'tramo', tramoId: ultimoSegmento.id } })

  const segmentosParaDistancia = segmentos.map((s) => ({ tramoId: s.id, longitud_m: s.longitud_m ?? 0 }))
  distribuirAccesorioPeriodico(segmentosParaDistancia, 2).forEach((tramoId, i) => {
    items.push({ ...base, idFisico: `montante:${montante.id}:codoRecorrido:${i}`, tipo: 'codoRecorrido', ubicacion: { tipo: 'tramo', tramoId } })
  })
  distribuirAccesorioPeriodico(segmentosParaDistancia, 4).forEach((tramoId, i) => {
    items.push({ ...base, idFisico: `montante:${montante.id}:union:${i}`, tipo: 'unionRecta', ubicacion: { tipo: 'tramo', tramoId } })
  })

  return items
}

// Tramos del tronco de Colector principal, en orden origen -> punta: desde
// el Tramo raíz (`identificarFilasDistribucionGeneral`) hasta que la
// topología entra en un Montante (`Tramo.montanteId` definido) o en el
// Tramo representativo de un Local directo -- el mismo criterio estructural
// que ya usa `resolverUbicacionDeTramo` en Materials, reimplementado acá
// sin depender de su índice de humanización (evita un import circular).
function tramosDeColectorEnOrden(proyecto: Proyecto, red: RedDeTramo): readonly Tramo[] {
  const { redHidraulica } = proyecto
  if (redHidraulica === undefined) {
    return []
  }
  const filaRaiz = identificarFilasDistribucionGeneral(proyecto).find(
    (fila) => fila.etiqueta === ETIQUETA_COLECTOR_PRINCIPAL && fila.red === red,
  )
  if (filaRaiz === undefined) {
    return []
  }
  const tramoRaiz = redHidraulica.tramos.find((t) => t.id === filaRaiz.tramoId)
  if (tramoRaiz === undefined) {
    return []
  }
  const tramosRepresentativosLocales = new Set(
    identificarFilasPrincipalesDeLocales(proyecto)
      .filter((fila) => fila.red === red)
      .map((fila) => fila.tramoId),
  )

  const cadena: Tramo[] = [tramoRaiz]
  let actual = tramoRaiz
  for (;;) {
    const salientes = redHidraulica.tramos.filter((t) => t.nodoOrigenId === actual.nodoDestinoId && t.red === red)
    if (salientes.length !== 1) {
      break
    }
    const siguiente = salientes[0]!
    if (siguiente.montanteId !== undefined || tramosRepresentativosLocales.has(siguiente.id)) {
      break
    }
    cadena.push(siguiente)
    actual = siguiente
  }
  return cadena
}

// Recorre, desde el último nodo del tronco de Colector, la cadena de
// bifurcaciones reales que reparte hacia los Montantes/Locales directos de
// esta red -- mismo patrón que `derivacionesDeMontante`, generalizado: en
// cada nodo de bifurcación, las salidas que arrancan un Montante o el Tramo
// representativo de un Local se cuentan como "salidas del Colector"; la
// rama restante (si existe) continúa el tronco. La ÚLTIMA salida alcanzada
// (cuando ya no queda tronco) no recibe Tee -- ver `resolverAccesoriosFisicosDeColectorRed`.
function resolverDerivacionesDelColector(
  proyecto: Proyecto,
  red: RedDeTramo,
  tramosColector: readonly Tramo[],
): { readonly nodosConTee: readonly { readonly nodoId: string; readonly teeConfigurada: boolean }[]; readonly tramoUltimaSalida: string | undefined } {
  const { redHidraulica } = proyecto
  if (redHidraulica === undefined || tramosColector.length === 0) {
    return { nodosConTee: [], tramoUltimaSalida: undefined }
  }
  const tramosRepresentativosLocales = new Set(
    identificarFilasPrincipalesDeLocales(proyecto)
      .filter((fila) => fila.red === red)
      .map((fila) => fila.tramoId),
  )
  const esInicioDeSalida = (t: Tramo): boolean => t.montanteId !== undefined || tramosRepresentativosLocales.has(t.id)

  const nodosPorId = new Map(redHidraulica.nodos.map((nodo) => [nodo.id, nodo]))
  const nodosConTee: { nodoId: string; teeConfigurada: boolean }[] = []
  let tramoUltimaSalida: string | undefined
  let nodoActual = tramosColector[tramosColector.length - 1]!.nodoDestinoId

  for (;;) {
    const salientes = redHidraulica.tramos.filter((t) => t.nodoOrigenId === nodoActual && t.red === red)
    if (salientes.length === 0) {
      break
    }
    if (salientes.length === 1) {
      const unico = salientes[0]!
      if (esInicioDeSalida(unico)) {
        tramoUltimaSalida = unico.id
        break
      }
      nodoActual = unico.nodoDestinoId
      continue
    }
    const continuaTronco = salientes.find((t) => !esInicioDeSalida(t))
    const salidasAca = salientes.filter((t) => esInicioDeSalida(t))
    const teeConfigurada = nodosPorId.get(nodoActual)?.tee !== undefined
    if (continuaTronco === undefined) {
      // No queda tronco después de esta bifurcación: la última salida
      // encontrada acá se resuelve como codo, el resto como Tee.
      const [ultima, ...resto] = salidasAca
      for (const _salida of resto) {
        nodosConTee.push({ nodoId: nodoActual, teeConfigurada })
      }
      tramoUltimaSalida = ultima?.id
      break
    }
    for (const _salida of salidasAca) {
      nodosConTee.push({ nodoId: nodoActual, teeConfigurada })
    }
    nodoActual = continuaTronco.nodoDestinoId
  }

  return { nodosConTee, tramoUltimaSalida }
}

function resolverAccesoriosFisicosDeColectorRed(
  proyecto: Proyecto,
  red: RedDeTramo,
  catalogoArtefactos: readonly ArtefactoNormativo[],
  contexto: ContextoDeCalculoM2 | undefined,
  pendientes: string[],
): AccesorioFisicoEstimado[] {
  const { redHidraulica, montantes, configuracionAbastecimiento } = proyecto
  if (redHidraulica === undefined) {
    return []
  }
  const tramosColector = tramosDeColectorEnOrden(proyecto, red)
  if (tramosColector.length === 0) {
    return []
  }
  const primerTramo = tramosColector[0]!

  const resultadoDn = resolverDiametroComercialDeTramo(proyecto, primerTramo.id, catalogoArtefactos, catalogoSistemasDeTuberia, contexto)
  const dnComercial = resultadoDn.tipo === 'conCandidato' ? resultadoDn.candidato.denominacionComercial : undefined
  if (dnComercial === undefined) {
    pendientes.push(`${ETIQUETA_COLECTOR_PRINCIPAL} (${red}) — accesorios estimados con DN pendiente de definición`)
    return []
  }

  const items: AccesorioFisicoEstimado[] = []
  const base = { sector: 'colectorPrincipal' as const, red, dnComercial }

  items.push({ ...base, idFisico: `colector:${red}:llave`, tipo: 'llaveDePaso', ubicacion: { tipo: 'tramo', tramoId: primerTramo.id } })

  const { nodosConTee, tramoUltimaSalida } = resolverDerivacionesDelColector(proyecto, red, tramosColector)
  let indiceTee = 0
  for (const nodo of nodosConTee) {
    if (!nodo.teeConfigurada) {
      items.push({ ...base, idFisico: `colector:${red}:tee:${indiceTee}`, tipo: 'teeDerivacion', ubicacion: { tipo: 'nodo', nodoId: nodo.nodoId } })
      indiceTee += 1
    }
  }
  if (tramoUltimaSalida !== undefined) {
    items.push({ ...base, idFisico: `colector:${red}:codoUltimaSalida`, tipo: 'codoUltimaSalida', ubicacion: { tipo: 'tramo', tramoId: tramoUltimaSalida } })
  }

  // Codos de recorrido del Colector: estimación fija (2, no "cada 2 m" --
  // regla exclusiva de Montantes), ubicados en el tramo raíz: afectan a
  // todo camino que atraviesa el Colector, igual que la llave general.
  items.push({ ...base, idFisico: `colector:${red}:codoRecorrido:0`, tipo: 'codoRecorrido', ubicacion: { tipo: 'tramo', tramoId: primerTramo.id } })
  items.push({ ...base, idFisico: `colector:${red}:codoRecorrido:1`, tipo: 'codoRecorrido', ubicacion: { tipo: 'tramo', tramoId: primerTramo.id } })

  const segmentosParaDistancia = tramosColector.map((t) => ({ tramoId: t.id, longitud_m: t.longitud_m ?? 0 }))
  distribuirAccesorioPeriodico(segmentosParaDistancia, 4).forEach((tramoId, i) => {
    items.push({ ...base, idFisico: `colector:${red}:union:${i}`, tipo: 'unionRecta', ubicacion: { tipo: 'tramo', tramoId } })
  })

  if (red === 'AF') {
    const filasGenerales = identificarFilasDistribucionGeneral(proyecto)
    const tieneAlimentacionAcs = filasGenerales.some((fila) => fila.etiqueta === 'Alimentación ACS')
    const tieneTanqueSuperior =
      configuracionAbastecimiento?.esquema === 'tanqueElevado' || configuracionAbastecimiento?.esquema === 'cisternaBombeoElevado'
    // ACS/ruptor/unión a tanque: piezas físicas cercanas a la entrada del
    // Colector (antes de cualquier derivación a Montante/Local), ubicadas
    // en el tramo raíz -- afectan a TODOS los caminos AF abastecidos desde
    // este Colector, igual que la llave general (misma justificación
    // topológica: son comunes a toda la instalación, no de una salida
    // particular).
    if (tieneAlimentacionAcs) {
      items.push({ ...base, idFisico: `colector:${red}:teeAcs`, tipo: 'teeAcs', ubicacion: { tipo: 'tramo', tramoId: primerTramo.id } })
    }
    if (tieneTanqueSuperior) {
      items.push({ ...base, idFisico: `colector:${red}:teeRuptor`, tipo: 'teeRuptor', ubicacion: { tipo: 'tramo', tramoId: primerTramo.id } })
      items.push({ ...base, idFisico: `colector:${red}:unionTanque`, tipo: 'unionTanque', ubicacion: { tipo: 'tramo', tramoId: primerTramo.id } })
    }
  }

  void montantes
  return items
}

// Punto de entrada único: todos los accesorios físicos estimados de
// Montante y Colector principal del proyecto (ambas redes). Gateado por el
// llamador al mismo criterio que ya regía DREZA (`granularidadHidraulica
// === 'simplificada' && metodoPerdidaLocalizada === 'estimado'`) -- este
// módulo no conoce ese gate, sólo produce la topología física.
export function resolverAccesoriosFisicosEstimadosDeRed(
  proyecto: Proyecto,
  catalogoArtefactos: readonly ArtefactoNormativo[],
  contexto?: ContextoDeCalculoM2,
): ResultadoAccesoriosFisicosEstimadosDeRed {
  const { redHidraulica, montantes } = proyecto
  if (redHidraulica === undefined) {
    return { items: [], pendientes: [] }
  }
  const pendientes: string[] = []
  const items: AccesorioFisicoEstimado[] = []

  for (const montante of montantes ?? []) {
    items.push(...resolverAccesoriosFisicosDeMontante(proyecto, montante, catalogoArtefactos, contexto, pendientes))
  }
  for (const red of ['AF', 'AC'] as const) {
    items.push(...resolverAccesoriosFisicosDeColectorRed(proyecto, red, catalogoArtefactos, contexto, pendientes))
  }

  return { items, pendientes }
}
