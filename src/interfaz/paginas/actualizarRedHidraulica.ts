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
    // M2-TOPO-C: cualquier escritura por esta vía es una edición del
    // proyectista sobre el input de longitud -> la longitud pasa a
    // PERSONALIZADA. Se elimina `longitudEsSugerida` aunque el número
    // tecleado coincida con el sugerido (la procedencia nunca se infiere
    // comparando valores). Al vaciar el campo tampoco tiene sentido el
    // flag. Copia fresca + `delete` (nunca muta el input), mismo criterio
    // que conDnComercialAdoptadoDeTramo.
    if (longitud_m === undefined) {
      const { longitud_m: _longitudAnterior, ...tramoSinLongitud } = tramo
      const resultado = { ...tramoSinLongitud }
      delete resultado.longitudEsSugerida
      return resultado
    }
    const conLongitud = { ...tramo, longitud_m }
    delete conLongitud.longitudEsSugerida
    return conLongitud
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

// Override manual del diametro comercial adoptado (D-δ.52). `undefined` =
// eliminar el override y volver al diametro que el motor resuelve
// automaticamente (accion "Auto"). `denominacion` = denominacionComercial
// de una entrada del sistema de tuberia vigente (p. ej. "32 mm"); no se
// valida aca que exista en el catalogo -- resolverDiametroComercialDeTramo
// la ignora si no existe, y normalizarOverridesDeDnSegunSistema puede
// limpiarla al cambiar de sistema. Mismo criterio de omision explicita de
// la clave (no `undefined` asignado) que conLongitudDeTramo/conAccesoriosDeTramo.
export function conDnComercialAdoptadoDeTramo(
  proyecto: Proyecto,
  tramoId: string,
  denominacion: string | undefined,
): Proyecto {
  const { redHidraulica } = proyecto
  if (redHidraulica === undefined) {
    return proyecto
  }

  const tramos = redHidraulica.tramos.map((tramo) => {
    if (tramo.id !== tramoId) {
      return tramo
    }
    if (denominacion === undefined) {
      // Copia fresca sin la clave -- nunca muta `tramo` (input), mismo
      // efecto que un destructuring-drop pero sin variable sin usar.
      const tramoSinOverride = { ...tramo }
      delete tramoSinOverride.dnComercialAdoptado
      return tramoSinOverride
    }
    return { ...tramo, dnComercialAdoptado: denominacion }
  })

  return { ...proyecto, redHidraulica: { ...redHidraulica, tramos } }
}

// D-δ.52 (§11/§14): al cambiar material o sistema de tuberia, cualquier
// `dnComercialAdoptado` que ya no exista en el catalogo del sistema
// vigente se elimina (vuelve a automatico). NO destructivo para los
// overrides que siguen siendo validos. Pensado para llamarse justo despues
// de conMaterialTuberia / conSistemaDeTuberia, igual criterio que el
// backfill de longitudes de D-δ.51.
export function normalizarOverridesDeDnSegunSistema(
  proyecto: Proyecto,
  denominacionesValidas: ReadonlySet<string>,
): Proyecto {
  const { redHidraulica } = proyecto
  if (redHidraulica === undefined) {
    return proyecto
  }
  let cambiado = false
  const tramos = redHidraulica.tramos.map((tramo) => {
    if (tramo.dnComercialAdoptado === undefined || denominacionesValidas.has(tramo.dnComercialAdoptado)) {
      return tramo
    }
    cambiado = true
    const tramoSinOverride = { ...tramo }
    delete tramoSinOverride.dnComercialAdoptado
    return tramoSinOverride
  })
  return cambiado ? { ...proyecto, redHidraulica: { ...redHidraulica, tramos } } : proyecto
}
