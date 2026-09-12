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
import type { RedHidraulica, Tramo } from '../../modelo/redHidraulica'
import { crearIndiceTopologico, type IndiceTopologico } from './topologia/indiceTopologico'
import type { IdentidadDeLocal } from './topologia/identificarTramoRepresentativoDeLocal'
import type { IndiceEstimacionLocalizada } from './presion/resolverPerdidaLocalizadaEstimadaDeCamino'

export interface ContextoDeCalculoM2 {
  // HYD-EST: derivado una vez por resolución; nunca sobrevive a una edición.
  estimacionLocalizada?: IndiceEstimacionLocalizada
  // tramoId -> resultado de resolverHidraulicaDeTramo para ese Tramo en ESTA
  // resolución. Nunca se muta un valor después de guardarlo.
  readonly hidraulicaPorTramo: Map<string, ResultadoHidraulicoDeTramo>
  // tramoId -> resultado de resolverDiametroComercialDeTramo para ese Tramo
  // en ESTA resolución (incluye el override manual `dnComercialAdoptado`, que
  // vive en redHidraulica y por tanto es parte de la entrada inmutable).
  readonly diametroComercialPorTramo: Map<string, ResultadoDiametroComercialDeTramo>
  // PERF-SCALE-01D. nodoDestinoId -> tramos ENTRANTES a ese nodo, para ESTA
  // resolución. Vacío hasta el primer uso real (ver
  // `obtenerTramosEntrantesIndexados`): `obtenerCaminoHaciaOrigen` lo
  // construye una sola vez, la primera vez que camina un árbol de esta
  // resolución, y lo reutiliza para los demás terminales -- reemplaza un
  // `Array.filter` sobre TODOS los tramos POR CADA PASO de CADA camino
  // (O(terminales·profundidad·tramos)) por un `Map.get` (O(terminales·
  // profundidad) tras una construcción única O(tramos)).
  readonly tramosEntrantesPorNodoDestino: Map<string, readonly Tramo[]>
  // PERF-SCALE-01D. El IndiceTopologico (nodosPorId/tramosPorId/
  // tramosSalientesPorNodo, ver topologia/indiceTopologico.ts) construido
  // para ESTA resolución. Su propio comentario de diseño (PERF-SCALE-01A)
  // dice "se materializa UNA vez por resolución", pero sin este campo
  // `calcularHidraulicaDeTramo` lo reconstruía una vez POR CADA Tramo
  // distinto calculado (≈tramos veces, no una) -- mutable únicamente para
  // memoizar esa construcción única; nunca se muta su contenido.
  indiceTopologico: IndiceTopologico | undefined
  // PERF-SCALE-01D. Resultado de `identificarTramosRepresentativosDeLocales`
  // para ESTA resolución, memoizado. Sólo importa con
  // `granularidadHidraulica: 'simplificada'`: `seleccionarTramosDeAcumulacion`
  // lo pedía desde CERO en cada llamada, y se llama una vez POR TERMINAL
  // desde `acumularPerdidaDistribuidaDeCamino` Y otra vez desde
  // `acumularPerdidaLocalizadaDeCamino` -- a escala 20+ UF, con
  // `identificarTramosRepresentativosDeLocales` internamente O(tramos²) (un
  // traversal aguas abajo sin índice por cada Tramo del Proyecto), esto era
  // O(terminales·tramos²): el hotspot real detrás del freeze de varios
  // segundos al editar un dato de presión en modo Rápido. `undefined` hasta
  // el primer uso.
  tramosRepresentativosDeLocales: ReadonlyMap<string, IdentidadDeLocal> | undefined
}

export function crearContextoDeCalculoM2(): ContextoDeCalculoM2 {
  return {
    hidraulicaPorTramo: new Map(),
    diametroComercialPorTramo: new Map(),
    tramosEntrantesPorNodoDestino: new Map(),
    indiceTopologico: undefined,
    tramosRepresentativosDeLocales: undefined,
  }
}

// Construye (la primera vez que se pide, dentro de esta resolución) el
// IndiceTopologico de `redHidraulica`, y lo devuelve. Mismo supuesto que el
// resto de este contexto: `redHidraulica` es inmutable mientras dura la
// resolución, así que un único índice es válido para todos los Tramos.
export function obtenerIndiceTopologicoDeContexto(
  contexto: ContextoDeCalculoM2,
  redHidraulica: RedHidraulica,
): IndiceTopologico {
  if (contexto.indiceTopologico === undefined) {
    contexto.indiceTopologico = crearIndiceTopologico(redHidraulica)
  }
  return contexto.indiceTopologico
}

// Construye (la primera vez que se pide, dentro de esta resolución) el
// índice nodoDestinoId -> tramos entrantes, y lo devuelve. `tramos` debe ser
// siempre `redHidraulica.tramos` de ESTE Proyecto -- inmutable mientras dura
// la resolución (mismo supuesto que el resto de este contexto). Un
// `redHidraulica` sin tramos dejaría el índice vacío indefinidamente; eso es
// correcto (no hay nada que indexar) y barato de detectar de nuevo en la
// próxima llamada.
export function obtenerTramosEntrantesIndexados(
  contexto: ContextoDeCalculoM2,
  tramos: readonly Tramo[],
): Map<string, readonly Tramo[]> {
  const indice = contexto.tramosEntrantesPorNodoDestino
  if (indice.size === 0) {
    for (const tramo of tramos) {
      const entrantes = indice.get(tramo.nodoDestinoId) as Tramo[] | undefined
      if (entrantes === undefined) {
        indice.set(tramo.nodoDestinoId, [tramo])
      } else {
        entrantes.push(tramo)
      }
    }
  }
  return indice
}
