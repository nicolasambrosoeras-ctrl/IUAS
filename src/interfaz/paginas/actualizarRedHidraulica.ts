// Actualizacion inmutable de RedHidraulica dentro de Proyecto: primer punto
// de escritura productiva sobre esta estructura desde la UI (hasta ahora
// redHidraulica solo se definia estaticamente en el proyecto demo). Mismo
// patron que actualizarConfiguracionHidraulica.ts -- funcion pura pequeña,
// no generaliza a un updater generico de Tramo (un solo campo con semantica
// propia, no una lista abierta). No crea redHidraulica si esta ausente, no
// crea/elimina Nodos ni Tramos, no deriva longitud_m de Δz ni de cotas (D-δ.22,
// CRIT-A20) -- la validacion de longitud_m>0 y compatibilidad con Δz ya
// vigente en validarRedHidraulica sigue siendo la unica fuente de verdad; este
// updater no la duplica.
import type { Proyecto } from '../../modelo/proyecto'

export function conLongitudDeTramo(proyecto: Proyecto, tramoId: string, longitud_m: number | undefined): Proyecto {
  const { redHidraulica } = proyecto
  if (redHidraulica === undefined) {
    return proyecto
  }

  const tramos = redHidraulica.tramos.map((tramo) => {
    if (tramo.id !== tramoId) {
      return tramo
    }
    if (longitud_m === undefined) {
      // Omision explicita de la clave, no `longitud_m: undefined` -- mismo
      // criterio ya usado para vaciar Local.regimen en MotorDemandaPantalla.tsx:
      // ausencia real de la propiedad opcional, nunca un valor undefined
      // asignado.
      const { longitud_m: _longitudAnterior, ...tramoSinLongitud } = tramo
      return tramoSinLongitud
    }
    return { ...tramo, longitud_m }
  })

  return { ...proyecto, redHidraulica: { ...redHidraulica, tramos } }
}
