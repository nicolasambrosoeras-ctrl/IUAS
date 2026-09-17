// MATERIALS-01: snapshot DERIVADO y puro del cómputo de materiales del
// Proyecto -- una proyección INDEPENDIENTE de la Memoria de cálculo
// (resolverDatosDeInforme.ts), no una reinterpretación de ella. Compone --
// nunca recalcula -- lo que el dominio ya resuelve (M1/M2/M3/M4): ningún
// Qc/DN/V/hf se reimplementa acá.
//
// Regla central del slice: CÓMPUTO TÉCNICO ≠ CANTIDAD PARA COMPRA. Esta
// función devuelve exclusivamente cantidades COMPUTADAS (derivadas del
// modelo, sin ningún margen). `aplicarMargenDeCompra` es un paso PURO y
// SEPARADO que transforma ese snapshot en cantidades de compra según un
// porcentaje elegido por el usuario en el momento de generar el documento
// -- el porcentaje NUNCA participa de este resolver ni se persiste en
// `Proyecto` (ver brief MATERIALS-01 §4/§43).
//
// Fuente de longitud física: exclusivamente `Tramo.longitud_m` (la longitud
// ADOPTADA/ALMACENADA), nunca una longitud hidráulica efectiva ni
// correcciones virtuales de presión (brief §8/§9/§10). Fuente de conteo:
// el inventario PLANO `RedHidraulica.tramos` -- cada Tramo físico (incluido
// un segmento de Montante compartido por varios Locales) se computa
// exactamente una vez, nunca una vez por camino/terminal (brief §11,
// CRIT de doble conteo).
//
// ACCESSORIES-DEFAULTS-01 (D-δ.139): además de accesorios/Tees explícitos
// (`origen: 'definido'`), en granularidad 'simplificada' + método
// 'estimado' este resolver agrega una composición física APROXIMADA por
// (Local, red) -- `origen: 'estimado'`, ver resolverAccesoriosFisicosPorDefecto
// más abajo. Decisión de dominio del usuario, documentada en
// docs/ACCESSORIES-DEFAULTS-01.md.
import type { Proyecto, UnidadFuncional } from '../../modelo/proyecto'
import type { RedDeTramo } from '../../modelo/redHidraulica'
import type { ArtefactoNormativo } from '../../normativa/eras-2023/catalogo-artefactos'
import type { TipoProyectoNormativo } from '../../normativa/eras-2023/coeficientes-mayoracion'
import { obtenerMaterialTuberia, catalogoMaterialesTuberia } from '../../motor/tuberias/materialTuberia'
import { catalogoSistemasDeTuberia } from '../../motor/tuberias/sistemaDeTuberia'
import { resolverDiametroComercialDeTramo } from '../../motor/tuberias/resolverDiametroComercialDeTramo'
import { crearContextoDeCalculoM2, type ContextoDeCalculoM2 } from '../../motor/tuberias/contextoDeCalculoM2'
import { localesDeUnidadFuncional } from '../../motor/tuberias/geometria/resolverCotaHidraulicaDeArtefacto'
import { nombreDeAccesorio } from '../../interfaz/paginas/AccesoriosDeTramoEditor'
import {
  identificarFilasDistribucionGeneral,
  identificarFilasPrincipalesDeLocales,
} from '../../interfaz/paginas/identificarFilasDeModulo2'
import { etiquetaHumanaDeLocal } from '../../interfaz/paginas/montantesDelProyecto'
import { nombreDeMontante } from '../../interfaz/paginas/nombreDeMontante'
import { resolverEstadoModulo3 } from '../../motor/modulo3/resolverEstadoModulo3'
import { contarTerminalesFisicosDeLocal } from '../../motor/tuberias/topologia/contarTerminalesFisicosDeLocal'
import { localUnicoDeTramo } from '../../motor/tuberias/topologia/identificarTramoRepresentativoDeLocal'
import { tabla07PerdidasLocalizadas } from '../../normativa/eras-2023/tabla-07-perdidas-localizadas'

export type ItemTuberiaComputado = {
  readonly material: string
  readonly red: RedDeTramo
  readonly dnComercial: string
  readonly longitudComputada_m: number
}

