// Pérdida de carga localizada de un Tramo, para el subconjunto inequívoco
// de Tabla N°7 declarable sobre Tramo.accesorios (D-δ.33/M2-C slice A):
// compone AccesorioDeTramo[] + velocidadReal_mps (ya resuelta por
// resolverDiametroComercialDeTramo -- NUNCA recalculada acá) con
// obtenerKsDeAccesorio (Tabla N°7) y calcularPerdidaCargaLocalizada
// (CRIT-A26, Js=Ks·V²/2g). Todos los accesorios de este subconjunto están
// sobre el mismo Tramo y comparten la misma velocidad real (ver
// IdAccesorioDeTramo), así que Ks_total = Σ(cantidad·Ks_tipo) antes de
// aplicar la fórmula una única vez -- Js es lineal en Ks a V fija, de
// modo que Σ Js_i(Ks_i, V) = Js(Σ Ks_i, V).
//
// Barrera de completitud (mismo principio que resolverBalanceDePresion /
// acumularPerdidaDistribuidaDeCamino): accesorios===undefined significa
// "todavía no relevado", nunca "sin accesorios" -- devuelve 'sinRelevar',
// nunca hf_m=0. accesorios===[] significa "relevado, efectivamente sin
// accesorios de este subconjunto" -- hf_m=0 es un cero real.
import type { AccesorioDeTramo } from '../../../modelo/redHidraulica'
import { obtenerKsDeAccesorio } from '../../../normativa/eras-2023/tabla-07-perdidas-localizadas'
import { calcularPerdidaCargaLocalizada } from './calcularPerdidaCargaLocalizada'

export type ResultadoPerdidaLocalizadaDeTramo =
  | { readonly tipo: 'sinRelevar' }
  | { readonly tipo: 'calculada'; readonly ksTotal: number; readonly hf_m: number }

export function resolverPerdidaLocalizadaDeTramo(
  accesorios: readonly AccesorioDeTramo[] | undefined,
  velocidadReal_mps: number,
): ResultadoPerdidaLocalizadaDeTramo {
  if (accesorios === undefined) {
    return { tipo: 'sinRelevar' }
  }

  if (accesorios.length === 0) {
    return { tipo: 'calculada', ksTotal: 0, hf_m: 0 }
  }

  const ksTotal = accesorios.reduce(
    (suma, accesorio) => suma + accesorio.cantidad * obtenerKsDeAccesorio(accesorio.tipo),
    0,
  )

  return { tipo: 'calculada', ksTotal, hf_m: calcularPerdidaCargaLocalizada(ksTotal, velocidadReal_mps) }
}
