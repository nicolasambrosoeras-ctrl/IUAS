// Seam de instrumentación del motor de tuberías -- INERTE por defecto
// (PERF-SCALE-01A + PERF-SCALE-01B).
//
// No es un contador de producción: en cualquier ejecución real de la app el
// único costo es un chequeo booleano (`activo`) por llamada GRUESA -- una
// creación de índice topológico, un traversal batch aguas abajo completo, o
// una solicitud/cálculo de hidráulica o diámetro comercial de un Tramo --
// nunca por nodo ni por artefacto. Mientras `activo === false` (el estado
// que la app siempre tiene) no se muta nada.
//
// Lo activan exclusivamente:
//   - el benchmark local del motor (`scripts/perf/`), para reportar cuántos
//     índices, traversals y (PERF-SCALE-01B) solicitudes vs. cálculos reales
//     de hidráulica/diámetro produce UNA resolución de escala;
//   - los tests estructurales de regresión de escala, para afirmar que esas
//     cantidades crecen con nodos/tramos y NO con artefactos×red
//     (PERF-SCALE-01A) y que, con el contexto de cálculo local a la
//     resolución (PERF-SCALE-01B), los cálculos reales por Tramo colapsan a
//     ~1 aunque las solicitudes sigan siendo ~5·tramos.
//
// Es el mecanismo menos invasivo para tener una propiedad OBSERVABLE del
// costo algorítmico sin sembrar `expect(duration < N)` flaky en CI ni
// exponer estructuras internas.

export interface ContadoresTopologicos {
  // Cuántas veces se construyó un IndiceTopologico (mapas nodos/tramos/
  // salientes) durante la ventana medida.
  readonly indicesTopologicosCreados: number
  // Cuántos traversals DFS aguas abajo completos se ejecutaron
  // (resolverCondicionesHidraulicasDeCaudalAguasAbajo).
  readonly traversalsCondicionAguasAbajo: number
  // PERF-SCALE-01B. Cuántas veces se INVOCÓ resolverHidraulicaDeTramo
  // (solicitudes) frente a cuántas veces se ejecutó su cuerpo real
  // (cálculos = cache miss, o sin contexto). solicitudes - cálculos = hits
  // del contexto de cálculo local a la resolución.
  readonly solicitudesHidraulicaDeTramo: number
  readonly calculosHidraulicaDeTramo: number
  // PERF-SCALE-01B. Ídem para resolverDiametroComercialDeTramo.
  readonly solicitudesDiametroComercialDeTramo: number
  readonly calculosDiametroComercialDeTramo: number
  // PERF-SCALE-01B. Cuántas veces se ejecutó resolverEstadoModulo2 durante
  // la ventana medida -- para contar resoluciones completas por edición
  // (§17 del brief) sin logging permanente.
  readonly resolucionesModulo2: number
  // PERF-SCALE-01D. Cuántos PASOS de `obtenerCaminoHaciaOrigen` se
  // ejecutaron (una iteración del while = un `Array.filter` sobre TODOS
  // los tramos del Proyecto, no solo los del camino). Sin índice de
  // "tramos entrantes por nodo", el costo de un camino de profundidad d es
  // O(d·tramos) en vez de O(d): este contador expone esa multiplicación
  // sin necesitar cronometrar. Se incrementa una vez por iteración del
  // bucle, tanto si termina en una raíz como si corta por
  // multiplesTramosEntrantes/ciclo.
  readonly pasosCaminoHaciaOrigen: number
  // PERF-SCALE-01D. Cuántas veces se invocó `resolverRedDeTerminal`: mismo
  // patrón de costo que el anterior (un `Array.find` sobre TODOS los
  // tramos por invocación, sin índice), invocada una vez por terminal en
  // cada resolución de M2 (vía `hfMedidorDeTerminal`/
  // `perdidasDeMedidoresDeTerminal`).
  readonly resolucionesRedDeTerminal: number
  // PERF-SCALE-01D. Cuántas veces se ejecutó identificarTramosRepresentativosDeLocales
  // DE CERO (cache miss del contexto). Sólo importa con granularidadHidraulica
  // 'simplificada': antes de PERF-SCALE-01D, `seleccionarTramosDeAcumulacion`
  // la recalculaba una vez POR TERMINAL (y otra vez para pérdida localizada);
  // con el contexto compartido debe colapsar a 1 por resolución sin importar
  // cuántos terminales tenga el Proyecto.
  readonly construccionesTramosRepresentativos: number
  // PERF-SCALE-01D. Milisegundos acumulados por ETAPA dentro de
  // resolverPresionResidualDeCamino (sumados sobre TODOS los terminales de
  // la ventana medida), sólo para diagnóstico de profiling -- diagnóstico
  // temporal para encontrar el hotspot real a escala 20+ UF sin depender de
  // un profiler externo. Claves usadas por el benchmark:
  // 'referenciasYCota', 'desnivelEIncremento', 'perdidaDistribuida',
  // 'perdidaLocalizada', 'balance'.
  readonly tiemposMsPorEtapa: Readonly<Record<string, number>>
}

