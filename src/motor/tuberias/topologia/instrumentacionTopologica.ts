// Seam de instrumentación topológica -- INERTE por defecto (PERF-SCALE-01A).
//
// No es un contador de producción: en cualquier ejecución real de la app el
// único costo es un chequeo booleano (`activo`) por llamada GRUESA -- una
// creación de índice topológico o un traversal batch aguas abajo completo,
// nunca por nodo ni por tramo. Mientras `activo === false` (el estado que la
// app siempre tiene) no se muta nada.
//
// Lo activan exclusivamente:
//   - el benchmark local del motor (`scripts/perf/`), para reportar cuántos
//     índices y traversals produce UNA resolución de escala (PERF-SCALE-01A
//     §9/§10);
//   - el test estructural de regresión de escala, para afirmar que esas
//     cantidades crecen con nodos/tramos y NO con artefactos×red (§8/§28).
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
}

let activo = false
let indicesTopologicosCreados = 0
let traversalsCondicionAguasAbajo = 0

export function activarInstrumentacionTopologica(): void {
  activo = true
  indicesTopologicosCreados = 0
  traversalsCondicionAguasAbajo = 0
}

export function desactivarInstrumentacionTopologica(): void {
  activo = false
}

export function reiniciarInstrumentacionTopologica(): void {
  indicesTopologicosCreados = 0
  traversalsCondicionAguasAbajo = 0
}

export function leerInstrumentacionTopologica(): ContadoresTopologicos {
  return { indicesTopologicosCreados, traversalsCondicionAguasAbajo }
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
