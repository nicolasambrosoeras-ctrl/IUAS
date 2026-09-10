// Proyección y edición de IDENTIDAD de los montantes explícitos para el
// constructor de Módulo 2 (M2-TOPO-C, Paso "UI del constructor"). Este
// módulo NO reconcilia topología -- eso es exclusivamente
// reconciliarMontante.ts (agregar/quitar Local, borrar montante). Acá vive
// sólo lo que la UI necesita ADEMÁS de esos comandos:
//
//   - crear/renombrar la identidad semántica en `Proyecto.montantes`
//     (id/red/nombre y nada más, D-δ.23);
//   - qué Locales EXISTENTES puede ofrecer un montante para "+ Agregar
//     local" (CAT-CONN §10 + deduplicación (UF,Local,Red) §11);
//   - una proyección READ-ONLY del montante (segmentos ordenados, nodos de
//     derivación, Locales servidos, origen) derivada ENTERAMENTE de
//     `RedHidraulica` + `Proyecto.montantes` + UF/Locales. Es la misma
//     proyección que consumirá VIS-TOPO (§19/§30): no se persiste ninguna
//     lista paralela de tramos ni de Locales.
import type { Local, Proyecto, TipoDeLocal, UnidadFuncional } from '../../modelo/proyecto'
import type { RedDeTramo } from '../../modelo/redHidraulica'
import {
  derivarLocalesServidos,
  reconstruirCadena,
  type LocalServido,
  type ResultadoReconciliacionDeMontante,
} from './reconciliarMontante'
import { derivarOrdinalesDeLocal } from './identificarFilasDeModulo2'
import { generarId } from './generarId'
import { nombreDeMontante, nombreFallbackDeMontante } from './nombreDeMontante'
import { obtenerArtefactosAguasAbajo } from '../../motor/tuberias/topologia/obtenerArtefactosAguasAbajo'
import { identificarNodosDeBifurcacion } from '../../motor/tuberias/topologia/identificarNodosDeBifurcacion'

// Duplicado intencional de la etiqueta homónima en
// ResultadoHidraulicoDeTramo.tsx / MotorDemandaPantalla.tsx (mismo criterio
// que esos dos: consumidor pequeño y puntual, no una fuente compartida
// todavía). Sólo se usa acá para rotular humanamente los Locales del
// constructor de montantes.
const ETIQUETA_TIPO_DE_LOCAL: Readonly<Record<TipoDeLocal, string>> = {
  bano: 'Baño',
  toilette: 'Toilette',
  cocina: 'Cocina',
  lavadero: 'Lavadero',
  cochera: 'Cochera',
  jardin: 'Jardín',
  otros: 'Otros',
}

function claveLocal(unidadFuncionalId: string, localId: string): string {
  return JSON.stringify([unidadFuncionalId, localId])
}

// Etiqueta humana de un Local dentro de su UF: "Baño 1 · UF 1". Nunca el
// id técnico. El ordinal numera por tipo dentro de la UF, igual que el
// resto de Módulo 2 (derivarOrdinalesDeLocal).
export function etiquetaHumanaDeLocal(uf: UnidadFuncional, local: Local): string {
  const ordinal = derivarOrdinalesDeLocal(uf.locales).get(local.id)
  const base = `${ETIQUETA_TIPO_DE_LOCAL[local.tipo]}${ordinal === undefined ? '' : ` ${ordinal}`}`
  return `${base} · ${uf.nombre}`
}

// ------------------------------------------------------------------
// Identidad: crear / renombrar
// ------------------------------------------------------------------

// Crea una identidad de montante nueva (id generado, `nombre` ausente ->
// fallback derivado por red). NO crea topología: un montante recién creado
// tiene 0 segmentos y 0 Locales, y eso es válido (§8). Devuelve el
// `montanteId` para que la UI pueda enfocar la card nueva.
export function conMontanteNuevo(
  proyecto: Proyecto,
  red: RedDeTramo,
): { readonly proyecto: Proyecto; readonly montanteId: string } {
  const montanteId = generarId('montante')
  return {
    proyecto: { ...proyecto, montantes: [...(proyecto.montantes ?? []), { id: montanteId, red }] },
    montanteId,
  }
}

