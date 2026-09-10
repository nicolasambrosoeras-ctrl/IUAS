// Motor de reconciliación de montantes explícitos (M2-TOPO-C, Paso 1).
//
// Un montante explícito NO es una segunda topología ni una segunda fuente
// de verdad (D-δ.23 firme): su identidad vive en `Proyecto.montantes`
// (id/red/nombre y nada más) y su estructura física vive ENTERAMENTE en
// `RedHidraulica` -- los segmentos son los `Tramo` cuyo `montanteId`
// apunta a esta identidad, los nodos de derivación son sus
// `nodoDestinoId`, y los Locales servidos se DERIVAN aguas abajo. Este
// módulo traduce comandos transitorios del constructor de M2
// ("agregar/quitar este Local a/de este montante", "borrar este
// montante") en mutaciones mínimas y no destructivas de esa topología
// física. Nunca persiste una lista paralela de Locales ni de Tramos.
//
// Decisiones cerradas que este motor implementa (subset autoritativo del
// handoff de M2-TOPO-C):
//
//  - Orden físico por COTA DE PISO EFECTIVA del Local (GEOM-UX-01 /
//    resolverCotaPisoDeLocal), nunca por el orden de clic ni por la cota
//    hidráulica del artefacto. Origen por encima -> cadena descendente;
//    origen por debajo (o desconocido) -> cadena ascendente. Un origen
//    ESTRICTAMENTE entre las cotas servidas deja la forma de la topología
//    físicamente ambigua (cadena única vs. bifurcación bidireccional):
//    fuera de alcance de M2-TOPO-C, se devuelve 'origenIntermedioNoSoportado'
//    sin mutar (DECISIÓN ROJA diferida).
//
//  - Longitud sugerida de cada segmento nuevo = |Δz| entre las cotas de
//    sus extremos, con `longitudEsSugerida: true`. La longitud sigue
//    significando recorrido físico real de cañería; |Δz| es sólo una
//    precarga IUAS editable (RD-2, ya implementada en conLongitudDeTramo:
//    al editar, el flag desaparece). Una longitud personalizada nunca se
//    reparte, interpola, escala, traslada ni borra (RD-1). Un |Δz| de 0 o
//    indeterminado NO fabrica un tramo de longitud 0 (CRIT-A20): el
//    segmento existe pero queda sin longitud precargada.
//
//  - Origen canónico: para AF con esquema 'directa' la raíz está a cota 0
//    (convención de resolverOrigenHidraulicoEfectivo); con tanque elevado,
//    la cota del pelo de agua mínimo (resolverPeloDeAguaMinimoEfectivo,
//    sin duplicar CRIT-A39) o el `cota_m` de la raíz en modo profesional.
//    Para AC, el `cota_m` del nodo produccionACS si el proyectista lo
//    declaró -- nunca se extrapola el pelo del tanque a AC. Sin cota
//    canónica coherente: segmentos sin longitud precargada, nunca 0.
//
//  - IDs estables (§24/§47): agregar/quitar un Local crea o modifica sólo
//    lo imprescindible. Un Local nuevo en una cota ya existente reusa el
//    nodo de derivación de esa cota. Quitar un Local NO fusiona segmentos
//    (§11): se prefiere conservar el nodo intermedio y ambos segmentos con
//    sus datos intactos; sólo se poda un nodo de derivación que quedó en
//    la punta sin ninguna derivación y cuyo segmento entrante es
//    íntegramente sugerido.
//
//  - Feed del Local (§25): asignar un Local reengancha su Tramo
//    representativo de esa red al nodo de derivación del montante;
//    quitarlo lo reengancha de vuelta a la raíz canónica fuera del
//    montante. Nunca se pierde longitud/accesorios/DN manual del feed (el
//    Tramo viaja entero, sólo cambia su `nodoOrigenId`).
import type { Local, Proyecto, UnidadFuncional } from '../../modelo/proyecto'
import type { Nodo, RedDeTramo, RedHidraulica, Tramo } from '../../modelo/redHidraulica'
import { resolverCotaPisoDeLocal } from '../../motor/tuberias/geometria/resolverCotaHidraulicaDeArtefacto'
import { resolverPeloDeAguaMinimoEfectivo } from '../../motor/modulo4/resolverPeloDeAguaMinimoDeTanque'
import { obtenerArtefactosAguasAbajo } from '../../motor/tuberias/topologia/obtenerArtefactosAguasAbajo'
import { asegurarRaizAC, asegurarRaizAF } from './asegurarRaizDeRed'
import { generarId } from './generarId'
import { podarNodosSinSalida } from './podarNodosSinSalida'

export type LocalServido = {
  readonly unidadFuncionalId: string
  readonly localId: string
}

// Copy humano de RD-1 (bloqueo de split sobre un segmento con dato físico
// manual). Texto conceptual del handoff -- una sola fuente para la UI.
export const COPY_BLOQUEO_SPLIT_DATO_MANUAL =
  'No se puede insertar automáticamente esta derivación porque el tramo que ' +
  'debería dividirse contiene datos personalizados. Revisá o restablecé los ' +
  'datos del tramo (longitud, accesorios o diámetro adoptado) antes de continuar.'