// Accesorios físicos explícitamente modelados (Tramo.accesorios en modo
// 'detallado') MÁS Tees nodales inequívocamente especificables (brief §24)
// -- origen `'definido'` -- MÁS, desde ACCESSORIES-DEFAULTS-01 (D-δ.139),
// la composición física APROXIMADA de un Local+red en granularidad
// 'simplificada' + modo 'estimado' -- origen `'estimado'` (ver
// resolverAccesoriosFisicosPorDefecto). Todos son piezas discretas
// comprables, agrupadas bajo el mismo tipo de ítem para el margen de
// compra (brief §22/§46).
export type ItemAccesorioComputado = {
  readonly clave: string
  readonly etiqueta: string
  readonly dnComercial: string | undefined
  readonly cantidadComputada: number
  // 'definido' = accesorio/Tee explícitamente modelado por el usuario
  // (Tramo.accesorios o Nodo.tee real). 'estimado' = composición física
  // aproximada de ACCESSORIES-DEFAULTS-01 -- Materials/PDF lo muestran
  // como columna "Origen", nunca se persiste (100% derivado en cada
  // resolución).
  readonly origen: 'definido' | 'estimado'
}

// Ítems SIN margen de compra (brief §27/§28/§31/§38): medidores, equipos de
// almacenamiento y artefactos sanitarios. Mostrar una columna "Extra 0 %"
// sugeriría que podría aplicarse -- por eso ni siquiera tienen el campo.
export type ItemSinMargen = {
  readonly nombre: string
  readonly especificacion: string
  readonly cantidad: number
}

export type DatosComputoDeMateriales = {
  readonly proyecto: Proyecto
  readonly tuberias: readonly ItemTuberiaComputado[]
  readonly accesorios: readonly ItemAccesorioComputado[]
  readonly medidores: readonly ItemSinMargen[]
  readonly almacenamiento: readonly ItemSinMargen[]
  readonly artefactos: readonly ItemSinMargen[]
  // Elementos que el modelo no puede computar de forma inequívoca todavía
  // (DN pendiente, longitud pendiente, derivación múltiple no modelada,
  // Tee sin configurar...) -- nunca se inventa un valor para completarlos
  // (brief §48/§49/§50/§51/§81).
  readonly pendientes: readonly string[]
  // MATERIALS-POLISH-01: "Estado del listado" -- distinto del estado
  // hidráulico (CUMPLE/NO CUMPLE de Verificación). 'completo' = ningún
  // elemento que Materials pretende computar quedó pendiente de
  // definición. 'parcial' = existe al menos uno (`pendientes.length > 0`).
  readonly estado: 'completo' | 'parcial'
}

function ordenarTuberias(items: readonly ItemTuberiaComputado[]): ItemTuberiaComputado[] {
  return [...items].sort((a, b) => {
    if (a.material !== b.material) return a.material.localeCompare(b.material, 'es')
    const dnA = parseFloat(a.dnComercial)
    const dnB = parseFloat(b.dnComercial)
    if (dnA !== dnB) return dnA - dnB
    if (a.red !== b.red) return a.red === 'AF' ? -1 : 1
    return 0
  })
}

function ordenarAccesorios(items: readonly ItemAccesorioComputado[]): ItemAccesorioComputado[] {
  return [...items].sort((a, b) => {
    if (a.etiqueta !== b.etiqueta) return a.etiqueta.localeCompare(b.etiqueta, 'es')
    const dnA = a.dnComercial !== undefined ? parseFloat(a.dnComercial) : Number.POSITIVE_INFINITY
    const dnB = b.dnComercial !== undefined ? parseFloat(b.dnComercial) : Number.POSITIVE_INFINITY
    return dnA - dnB
  })
}

// MATERIALS-POLISH-01: humanización de pendientes (brief §11/§12/§40) --
// ningún ID interno (`Tramo.id`, `Nodo.id`) llega al texto público. Índice
// construido UNA vez por resolución: mapa tramoId -> etiqueta de
// Distribución general ("Alimentación general"/"Alimentación ACS", ya
// derivada por identificarFilasDistribucionGeneral) y tramoId -> identidad
// de (UF, Local) del Tramo representativo (identificarFilasPrincipalesDeLocales,
// la MISMA fuente de verdad que ya usa la fila de M2 y HYD-EST).
type IndiceDeHumanizacion = {
  readonly etiquetaDistribucionGeneralPorTramoId: ReadonlyMap<string, string>
  readonly identidadPorTramoId: ReadonlyMap<string, { unidadFuncionalId: string; localId: string }>
}

function construirIndiceDeHumanizacion(proyecto: Proyecto): IndiceDeHumanizacion {
  const etiquetaDistribucionGeneralPorTramoId = new Map<string, string>()
  for (const fila of identificarFilasDistribucionGeneral(proyecto)) {
    etiquetaDistribucionGeneralPorTramoId.set(fila.tramoId, fila.etiqueta)
  }
  const identidadPorTramoId = new Map<string, { unidadFuncionalId: string; localId: string }>()
  for (const fila of identificarFilasPrincipalesDeLocales(proyecto)) {
    identidadPorTramoId.set(fila.tramoId, { unidadFuncionalId: fila.unidadFuncionalId, localId: fila.localId })
  }
  return { etiquetaDistribucionGeneralPorTramoId, identidadPorTramoId }
}

