// Jerarquía de cotas hidráulicas heredadas (GEOM-UX-01, D-δ.86).
//
//   UnidadFuncional.cotaHidraulicaReferencia_m   (cota de piso de la UF)
//        │
//        Local.cotaPiso_m?                        (override de piso; ausente = hereda UF)
//        │
//        Artefacto.alturaHidraulicaSobrePiso_m?   (override; ausente = Tabla IUAS del tipo)
//        │
//        └── cota hidráulica efectiva del terminal = piso efectivo + altura efectiva
//
// Funciones puras: no conocen topología, granularidad ni UI. La regla es
// SIEMPRE herencia + suma -- vale para 'simplificada' y 'profesional' por
// igual (GEOM-UX-01 sustituyó la hipótesis geométrica uniforme de 1,00 m
// del modo rápido por esta derivación). El único caso que NO pasa por acá
// es el terminal degenerado que además es la raíz del camino (punto de
// alimentación), que conserva su propia Nodo.cota_m -- eso lo decide
// resolverPresionResidualDeCamino, no este módulo.
//
// `undefined` se propaga como "dato de piso todavía no provisto" (CRIT-A20:
// ausencia nunca es 0). La altura, en cambio, siempre resuelve mientras el
// tipo exista en el catálogo (la Tabla IUAS es 16/16 por test de
// completitud); sólo un `artefactoId` desconocido la deja `undefined`.
import type { Local, UnidadFuncional } from '../../../modelo/proyecto'
import type { Artefacto } from '../../../modelo/proyecto'
import { obtenerAlturaHidraulicaIuas } from '../../../normativa/eras-2023/catalogo-artefactos/alturasHidraulicasIuas'

// Cota de piso efectiva del Local: su override explícito si lo tiene, si
// no la cota de piso de referencia de la UnidadFuncional. `undefined` si
// ni el Local ni la UF tienen cota cargada.
export function resolverCotaPisoDeLocal(
  unidadFuncional: Pick<UnidadFuncional, 'cotaHidraulicaReferencia_m'>,
  local: Pick<Local, 'cotaPiso_m'>,
): number | undefined {
  return local.cotaPiso_m ?? unidadFuncional.cotaHidraulicaReferencia_m
}

// Altura hidráulica efectiva del artefacto sobre el piso terminado del
// Local: su override explícito si lo tiene, si no la altura de referencia
// IUAS de su tipo de catálogo. `undefined` sólo si el tipo no existe en
// la Tabla IUAS (post-validación + completitud, inalcanzable en la
// práctica).
export function resolverAlturaHidraulicaDeArtefacto(
  artefacto: Pick<Artefacto, 'artefactoId' | 'alturaHidraulicaSobrePiso_m'>,
): number | undefined {
  return artefacto.alturaHidraulicaSobrePiso_m ?? obtenerAlturaHidraulicaIuas(artefacto.artefactoId)
}

// Cota hidráulica efectiva del terminal del artefacto = cota de piso
// efectiva del Local + altura hidráulica efectiva del artefacto.
// `undefined` si falta cualquiera de los dos sumandos.
export function resolverCotaHidraulicaEfectivaDeArtefacto(
  unidadFuncional: Pick<UnidadFuncional, 'cotaHidraulicaReferencia_m'>,
  local: Pick<Local, 'cotaPiso_m'>,
  artefacto: Pick<Artefacto, 'artefactoId' | 'alturaHidraulicaSobrePiso_m'>,
): number | undefined {
  const cotaPiso_m = resolverCotaPisoDeLocal(unidadFuncional, local)
  const altura_m = resolverAlturaHidraulicaDeArtefacto(artefacto)
  if (cotaPiso_m === undefined || altura_m === undefined) {
    return undefined
  }
  return cotaPiso_m + altura_m
}