export const COPY_BLOQUEO_BORRADO_DATO_MANUAL =
  'No se puede borrar automáticamente este montante porque alguno de sus ' +
  'segmentos contiene datos personalizados (longitud, accesorios o diámetro ' +
  'adoptado) que no pueden trasladarse a la alimentación de un Local sin ' +
  'perder significado. Revisá o restablecé esos tramos antes de continuar.'

type MotivoDeBloqueo = 'longitudPersonalizada' | 'accesorios' | 'dnManual'

export type SegmentoBloqueante = {
  readonly tramoId: string
  readonly motivos: readonly MotivoDeBloqueo[]
}

export type ResultadoReconciliacionDeMontante =
  // El Proyecto todavía no tiene ninguna topología física.
  | { readonly tipo: 'sinRedHidraulica' }
  // No existe ninguna identidad de montante con ese id.
  | { readonly tipo: 'montanteInexistente' }
  // El (unidadFuncionalId, localId) del comando no existe en el Proyecto.
  | { readonly tipo: 'localInexistente' }
  // El Local no tiene un feed reenganchable en la red del montante (sin
  // terminal de esa red, o varios orígenes ya conectados sin patrón
  // único). El constructor de M2 sólo ofrece Locales con conectividad
  // real (CAT-CONN), así que esto es un borde defensivo.
  | { readonly tipo: 'localSinFeedConectable' }
  // El Local no está servido hoy por este montante (quitar es un no-op).
  | { readonly tipo: 'localNoServido' }
  // RD-1: la operación partiría un segmento con dato físico manual. NO se
  // muta nada -- el Proyecto devuelto por el llamador debe seguir siendo
  // el de entrada, byte-equivalente.
  | {
      readonly tipo: 'bloqueadoPorDatoFisicoManual'
      readonly copyHumano: string
      readonly segmentosBloqueantes: readonly SegmentoBloqueante[]
    }
  // §15: borrar el montante obligaría a descartar datos físicos
  // personalizados de sus segmentos. NO se muta nada.
  | {
      readonly tipo: 'bloqueadoPorDatoFisicoManualEnBorrado'
      readonly copyHumano: string
      readonly segmentosBloqueantes: readonly SegmentoBloqueante[]
    }
  // El origen del montante cae estrictamente entre las cotas de los
  // Locales servidos: forma de la topología físicamente ambigua. Fuera de
  // alcance de M2-TOPO-C.
  | {
      readonly tipo: 'origenIntermedioNoSoportado'
      readonly cotaOrigen_m: number
      readonly cotasServidas_m: readonly number[]
    }
  | {
      readonly tipo: 'reconciliado'
      readonly proyecto: Proyecto
      // Locales servidos por el montante DESPUÉS de la mutación, derivados
      // de la topología (nunca de una lista persistida).
      readonly localesServidos: readonly LocalServido[]
      // Locales servidos cuya cota de piso efectiva no se pudo resolver:
      // quedan enganchados al montante pero con el/los segmento(s) sin
      // longitud precargada (nunca 0) hasta que se cargue la cota.
      readonly localesSinCota: readonly LocalServido[]
    }

// ------------------------------------------------------------------
// Helpers puros
// ------------------------------------------------------------------

function claveLocal(unidadFuncionalId: string, localId: string): string {
  return JSON.stringify([unidadFuncionalId, localId])
}

function buscarLocal(
  proyecto: Proyecto,
  unidadFuncionalId: string,
  localId: string,
): { readonly unidadFuncional: UnidadFuncional; readonly local: Local } | undefined {
  const unidadFuncional = proyecto.unidadesFuncionales.find((uf) => uf.id === unidadFuncionalId)
  const local = unidadFuncional?.locales.find((l) => l.id === localId)
  if (unidadFuncional === undefined || local === undefined) {
    return undefined
  }
  return { unidadFuncional, local }
}

function cotaDePisoDeLocalServido(proyecto: Proyecto, servido: LocalServido): number | undefined {
  const encontrado = buscarLocal(proyecto, servido.unidadFuncionalId, servido.localId)
  if (encontrado === undefined) {
    return undefined
  }
  return resolverCotaPisoDeLocal(encontrado.unidadFuncional, encontrado.local)
}

// Un segmento del montante es "libremente resegmentable" (RD-1) cuando NO
// tiene ningún dato físico manual: su longitud es sugerida por IUAS (o
// todavía no tiene longitud), no tiene accesorios relevados y no tiene un
// DN adoptado a mano. `accesorios: []` ("relevado, sin accesorios") NO
// bloquea -- sólo una lista no vacía.
function motivosDeBloqueoDeSegmento(tramo: Tramo): readonly MotivoDeBloqueo[] {
  const motivos: MotivoDeBloqueo[] = []
  if (tramo.longitud_m !== undefined && tramo.longitudEsSugerida !== true) {
    motivos.push('longitudPersonalizada')
  }
  if (tramo.accesorios !== undefined && tramo.accesorios.length > 0) {
    motivos.push('accesorios')
  }
  if (tramo.dnComercialAdoptado !== undefined) {
    motivos.push('dnManual')
  }
  return motivos
}

