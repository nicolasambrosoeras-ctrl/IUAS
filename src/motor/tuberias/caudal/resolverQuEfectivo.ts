// Selector puro de qu unitario segun condicion hidraulica evaluada. El
// catalogo conserva que caudales tiene el artefacto (quTotal/quFria/
// quCaliente); esta funcion decide cual de esos tres corresponde usar. No
// corrige, no reinterpreta ni completa datos del catalogo -- ante un dato
// ausente (null) para la condicion pedida, lanza en vez de inventar 0.
// Ciega a topologia: quien decide si un Tramo esta en condicion 'total',
// 'aguaFria' o 'aguaCaliente' es un componente futuro, no esta funcion.
import type { ArtefactoNormativo } from '../../../normativa/eras-2023/catalogo-artefactos'

export type CondicionHidraulicaDeCaudal = 'total' | 'aguaFria' | 'aguaCaliente'

export function resolverQuEfectivo(
  artefactoNormativo: ArtefactoNormativo,
  condicion: CondicionHidraulicaDeCaudal,
): number {
  if (condicion === 'total') {
    return artefactoNormativo.quTotal_lps
  }

  const campo = condicion === 'aguaFria' ? 'quFria_lps' : 'quCaliente_lps'
  const valor = artefactoNormativo[campo]

  // Precondicion imposible si el llamador conoce el catalogo: pedir una
  // condicion AF/AC sobre un artefacto que el catalogo no desagrega es un
  // error de uso (mismo criterio que otras "precondicion imposible" del
  // motor), no un 0 silencioso que subdimensionaria esa rama.
  if (valor === null) {
    throw new Error(
      `resolverQuEfectivo: el artefacto "${artefactoNormativo.id}" no tiene ${campo} definido en el catálogo`,
    )
  }

  return valor
}
