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
//
// HYD-ACQUA-K-CATALOG-01: `reducciones` es el único id de este subconjunto
// cuyo K depende de contexto topológico (el salto de diámetro real entre
// este Tramo y el inmediatamente aguas arriba, ver resolverKsDeReduccion.ts)
// en vez de resolverse por identidad pura -- por eso NO pasa por
// resolverKsDeAccesorioDeTramo. `contextoReduccion` sólo es necesario
// cuando `accesorios` incluye al menos una `reducciones`; el llamador
// (acumularPerdidaLocalizadaDeCamino) ya resuelve el DN de cada Tramo del
// camino para la velocidad, así que el DN "aguas arriba" es el del Tramo
// anterior en el mismo recorrido -- nunca un dato nuevo que pedir aparte.
import type { AccesorioDeTramo } from '../../../modelo/redHidraulica'
import { resolverKsDeAccesorioDeTramo } from './resolverKsDeAccesorioDeTramo'
import { resolverKsDeReduccion } from './resolverKsDeReduccion'
import { calcularPerdidaCargaLocalizada } from './calcularPerdidaCargaLocalizada'

export type ResultadoPerdidaLocalizadaDeTramo =
  | { readonly tipo: 'sinRelevar' }
  // Una `reducciones` declarada bajo Acqua System no pudo clasificarse
  // (sin Tramo aguas arriba, o DN fuera de la serie nominal) -- nunca se
  // inventa una clasificación ni se aplica un K arbitrario.
  | { readonly tipo: 'reduccionNoClasificable' }
  | { readonly tipo: 'calculada'; readonly ksTotal: number; readonly hf_m: number }

export type ContextoReduccionDeTramo = {
  // undefined = el llamador no resolvió el DN propio de este Tramo (p.ej.
  // no lo necesitaba para nada más) -- sólo importa si `sistemaDeTuberiaId`
  // es Acqua System y hay una `reducciones` declarada; en cualquier otro
  // caso, Tabla N°7 nunca lo usa.
  readonly dnPropio: string | undefined
  // undefined = este Tramo no tiene un Tramo aguas arriba resuelto en el
  // recorrido (p.ej. es el primer segmento desde la raíz).
  readonly dnAguasArriba: string | undefined
}

// `sistemaDeTuberiaId` (HYD-OVERPASS-01): selecciona el catálogo de Ks
// aplicable a cada accesorio declarado (Tabla N°7 ERAS-2023, o el
// catálogo propio del fabricante cuando el sistema adoptado es Acqua
// System) -- ver resolverKsDeAccesorioDeTramo.ts.
export function resolverPerdidaLocalizadaDeTramo(
  accesorios: readonly AccesorioDeTramo[] | undefined,
  velocidadReal_mps: number,
  sistemaDeTuberiaId: string,
  contextoReduccion?: ContextoReduccionDeTramo,
): ResultadoPerdidaLocalizadaDeTramo {
  if (accesorios === undefined) {
    return { tipo: 'sinRelevar' }
  }

  if (accesorios.length === 0) {
    return { tipo: 'calculada', ksTotal: 0, hf_m: 0 }
  }

  let ksTotal = 0
  for (const accesorio of accesorios) {
    if (accesorio.tipo === 'reducciones') {
      const resultado = resolverKsDeReduccion(sistemaDeTuberiaId, contextoReduccion?.dnPropio, contextoReduccion?.dnAguasArriba)
      if (resultado.resultado === 'noClasificable') {
        return { tipo: 'reduccionNoClasificable' }
      }
      ksTotal += accesorio.cantidad * resultado.ks
      continue
    }
    ksTotal += accesorio.cantidad * resolverKsDeAccesorioDeTramo(accesorio.tipo, sistemaDeTuberiaId).ks
  }

  // ksTotal===0 con accesorios no vacíos es posible desde este slice (una
  // reducción "mismoDn" -- sin incidencia hidráulica real, ver
  // resolverKsDeReduccion.ts): mismo cero real que accesorios=[], nunca
  // se llama a calcularPerdidaCargaLocalizada con Ks=0 (esa primitiva
  // exige Ks>0 -- precondición pensada para el subconjunto original, sin
  // ceros legítimos).
  if (ksTotal === 0) {
    return { tipo: 'calculada', ksTotal: 0, hf_m: 0 }
  }

  return { tipo: 'calculada', ksTotal, hf_m: calcularPerdidaCargaLocalizada(ksTotal, velocidadReal_mps) }
}
