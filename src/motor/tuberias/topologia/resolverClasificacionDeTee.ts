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
// este punto). El único estado de dominio legítimo que esta función
// distingue es `Nodo.tee === undefined`: una bifurcación 1→2 real cuya
// tee todavía no fue relevada -- nunca se infiere ninguna clasificación
// para ese caso.
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
      // El Nodo no tiene exactamente 1 entrante + 2 salientes: fuera del
      // alcance de este incremento (no bifurca, o bifurca en más de 2).
      // No es un estado de incompletitud -- simplemente no aplica.
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