function nombreDeRed(red: RedDeTramo): string {
  return red === 'AF' ? 'Agua fría' : 'Agua caliente'
}

// MATERIALS-POLISH-01 (brief §10/§33): en granularidad 'simplificada', un
// Tramo "ramal" -- puro de un (UF, Local) pero NO su representativo -- es,
// por construcción del modelo (mismo criterio que
// seleccionarTramosDeAcumulacion.ts, D-δ.44), un ramal interno hacia un
// Artefacto puntual que NUNCA requiere su propia longitud/DN/accesorios:
// el usuario sólo relevó UN dato por (Local, red), el del Tramo
// representativo. Marcarlo como "pendiente de definición" sería mostrar
// deuda topológica interna que Materials nunca pretendió computar (brief
// §10) -- y, para un fan-out/Tee dentro de esa misma zona ramal, la capa
// de ACCESSORIES-DEFAULTS-01 ya provee la aproximación física
// correspondiente, así que además duplicaría/contradiría ese default. En
// 'profesional' esta función siempre devuelve `false`: cada Tramo físico
// sigue exigiendo sus propios datos, sin cambios (comportamiento previo).
function esTramoRamalEnSimplificada(
  proyecto: Proyecto,
  tramoId: string,
  contexto: ContextoDeCalculoM2,
  indiceDeHumanizacion: IndiceDeHumanizacion,
): boolean {
  if (proyecto.configuracionHidraulica.granularidadHidraulica !== 'simplificada') {
    return false
  }
  if (indiceDeHumanizacion.identidadPorTramoId.has(tramoId)) {
    // Es el Tramo representativo de su (Local, red): SIEMPRE relevante.
    return false
  }
  return localUnicoDeTramo(proyecto, tramoId, contexto) !== undefined
}

// Etiqueta humana de un Tramo para un mensaje de pendiente -- nunca
// `Tramo.id` ni `Nodo.id`. Orden de resolución: (1) Distribución general
// ("Alimentación general"/"Alimentación ACS"); (2) Tramo representativo de
// un (UF, Local) -- misma etiqueta que ya usa la Memoria técnica
// (`etiquetaHumanaDeLocal`); (3) Montante, si el Tramo pertenece a uno;
// (4) fallback neutro por red (brief §12: nunca un ID técnico como texto
// público, ni siquiera como fallback).
function etiquetaHumanaDeTramoParaPendiente(proyecto: Proyecto, tramoId: string, red: RedDeTramo, indice: IndiceDeHumanizacion): string {
  const etiquetaGeneral = indice.etiquetaDistribucionGeneralPorTramoId.get(tramoId)
  if (etiquetaGeneral !== undefined) {
    return etiquetaGeneral
  }

  const identidad = indice.identidadPorTramoId.get(tramoId)
  if (identidad !== undefined) {
    const uf = proyecto.unidadesFuncionales.find((candidata) => candidata.id === identidad.unidadFuncionalId)
    const local = uf !== undefined ? localesDeUnidadFuncional(uf).find((candidato) => candidato.id === identidad.localId) : undefined
    if (uf !== undefined && local !== undefined) {
      return `${etiquetaHumanaDeLocal(uf, local)} · ${nombreDeRed(red)}`
    }
  }

  const tramo = proyecto.redHidraulica?.tramos.find((candidato) => candidato.id === tramoId)
  if (tramo?.montanteId !== undefined) {
    return `${nombreDeMontante(proyecto, tramo.montanteId)} · ${nombreDeRed(red)}`
  }

  return `Tramo de ${nombreDeRed(red).toLowerCase()}`
}

