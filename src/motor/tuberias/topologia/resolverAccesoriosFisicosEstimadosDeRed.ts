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
import { clasificarSaltoDeReduccion } from '../perdidaCarga/clasificarSaltoDeReduccion'
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
  | 'reduccion'

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
  // DN "propio" del accesorio -- para `tipo: 'reduccion'`, el DN del lado
  // AGUAS ABAJO (CRIT-A30: la reducción se declara sobre el lado menor,
  // el Tramo donde efectivamente vive la pieza); `dnAguasArriba` completa
  // el par para poder resolver su Ks (`resolverKsDeReduccion` necesita
  // ambos DN, nunca uno solo -- CRIT-A26). Para cualquier otro tipo,
  // `dnAguasArriba` queda ausente (no aplica).
  readonly dnComercial: string
  readonly dnAguasArriba?: string
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

function resolverDnDeTramo(
  proyecto: Proyecto,
  tramoId: string,
  catalogoArtefactos: readonly ArtefactoNormativo[],
  contexto: ContextoDeCalculoM2 | undefined,
): string | undefined {
  const resultado = resolverDiametroComercialDeTramo(proyecto, tramoId, catalogoArtefactos, catalogoSistemasDeTuberia, contexto)
  return resultado.tipo === 'conCandidato' ? resultado.candidato.denominacionComercial : undefined
}