// Renombra la identidad. `nombre` vacío o sólo espacios -> se ELIMINA el
// nombre custom y el montante vuelve al fallback derivado (§8). El fallback
// nunca se materializa como `Montante.nombre`.
export function conNombreDeMontante(proyecto: Proyecto, montanteId: string, nombre: string): Proyecto {
  const limpio = nombre.trim()
  return {
    ...proyecto,
    montantes: (proyecto.montantes ?? []).map((montante) =>
      montante.id === montanteId
        ? limpio === ''
          ? { id: montante.id, red: montante.red }
          : { id: montante.id, red: montante.red, nombre: limpio }
        : montante,
    ),
  }
}

// ------------------------------------------------------------------
// CAT-CONN: redes físicas reales de un Local
// ------------------------------------------------------------------

// Redes (AF/AC) para las que el Local tiene AL MENOS un terminal físico
// conectado en `RedHidraulica` (CRIT-A15) -- misma señal estructural que
// determinarConectividadFisica (nodo terminal de artefacto + tramo
// entrante -> `Tramo.red`), re-derivada acá para todo el Local de una vez
// y sin lanzar cuando no hay terminal (offering, no cálculo). NO se mira
// el tipo/nombre del artefacto ni `conectividadElegida` (§10): sólo la
// topología efectiva.
export function redesFisicasDeLocal(
  proyecto: Proyecto,
  unidadFuncionalId: string,
  localId: string,
): readonly RedDeTramo[] {
  const redHidraulica = proyecto.redHidraulica
  if (redHidraulica === undefined) {
    return []
  }
  const idsTerminales = new Set(
    redHidraulica.nodos
      .filter(
        (nodo) =>
          nodo.referencia?.tipo === 'artefacto' &&
          nodo.referencia.unidadFuncionalId === unidadFuncionalId &&
          nodo.referencia.localId === localId,
      )
      .map((nodo) => nodo.id),
  )
  if (idsTerminales.size === 0) {
    return []
  }
  const redes = new Set<RedDeTramo>()
  for (const tramo of redHidraulica.tramos) {
    if (idsTerminales.has(tramo.nodoDestinoId)) {
      redes.add(tramo.red)
    }
  }
  return redes.has('AF') && redes.has('AC') ? ['AF', 'AC'] : redes.has('AF') ? ['AF'] : redes.has('AC') ? ['AC'] : []
}

// ------------------------------------------------------------------
// Locales ofrecibles para "+ Agregar local"
// ------------------------------------------------------------------

export type LocalOfrecible = {
  readonly unidadFuncionalId: string
  readonly localId: string
  readonly etiqueta: string
}

// Todos los (UF,Local,Red) ya "tomados" por algún montante de esa red
// (servidos por ESTE o por OTRO montante). La regla de deduplicación es
// firme (§11): un (UF,Local,Red) sólo puede pertenecer a UN montante de
// esa red. AF y AC son independientes.
function localesTomadosEnRed(proyecto: Proyecto, red: RedDeTramo): ReadonlySet<string> {
  const tomados = new Set<string>()
  for (const montante of proyecto.montantes ?? []) {
    if (montante.red !== red) {
      continue
    }
    for (const servido of derivarLocalesServidos(proyecto, montante.id)) {
      tomados.add(claveLocal(servido.unidadFuncionalId, servido.localId))
    }
  }
  return tomados
}

// Locales EXISTENTES que este montante puede ofrecer para agregar:
//   - con conectividad física en la red del montante (CAT-CONN, §10);
//   - cuyo (UF,Local,Red) no pertenece ya a NINGÚN montante de esa red
//     (dedup §11 -- ni este ni otro; la UI nunca crea multi-padre).
// Nunca crea Locales (§9): sólo lista los que ya existen. Orden estable:
// el de `unidadesFuncionales` y, dentro de cada UF, el de `locales`.
export function localesOfreciblesParaMontante(proyecto: Proyecto, montanteId: string): readonly LocalOfrecible[] {
  const montante = (proyecto.montantes ?? []).find((candidato) => candidato.id === montanteId)
  if (montante === undefined) {
    return []
  }
  const tomados = localesTomadosEnRed(proyecto, montante.red)
  const ofrecibles: LocalOfrecible[] = []
  for (const uf of proyecto.unidadesFuncionales) {
    for (const local of uf.locales) {
      const clave = claveLocal(uf.id, local.id)
      if (tomados.has(clave)) {
        continue
      }
      if (!redesFisicasDeLocal(proyecto, uf.id, local.id).includes(montante.red)) {
        continue
      }
      ofrecibles.push({ unidadFuncionalId: uf.id, localId: local.id, etiqueta: etiquetaHumanaDeLocal(uf, local) })
    }
  }
  return ofrecibles
}

