// Jerarquía de cotas hidráulicas heredadas (GEOM-UX-01, D-δ.86; reencuadrada
// de UF a Nivel por UI-M1-MULTINIVEL-01).
//
//   Nivel.cotaHidraulicaReferencia_m             (cota de piso del Nivel)
//        │
//        Local.cotaPiso_m?                        (override de piso; ausente = hereda el Nivel)
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
import type { Local, Nivel, UnidadFuncional } from '../../../modelo/proyecto'
import type { Artefacto } from '../../../modelo/proyecto'
import { obtenerAlturaHidraulicaIuas } from '../../../normativa/eras-2023/catalogo-artefactos/alturasHidraulicasIuas'

// UI-M1-MULTINIVEL-01: todos los Locales de una UF, aplanados a través de
// sus Niveles (orden: niveles[] y luego locales[] dentro de cada Nivel).
// Reemplaza el acceso directo `uf.locales` de antes de este slice -- los
// Locales ya no cuelgan directamente de la UF, sino de cada Nivel.
export function localesDeUnidadFuncional(unidadFuncional: Pick<UnidadFuncional, 'niveles'>): readonly Local[] {
  return unidadFuncional.niveles.flatMap((nivel) => nivel.locales)
}

// Nivel que posee un Local dado, por id. `undefined` sólo ante una
// referencia inconsistente (localId que no pertenece a ningún Nivel de
// esta UF) -- inalcanzable tras validarRedHidraulica en el camino normal.
export function resolverNivelDeLocal(
  unidadFuncional: Pick<UnidadFuncional, 'niveles'>,
  localId: string,
): Nivel | undefined {
  return unidadFuncional.niveles.find((nivel) => nivel.locales.some((local) => local.id === localId))
}

// Cota de piso efectiva del Local: su override explícito si lo tiene, si
// no la cota de piso de referencia de su Nivel. `undefined` si ni el
// Local ni el Nivel tienen cota cargada.
export function resolverCotaPisoDeLocal(
  nivel: Pick<Nivel, 'cotaHidraulicaReferencia_m'>,
  local: Pick<Local, 'cotaPiso_m'>,
): number | undefined {
  return local.cotaPiso_m ?? nivel.cotaHidraulicaReferencia_m
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
  nivel: Pick<Nivel, 'cotaHidraulicaReferencia_m'>,
  local: Pick<Local, 'cotaPiso_m'>,
  artefacto: Pick<Artefacto, 'artefactoId' | 'alturaHidraulicaSobrePiso_m'>,
): number | undefined {
  const cotaPiso_m = resolverCotaPisoDeLocal(nivel, local)
  const altura_m = resolverAlturaHidraulicaDeArtefacto(artefacto)
  if (cotaPiso_m === undefined || altura_m === undefined) {
    return undefined
  }
  return cotaPiso_m + altura_m
}