function resolverTuberiasYAccesorios(
  proyecto: Proyecto,
  catalogoArtefactos: readonly ArtefactoNormativo[],
  contexto: ContextoDeCalculoM2,
  indiceDeHumanizacion: IndiceDeHumanizacion,
  pendientes: string[],
): { tuberias: ItemTuberiaComputado[]; accesorios: Map<string, ItemAccesorioComputado> } {
  const acumuladorTuberias = new Map<string, ItemTuberiaComputado>()
  const acumuladorAccesorios = new Map<string, ItemAccesorioComputado>()
  const { redHidraulica } = proyecto
  if (redHidraulica === undefined) {
    return { tuberias: [], accesorios: acumuladorAccesorios }
  }

  const material = obtenerMaterialTuberia(proyecto.configuracionHidraulica.materialTuberiaId, catalogoMaterialesTuberia)
  const modoDetallado = proyecto.configuracionHidraulica.metodoPerdidaLocalizada === 'detallado'

  const resolverDn = (tramoId: string) =>
    resolverDiametroComercialDeTramo(proyecto, tramoId, catalogoArtefactos, catalogoSistemasDeTuberia, contexto)

  for (const tramo of redHidraulica.tramos) {
    // MATERIALS-POLISH-01 (brief §10/§33): un Tramo "ramal" en
    // 'simplificada' nunca requiere longitud/DN/accesorios propios -- se
    // excluye por completo (ni tubería, ni pendiente, ni accesorio
    // detallado), no sólo se le perdona la longitud.
    if (esTramoRamalEnSimplificada(proyecto, tramo.id, contexto, indiceDeHumanizacion)) {
      continue
    }

    const etiquetaTramo = etiquetaHumanaDeTramoParaPendiente(proyecto, tramo.id, tramo.red, indiceDeHumanizacion)

    // Fuente de longitud: exclusivamente longitud_m (CRIT-A20: 0/ausente
    // es inválido, nunca se suma como tramo válido, brief §50).
    const longitudValida = tramo.longitud_m !== undefined && tramo.longitud_m > 0
    if (!longitudValida) {
      pendientes.push(`${etiquetaTramo} — longitud pendiente de definición`)
    }

    const resultadoDn = resolverDn(tramo.id)
    const dnComercial = resultadoDn.tipo === 'conCandidato' ? resultadoDn.candidato.denominacionComercial : undefined
    if (dnComercial === undefined) {
      pendientes.push(`${etiquetaTramo} — DN pendiente de definición`)
    }

    if (longitudValida && dnComercial !== undefined) {
      const clave = `${material.nombre}|${tramo.red}|${dnComercial}`
      const existente = acumuladorTuberias.get(clave)
      acumuladorTuberias.set(clave, {
        material: material.nombre,
        red: tramo.red,
        dnComercial,
        // longitud_m ya validado > 0 arriba (longitudValida).
        longitudComputada_m: (existente?.longitudComputada_m ?? 0) + (tramo.longitud_m as number),
      })
    }

    // Accesorios explícitos de Tramo.accesorios: sólo en modo 'detallado'
    // (brief §18/§19/§20) -- los K estimados de HYD-EST NUNCA se convierten
    // en piezas, y esta rama simplemente no los lee.
    if (modoDetallado && tramo.accesorios !== undefined && tramo.accesorios.length > 0) {
      for (const accesorio of tramo.accesorios) {
        const etiqueta = nombreDeAccesorio(accesorio.tipo)
        const claveAccesorio = `${accesorio.tipo}|${dnComercial ?? 'pendiente'}`
        const existente = acumuladorAccesorios.get(claveAccesorio)
        acumuladorAccesorios.set(claveAccesorio, {
          clave: claveAccesorio,
          etiqueta,
          dnComercial,
          cantidadComputada: (existente?.cantidadComputada ?? 0) + accesorio.cantidad,
          origen: 'definido',
        })
      }
    }
  }

  return { tuberias: [...acumuladorTuberias.values()], accesorios: acumuladorAccesorios }
}