function esLibrementeResegmentable(tramo: Tramo): boolean {
  return motivosDeBloqueoDeSegmento(tramo).length === 0
}

// Longitud sugerida entre dos cotas: |Δz|. Indeterminada (undefined) si
// falta alguna cota. Un |Δz| de 0 NO se materializa como longitud 0
// (CRIT-A20): se devuelve undefined y el segmento queda sin precarga.
function longitudSugeridaEntre(za: number | undefined, zb: number | undefined): number | undefined {
  if (za === undefined || zb === undefined) {
    return undefined
  }
  const delta = Math.abs(za - zb)
  return delta === 0 ? undefined : delta
}

// Aplica una longitud sugerida a un segmento del montante, respetando
// CRIT-A20: si la sugerencia es indeterminada o 0, el segmento queda sin
// `longitud_m` ni `longitudEsSugerida`.
function conLongitudSugerida(tramo: Tramo, longitud: number | undefined): Tramo {
  const base: Tramo = {
    id: tramo.id,
    nodoOrigenId: tramo.nodoOrigenId,
    nodoDestinoId: tramo.nodoDestinoId,
    red: tramo.red,
    ...(tramo.accesorios !== undefined ? { accesorios: tramo.accesorios } : {}),
    ...(tramo.dnComercialAdoptado !== undefined ? { dnComercialAdoptado: tramo.dnComercialAdoptado } : {}),
    ...(tramo.montanteId !== undefined ? { montanteId: tramo.montanteId } : {}),
  }
  if (longitud === undefined) {
    return base
  }
  return { ...base, longitud_m: longitud, longitudEsSugerida: true }
}

// Segmentos del montante ordenados desde el origen hacia la punta.
export type CadenaDeMontante = {
  readonly origenNodoId: string
  readonly segmentos: readonly Tramo[]
  // nodoDestinoId de cada segmento, en orden origen -> punta.
  readonly nodosDeDerivacion: readonly string[]
}

// Reconstrucción read-only de la cadena lineal de segmentos de un montante,
// en orden origen -> punta. `undefined` si el montante no tiene segmentos o
// si una edición manual del JSON rompió la linealidad. Exportada para que
// la proyección de la UI (montantesDelProyecto.ts / constructor de M2) y la
// prueba de proyectabilidad VIS-TOPO deriven el orden de los segmentos de
// la MISMA fuente que el motor, sin reimplementar el recorrido.
export function reconstruirCadena(redHidraulica: RedHidraulica, montanteId: string): CadenaDeMontante | undefined {
  const segmentos = redHidraulica.tramos.filter((t) => t.montanteId === montanteId)
  if (segmentos.length === 0) {
    return undefined
  }
  const destinos = new Set(segmentos.map((t) => t.nodoDestinoId))
  const primeros = segmentos.filter((t) => !destinos.has(t.nodoOrigenId))
  // Construcción propia del motor: siempre una cadena lineal. Si algo la
  // rompió (edición manual del JSON), no reordenamos a ciegas.
  if (primeros.length !== 1) {
    return undefined
  }
  const ordenados: Tramo[] = []
  let actual: Tramo | undefined = primeros[0]
  const porOrigen = new Map(segmentos.map((t) => [t.nodoOrigenId, t]))
  const vistos = new Set<string>()
  while (actual !== undefined) {
    if (vistos.has(actual.id)) {
      return undefined
    }
    vistos.add(actual.id)
    ordenados.push(actual)
    actual = porOrigen.get(actual.nodoDestinoId)
  }
  if (ordenados.length !== segmentos.length) {
    return undefined
  }
  return {
    origenNodoId: ordenados[0]!.nodoOrigenId,
    segmentos: ordenados,
    nodosDeDerivacion: ordenados.map((t) => t.nodoDestinoId),
  }
}

// Locales servidos por el montante, DERIVADOS de la topología: unión de
// los Locales aguas abajo de cada segmento. Nunca se persiste una lista
// paralela (D-δ.23): esta derivación es la única forma de responder "qué
// Locales sirve el montante", y la comparten el motor de reconciliación y
// la UI del constructor (montantesDelProyecto.ts).
export function derivarLocalesServidos(proyecto: Proyecto, montanteId: string): readonly LocalServido[] {
  const { redHidraulica } = proyecto
  if (redHidraulica === undefined) {
    return []
  }
  const segmentos = redHidraulica.tramos.filter((t) => t.montanteId === montanteId)
  const vistos = new Map<string, LocalServido>()
  for (const segmento of segmentos) {
    for (const ref of obtenerArtefactosAguasAbajo(proyecto, segmento.id)) {
      const clave = claveLocal(ref.unidadFuncionalId, ref.localId)
      if (!vistos.has(clave)) {
        vistos.set(clave, { unidadFuncionalId: ref.unidadFuncionalId, localId: ref.localId })
      }
    }
  }
  return [...vistos.values()]
}