// ------------------------------------------------------------------
// Proyección READ-ONLY (card del constructor + proyectabilidad VIS-TOPO)
// ------------------------------------------------------------------

export type SegmentoProyectado = {
  readonly tramoId: string
  readonly nodoOrigenId: string
  readonly nodoDestinoId: string
  // Longitud FÍSICA declarada del segmento (recorrido real de cañería).
  // Ausente = todavía sin longitud (nunca 0, CRIT-A20).
  readonly longitud_m?: number
  // true -> precargada por IUAS (|Δz|), editable/re-segmentable;
  // false -> personalizada por el proyectista (RD-1/RD-2, intocable).
  readonly longitudEsSugerida: boolean
  readonly dnComercialAdoptado?: string
  // Posición en la cadena origen -> punta (0-based).
  readonly orden: number
}

export type LocalServidoProyectado = LocalServido & { readonly etiqueta: string }

export type MontanteProyectado = {
  readonly id: string
  readonly red: RedDeTramo
  // Nombre HUMANO ya resuelto (custom o fallback por red). Nunca el id.
  readonly nombre: string
  // Fallback derivado por red ("Montante AF 1"), SIEMPRE, ignorando el
  // custom -- estable mientras no cambie la red ni el orden de la lista.
  // Sirve para etiquetas accesibles que no deben mutar mientras el usuario
  // teclea un nombre custom.
  readonly nombreFallback: string
  readonly localesServidos: readonly LocalServidoProyectado[]
  // Segmentos en orden origen -> punta. Vacío = montante sin topología
  // todavía (0 Locales), que es un estado válido (§8).
  readonly segmentos: readonly SegmentoProyectado[]
  readonly nodosDeDerivacion: readonly string[]
  // Nodo de origen de la cadena (raíz canónica fuera del montante).
  // Ausente = el montante todavía no tiene segmentos.
  readonly origenNodoId?: string
  // false -> hay segmentos pero no forman una cadena lineal (edición
  // manual del JSON): la UI degrada a listado plano sin orden.
  readonly cadenaLineal: boolean
}

function etiquetarServidos(proyecto: Proyecto, servidos: readonly LocalServido[]): readonly LocalServidoProyectado[] {
  return servidos.map((servido) => {
    const uf = proyecto.unidadesFuncionales.find((candidata) => candidata.id === servido.unidadFuncionalId)
    const local = uf?.locales.find((candidato) => candidato.id === servido.localId)
    const etiqueta =
      uf !== undefined && local !== undefined
        ? etiquetaHumanaDeLocal(uf, local)
        : 'Local (no encontrado)'
    return { ...servido, etiqueta }
  })
}

// Proyección de un montante para la UI y para VIS-TOPO. `undefined` si la
// identidad no existe. TODO se deriva de la topología: los segmentos son
// los `Tramo` con `montanteId` de esta identidad, ordenados con la MISMA
// reconstrucción de cadena que usa el motor (reconstruirCadena), y los
// Locales servidos con derivarLocalesServidos.
export function proyectarMontante(proyecto: Proyecto, montanteId: string): MontanteProyectado | undefined {
  const montante = (proyecto.montantes ?? []).find((candidato) => candidato.id === montanteId)
  if (montante === undefined) {
    return undefined
  }
  const montantes = proyecto.montantes ?? []
  const posicionEnRed =
    montantes.slice(0, montantes.indexOf(montante) + 1).filter((candidato) => candidato.red === montante.red).length
  const redHidraulica = proyecto.redHidraulica
  const segmentosCrudos = (redHidraulica?.tramos ?? []).filter((tramo) => tramo.montanteId === montanteId)
  const cadena = redHidraulica === undefined ? undefined : reconstruirCadena(redHidraulica, montanteId)

  const segmentosOrdenados = cadena?.segmentos ?? segmentosCrudos
  const segmentos: readonly SegmentoProyectado[] = segmentosOrdenados.map((tramo, orden) => ({
    tramoId: tramo.id,
    nodoOrigenId: tramo.nodoOrigenId,
    nodoDestinoId: tramo.nodoDestinoId,
    ...(tramo.longitud_m !== undefined ? { longitud_m: tramo.longitud_m } : {}),
    longitudEsSugerida: tramo.longitudEsSugerida === true,
    ...(tramo.dnComercialAdoptado !== undefined ? { dnComercialAdoptado: tramo.dnComercialAdoptado } : {}),
    orden,
  }))

  return {
    id: montante.id,
    red: montante.red,
    nombre: nombreDeMontante(proyecto, montante.id),
    nombreFallback: nombreFallbackDeMontante(montante.red, posicionEnRed),
    localesServidos: etiquetarServidos(proyecto, derivarLocalesServidos(proyecto, montanteId)),
    segmentos,
    nodosDeDerivacion: cadena?.nodosDeDerivacion ?? segmentosCrudos.map((tramo) => tramo.nodoDestinoId),
    ...(cadena !== undefined ? { origenNodoId: cadena.origenNodoId } : {}),
    cadenaLineal: cadena !== undefined || segmentosCrudos.length === 0,
  }
}