// Tee nodal (brief §24/§25/§26): computable como pieza comercial única sólo
// cuando la geometría comercial de sus 3 bocas (entrada, salida recta,
// salida lateral) puede determinarse de forma inequívoca a partir del DN
// resuelto de cada Tramo conectado. CRIT-A30: un cambio de DN entre Tramos
// NUNCA genera una "Reducción" inferida -- esta función no infiere ninguna
// pieza a partir de diferencias de DN, sólo identifica la Tee ya declarada
// explícitamente en `Nodo.tee`.
function resolverTees(
  proyecto: Proyecto,
  catalogoArtefactos: readonly ArtefactoNormativo[],
  contexto: ContextoDeCalculoM2,
  indiceDeHumanizacion: IndiceDeHumanizacion,
  acumuladorAccesorios: Map<string, ItemAccesorioComputado>,
  pendientes: string[],
): void {
  const { redHidraulica } = proyecto
  if (redHidraulica === undefined) {
    return
  }

  const dnDeTramo = (tramoId: string): string | undefined => {
    const resultado = resolverDiametroComercialDeTramo(proyecto, tramoId, catalogoArtefactos, catalogoSistemasDeTuberia, contexto)
    return resultado.tipo === 'conCandidato' ? resultado.candidato.denominacionComercial : undefined
  }

  for (const nodo of redHidraulica.nodos) {
    const entrantes = redHidraulica.tramos.filter((tramo) => tramo.nodoDestinoId === nodo.id)
    const salientes = redHidraulica.tramos.filter((tramo) => tramo.nodoOrigenId === nodo.id)

    if (entrantes.length !== 1) {
      continue
    }

    // MATERIALS-POLISH-01 (brief §10/§17/§33): en 'simplificada', CUALQUIER
    // bifurcación sin `montanteId` es la forma NORMAL en que esa
    // granularidad representa la distribución -- desde "Alimentación
    // general" abriéndose hacia cada Local (fan-out 1→N sin Tee: así es
    // como se ve SIEMPRE un proyecto simplificado bien formado, brief §33
    // "no marcar PARCIAL simplemente porque no existe topología
    // profesional") hasta el propio fan-out interno de un Local con
    // varios artefactos (1→2 incluido). Ninguna de las dos exige una Tee
    // real: la aproximación física de ACCESSORIES-DEFAULTS-01 (Tee
    // estimada por Local+red) ya cubre el caso interno, y la distribución
    // general no es una pieza comprable. Sólo una bifurcación real de
    // MONTANTE (`Tramo.montanteId` presente en el entrante o en algún
    // saliente -- M2-TOPO-D/TeeDeNodoEditor.tsx) sigue exigiendo su Tee
    // configurada, en cualquier granularidad.
    const esBifurcacionDeMontante = entrantes[0]!.montanteId !== undefined || salientes.some((tramo) => tramo.montanteId !== undefined)
    if (proyecto.configuracionHidraulica.granularidadHidraulica === 'simplificada' && !esBifurcacionDeMontante) {
      continue
    }

    // Identidad humana del nodo para cualquier pendiente de esta Tee: la
    // MISMA etiqueta que su Tramo entrante (brief §11/§12 -- nunca
    // `Nodo.id`).
    const etiquetaNodo = etiquetaHumanaDeTramoParaPendiente(proyecto, entrantes[0]!.id, entrantes[0]!.red, indiceDeHumanizacion)

    if (salientes.length > 2) {
      // Fan-out 1→N (N≥3): sin representación física en el modelo actual
      // (brief §26) -- nunca se inventa una pieza comercial.
      pendientes.push(`${etiquetaNodo} — derivación múltiple no modelada, requiere especificación`)
      continue
    }

    if (salientes.length !== 2) {
      continue
    }

    if (nodo.tee === undefined) {
      pendientes.push(`${etiquetaNodo} — Tee pendiente de configuración`)
      continue
    }

    const tee = nodo.tee
    // entrantes.length === 1 y salientes.length === 2 ya garantizados arriba.
    const dnEntrada = dnDeTramo(entrantes[0]!.id)
    let dnRecta: string | undefined
    let dnLateral: string | undefined
    if (tee.tipo === 'entradaCentral') {
      dnRecta = dnDeTramo(salientes[0]!.id)
      dnLateral = dnDeTramo(salientes[1]!.id)
    } else {
      const recta = salientes.find((tramo) => tramo.id === tee.tramoSalidaRectaId)
      const lateral = salientes.find((tramo) => tramo.id !== tee.tramoSalidaRectaId)
      dnRecta = recta !== undefined ? dnDeTramo(recta.id) : undefined
      dnLateral = lateral !== undefined ? dnDeTramo(lateral.id) : undefined
    }

    if (dnEntrada === undefined || dnRecta === undefined || dnLateral === undefined) {
      pendientes.push(`${etiquetaNodo} — Tee con DN pendiente de definición`)
      continue
    }

    const etiqueta = `Tee DN ${dnEntrada} × ${dnRecta} × ${dnLateral}`
    const clave = `tee|${etiqueta}`
    const existente = acumuladorAccesorios.get(clave)
    acumuladorAccesorios.set(clave, {
      clave,
      etiqueta,
      dnComercial: undefined,
      cantidadComputada: (existente?.cantidadComputada ?? 0) + 1,
      origen: 'definido',
    })
  }
}