// Cota de derivación de cada nodo del montante: la cota de piso de los
// Locales cuyo feed cuelga de ese nodo (fuera de la cadena del montante).
// Todos los Locales de un mismo nodo comparten cota por construcción; se
// toma la primera resoluble.
function cotasDeNodosDeDerivacion(
  proyecto: Proyecto,
  redHidraulica: RedHidraulica,
  montanteId: string,
  nodosDeDerivacion: readonly string[],
): Map<string, number | undefined> {
  const resultado = new Map<string, number | undefined>()
  for (const nodoId of nodosDeDerivacion) {
    const feeds = redHidraulica.tramos.filter((t) => t.nodoOrigenId === nodoId && t.montanteId !== montanteId)
    let cota: number | undefined
    for (const feed of feeds) {
      for (const ref of obtenerArtefactosAguasAbajo(proyecto, feed.id)) {
        cota = cotaDePisoDeLocalServido(proyecto, {
          unidadFuncionalId: ref.unidadFuncionalId,
          localId: ref.localId,
        })
        if (cota !== undefined) {
          break
        }
      }
      if (cota !== undefined) {
        break
      }
    }
    resultado.set(nodoId, cota)
  }
  return resultado
}

type OrigenDeMontante = {
  readonly redHidraulica: RedHidraulica
  readonly nodoOrigenId: string
  readonly cotaOrigen_m: number | undefined
}

// Origen canónico del montante y su cota, sin duplicar CRIT-A39 (§19/§21).
function resolverOrigenDeMontante(proyecto: Proyecto, redHidraulica: RedHidraulica, red: RedDeTramo): OrigenDeMontante {
  if (red === 'AC') {
    const raiz = asegurarRaizAC(redHidraulica)
    const nodo = raiz.redHidraulica.nodos.find((n) => n.id === raiz.nodoId)
    // §21: AC referencia produccionACS; su cota canónica es la que el
    // proyectista haya declarado sobre ese nodo -- nunca se extrapola el
    // pelo del tanque a AC.
    return { redHidraulica: raiz.redHidraulica, nodoOrigenId: raiz.nodoId, cotaOrigen_m: nodo?.cota_m }
  }

  const raiz = asegurarRaizAF(redHidraulica)
  const esquema = proyecto.configuracionAbastecimiento?.esquema
  const granularidad = proyecto.configuracionHidraulica.granularidadHidraulica

  let cotaOrigen_m: number | undefined
  if (esquema === 'directa') {
    // resolverOrigenHidraulicoEfectivo: raíz ≈ cota 0 (nivel de acera).
    cotaOrigen_m = 0
  } else if (esquema === 'tanqueElevado' || esquema === 'cisternaBombeoElevado') {
    const pelo = resolverPeloDeAguaMinimoEfectivo({
      esquema,
      granularidad,
      desnivelConexion_m: proyecto.parametros.desnivelConexion_m,
    })
    if (pelo.tipo === 'derivadoRapido') {
      cotaOrigen_m = pelo.cota_m
    } else {
      // 'manual' (profesional) o 'noAplica' (cisternaBombeoElevado): la
      // cota canónica es el `cota_m` declarado sobre la raíz AF, si existe.
      const nodo = raiz.redHidraulica.nodos.find((n) => n.id === raiz.nodoId)
      cotaOrigen_m = nodo?.cota_m
    }
  }

  return { redHidraulica: raiz.redHidraulica, nodoOrigenId: raiz.nodoId, cotaOrigen_m }
}

// Sentido físico de la cadena a partir de la cota del origen y de las
// cotas servidas. 'descendente' = origen por encima; 'ascendente' = origen
// por debajo o desconocido; 'ambiguo' = origen estrictamente en el medio.
type SentidoDeCadena = 'ascendente' | 'descendente' | 'ambiguo'

function resolverSentido(cotaOrigen_m: number | undefined, cotasServidas: readonly number[]): SentidoDeCadena {
  if (cotaOrigen_m === undefined || cotasServidas.length === 0) {
    return 'ascendente'
  }
  const min = Math.min(...cotasServidas)
  const max = Math.max(...cotasServidas)
  if (cotaOrigen_m >= max) {
    return 'descendente'
  }
  if (cotaOrigen_m <= min) {
    return 'ascendente'
  }
  return 'ambiguo'
}

// Feed de un Local en una red: el Tramo NO-segmento-de-montante más cercano
// al origen cuya totalidad aguas abajo pertenece a ese único Local -- el
// mismo "Tramo representativo" de D-δ.44, pero excluyendo explícitamente
// los segmentos del montante (que, en un montante de un solo Local,
// `identificarTramosRepresentativosDeLocales` reconocería como
// representativos). Es el Tramo cuyo `nodoOrigenId` hay que reenganchar
// para mover el Local dentro/fuera del montante -- su longitud, accesorios
// y DN manual viajan con él sin tocarse. `undefined` si el Local no tiene
// conectividad reenganchable en esa red.
function hallarFeedDeLocal(
  proyecto: Proyecto,
  redHidraulica: RedHidraulica,
  unidadFuncionalId: string,
  localId: string,
  red: RedDeTramo,
): Tramo | undefined {
  const clave = claveLocal(unidadFuncionalId, localId)
  const esPuroDelLocal = (tramo: Tramo): boolean => {
    const refs = obtenerArtefactosAguasAbajo(proyecto, tramo.id)
    return refs.length > 0 && refs.every((r) => claveLocal(r.unidadFuncionalId, r.localId) === clave)
  }
  const candidatos = redHidraulica.tramos.filter(
    (t) => t.red === red && t.montanteId === undefined && esPuroDelLocal(t),
  )
  if (candidatos.length === 0) {
    return undefined
  }
  const idsCandidatos = new Set(candidatos.map((t) => t.id))
  const porDestino = new Map(redHidraulica.tramos.map((t) => [t.nodoDestinoId, t]))
  // El feed es el candidato cuyo Tramo padre ya NO es puro de este Local
  // (distribución general, segmento de montante, o alcanza más de un
  // Local): el más cercano al origen.
  return candidatos.find((t) => {
    const padre = porDestino.get(t.nodoOrigenId)
    return padre === undefined || !idsCandidatos.has(padre.id)
  })
}