// ------------------------------------------------------------------
// Interpretación humana del resultado del motor de reconciliación
// ------------------------------------------------------------------

// Traduce un `ResultadoReconciliacionDeMontante` a la decisión que la UI
// tiene que tomar (§13):
//   - `proyecto` no nulo -> aplicar con onCambiar (recálculo inmediato).
//   - `aviso` no nulo    -> mostrar ESE texto humano al usuario, sin
//                           mutar estado. Nunca un enum ni un id interno.
//   - ambos nulos        -> no-op silencioso (p. ej. quitar un Local que
//                           el montante no servía).
export type InterpretacionDeResultado = {
  readonly proyecto: Proyecto | null
  readonly aviso: string | null
}

const AVISO_ORIGEN_INTERMEDIO =
  'Por ahora IUAS no puede ubicar automáticamente este Local en el montante: el origen del ' +
  'montante queda entre las cotas de los Locales ya conectados y la forma del recorrido no es ' +
  'única. Cargá o ajustá las cotas de piso de los Locales, o conectá este Local por fuera del ' +
  'montante.'

const AVISO_SIN_FEED =
  'Ese Local no tiene una conexión de agua de esta red que se pueda enganchar a este montante. ' +
  'Revisá su conectividad en la Demanda.'

const AVISO_GENERICO =
  'No se pudo completar la operación sobre el montante. Recargá la página si el problema persiste.'

export function interpretarResultadoDeMontante(
  resultado: ResultadoReconciliacionDeMontante,
): InterpretacionDeResultado {
  switch (resultado.tipo) {
    case 'reconciliado':
      return { proyecto: resultado.proyecto, aviso: null }
    case 'localNoServido':
      // Quitar algo que no estaba: no-op, sin ruido (§14).
      return { proyecto: null, aviso: null }
    case 'bloqueadoPorDatoFisicoManual':
    case 'bloqueadoPorDatoFisicoManualEnBorrado':
      return { proyecto: null, aviso: resultado.copyHumano }
    case 'origenIntermedioNoSoportado':
      return { proyecto: null, aviso: AVISO_ORIGEN_INTERMEDIO }
    case 'localSinFeedConectable':
      return { proyecto: null, aviso: AVISO_SIN_FEED }
    case 'sinRedHidraulica':
    case 'montanteInexistente':
    case 'localInexistente':
      // Bordes defensivos: la UI del constructor sólo se muestra dentro
      // del gate de cobertura de M2 y nunca ofrece ids inexistentes.
      return { proyecto: null, aviso: AVISO_GENERICO }
  }
}

// ------------------------------------------------------------------
// Derivaciones (tees) del montante -- M2-TOPO-D
// ------------------------------------------------------------------

// Etiqueta HUMANA de una salida de un nodo de derivación del montante,
// para el editor de tee (§6/§17). Prioridad:
//   1. la salida ES el siguiente segmento del montante -> nombre del
//      montante ("Montante AF 1" / nombre custom);
//   2. la salida es el feed de EXACTAMENTE un Local -> etiqueta de ese
//      Local ("Baño 1 · UF 3");
//   3. alcanza varios Locales -> "Ramal a varios Locales";
//   4. no alcanza ninguno -> "Salida sin destino".
// Nunca el id técnico del Tramo/Nodo. Todo derivado de la topología.
export function etiquetaDeSalidaDeMontante(
  proyecto: Proyecto,
  montanteId: string,
  tramoSalienteId: string,
): string {
  const tramo = proyecto.redHidraulica?.tramos.find((candidato) => candidato.id === tramoSalienteId)
  if (tramo === undefined) {
    return 'Salida sin destino'
  }
  if (tramo.montanteId === montanteId) {
    return nombreDeMontante(proyecto, montanteId)
  }
  const localesAbajo = new Map<string, LocalServido>()
  for (const ref of obtenerArtefactosAguasAbajo(proyecto, tramoSalienteId)) {
    localesAbajo.set(claveLocal(ref.unidadFuncionalId, ref.localId), {
      unidadFuncionalId: ref.unidadFuncionalId,
      localId: ref.localId,
    })
  }
  const servidos = [...localesAbajo.values()]
  if (servidos.length === 0) {
    return 'Salida sin destino'
  }
  if (servidos.length === 1) {
    const servido = servidos[0]!
    const uf = proyecto.unidadesFuncionales.find((candidata) => candidata.id === servido.unidadFuncionalId)
    const local = uf?.locales.find((candidato) => candidato.id === servido.localId)
    return uf !== undefined && local !== undefined ? etiquetaHumanaDeLocal(uf, local) : 'Salida sin destino'
  }
  return 'Ramal a varios Locales'
}

