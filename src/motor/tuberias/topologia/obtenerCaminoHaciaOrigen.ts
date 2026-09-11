// Traversal topologico puro hacia el origen: parte de un nodo terminal y
// camina CONTRA la direccion de los tramos (nodoDestinoId -> nodoOrigenId)
// hasta una raiz de alimentacion (nodo sin ningun tramo entrante). Es la
// pieza que faltaba para M2-B: los demas traversals del motor
// (obtenerArtefactosAguasAbajo, determinarCondicionHidraulicaDeCaudal,
// determinarConectividadFisica) recorren aguas ABAJO; este recorre aguas
// ARRIBA para poder acumular despues desnivel y perdida por tramo a lo
// largo del camino.
//
// Precondicion de alcance (CRIT-A27): los motores hidraulicos actuales de
// Modulo 2 trabajan sobre alimentacion RAMIFICADA -- cada consumo
// computado por un tramo se presupone transportado por un unico camino
// aguas arriba. Esta funcion NO restringe el modelo RedHidraulica (que
// conserva su generalidad deliberada, incluida la futura recirculacion
// ACS, D-delta.15): cuando la ascendencia del terminal no es un unico
// camino inequivoco (multiples tramos entrantes en un nodo, tramos
// paralelos, ciclo), devuelve un resultado discriminado 'no resoluble' en
// vez de fabricar un camino o elegir silenciosamente un predecesor. La
// red sigue siendo valida como estructura; simplemente no es resoluble
// por el alcance hidraulico actual.
import type { Nodo, RedHidraulica, Tramo } from '../../../modelo/redHidraulica'
import { registrarPasoCaminoHaciaOrigen } from './instrumentacionTopologica'
import { obtenerTramosEntrantesIndexados, type ContextoDeCalculoM2 } from '../contextoDeCalculoM2'

export type CaminoHaciaOrigen = {
  readonly tipo: 'camino'
  // Orden hidraulico explicito: raiz primero, terminal ultimo
  // (origen -> terminal). tramos[i] conecta nodos[i] -> nodos[i+1], asi
  // que tramos.length === nodos.length - 1. Para el caso "raiz inmediata"
  // (el nodo consultado ya es una raiz), nodos === [nodoTerminal] y
  // tramos === [].
  readonly nodos: readonly Nodo[]
  readonly tramos: readonly Tramo[]
  readonly raizId: string
  readonly terminalId: string
}

// RedHidraulica estructuralmente valida pero cuya ascendencia hacia el
// terminal consultado no es un unico camino inequivoco -> fuera del
// alcance hidraulico actual de M2 (CRIT-A27). NO es un error de uso: es
// un estado de dominio que un consumidor (balance de presion) debe
// propagar como incompleto/no resoluble, nunca convertir en un camino.
export type CaminoHaciaOrigenNoResoluble =
  | {
      readonly tipo: 'multiplesTramosEntrantes'
      // Nodo de la ascendencia (puede ser el propio terminal) con dos o
      // mas tramos entrantes. Incluye el caso de tramos paralelos
      // A -> B: dos Tramo distintos con el mismo nodoDestinoId.
      readonly nodoId: string
      readonly tramosEntrantesIds: readonly string[]
    }
  | {
      readonly tipo: 'ciclo'
      // Nodo ya visitado al que el walk vuelve a llegar: la ascendencia
      // contiene un ciclo y no termina en ninguna raiz.
      readonly nodoId: string
    }

export type ResultadoCaminoHaciaOrigen = CaminoHaciaOrigen | CaminoHaciaOrigenNoResoluble