function reengancharTramo(redHidraulica: RedHidraulica, tramoId: string, nuevoOrigenId: string): RedHidraulica {
  return {
    nodos: redHidraulica.nodos,
    tramos: redHidraulica.tramos.map((t) => (t.id === tramoId ? { ...t, nodoOrigenId: nuevoOrigenId } : t)),
  }
}

// ------------------------------------------------------------------
// Comando: agregar un Local al montante
// ------------------------------------------------------------------

export function agregarLocalAMontante(
  proyecto: Proyecto,
  montanteId: string,
  unidadFuncionalId: string,
  localId: string,
): ResultadoReconciliacionDeMontante {
  const { redHidraulica } = proyecto
  if (redHidraulica === undefined) {
    return { tipo: 'sinRedHidraulica' }
  }
  const montante = (proyecto.montantes ?? []).find((m) => m.id === montanteId)
  if (montante === undefined) {
    return { tipo: 'montanteInexistente' }
  }
  const encontrado = buscarLocal(proyecto, unidadFuncionalId, localId)
  if (encontrado === undefined) {
    return { tipo: 'localInexistente' }
  }

  const red = montante.red
  const servidoNuevo: LocalServido = { unidadFuncionalId, localId }
  const yaServidos = derivarLocalesServidos(proyecto, montanteId)
  if (yaServidos.some((s) => claveLocal(s.unidadFuncionalId, s.localId) === claveLocal(unidadFuncionalId, localId))) {
    // Idempotente: ya está servido, no se toca nada.
    return { tipo: 'reconciliado', proyecto, localesServidos: yaServidos, localesSinCota: [] }
  }

  const origen = resolverOrigenDeMontante(proyecto, redHidraulica, red)
  let rh = origen.redHidraulica

  const feed = hallarFeedDeLocal(proyecto, rh, unidadFuncionalId, localId, red)
  if (feed === undefined) {
    return { tipo: 'localSinFeedConectable' }
  }

  const zNuevo = resolverCotaPisoDeLocal(encontrado.unidadFuncional, encontrado.local)

  const cadena = reconstruirCadena(rh, montanteId)
  const cotasPorNodo = cadena
    ? cotasDeNodosDeDerivacion(proyecto, rh, montanteId, cadena.nodosDeDerivacion)
    : new Map<string, number | undefined>()

  // Cotas servidas conocidas hoy + la nueva (si es conocida), para
  // resolver sentido y detectar origen intermedio.
  const cotasConocidas: number[] = []
  for (const c of cotasPorNodo.values()) {
    if (c !== undefined) {
      cotasConocidas.push(c)
    }
  }
  if (zNuevo !== undefined) {
    cotasConocidas.push(zNuevo)
  }
  const sentido = resolverSentido(origen.cotaOrigen_m, cotasConocidas)
  if (sentido === 'ambiguo') {
    return {
      tipo: 'origenIntermedioNoSoportado',
      cotaOrigen_m: origen.cotaOrigen_m as number,
      cotasServidas_m: [...new Set(cotasConocidas)].sort((a, b) => a - b),
    }
  }

  // --- Caso A: montante vacío -> primer segmento origen -> nodo nuevo.
  if (cadena === undefined) {
    const nodoDerivacionId = generarId('nodo-montante')
    const segmentoId = generarId('tramo-montante')
    const segmento = conLongitudSugerida(
      { id: segmentoId, nodoOrigenId: origen.nodoOrigenId, nodoDestinoId: nodoDerivacionId, red, montanteId },
      longitudSugeridaEntre(origen.cotaOrigen_m, zNuevo),
    )
    rh = {
      nodos: [...rh.nodos, { id: nodoDerivacionId }],
      tramos: [...rh.tramos, segmento],
    }
    rh = reengancharTramo(rh, feed.id, nodoDerivacionId)
    return finalizar(proyecto, rh, montanteId, zNuevo === undefined ? [servidoNuevo] : [])
  }

  // --- Caso B: ya hay cadena. Ubicar la nueva cota.
  const nodosOrdenados = cadena.nodosDeDerivacion
  // ¿Existe ya un nodo de derivación a esta misma cota? -> reusar (§16/§17
  // CASO 3): sin split, sin bloqueo.
  if (zNuevo !== undefined) {
    const nodoMismaCota = nodosOrdenados.find((n) => cotasPorNodo.get(n) === zNuevo)
    if (nodoMismaCota !== undefined) {
      rh = reengancharTramo(rh, feed.id, nodoMismaCota)
      return finalizar(proyecto, rh, montanteId, [])
    }
  }

  // Posición de la nueva cota dentro de la cadena ordenada (por sentido).
  // Los nodos sin cota conocida se tratan como "en la punta".
  const posicion = ubicarEnCadena(zNuevo, nodosOrdenados, cotasPorNodo, sentido)

  if (posicion.tipo === 'punta') {
    const nodoAnteriorId = nodosOrdenados[nodosOrdenados.length - 1]!
    const zAnterior = cotasPorNodo.get(nodoAnteriorId)
    const nodoDerivacionId = generarId('nodo-montante')
    const segmento = conLongitudSugerida(
      {
        id: generarId('tramo-montante'),
        nodoOrigenId: nodoAnteriorId,
        nodoDestinoId: nodoDerivacionId,
        red,
        montanteId,
      },
      longitudSugeridaEntre(zAnterior, zNuevo),
    )
    rh = { nodos: [...rh.nodos, { id: nodoDerivacionId }], tramos: [...rh.tramos, segmento] }
    rh = reengancharTramo(rh, feed.id, nodoDerivacionId)
    return finalizar(proyecto, rh, montanteId, zNuevo === undefined ? [servidoNuevo] : [])
  }

  // posicion.tipo === 'split': partir el segmento entre dos nodos (o entre
  // el origen y el primer nodo). RD-1: sólo si es íntegramente sugerido.
  const segmentoAPartir = cadena.segmentos[posicion.indiceSegmento]!
  const nodoArribaId = posicion.indiceSegmento === 0 ? undefined : nodosOrdenados[posicion.indiceSegmento - 1]!
  const nodoAbajoId = nodosOrdenados[posicion.indiceSegmento]!
  const motivos = motivosDeBloqueoDeSegmento(segmentoAPartir)
  if (motivos.length > 0) {
    return {
      tipo: 'bloqueadoPorDatoFisicoManual',
      copyHumano: COPY_BLOQUEO_SPLIT_DATO_MANUAL,
      segmentosBloqueantes: [{ tramoId: segmentoAPartir.id, motivos }],
    }
  }

  const zArriba = nodoArribaId === undefined ? origen.cotaOrigen_m : cotasPorNodo.get(nodoArribaId)
  const zAbajo = cotasPorNodo.get(nodoAbajoId)
  const nodoDerivacionId = generarId('nodo-montante')
  // El segmento existente conserva su id como la mitad AGUAS ARRIBA
  // (origen sin cambios); la mitad aguas abajo es un segmento nuevo.
  const mitadArriba = conLongitudSugerida(
    { ...segmentoAPartir, nodoDestinoId: nodoDerivacionId },
    longitudSugeridaEntre(zArriba, zNuevo),
  )
  const mitadAbajo = conLongitudSugerida(
    {
      id: generarId('tramo-montante'),
      nodoOrigenId: nodoDerivacionId,
      nodoDestinoId: nodoAbajoId,
      red,
      montanteId,
    },
    longitudSugeridaEntre(zNuevo, zAbajo),
  )
  rh = {
    nodos: [...rh.nodos, { id: nodoDerivacionId }],
    tramos: [...rh.tramos.filter((t) => t.id !== segmentoAPartir.id), mitadArriba, mitadAbajo],
  }
  rh = reengancharTramo(rh, feed.id, nodoDerivacionId)
  return finalizar(proyecto, rh, montanteId, zNuevo === undefined ? [servidoNuevo] : [])
}

