// Actualizacion inmutable de RedHidraulica dentro de Proyecto: primer punto
// de escritura productiva sobre esta estructura desde la UI (hasta ahora
// redHidraulica solo se definia estaticamente en el proyecto demo). Mismo
// patron que actualizarConfiguracionHidraulica.ts -- funciones puras
// pequeñas, una por campo con semantica propia (no un updater generico de
// Tramo/Nodo, no una lista abierta). No crea redHidraulica si esta ausente,
// no crea/elimina Nodos ni Tramos, no deriva longitud_m de Δz ni de cotas
// (D-δ.22, CRIT-A20) -- la validacion de longitud_m>0 y compatibilidad con
// Δz ya vigente en validarRedHidraulica sigue siendo la unica fuente de
// verdad; estos updaters no la duplican. Tampoco calculan Ks, velocidad ni
// clasificacion de tee -- solo persisten el dato fisico declarado por el
// usuario (accesorios: tipo+cantidad; tee: configuracion), exactamente el
// contrato ya cerrado por CRIT-A26/A28/A30/A31 y D-δ.33.
import type { Proyecto } from '../../modelo/proyecto'
import type { AccesorioDeTramo, ConfiguracionDeTee } from '../../modelo/redHidraulica'

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

// cota_m ausente ≠ 0 (Nodo, ver modelo/redHidraulica): necesario para que
// resolverDesnivelDeCamino resuelva Δz de raiz/terminal -- este updater
// solo persiste el dato declarado, nunca infiere una cota a partir de
// longitud_m ni de ningun otro campo (D-δ.22).
export function conCotaDeNodo(proyecto: Proyecto, nodoId: string, cota_m: number | undefined): Proyecto {
  const { redHidraulica } = proyecto
  if (redHidraulica === undefined) {
    return proyecto
  }

  const nodos = redHidraulica.nodos.map((nodo) => {
    if (nodo.id !== nodoId) {
      return nodo
    }
    if (cota_m === undefined) {
      const { cota_m: _cotaAnterior, ...nodoSinCota } = nodo
      return nodoSinCota
    }
    return { ...nodo, cota_m }
  })

  return { ...proyecto, redHidraulica: { ...redHidraulica, nodos } }
}

// undefined = relevamiento de accesorios NO realizado todavia (nunca "sin
// accesorios") -- mismo contrato que Tramo.accesorios (D-δ.33). La UI que
// llama a esto con `[]` esta declarando "relevado, efectivamente sin
// accesorios de este subconjunto", con un cero real de perdida localizada.
export function conAccesoriosDeTramo(
  proyecto: Proyecto,
  tramoId: string,
  accesorios: readonly AccesorioDeTramo[] | undefined,
): Proyecto {
  const { redHidraulica } = proyecto
  if (redHidraulica === undefined) {
    return proyecto
  }

  const tramos = redHidraulica.tramos.map((tramo) => {
    if (tramo.id !== tramoId) {
      return tramo
    }
    if (accesorios === undefined) {
      const { accesorios: _accesoriosAnteriores, ...tramoSinAccesorios } = tramo
      return tramoSinAccesorios
    }
    return { ...tramo, accesorios }
  })

  return { ...proyecto, redHidraulica: { ...redHidraulica, tramos } }
}

// undefined = bifurcacion real (1 entrante + 2 salientes) cuya tee todavia
// no fue relevada (CRIT-A31) -- nunca "sin tee": una bifurcacion 1→2 real
// siempre corresponde a alguna pieza fisica en T/Y. No valida aca la
// estructura del Nodo (1 entrante+2 salientes) ni que tramoSalidaRectaId
// sea realmente un saliente de ese Nodo -- validarRedHidraulica sigue
// siendo la unica fuente de verdad para eso.
export function conTeeDeNodo(proyecto: Proyecto, nodoId: string, tee: ConfiguracionDeTee | undefined): Proyecto {
  const { redHidraulica } = proyecto
  if (redHidraulica === undefined) {
    return proyecto
  }

  const nodos = redHidraulica.nodos.map((nodo) => {
    if (nodo.id !== nodoId) {
      return nodo
    }
    if (tee === undefined) {
      const { tee: _teeAnterior, ...nodoSinTee } = nodo
      return nodoSinTee
    }
    return { ...nodo, tee }
  })

  return { ...proyecto, redHidraulica: { ...redHidraulica, nodos } }
}
