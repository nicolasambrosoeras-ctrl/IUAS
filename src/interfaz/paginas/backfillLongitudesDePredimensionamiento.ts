// D-δ.51: precarga NO destructiva de longitudes iniciales para
// predimensionamiento. Nunca sobreescribe un `longitud_m` ya definido
// (input del usuario, o relevamiento heredado) -- solo completa los que
// están `undefined`. Se aplica en momentos ESTRUCTURALES (montaje inicial,
// toggle de modo, crear/duplicar UF·Local·Artefacto), nunca en cada
// pulsación: si el usuario vacía un campo de longitud, ese `undefined` es
// una intención explícita y este backfill no corre en ese momento.
//
// Los valores 5 / 10 / 10 son VALORES INICIALES IUAS PARA
// PREDIMENSIONAMIENTO, editables -- NO norma ERAS, NO relevamiento, NO
// requisito reglamentario (brief D-δ.51 §4/§53).
//
// Dos reglas según granularidad (el "modo de trabajo" se deriva de
// granularidad + metodoPerdidaLocalizada, ver modoDeTrabajo.ts):
//
//   simplificada (Rápido) -- solo los Tramos que el usuario ve y edita en
//   modo rápido: el representativo de cada (Local, Red) (D-δ.44) y la
//   Distribución general. Los ramales internos NO reciben default (no
//   participan de hfDistribuida en simplificada).
//     Distribución general / Alimentación ACS -> 10 m
//     Tramo representativo de Local+Red        -> 5 m
//
//   profesional -- `acumularPerdidaDistribuidaDeCamino` itera TODO
//   `camino.tramos`, así que cada Tramo físico requiere su longitud. La
//   precarga cubre todos los Tramos, con el mismo criterio de rol:
//     Distribución general / Alimentación ACS -> 10 m
//     cualquier otro Tramo físico             -> 5 m
//
// Los accesorios NO se precargan en ningún modo (decisión roja de D-δ.51
// resuelta -- alternativa A: `accesorios === undefined` significa "no
// relevado", convertirlo en `[]` afirmaría un relevamiento inexistente).
import type { Proyecto } from '../../modelo/proyecto'
import type { Tramo } from '../../modelo/redHidraulica'
import { identificarTramosRepresentativosDeLocales } from '../../motor/tuberias/topologia/identificarTramoRepresentativoDeLocal'
import { identificarFilasDistribucionGeneral } from './identificarFilasDeModulo2'

export const LONGITUD_INICIAL_LOCAL_RED_M = 5
export const LONGITUD_INICIAL_DISTRIBUCION_GENERAL_M = 10

export function backfillLongitudesDePredimensionamiento(proyecto: Proyecto): Proyecto {
  const { redHidraulica } = proyecto
  if (redHidraulica === undefined) {
    return proyecto
  }

  const idsDistribucionGeneral = new Set(identificarFilasDistribucionGeneral(proyecto).map((fila) => fila.tramoId))
  const idsRepresentativos = new Set(identificarTramosRepresentativosDeLocales(proyecto).keys())
  const esSimplificada = proyecto.configuracionHidraulica.granularidadHidraulica === 'simplificada'

  let cambiado = false
  const tramos = redHidraulica.tramos.map((tramo): Tramo => {
    if (tramo.longitud_m !== undefined) {
      return tramo
    }

    let inicial: number | undefined
    if (idsDistribucionGeneral.has(tramo.id)) {
      inicial = LONGITUD_INICIAL_DISTRIBUCION_GENERAL_M
    } else if (!esSimplificada || idsRepresentativos.has(tramo.id)) {
      inicial = LONGITUD_INICIAL_LOCAL_RED_M
    }

    if (inicial === undefined) {
      return tramo
    }
    cambiado = true
    return { ...tramo, longitud_m: inicial }
  })

  if (!cambiado) {
    return proyecto
  }
  return { ...proyecto, redHidraulica: { ...redHidraulica, tramos } }
}