type PosicionEnCadena =
  | { readonly tipo: 'punta' }
  // Partir el segmento `indiceSegmento` de la cadena (mismo índice que en
  // `cadena.segmentos` / `nodosDeDerivacion`): el segmento 0 va del origen
  // al primer nodo; el segmento i (i>0) va del nodo i-1 al nodo i.
  | { readonly tipo: 'split'; readonly indiceSegmento: number }

// Ubica una cota nueva dentro de la cadena ordenada origen -> punta. Para
// 'ascendente' las cotas crecen hacia la punta; para 'descendente'
// decrecen. La nueva cota parte el primer segmento cuyo nodo de destino
// está MÁS LEJOS del origen que ella; si ninguno lo está (o los nodos que
// quedan no tienen cota conocida), va en la punta.
function ubicarEnCadena(
  zNuevo: number | undefined,
  nodosOrdenados: readonly string[],
  cotasPorNodo: ReadonlyMap<string, number | undefined>,
  sentido: 'ascendente' | 'descendente',
): PosicionEnCadena {
  if (zNuevo === undefined) {
    return { tipo: 'punta' }
  }
  const masLejosQueNuevo = (z: number): boolean => (sentido === 'ascendente' ? z > zNuevo : z < zNuevo)

  for (let i = 0; i < nodosOrdenados.length; i += 1) {
    const z = cotasPorNodo.get(nodosOrdenados[i]!)
    if (z !== undefined && masLejosQueNuevo(z)) {
      return { tipo: 'split', indiceSegmento: i }
    }
  }
  return { tipo: 'punta' }
}

