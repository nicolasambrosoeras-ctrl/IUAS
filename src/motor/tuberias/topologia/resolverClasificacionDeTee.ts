// Clasificación del recorrido hidráulico de un Tramo saliente de un Nodo
// de bifurcación configurado como tee (CRIT-A31, modo detallado/experto
// de M2-C, D-δ.33): determina cuál de las 3 filas de Tabla N°7 (paso
// recto / salida lateral / entrada central-salidas laterales) corresponde
// al tramo consultado, sin resolver todavía Ks ni velocidad -- eso es
// responsabilidad del consumidor (acumularPerdidaLocalizadaDeCamino),
// que ya tiene resuelta la velocidad real de cada Tramo.
//
// Puramente derivado de Nodo.tee + la conectividad real del Nodo en
// RedHidraulica -- nunca infiere orientación desde ids, orden de
// arrays, orden de creación ni nombres (misma regla que
// hallarNodoDeInsercionDeLocal).
//
// Esta función asume que el Proyecto ya pasó validarRedHidraulica (mismo
// contrato que el resto de los resolvers del motor de tuberías, ver
// resolverPresionResidualDeCamino): si el Nodo declara `tee` pero la
// estructura real no es 1 entrante + 2 salientes, o `tramoSalidaRectaId`
// no pertenece a los dos salientes reales, es una precondición imposible
// tras la validación -- throw, no un estado de dominio a manejar acá
// (validarRedHidraulica ya lo rechaza explícitamente antes de llegar a
// este punto). Los estados de dominio legítimos que esta función
// distingue son:
//  - `Nodo.tee === undefined` sobre una bifurcación 1→2 real: la tee
//    todavía no fue relevada (`sinConfigurar`) -- nunca se infiere una
//    clasificación.
//  - 1 entrante + >2 salientes (`derivacionMultipleNoModelada`, M2-TOPO-E):
//    fan-out válido para Qc (M2-TOPO-A) pero fuera del alcance de
//    ConfiguracionDeTee (sólo 1→2). El modelo actual NO tiene datos para
//    representar esa singularidad (orden físico de ramas, cuál es recta,
//    piezas reales, longitudes intermedias) y NO se inventan. El consumidor
//    (acumularPerdidaLocalizadaDeCamino) marca ese tramo como no resuelto
//    -- la pérdida localizada del camino queda explícitamente INCOMPLETA,
//    nunca un 0 silencioso que aparente relevamiento completo. Depende sólo
//    de la topología real (entrantes/salientes), nunca de `montanteId`:
//    una cabecera de Local con ≥3 artefactos recibe el mismo tratamiento
//    que un nodo de derivación de montante 1→N.
//  - 1→1 / raíz / cualquier nodo que no bifurca (`noEsBifurcacionDeTee`):
//    genuinamente no hay singularidad de tee -- contribución 0 correcta.
import type { IdAccesorioTabla07 } from '../../../normativa/eras-2023/tabla-07-perdidas-localizadas'
import type { RedHidraulica } from '../../../modelo/redHidraulica'

export type ResultadoClasificacionDeTee =
  | {
      readonly tipo: 'clasificado'
      readonly idAccesorioTabla07: Extract<
        IdAccesorioTabla07,
        'teePasoRecto' | 'teeSalidaLateral' | 'teeEntradaCentralSalidasLaterales'
      >
    }
  | {
      // Nodo.tee === undefined: bifurcación real (1 entrante + 2
      // salientes), tee física todavía no relevada. Nunca se infiere
      // "sin tee" -- una bifurcación 1→2 real siempre corresponde a
      // algún tipo de pieza en T/Y.
      readonly tipo: 'sinConfigurar'
    }
  | {
      // 1 entrante + >2 salientes (fan-out 1→N, N≥3). Válido para Qc
      // (M2-TOPO-A) pero fuera del alcance de ConfiguracionDeTee (1→2). Su
      // pérdida localizada real NO se modela con los datos actuales -- es
      // un estado de incompletitud, no un "no aplica" (M2-TOPO-E, §8).
      readonly tipo: 'derivacionMultipleNoModelada'
      readonly cantidadSalidas: number
    }
  | {
      // El Nodo no bifurca (1→1, 1→0, raíz sin entrante) o tiene ≥2
      // entrantes (precondición imposible tras validarRedHidraulica). No
      // hay singularidad de tee -- contribución 0 genuina, no incompletitud.
      readonly tipo: 'noEsBifurcacionDeTee'
    }

export function resolverClasificacionDeTee(
  redHidraulica: RedHidraulica,
  nodoId: string,
  tramoSalienteId: string,
): ResultadoClasificacionDeTee {
  const nodo = redHidraulica.nodos.find((candidato) => candidato.id === nodoId)
  if (nodo === undefined) {
    throw new Error(`resolverClasificacionDeTee: no existe ningún nodo con id "${nodoId}"`)
  }

  const salientes = redHidraulica.tramos.filter((tramo) => tramo.nodoOrigenId === nodoId)
  const entrantes = redHidraulica.tramos.filter((tramo) => tramo.nodoDestinoId === nodoId)

  if (entrantes.length === 1 && salientes.length > 2) {
    // Fan-out 1→N (N≥3): se distingue explícitamente de `noEsBifurcacionDeTee`
    // -- el camino que atraviesa este nodo NO puede declararse con su
    // pérdida localizada completa (M2-TOPO-E). No lanza aunque el Nodo
    // arrastre una `tee` vieja de cuando era 1→2 (defensa en profundidad;
    // reconciliarTeesTrasCambioTopologico ya la limpia en el flujo normal).
    return { tipo: 'derivacionMultipleNoModelada', cantidadSalidas: salientes.length }
  }

  if (salientes.length !== 2 || entrantes.length !== 1) {
    return { tipo: 'noEsBifurcacionDeTee' }
  }

  const tramoSaliente = salientes.find((tramo) => tramo.id === tramoSalienteId)
  if (tramoSaliente === undefined) {
    // Precondición imposible si el llamador pasa un tramo real del
    // camino cuyo nodoOrigenId === nodoId (mismo criterio "precondición
    // imposible" que el resto del motor).
    throw new Error(
      `resolverClasificacionDeTee: el tramo "${tramoSalienteId}" no es un tramo saliente del nodo "${nodoId}"`,
    )
  }

  if (nodo.tee === undefined) {
    return { tipo: 'sinConfigurar' }
  }

  if (nodo.tee.tipo === 'entradaCentral') {
    return { tipo: 'clasificado', idAccesorioTabla07: 'teeEntradaCentralSalidasLaterales' }
  }

  const { tramoSalidaRectaId } = nodo.tee
  const otraSaliente = salientes.find((tramo) => tramo.id !== tramoSalienteId)
  if (tramoSalidaRectaId !== tramoSalienteId && tramoSalidaRectaId !== otraSaliente?.id) {
    // Precondición imposible tras validarRedHidraulica
    // (redHidraulicaNodoTeeTramoSalidaRectaInvalido): tramoSalidaRectaId
    // debe ser uno de los dos salientes reales.
    throw new Error(
      `resolverClasificacionDeTee: la configuración de tee del nodo "${nodoId}" referencia un ` +
        `tramoSalidaRectaId ("${tramoSalidaRectaId}") que no es ninguno de sus dos tramos salientes`,
    )
  }

  return {
    tipo: 'clasificado',
    idAccesorioTabla07: tramoSalidaRectaId === tramoSalienteId ? 'teePasoRecto' : 'teeSalidaLateral',
  }
}