// Reducciones físicas estimadas por cambio real de DN entre tramos
// FÍSICAMENTE CONSECUTIVOS (CRIT-A30: la reducción se declara sobre el
// lado aguas abajo/menor, nunca inferida comparando tramos no conectados).
// `paresConsecutivos` ya viene resuelto por el llamador -- cada par es
// [tramoAguasAbajo, tramoAguasArriba] realmente unidos por un Nodo común
// (`tramoAguasAbajo.nodoOrigenId === tramoAguasArriba.nodoDestinoId`).
// Sólo genera una pieza cuando el salto CLASIFICA (`inmediata`/`mediata`,
// misma serie nominal que ya usa `resolverKsDeReduccion`) -- mismo DN no
// genera reducción (no es una pieza faltante, es una clasificación válida
// sin pieza física) y un DN no perteneciente a la serie/no resoluble
// nunca fabrica una reducción "fantasma" sin evidencia clasificable.
function detectarReduccionesEntrePares(
  proyecto: Proyecto,
  pares: readonly { readonly tramoAguasAbajo: Tramo; readonly tramoAguasArriba: Tramo }[],
  catalogoArtefactos: readonly ArtefactoNormativo[],
  contexto: ContextoDeCalculoM2 | undefined,
): readonly { readonly tramoId: string; readonly dnPropio: string; readonly dnAguasArriba: string }[] {
  const resultado: { tramoId: string; dnPropio: string; dnAguasArriba: string }[] = []
  for (const { tramoAguasAbajo, tramoAguasArriba } of pares) {
    const dnPropio = resolverDnDeTramo(proyecto, tramoAguasAbajo.id, catalogoArtefactos, contexto)
    const dnAguasArriba = resolverDnDeTramo(proyecto, tramoAguasArriba.id, catalogoArtefactos, contexto)
    if (dnPropio === undefined || dnAguasArriba === undefined) {
      continue
    }
    const clasificacion = clasificarSaltoDeReduccion(dnPropio, dnAguasArriba)
    if (clasificacion !== 'inmediata' && clasificacion !== 'mediata') {
      // 'mismoDn': no hay pieza física (no es un pendiente). 'pendiente':
      // salto no clasificable en la serie nominal -- no se fabrica una
      // reducción sin evidencia clasificable (nunca un K inventado).
      continue
    }
    resultado.push({ tramoId: tramoAguasAbajo.id, dnPropio, dnAguasArriba })
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

  // Tee de derivación: una por cada Local servido menos uno
  // (`derivacionesEsperadas = max(0, n-1)`, cardinalidad histórica DREZA
  // preservada), descontando las bifurcaciones que YA tienen `Nodo.tee`
  // configurado (opción A, MATERIALS-ACCESSORIES-01). Cada una vive en su
  // propio Nodo: sólo los caminos que atraviesan ESE nodo la ven. Se
  // limita a los primeros `derivacionesEsperadas` nodos de bifurcación de
  // la cadena (nunca TODOS los que reporte `derivacionesDeMontante`): un
  // nodo de bifurcación puede existir por una razón ajena al reparto entre
  // Locales de ESTE Montante (p. ej. el segmento del Montante termina en
  // un nodo que además alimenta la producción ACS) -- ese caso no debe
  // sumar una Tee de más.
  const derivacionesEsperadas = Math.max(0, n - 1)
  const bifurcaciones = derivacionesDeMontante(proyecto, montante.id).filter((d) => d.tipo === 'bifurcacion')
  const derivacionesYaResueltas = bifurcaciones.filter((d) => d.teeConfigurada).length
  const teesAGenerar = Math.max(0, derivacionesEsperadas - derivacionesYaResueltas)
  let indiceTee = 0
  for (const derivacion of bifurcaciones) {
    if (indiceTee >= teesAGenerar) {
      break
    }
    if (!derivacion.teeConfigurada) {
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

  // Reducciones: cada segmento contra su predecesor FÍSICO real -- para
  // el primero de la cadena, el Tramo que efectivamente lo alimenta
  // (puede ser el tronco de Colector, otro Montante, o nada si el
  // Montante arranca en la raíz absoluta de la topología, caso en el que
  // no hay ningún Tramo aguas arriba y no se fabrica una reducción de
  // "extremo"). Para el resto, el segmento inmediatamente anterior de la
  // MISMA cadena (siempre lineal, `reconstruirCadena`/CRIT).
  const paresParaReduccion: { tramoAguasAbajo: Tramo; tramoAguasArriba: Tramo }[] = []
  segmentos.forEach((segmento, i) => {
    if (i === 0) {
      const tramoAguasArriba = redHidraulica.tramos.find((t) => t.nodoDestinoId === segmento.nodoOrigenId)
      if (tramoAguasArriba !== undefined) {
        paresParaReduccion.push({ tramoAguasAbajo: segmento, tramoAguasArriba })
      }
      return
    }
    paresParaReduccion.push({ tramoAguasAbajo: segmento, tramoAguasArriba: segmentos[i - 1]! })
  })
  detectarReduccionesEntrePares(proyecto, paresParaReduccion, catalogoArtefactos, contexto).forEach((reduccion, i) => {
    items.push({
      ...base,
      idFisico: `montante:${montante.id}:reduccion:${i}`,
      tipo: 'reduccion',
      ubicacion: { tipo: 'tramo', tramoId: reduccion.tramoId },
      dnComercial: reduccion.dnPropio,
      dnAguasArriba: reduccion.dnAguasArriba,
    })
  })

  return items
}

// Tramos del tronco de Colector principal, en orden origen -> punta: desde
// el Tramo raíz (`identificarFilasDistribucionGeneral`) hasta que la
// topología entra en un Montante (`Tramo.montanteId` definido) o en el
// Tramo representativo de un Local directo -- el mismo criterio estructural
// que ya usa `resolverUbicacionDeTramo` en Materials, reimplementado acá
// sin depender de su índice de humanización (evita un import circular).
//
// A diferencia de una cadena estrictamente lineal (que se cortaría en la
// PRIMERA bifurcación), esto recorre TODO el subárbol de tramos "de
// reparto" alcanzables desde la raíz siguiendo únicamente ramas que NO son
// el arranque de un Montante/Local ni la rama hacia producción ACS -- un
// Colector puede bifurcarse varias veces antes de llegar a sus salidas
// finales (Caso E: 4 Locales directos desde un único nodo), y todos esos
// tramos "de reparto" son igualmente Colector, no sólo el primer tramo.
// Orden: BFS desde la raíz (determinístico, estable).
export function tramosDeColectorEnOrden(proyecto: Proyecto, red: RedDeTramo): readonly Tramo[] {
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
  if (tramoRaiz.montanteId !== undefined) {
    // Caso degenerado: el propio Tramo raíz de toda la topología ya
    // pertenece a un Montante (`identificarFilasDistribucionGeneral`
    // clasifica por ausencia de tramo entrante, sin mirar `montanteId`) --
    // no hay ningún segmento de Colector distinto aguas arriba de ese
    // Montante; tratarlo como Colector además de Montante duplicaría la
    // llave/codos/uniones de ESE MISMO Tramo bajo los dos sectores.
    return []
  }
  const esSalidaOAcs = construirClasificadorDeSalidaOAcs(proyecto, red)

  const resultado: Tramo[] = [tramoRaiz]
  const cola: string[] = [tramoRaiz.nodoDestinoId]
  while (cola.length > 0) {
    const nodoActual = cola.shift()!
    const salientes = redHidraulica.tramos.filter((t) => t.nodoOrigenId === nodoActual && t.red === red)
    for (const saliente of salientes) {
      if (esSalidaOAcs(saliente)) {
        continue
      }
      resultado.push(saliente)
      cola.push(saliente.nodoDestinoId)
    }
  }
  return resultado
}

// Clasificador compartido: un Tramo NO pertenece al tronco de reparto del
// Colector si arranca un Montante/Local (es una salida real) o si lleva
// hacia producción ACS (pieza aparte, `teeAcs`, ver
// `resolverAccesoriosFisicosDeColectorRed`).
function construirClasificadorDeSalidaOAcs(proyecto: Proyecto, red: RedDeTramo): (t: Tramo) => boolean {
  const { redHidraulica } = proyecto
  const nodosPorId = new Map((redHidraulica?.nodos ?? []).map((nodo) => [nodo.id, nodo]))
  const tramosRepresentativosLocales = new Set(
    identificarFilasPrincipalesDeLocales(proyecto)
      .filter((fila) => fila.red === red)
      .map((fila) => fila.tramoId),
  )
  return (t: Tramo): boolean =>
    t.montanteId !== undefined || tramosRepresentativosLocales.has(t.id) || nodosPorId.get(t.nodoDestinoId)?.referencia?.tipo === 'produccionACS'
}

// Recorre TODOS los nodos frontera del tronco de Colector (el nodo destino
// de la raíz + el nodo destino de cada tramo de reparto de
// `tramosColector`) y, en cada uno, identifica las salidas reales
// (arrancan un Montante o el Tramo representativo de un Local) -- cada una
// suma una Tee de derivación, SALVO la última de todas (en el orden
// determinístico del recorrido), que se resuelve como codo en vez de Tee
// (brief §8: "una Tee por salida salvo la última; un codo para la última
// salida"). `tramosColector` ya excluye ramas ACS y salidas (ver
// `tramosDeColectorEnOrden`), así que alcanza con mirar, por cada nodo
// frontera, los salientes que SÍ son salida.
function resolverDerivacionesDelColector(
  proyecto: Proyecto,
  red: RedDeTramo,
  tramosColector: readonly Tramo[],
): { readonly nodosConTee: readonly { readonly nodoId: string; readonly teeConfigurada: boolean }[]; readonly tramoUltimaSalida: string | undefined } {
  const { redHidraulica } = proyecto
  if (redHidraulica === undefined || tramosColector.length === 0) {
    return { nodosConTee: [], tramoUltimaSalida: undefined }
  }
  const nodosPorId = new Map(redHidraulica.nodos.map((nodo) => [nodo.id, nodo]))
  const tramosRepresentativosLocales = new Set(
    identificarFilasPrincipalesDeLocales(proyecto)
      .filter((fila) => fila.red === red)
      .map((fila) => fila.tramoId),
  )
  const esInicioDeSalida = (t: Tramo): boolean => t.montanteId !== undefined || tramosRepresentativosLocales.has(t.id)

  const salidasPorNodo: { nodoId: string; tramoId: string }[] = []
  for (const nodoFrontera of tramosColector.map((t) => t.nodoDestinoId)) {
    for (const saliente of redHidraulica.tramos.filter((t) => t.nodoOrigenId === nodoFrontera && t.red === red)) {
      if (esInicioDeSalida(saliente)) {
        salidasPorNodo.push({ nodoId: nodoFrontera, tramoId: saliente.id })
      }
    }
  }
  if (salidasPorNodo.length === 0) {
    return { nodosConTee: [], tramoUltimaSalida: undefined }
  }

  const ultima = salidasPorNodo[salidasPorNodo.length - 1]!
  const nodosConTee = salidasPorNodo
    .slice(0, -1)
    .map(({ nodoId }) => ({ nodoId, teeConfigurada: nodosPorId.get(nodoId)?.tee !== undefined }))
  return { nodosConTee, tramoUltimaSalida: ultima.tramoId }
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

  // Reducciones: cada tramo "de reparto" del Colector (salvo la raíz, que
  // por definición no tiene ningún Tramo entrante -- CRIT, no se fabrica
  // una reducción de "extremo") contra su predecesor físico REAL,
  // encontrado por topología (nunca por posición en el array -- un nodo
  // de bifurcación puede tener varios tramos "de reparto" hijos, cada uno
  // comparado independientemente contra el MISMO padre: así un fan-out
  // con ramas de DN distinto genera una reducción por cada rama que
  // efectivamente cambia, nunca una sola "promedio" ni ninguna para las
  // ramas que no cambian).
  const paresColectorParaReduccion = tramosColector.slice(1).map((tramo) => {
    const tramoAguasArriba = redHidraulica.tramos.find((t) => t.nodoDestinoId === tramo.nodoOrigenId)
    return tramoAguasArriba === undefined ? undefined : { tramoAguasAbajo: tramo, tramoAguasArriba }
  }).filter((par): par is { tramoAguasAbajo: Tramo; tramoAguasArriba: Tramo } => par !== undefined)
  detectarReduccionesEntrePares(proyecto, paresColectorParaReduccion, catalogoArtefactos, contexto).forEach((reduccion, i) => {
    items.push({
      ...base,
      idFisico: `colector:${red}:reduccion:${i}`,
      tipo: 'reduccion',
      ubicacion: { tipo: 'tramo', tramoId: reduccion.tramoId },
      dnComercial: reduccion.dnPropio,
      dnAguasArriba: reduccion.dnAguasArriba,
    })
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

// Conjunto de Tramos que pertenecen físicamente a un Montante o al tronco
// de Colector principal (todos los segmentos, no sólo los que recibieron
// una pieza periódica) -- usado por Materials para excluir estos Tramos de
// `resolverUnionesRectasDreza` (que agrupa por sector amplio) y no contar
// la misma unión física dos veces bajo dos reglas distintas.
export function tramosDeMontanteYColector(proyecto: Proyecto): ReadonlySet<string> {
  const { redHidraulica } = proyecto
  const cubiertos = new Set<string>()
  if (redHidraulica === undefined) {
    return cubiertos
  }
  for (const tramo of redHidraulica.tramos) {
    if (tramo.montanteId !== undefined) {
      cubiertos.add(tramo.id)
    }
  }
  for (const red of ['AF', 'AC'] as const) {
    for (const tramo of tramosDeColectorEnOrden(proyecto, red)) {
      cubiertos.add(tramo.id)
    }
  }
  return cubiertos
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

// PERF-SCALE-01B (mismo patrón que `ContextoDeCalculoM2`): el resultado de
// `resolverAccesoriosFisicosEstimadosDeRed` es el MISMO para todos los
// terminales de una resolución (no depende del terminal consultado, sólo
// de `proyecto`) -- sin memoizar, `resolverPresionResidualDeCamino` lo
// recalcularía desde cero por cada terminal (recorriendo TODOS los
// Montantes/Colector cada vez), reintroduciendo la complejidad
// O(terminales·montantes) que el resto del árbol de presión ya evita. Se
// memoiza por `contexto` (WeakMap, vive y muere con él -- nunca un cache
// global) en vez de agregar un campo a `ContextoDeCalculoM2` para no crear
// una dependencia circular de tipos entre ese módulo y este. Ausente ⇒
// comportamiento previo byte a byte (recalcula siempre), igual que el
// resto del contexto opcional.
const cachePorContexto = new WeakMap<ContextoDeCalculoM2, ResultadoAccesoriosFisicosEstimadosDeRed>()

export function obtenerAccesoriosFisicosEstimadosDeRedDeContexto(
  proyecto: Proyecto,
  catalogoArtefactos: readonly ArtefactoNormativo[],
  contexto?: ContextoDeCalculoM2,
): ResultadoAccesoriosFisicosEstimadosDeRed {
  if (contexto === undefined) {
    return resolverAccesoriosFisicosEstimadosDeRed(proyecto, catalogoArtefactos)
  }
  const cacheado = cachePorContexto.get(contexto)
  if (cacheado !== undefined) {
    return cacheado
  }
  const resultado = resolverAccesoriosFisicosEstimadosDeRed(proyecto, catalogoArtefactos, contexto)
  cachePorContexto.set(contexto, resultado)
  return resultado
}