// ------------------------------------------------------------------
// Comando: quitar un Local del montante
// ------------------------------------------------------------------

export function quitarLocalDeMontante(
  proyecto: Proyecto,
  montanteId: string,
  unidadFuncionalId: string,
  localId: string,
): ResultadoReconciliacionDeMontante {
  const { redHidraulica } = proyecto
  if (redHidraulica === undefined) {
    return { tipo: 'sinRedHidraulica' }
  }
  const montante = (proyecto.montantes ?? []).find((m) => m.id === montanteId)
  if (montante === undefined) {
    return { tipo: 'montanteInexistente' }
  }
  const servidos = derivarLocalesServidos(proyecto, montanteId)
  const clave = claveLocal(unidadFuncionalId, localId)
  if (!servidos.some((s) => claveLocal(s.unidadFuncionalId, s.localId) === clave)) {
    return { tipo: 'localNoServido' }
  }

  const red = montante.red
  const feed = hallarFeedDeLocal(proyecto, redHidraulica, unidadFuncionalId, localId, red)
  if (feed === undefined) {
    return { tipo: 'localSinFeedConectable' }
  }

  // Reenganchar el feed a la raíz canónica FUERA del montante.
  const origen = red === 'AC' ? asegurarRaizAC(redHidraulica) : asegurarRaizAF(redHidraulica)
  let rh = reengancharTramo(origen.redHidraulica, feed.id, origen.nodoId)

  // §11: sólo se poda la punta sin derivación con segmento entrante
  // íntegramente sugerido. NO se corre `podarNodosSinSalida` acá -- podaría
  // un nodo de derivación en la punta aunque su segmento entrante tenga
  // dato físico manual (se debe conservar) y nunca hay otro nodo puramente
  // topológico que quitar un Local pueda dejar sin salida.
  rh = podarPuntaSinDerivacion(rh, montanteId)

  return finalizar(proyecto, rh, montanteId, [])
}

// §11: quitar un Local NO fusiona segmentos. Sólo se poda el/los nodo(s)
// de derivación que quedaron EN LA PUNTA de la cadena sin ninguna
// derivación y cuyo segmento entrante es íntegramente sugerido -- nunca un
// nodo intermedio (ahí se conservan nodo y ambos segmentos con sus datos),
// nunca un segmento con dato físico manual (se conserva para no perderlo).
function podarPuntaSinDerivacion(redHidraulica: RedHidraulica, montanteId: string): RedHidraulica {
  let rh = redHidraulica
  for (;;) {
    const cadena = reconstruirCadena(rh, montanteId)
    if (cadena === undefined || cadena.segmentos.length === 0) {
      return rh
    }
    const puntaId = cadena.nodosDeDerivacion[cadena.nodosDeDerivacion.length - 1]!
    const ultimoSegmento = cadena.segmentos[cadena.segmentos.length - 1]!
    const tieneDerivacion = rh.tramos.some((t) => t.nodoOrigenId === puntaId)
    const nodoPunta = rh.nodos.find((n) => n.id === puntaId)
    if (tieneDerivacion || nodoPunta?.referencia !== undefined || !esLibrementeResegmentable(ultimoSegmento)) {
      return rh
    }
    rh = {
      nodos: rh.nodos.filter((n) => n.id !== puntaId),
      tramos: rh.tramos.filter((t) => t.id !== ultimoSegmento.id),
    }
  }
}

// ------------------------------------------------------------------
// Comando: borrar el montante
// ------------------------------------------------------------------

export function borrarMontante(proyecto: Proyecto, montanteId: string): ResultadoReconciliacionDeMontante {
  const { redHidraulica } = proyecto
  if (redHidraulica === undefined) {
    return { tipo: 'sinRedHidraulica' }
  }
  const montante = (proyecto.montantes ?? []).find((m) => m.id === montanteId)
  if (montante === undefined) {
    return { tipo: 'montanteInexistente' }
  }

  const segmentos = redHidraulica.tramos.filter((t) => t.montanteId === montanteId)
  const bloqueantes: SegmentoBloqueante[] = []
  for (const segmento of segmentos) {
    const motivos = motivosDeBloqueoDeSegmento(segmento)
    if (motivos.length > 0) {
      bloqueantes.push({ tramoId: segmento.id, motivos })
    }
  }
  if (bloqueantes.length > 0) {
    // §15: DECISIÓN ROJA -- no borrar silenciosamente descartando datos
    // físicos personalizados que no pueden trasladarse a un feed de Local.
    return {
      tipo: 'bloqueadoPorDatoFisicoManualEnBorrado',
      copyHumano: COPY_BLOQUEO_BORRADO_DATO_MANUAL,
      segmentosBloqueantes: bloqueantes,
    }
  }

  const red = montante.red
  const servidos = derivarLocalesServidos(proyecto, montanteId)
  const origen = red === 'AC' ? asegurarRaizAC(redHidraulica) : asegurarRaizAF(redHidraulica)
  let rh = origen.redHidraulica

  for (const servido of servidos) {
    const feed = hallarFeedDeLocal(proyecto, rh, servido.unidadFuncionalId, servido.localId, red)
    if (feed !== undefined) {
      rh = reengancharTramo(rh, feed.id, origen.nodoId)
    }
  }

  // Todos los segmentos son íntegramente sugeridos (ya se filtró): se
  // eliminan. Los nodos de derivación se eliminan sólo si, tras quitar los
  // segmentos y reenganchar los feeds, ya no los referencia ningún Tramo
  // (un feed que no se pudo reenganchar mantiene vivo su nodo, sin
  // dangling).
  const idsSegmentos = new Set(segmentos.map((s) => s.id))
  const idsNodosDerivacion = new Set(segmentos.map((s) => s.nodoDestinoId))
  const tramosRestantes = rh.tramos.filter((t) => !idsSegmentos.has(t.id))
  const nodosAunReferenciados = new Set(
    tramosRestantes.flatMap((t) => [t.nodoOrigenId, t.nodoDestinoId]),
  )
  rh = {
    nodos: rh.nodos.filter((n) => !(idsNodosDerivacion.has(n.id) && !nodosAunReferenciados.has(n.id))),
    tramos: tramosRestantes,
  }
  rh = podarNodosSinSalida(rh)

  const proyectoSinMontante: Proyecto = {
    ...proyecto,
    redHidraulica: reconciliarTeesTrasCambioTopologico(rh),
    montantes: (proyecto.montantes ?? []).filter((m) => m.id !== montanteId),
  }
  return {
    tipo: 'reconciliado',
    proyecto: proyectoSinMontante,
    localesServidos: [],
    localesSinCota: [],
  }
}