// ACCESSORIES-DEFAULTS-01 (D-δ.139, decisión de dominio del usuario):
// composición física APROXIMADA de accesorios por (Local, red), reusando
// EXACTAMENTE la misma cardinalidad ya cerrada de HYD-EST (D-δ.40/D-δ.45)
// como aproximación de COMPRA -- nunca reabre ni recalibra esa fórmula
// hidráulica (los `KS_ESTIMADO_*`/la resolución de `hf` de
// resolverPerdidaLocalizadaEstimadaDeLocal.ts no se tocan ni se importan
// acá; esta función no calcula pérdida de carga, sólo cuenta piezas):
//   nTeesEstimadas        = max(0, n-1)           (Tee entrada central,
//                                                   salidas laterales)
//   nSingularidadTerminal = n>=1 ? 1 : 0           (Codo a 90º)
//   nLlaveDePaso          = n>=1 ? 1 : 0           (Llave de paso)
//
// Corre EXCLUSIVAMENTE cuando `granularidadHidraulica==='simplificada'` Y
// `metodoPerdidaLocalizada==='estimado'` -- decisión de producto explícita
// del usuario: en 'profesional' el listado exige piezas explícitamente
// modeladas (Tramo.accesorios/Nodo.tee real), nunca completa el BOM con
// una convención automática, aunque el método de pérdida siga siendo
// 'estimado'. Esto también deja sin ningún riesgo de doble conteo contra
// Tees topológicas reales: en 'profesional' los defaults están
// directamente deshabilitados; en 'simplificada' un Local nunca tiene
// `Nodo.tee` propio (las Tees reales sólo existen en derivaciones de
// Montante -- M2-TOPO-D/TeeDeNodoEditor.tsx -- fuera de este Local).
function resolverAccesoriosFisicosPorDefecto(
  proyecto: Proyecto,
  catalogoArtefactos: readonly ArtefactoNormativo[],
  contexto: ContextoDeCalculoM2,
  indiceDeHumanizacion: IndiceDeHumanizacion,
  acumuladorAccesorios: Map<string, ItemAccesorioComputado>,
  pendientes: string[],
): void {
  const { configuracionHidraulica, redHidraulica } = proyecto
  if (
    redHidraulica === undefined ||
    configuracionHidraulica.granularidadHidraulica !== 'simplificada' ||
    configuracionHidraulica.metodoPerdidaLocalizada !== 'estimado'
  ) {
    return
  }

  const filaTeeEstimada = tabla07PerdidasLocalizadas.find((fila) => fila.id === 'teeEntradaCentralSalidasLaterales')
  if (filaTeeEstimada === undefined) {
    // Precondicion imposible: mismo criterio que obtenerKsDeAccesorio.
    throw new Error(
      'resolverAccesoriosFisicosPorDefecto: no existe "teeEntradaCentralSalidasLaterales" en Tabla N°7',
    )
  }
  const nombreTeeEstimada = filaTeeEstimada.nombre

  // Prefijo `estimado|` en la clave: nunca puede colisionar con las claves
  // `${tipo}|${dn}` de 'detallado' ni `tee|${etiqueta}` de la Tee real --
  // ambas ramas son además mutuamente excluyentes por
  // `metodoPerdidaLocalizada` (nunca corren en la misma resolución).
  const agregar = (etiqueta: string, tipo: string, dnComercial: string, cantidad: number): void => {
    const clave = `estimado|${tipo}|${dnComercial}`
    const existente = acumuladorAccesorios.get(clave)
    acumuladorAccesorios.set(clave, {
      clave,
      etiqueta,
      dnComercial,
      cantidadComputada: (existente?.cantidadComputada ?? 0) + cantidad,
      origen: 'estimado',
    })
  }

  for (const fila of identificarFilasPrincipalesDeLocales(proyecto)) {
    const n = contarTerminalesFisicosDeLocal(redHidraulica, fila.unidadFuncionalId, fila.localId, fila.red)
    if (n === 0) {
      continue
    }

    const resultadoDn = resolverDiametroComercialDeTramo(proyecto, fila.tramoId, catalogoArtefactos, catalogoSistemasDeTuberia, contexto)
    const dnComercial = resultadoDn.tipo === 'conCandidato' ? resultadoDn.candidato.denominacionComercial : undefined
    // DN no resoluble: nunca se inventa (mismo criterio que tuberías) --
    // se declara pendiente y no se agrega ninguna pieza para este Local+red.
    if (dnComercial === undefined) {
      const etiqueta = etiquetaHumanaDeTramoParaPendiente(proyecto, fila.tramoId, fila.red, indiceDeHumanizacion)
      pendientes.push(`${etiqueta} — accesorios estimados con DN pendiente de definición`)
      continue
    }

    const nTeesEstimadas = Math.max(0, n - 1)
    if (nTeesEstimadas > 0) {
      agregar(nombreTeeEstimada, 'teeEstimada', dnComercial, nTeesEstimadas)
    }
    agregar(nombreDeAccesorio('codo90'), 'codo90', dnComercial, 1)
    agregar(nombreDeAccesorio('llaveDePaso'), 'llaveDePaso', dnComercial, 1)
  }
}

