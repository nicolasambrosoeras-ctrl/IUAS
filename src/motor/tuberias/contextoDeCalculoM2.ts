// Contexto de cálculo hidráulico LOCAL a una única resolución de Módulo 2
// (PERF-SCALE-01B).
//
// PROBLEMA. Durante UNA resolución de M2 (resolverEstadoModulo2 recorre un
// camino raíz→terminal por cada terminal), el mismo Tramo se resuelve desde
// cero muchas veces:
//   - cross-camino: distintos terminales comparten los Tramos troncales
//     (t-general, t-af-acs-{u}, t-af-br-{u}-{l}...), y cada camino los vuelve
//     a resolver;
//   - cross-etapa: dentro de un mismo camino, la pérdida distribuida pide
//     diámetro/velocidad de un Tramo y la pérdida localizada (estimada o
//     detallada) los vuelve a pedir.
// Medido en el fixture de escala M (393 tramos): ~2058 ejecuciones reales de
// resolverHidraulicaDeTramo, ~5,2× de redundancia.
//
// SOLUCIÓN. Un contexto puro que memoiza, por `tramoId`, el resultado de
// resolverHidraulicaDeTramo y de resolverDiametroComercialDeTramo. Ambas
// funciones son puras respecto de `(proyecto, tramoId, catálogos)`; durante
// una resolución de M2 el `proyecto` y los catálogos son inmutables (nadie
// muta redHidraulica ni configuracionHidraulica mientras se resuelve), así
// que `tramoId` es una clave completa y correcta de la entrada -- no puede
// haber dos resultados hidráulicos legítimos distintos para el mismo Tramo
// dentro de la misma resolución.
//
// CICLO DE VIDA. Se crea vacío al entrar a resolverEstadoModulo2 (o a
// cualquier orquestador de presión que quiera reutilizar el trabajo entre
// terminales) y se descarta al salir -- NO se guarda en el Proyecto, NO es
// un cache global, NO hay WeakMap ni singleton, NO hay invalidación. Cada
// edición del Proyecto arranca una resolución nueva con un contexto nuevo,
// así que el resultado depende sólo del input actual y nunca puede quedar
// stale. Al terminar la resolución el contexto queda elegible para GC;
// memoria O(tramos), nunca O(tramos×terminales).
//
// COMPATIBILIDAD. El contexto es un parámetro OPCIONAL al final de la firma
// de cada función del árbol de presión. Ausente ⇒ comportamiento previo byte
// a byte (cada llamada recalcula), que es lo que siguen haciendo los call
// sites puntuales de la UI (resolver una sola fila/tramo) y los tests
// históricos.
import type { ResultadoHidraulicoDeTramo } from './resolverHidraulicaDeTramo'
import type { ResultadoDiametroComercialDeTramo } from './resolverDiametroComercialDeTramo'

export interface ContextoDeCalculoM2 {
  // tramoId -> resultado de resolverHidraulicaDeTramo para ese Tramo en ESTA
  // resolución. Nunca se muta un valor después de guardarlo.
  readonly hidraulicaPorTramo: Map<string, ResultadoHidraulicoDeTramo>
  // tramoId -> resultado de resolverDiametroComercialDeTramo para ese Tramo
  // en ESTA resolución (incluye el override manual `dnComercialAdoptado`, que
  // vive en redHidraulica y por tanto es parte de la entrada inmutable).
  readonly diametroComercialPorTramo: Map<string, ResultadoDiametroComercialDeTramo>
}

export function crearContextoDeCalculoM2(): ContextoDeCalculoM2 {
  return {
    hidraulicaPorTramo: new Map(),
    diametroComercialPorTramo: new Map(),
  }
}