export type DerivacionDeMontante =
  // 1 tramo entrante + 2 salientes: tee editable con ConfiguracionDeTee
  // (CRIT-A31), en modo Detalladas.
  | {
      readonly tipo: 'bifurcacion'
      readonly nodoId: string
      readonly tramoEntranteId: string
      readonly tramosSalientesIds: readonly [string, string]
      readonly etiquetasDeSalida: Readonly<Record<string, string>>
      readonly teeConfigurada: boolean
      // orden en la cadena origen -> punta (1-based), sólo para rotular.
      readonly orden: number
    }
  // 1 tramo entrante + >=3 salientes: fan-out válido para Qc (M2-TOPO-A),
  // pero fuera del alcance de ConfiguracionDeTee (1->2). No se ofrece un
  // editor engañoso (§12/§40); la UI lo explica como limitación conocida.
  | {
      readonly tipo: 'noConfigurable'
      readonly nodoId: string
      readonly cantidadSalidas: number
      readonly etiquetasDeSalida: readonly string[]
      readonly orden: number
    }

// Derivaciones REALES del montante: los nodos que son `nodoDestinoId` de
// algún segmento y que además bifurcan. Un nodo punta 1->1 (montante con
// un único Local en esa cota y sin continuación) NO es una derivación y no
// aparece (§15). READ-ONLY, todo derivado de RedHidraulica +
// Proyecto.montantes + UF/Locales -- es también la proyección que
// consumirán HYD-EST y VIS-TOPO (§21).
export function derivacionesDeMontante(proyecto: Proyecto, montanteId: string): readonly DerivacionDeMontante[] {
  const redHidraulica = proyecto.redHidraulica
  if (redHidraulica === undefined) {
    return []
  }
  const proyeccion = proyectarMontante(proyecto, montanteId)
  if (proyeccion === undefined) {
    return []
  }
  const bifurcaciones = new Map(identificarNodosDeBifurcacion(redHidraulica).map((bif) => [bif.nodoId, bif]))
  const resultado: DerivacionDeMontante[] = []
  proyeccion.nodosDeDerivacion.forEach((nodoId, indice) => {
    const orden = indice + 1
    const bif = bifurcaciones.get(nodoId)
    if (bif !== undefined) {
      resultado.push({
        tipo: 'bifurcacion',
        nodoId,
        tramoEntranteId: bif.tramoEntranteId,
        tramosSalientesIds: bif.tramosSalientesIds,
        etiquetasDeSalida: Object.fromEntries(
          bif.tramosSalientesIds.map((salienteId) => [
            salienteId,
            etiquetaDeSalidaDeMontante(proyecto, montanteId, salienteId),
          ]),
        ),
        teeConfigurada: redHidraulica.nodos.find((nodo) => nodo.id === nodoId)?.tee !== undefined,
        orden,
      })
      return
    }
    const salientes = redHidraulica.tramos.filter((tramo) => tramo.nodoOrigenId === nodoId)
    const entrantes = redHidraulica.tramos.filter((tramo) => tramo.nodoDestinoId === nodoId)
    if (entrantes.length === 1 && salientes.length >= 3) {
      resultado.push({
        tipo: 'noConfigurable',
        nodoId,
        cantidadSalidas: salientes.length,
        etiquetasDeSalida: salientes.map((tramo) => etiquetaDeSalidaDeMontante(proyecto, montanteId, tramo.id)),
        orden,
      })
    }
    // 1->1 punta: no bifurca, no es una derivación -- no se lista.
  })
  return resultado
}