function resolverMedidores(
  proyecto: Proyecto,
  catalogoArtefactos: readonly ArtefactoNormativo[],
  coeficientesMayoracion: readonly TipoProyectoNormativo[],
  pendientes: string[],
): ItemSinMargen[] {
  const medidores: ItemSinMargen[] = []
  const estado = resolverEstadoModulo3(proyecto, catalogoArtefactos, coeficientesMayoracion)
  if (estado.estado === 'noIniciado') {
    return medidores
  }
  if (estado.estado === 'error') {
    return medidores
  }

  const resultadoParcial = estado.estado === 'evaluado' ? estado.resultado : estado.parcial
  const nombreDeUf = (unidadFuncionalId: string): string =>
    proyecto.unidadesFuncionales.find((uf: UnidadFuncional) => uf.id === unidadFuncionalId)?.nombre ?? unidadFuncionalId

  if (resultadoParcial.medidorGeneral !== undefined) {
    medidores.push({
      nombre: 'Medidor general',
      especificacion: `DN ${resultadoParcial.medidorGeneral.adoptado.dnMedidor_mm} mm`,
      cantidad: 1,
    })
  }
  for (const individual of resultadoParcial.medidoresIndividuales) {
    const servicio = individual.resultado.servicioMedido === 'aguaFria' ? 'AF' : 'AC'
    medidores.push({
      nombre: `Medidor individual — ${nombreDeUf(individual.resultado.unidadFuncionalId)} (${servicio})`,
      especificacion: `DN ${individual.resultado.adoptado.dnMedidor_mm} mm`,
      cantidad: 1,
    })
  }

  if (estado.estado === 'incompleto') {
    pendientes.push('Medidores — el cálculo de Módulo 3 está incompleto; algunos medidores no pudieron determinarse')
  }

  return medidores
}

function formatearLitros(volumen_m3: number): string {
  const litros = Math.round(volumen_m3 * 1000)
  return `${new Intl.NumberFormat('es-AR').format(litros)} L`
}

function resolverAlmacenamiento(proyecto: Proyecto, pendientes: string[]): ItemSinMargen[] {
  const almacenamiento: ItemSinMargen[] = []
  const configuracion = proyecto.configuracionAbastecimiento
  if (configuracion === undefined) {
    return almacenamiento
  }

  const tieneTanqueSuperior = configuracion.esquema === 'tanqueElevado' || configuracion.esquema === 'cisternaBombeoElevado'
  if (tieneTanqueSuperior && configuracion.volumenTanqueElevadoAdoptado_m3 !== undefined && configuracion.volumenTanqueElevadoAdoptado_m3 > 0) {
    almacenamiento.push({
      nombre: 'Tanque elevado',
      especificacion: `Volumen adoptado: ${formatearLitros(configuracion.volumenTanqueElevadoAdoptado_m3)}`,
      cantidad: 1,
    })
  }

  if (
    configuracion.esquema === 'cisternaBombeoElevado' &&
    configuracion.volumenTanqueBombeoAdoptado_m3 !== undefined &&
    configuracion.volumenTanqueBombeoAdoptado_m3 > 0
  ) {
    almacenamiento.push({
      nombre: 'Cisterna / tanque de bombeo',
      especificacion: `Volumen adoptado: ${formatearLitros(configuracion.volumenTanqueBombeoAdoptado_m3)}`,
      cantidad: 1,
    })
  }

  // Brief §29: el esquema puede requerir una bomba, pero el modelo no
  // define ningún dato de bomba (potencia, caudal, modelo) -- nunca se
  // inventa una especificación comercial concreta.
  if (configuracion.esquema === 'cisternaBombeoElevado') {
    pendientes.push('Sistema de bombeo requerido — no dimensionado por este módulo')
  }

  return almacenamiento
}

