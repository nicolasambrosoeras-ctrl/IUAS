// Selector puro de presion minima requerida por un Artefacto normativo
// (ERAS-2023 SS2.9.1.4, presionMinima_kgcm2 ya cargado en catalogoArtefactos
// -- ver CRITERIOS.md, tabla del catalogo). Mismo criterio que
// resolverQuEfectivo: el catalogo conserva el dato, esta funcion decide
// como leerlo; ante presionMinima_kgcm2=null (maquinaLavavajillas,
// piletaDeCocinaIndustrial -- sin valor publicado por ERAS para ese
// artefacto) lanza en vez de inventar 0, que subdimensionaria la
// verificacion. No decide en que punto fisico de la topologia se aplica
// esta presion (ver D-delta.32/D-delta.36) -- solo resuelve el valor
// normativo para un ArtefactoNormativo dado.
import type { ArtefactoNormativo } from '../../../normativa/eras-2023/catalogo-artefactos'

export function resolverPresionMinimaDeArtefacto(artefactoNormativo: ArtefactoNormativo): number {
  const { presionMinima_kgcm2 } = artefactoNormativo

  if (presionMinima_kgcm2 === null) {
    throw new Error(
      `resolverPresionMinimaDeArtefacto: el artefacto "${artefactoNormativo.id}" no tiene presionMinima_kgcm2 definida en el catálogo`,
    )
  }

  return presionMinima_kgcm2
}