export function obtenerCaminoHaciaOrigen(
  redHidraulica: RedHidraulica,
  nodoTerminalId: string,
  // PERF-SCALE-01D: contexto de cálculo local a la resolución de M2 (mismo
  // parámetro opcional que el resto del árbol de presión, ver
  // contextoDeCalculoM2.ts). Presente -> el índice nodoDestinoId->entrantes
  // se construye UNA vez para toda la resolución y este traversal deja de
  // ser O(profundidad·tramos) para pasar a O(profundidad). Ausente ->
  // comportamiento previo byte a byte (cada llamada escanea todos los
  // tramos): lo que siguen haciendo los call sites puntuales y los tests.
  contexto?: ContextoDeCalculoM2,
): ResultadoCaminoHaciaOrigen {
  const nodosPorId = new Map(redHidraulica.nodos.map((nodo) => [nodo.id, nodo]))
  const tramosEntrantesPorNodoDestino =
    contexto === undefined ? undefined : obtenerTramosEntrantesIndexados(contexto, redHidraulica.tramos)

  const nodoTerminal = nodosPorId.get(nodoTerminalId)
  if (nodoTerminal === undefined) {
    // Precondicion imposible tras validarRedHidraulica: un nodoId
    // inexistente es un error de uso de esta funcion, no un estado
    // previsible del dominio -- mismo criterio que tramoId inexistente en
    // obtenerArtefactosAguasAbajo / determinarCondicionHidraulicaDeCaudal.
    throw new Error(`obtenerCaminoHaciaOrigen: no existe ningun nodo con id "${nodoTerminalId}"`)
  }

  // Camino en orden inverso (terminal -> raiz) mientras se recorre; se
  // invierte al final para entregarlo en orden hidraulico (raiz ->
  // terminal).
  const nodosDesdeTerminal: Nodo[] = [nodoTerminal]
  const tramosDesdeTerminal: Tramo[] = []
  const nodosVisitados = new Set<string>([nodoTerminalId])

  let nodoActualId = nodoTerminalId

  for (;;) {
    registrarPasoCaminoHaciaOrigen()
    const tramosEntrantes =
      tramosEntrantesPorNodoDestino === undefined
        ? redHidraulica.tramos.filter((tramo) => tramo.nodoDestinoId === nodoActualId)
        : (tramosEntrantesPorNodoDestino.get(nodoActualId) ?? [])

    if (tramosEntrantes.length === 0) {
      // nodoActual no tiene tramo entrante: es una raiz de alimentacion.
      // Fin del camino (incluye el caso "raiz inmediata": el bucle no
      // agrego nada y nodoActualId === nodoTerminalId).
      break
    }

    if (tramosEntrantes.length > 1) {
      return {
        tipo: 'multiplesTramosEntrantes',
        nodoId: nodoActualId,
        tramosEntrantesIds: tramosEntrantes.map((tramo) => tramo.id),
      }
    }

    const tramoEntrante = tramosEntrantes[0] as Tramo
    const nodoOrigenId = tramoEntrante.nodoOrigenId

    if (nodosVisitados.has(nodoOrigenId)) {
      // El unico predecesor ya esta en el camino recorrido: la
      // ascendencia contiene un ciclo y no llega a ninguna raiz.
      return { tipo: 'ciclo', nodoId: nodoOrigenId }
    }

    const nodoOrigen = nodosPorId.get(nodoOrigenId)
    if (nodoOrigen === undefined) {
      // Precondicion imposible tras validarRedHidraulica
      // (redHidraulicaTramoNodoInexistente): un tramo que apunta a un
      // nodo inexistente es un defecto estructural, no un estado del
      // dominio -- throw, mismo criterio que el nodoTerminalId de arriba.
      throw new Error(
        `obtenerCaminoHaciaOrigen: el tramo "${tramoEntrante.id}" referencia un nodoOrigenId inexistente ` +
          `("${nodoOrigenId}")`,
      )
    }

    nodosVisitados.add(nodoOrigenId)
    nodosDesdeTerminal.push(nodoOrigen)
    tramosDesdeTerminal.push(tramoEntrante)
    nodoActualId = nodoOrigenId
  }

  const nodos = [...nodosDesdeTerminal].reverse()
  const tramos = [...tramosDesdeTerminal].reverse()

  return {
    tipo: 'camino',
    nodos,
    tramos,
    raizId: nodoActualId,
    terminalId: nodoTerminalId,
  }
}