function resolverArtefactos(proyecto: Proyecto, catalogoArtefactos: readonly ArtefactoNormativo[]): ItemSinMargen[] {
  const acumulador = new Map<string, ItemSinMargen>()
  for (const unidadFuncional of proyecto.unidadesFuncionales) {
    for (const local of localesDeUnidadFuncional(unidadFuncional)) {
      for (const artefacto of local.artefactos) {
        // Mismo criterio de computabilidad que el resto del motor (M3):
        // sólo artefactos normativos participan del cómputo.
        if (artefacto.origen !== 'normativo') {
          continue
        }
        const normativo = catalogoArtefactos.find((candidato) => candidato.id === artefacto.artefactoId)
        const nombre = normativo?.nombre ?? artefacto.artefactoId
        const existente = acumulador.get(nombre)
        acumulador.set(nombre, {
          nombre,
          especificacion: '',
          cantidad: (existente?.cantidad ?? 0) + artefacto.cantidad,
        })
      }
    }
  }
  return [...acumulador.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
}

export function resolverDatosDeListadoDeMateriales(
  proyecto: Proyecto,
  catalogoArtefactos: readonly ArtefactoNormativo[],
  coeficientesMayoracion: readonly TipoProyectoNormativo[],
): DatosComputoDeMateriales {
  const contexto = crearContextoDeCalculoM2()
  const pendientes: string[] = []
  const indiceDeHumanizacion = construirIndiceDeHumanizacion(proyecto)

  const { tuberias, accesorios } = resolverTuberiasYAccesorios(proyecto, catalogoArtefactos, contexto, indiceDeHumanizacion, pendientes)
  resolverTees(proyecto, catalogoArtefactos, contexto, indiceDeHumanizacion, accesorios, pendientes)
  resolverAccesoriosFisicosPorDefecto(proyecto, catalogoArtefactos, contexto, indiceDeHumanizacion, accesorios, pendientes)

  return {
    proyecto,
    tuberias: ordenarTuberias(tuberias),
    accesorios: ordenarAccesorios([...accesorios.values()]),
    medidores: resolverMedidores(proyecto, catalogoArtefactos, coeficientesMayoracion, pendientes),
    almacenamiento: resolverAlmacenamiento(proyecto, pendientes),
    artefactos: resolverArtefactos(proyecto, catalogoArtefactos),
    pendientes,
    // MATERIALS-POLISH-01 (brief §7/§31/§32): "COMPLETO" no es un estado
    // hidráulico (CUMPLE/NO CUMPLE) -- es exclusivamente "¿Materials pudo
    // computar de forma inequívoca todo lo que pretende computar?". Se
    // deriva de `pendientes`: cada pendiente ya representa, por
    // construcción, un elemento que Materials no pudo determinar (brief
    // §10 -- no se agrega ningún pendiente que no sea relevante para el
    // BOM). Simplificada bien formada con defaults resolubles → sin
    // pendientes → COMPLETO (brief §33): no exige granularidad profesional
    // ni modo detallado.
    estado: pendientes.length === 0 ? 'completo' : 'parcial',
  }
}

export type ItemTuberiaConMargen = ItemTuberiaComputado & { readonly longitudCompra_m: number }
export type ItemAccesorioConMargen = ItemAccesorioComputado & { readonly cantidadCompra: number }

export type DatosListadoDeMateriales = Omit<DatosComputoDeMateriales, 'tuberias' | 'accesorios'> & {
  readonly porcentajeExtraCompra: number
  readonly tuberias: readonly ItemTuberiaConMargen[]
  readonly accesorios: readonly ItemAccesorioConMargen[]
}

// Paso PURO y SEPARADO (brief §4/§43): transforma cantidades COMPUTADAS en
// cantidades de COMPRA según el margen elegido por el usuario. Nunca
// modifica `datos.proyecto` ni ningún campo computado -- para cualquier
// porcentaje válido, `longitudComputada_m`/`cantidadComputada` de la salida
// son idénticos a los de la entrada (brief §44, invariante de no mutación).
//
// Rounding (brief §45): tuberías mantienen precisión numérica completa (el
// redondeo a 2 decimales es sólo de PRESENTACIÓN, responsabilidad del
// renderer); accesorios discretos SIEMPRE redondean hacia arriba
// (Math.ceil) -- 1 accesorio + 1 % da 2, intencionalmente (brief §45/§60).
export function aplicarMargenDeCompra(datos: DatosComputoDeMateriales, porcentajeExtraCompra: number): DatosListadoDeMateriales {
  if (!Number.isFinite(porcentajeExtraCompra) || porcentajeExtraCompra < 0 || porcentajeExtraCompra > 100) {
    throw new Error(
      `aplicarMargenDeCompra: porcentajeExtraCompra debe ser un número finito entre 0 y 100 (recibido: ${porcentajeExtraCompra})`,
    )
  }

  const factor = 1 + porcentajeExtraCompra / 100

  return {
    ...datos,
    porcentajeExtraCompra,
    tuberias: datos.tuberias.map((item) => ({ ...item, longitudCompra_m: item.longitudComputada_m * factor })),
    accesorios: datos.accesorios.map((item) => ({ ...item, cantidadCompra: Math.ceil(item.cantidadComputada * factor) })),
  }
}