// ------------------------------------------------------------------
// Reconciliación de `Nodo.tee` tras un cambio de topología (M2-TOPO-D §13)
// ------------------------------------------------------------------

// Alta/baja de Locales, misma cota y borrado de montante pueden cambiar el
// fan-out de un Nodo de derivación: un 1→2 que pasa a 1→3 (un Local nuevo a
// una cota ya servida) o a 1→1 (se quitó su única rama), o un 1→2 cuya
// rama marcada como continuación recta dejó de salir de ese nodo. En todos
// esos casos `Nodo.tee` (CRIT-A31, alcance exclusivo 1→2) queda inválido
// -- `validarRedHidraulica` lo rechazaría (`redHidraulicaNodoTeeEstructuraNoSoportada`
// / `redHidraulicaNodoTeeTramoSalidaRectaInvalido`) y
// `resolverClasificacionDeTee` lanzaría en el balance de presión. Este
// paso LIMPIA de forma determinista sólo la metadata que ya no puede
// aplicarse: nunca toca `longitud_m` / `dnComercialAdoptado` / `accesorios`
// (RD-1/RD-2 de M2-TOPO-C) ni la topología. Una configuración de tee sobre
// un Nodo que sigue siendo exactamente 1→2 con las mismas dos salidas se
// PRESERVA intacta. La decisión física "esta salida es la recta" no puede
// "sobrevivir" a que el Nodo deje de ser una bifurcación 1→2: ya no
// describe una pieza en T que exista.
export function reconciliarTeesTrasCambioTopologico(redHidraulica: RedHidraulica): RedHidraulica {
  let cambiado = false
  const nodos = redHidraulica.nodos.map((nodo): Nodo => {
    const { tee } = nodo
    if (tee === undefined) {
      return nodo
    }
    const salientes = redHidraulica.tramos.filter((tramo) => tramo.nodoOrigenId === nodo.id)
    const entrantes = redHidraulica.tramos.filter((tramo) => tramo.nodoDestinoId === nodo.id)
    const sigueSiendoBifurcacion = salientes.length === 2 && entrantes.length === 1
    const rectaSigueSaliendo =
      tee.tipo !== 'entradaPorExtremo' || salientes.some((tramo) => tramo.id === tee.tramoSalidaRectaId)
    if (sigueSiendoBifurcacion && rectaSigueSaliendo) {
      return nodo
    }
    cambiado = true
    // Se OMITE la clave `tee` (no se asigna `undefined`), mismo criterio de
    // omisión explícita que conTeeDeNodo / conLongitudDeTramo.
    const nodoSinTee: Nodo = { id: nodo.id }
    if (nodo.referencia !== undefined) {
      nodoSinTee.referencia = nodo.referencia
    }
    if (nodo.cota_m !== undefined) {
      nodoSinTee.cota_m = nodo.cota_m
    }
    return nodoSinTee
  })
  return cambiado ? { nodos, tramos: redHidraulica.tramos } : redHidraulica
}

// ------------------------------------------------------------------
// Cierre común
// ------------------------------------------------------------------

function finalizar(
  proyecto: Proyecto,
  redHidraulica: RedHidraulica,
  montanteId: string,
  localesSinCota: readonly LocalServido[],
): ResultadoReconciliacionDeMontante {
  const proyectoActualizado: Proyecto = {
    ...proyecto,
    redHidraulica: reconciliarTeesTrasCambioTopologico(redHidraulica),
  }
  return {
    tipo: 'reconciliado',
    proyecto: proyectoActualizado,
    localesServidos: derivarLocalesServidos(proyectoActualizado, montanteId),
    localesSinCota,
  }
}