let activo = false
let indicesTopologicosCreados = 0
let traversalsCondicionAguasAbajo = 0
let solicitudesHidraulicaDeTramo = 0
let calculosHidraulicaDeTramo = 0
let solicitudesDiametroComercialDeTramo = 0
let calculosDiametroComercialDeTramo = 0
let resolucionesModulo2 = 0
let pasosCaminoHaciaOrigen = 0
let resolucionesRedDeTerminal = 0
let construccionesTramosRepresentativos = 0
let tiemposMsPorEtapa: Record<string, number> = {}

function reiniciarContadores(): void {
  indicesTopologicosCreados = 0
  traversalsCondicionAguasAbajo = 0
  solicitudesHidraulicaDeTramo = 0
  calculosHidraulicaDeTramo = 0
  solicitudesDiametroComercialDeTramo = 0
  calculosDiametroComercialDeTramo = 0
  resolucionesModulo2 = 0
  pasosCaminoHaciaOrigen = 0
  resolucionesRedDeTerminal = 0
  construccionesTramosRepresentativos = 0
  tiemposMsPorEtapa = {}
}

export function activarInstrumentacionTopologica(): void {
  activo = true
  reiniciarContadores()
}

export function desactivarInstrumentacionTopologica(): void {
  activo = false
}

export function reiniciarInstrumentacionTopologica(): void {
  reiniciarContadores()
}

export function leerInstrumentacionTopologica(): ContadoresTopologicos {
  return {
    indicesTopologicosCreados,
    traversalsCondicionAguasAbajo,
    solicitudesHidraulicaDeTramo,
    calculosHidraulicaDeTramo,
    solicitudesDiametroComercialDeTramo,
    calculosDiametroComercialDeTramo,
    resolucionesModulo2,
    pasosCaminoHaciaOrigen,
    resolucionesRedDeTerminal,
    construccionesTramosRepresentativos,
    tiemposMsPorEtapa: { ...tiemposMsPorEtapa },
  }
}

export function registrarIndiceTopologicoCreado(): void {
  if (activo) {
    indicesTopologicosCreados += 1
  }
}

export function registrarTraversalCondicionAguasAbajo(): void {
  if (activo) {
    traversalsCondicionAguasAbajo += 1
  }
}

export function registrarSolicitudHidraulicaDeTramo(): void {
  if (activo) {
    solicitudesHidraulicaDeTramo += 1
  }
}

export function registrarCalculoHidraulicaDeTramo(): void {
  if (activo) {
    calculosHidraulicaDeTramo += 1
  }
}

export function registrarSolicitudDiametroComercialDeTramo(): void {
  if (activo) {
    solicitudesDiametroComercialDeTramo += 1
  }
}

export function registrarCalculoDiametroComercialDeTramo(): void {
  if (activo) {
    calculosDiametroComercialDeTramo += 1
  }
}

export function registrarResolucionModulo2(): void {
  if (activo) {
    resolucionesModulo2 += 1
  }
}

export function registrarPasoCaminoHaciaOrigen(): void {
  if (activo) {
    pasosCaminoHaciaOrigen += 1
  }
}

export function registrarResolucionRedDeTerminal(): void {
  if (activo) {
    resolucionesRedDeTerminal += 1
  }
}

export function registrarConstruccionTramosRepresentativos(): void {
  if (activo) {
    construccionesTramosRepresentativos += 1
  }
}

export function acumularTiempoMsPorEtapa(etapa: string, ms: number): void {
  if (activo) {
    tiemposMsPorEtapa[etapa] = (tiemposMsPorEtapa[etapa] ?? 0) + ms
  }
}

// Gate para que un llamador evite incluso el `performance.now()` de medición
// por etapa (más fino que las llamadas GRUESAS del resto de este seam)
// mientras la instrumentación está inactiva -- costo cero en producción.
export function instrumentacionTopologicaActiva(): boolean {
  return activo
}
