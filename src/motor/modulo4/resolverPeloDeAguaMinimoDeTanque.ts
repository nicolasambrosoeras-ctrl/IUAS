// Pelo de agua mínimo EFECTIVO para la verificación de presión de Módulo 2
// cuando el esquema de abastecimiento es 'tanqueElevado' (M2 / CRIT-A39,
// D-δ.79).
//
// En modo Profesional ('profesional') el pelo de agua mínimo es un DATO
// DECLARADO: el proyectista lo mide y lo carga como cota de la raíz del
// camino (`Nodo.cota_m`). En modo Rápido ('simplificada') IUAS lo ESTIMA
// con una hipótesis geométrica simplificada:
//
//   z_pelo_agua_min = desnivelConexion_m − 0,50 m
//
// ambas magnitudes referidas al nivel de acera (datum común del Proyecto:
// ver `Nodo.cota_m` y `ParametrosProyecto.desnivelConexion_m`). Para el
// esquema 'tanqueElevado', `desnivelConexion_m` ya significa "desnivel de
// la acera al punto de alimentación del tanque" (CRIT-A37 /
// etiquetaDesnivelConexion), así que el pelo de agua mínimo estimado queda
// 0,50 m por debajo de ese punto de alimentación.
//
// Es una HIPÓTESIS IUAS DEL MODO RÁPIDO (CRIT-A39), no una regla ERAS ni
// una verdad física universal: sólo una simplificación para no exigir en
// modo Rápido una segunda cota geométrica relacionada. NO aplica a
// 'cisternaBombeoElevado' (la conexión de red y el tanque elevado no
// comparten necesariamente esa relación geométrica: se mantiene el dato
// manual) ni a 'directa' (no hay pelo de agua de tanque). El valor manual
// del modo Profesional se preserva intacto: esta función no lo lee, no lo
// persiste y no lo sobrescribe.
//
// Función pura y total: no lee el Proyecto ni la RedHidraulica, no
// persiste, no aplica clamp ni redondeo (el 0,50 se resta tal cual; el
// formateo visual es responsabilidad de la UI). NO vive dentro de
// motor/tuberias/** ni motor/modulo2/** — la composición M4→M2 ocurre en
// la frontera de presentación (resolverEntradasDeVerificacion), sin crear
// un ciclo.
import type { EsquemaDeAbastecimiento, GranularidadHidraulica } from '../../modelo/proyecto'

// Holgura entre el punto de alimentación del tanque y el pelo de agua
// mínimo bajo la hipótesis del modo Rápido (CRIT-A39).
export const HOLGURA_PELO_DE_AGUA_MINIMO_RAPIDO_M = 0.5

export type PeloDeAguaMinimoEfectivo =
  // Esquema sin tanque elevado simple ('directa' o 'cisternaBombeoElevado',
  // o esquema ausente): esta hipótesis no interviene.
  | { readonly tipo: 'noAplica' }
  // Modo Profesional: el pelo de agua mínimo es el dato manual declarado
  // (cota de la raíz), tal como hoy.
  | { readonly tipo: 'manual' }
  // Modo Rápido con el desnivel de alimentación disponible: cota estimada.
  | {
      readonly tipo: 'derivadoRapido'
      readonly cota_m: number
      readonly desnivelAlimentacionTanque_m: number
    }
  // Modo Rápido sin el desnivel de alimentación: no se fabrica 0 ni se cae
  // al dato manual oculto — la verificación queda incompleta.
  | { readonly tipo: 'incompletoRapido' }

export function resolverPeloDeAguaMinimoEfectivo(entrada: {
  readonly esquema: EsquemaDeAbastecimiento | undefined
  readonly granularidad: GranularidadHidraulica
  readonly desnivelConexion_m: number | undefined
}): PeloDeAguaMinimoEfectivo {
  const { esquema, granularidad, desnivelConexion_m } = entrada

  if (esquema !== 'tanqueElevado') {
    return { tipo: 'noAplica' }
  }

  if (granularidad === 'profesional') {
    return { tipo: 'manual' }
  }

  // granularidad === 'simplificada' (modo Rápido)
  if (desnivelConexion_m === undefined) {
    return { tipo: 'incompletoRapido' }
  }

  if (!Number.isFinite(desnivelConexion_m)) {
    throw new Error(
      `resolverPeloDeAguaMinimoEfectivo: desnivelConexion_m debe ser un número finito (recibido: ${desnivelConexion_m})`,
    )
  }

  return {
    tipo: 'derivadoRapido',
    cota_m: desnivelConexion_m - HOLGURA_PELO_DE_AGUA_MINIMO_RAPIDO_M,
    desnivelAlimentacionTanque_m: desnivelConexion_m,
  }
}
