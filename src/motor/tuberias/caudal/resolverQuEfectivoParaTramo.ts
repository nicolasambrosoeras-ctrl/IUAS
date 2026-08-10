// Composicion pura de las dos primitivas de caudal: clasifica la condicion
// hidraulica topologica del par (Tramo, Artefacto) y selecciona el qu
// normativo correspondiente. No reimplementa ninguna de las dos
// responsabilidades (traversal A/B, seleccion quTotal/quFria/quCaliente):
// solo las encadena. Los errores de ambas primitivas se propagan tal cual,
// sin traducirlos a una jerarquia propia.
import type { RedHidraulica, ReferenciaDeArtefacto } from '../../../modelo/redHidraulica'
import type { ArtefactoNormativo } from '../../../normativa/eras-2023/catalogo-artefactos'
import { determinarCondicionHidraulicaDeCaudal } from './determinarCondicionHidraulicaDeCaudal'
import { resolverQuEfectivo, type CondicionHidraulicaDeCaudal } from './resolverQuEfectivo'

export interface QuEfectivoParaTramo {
  readonly condicion: CondicionHidraulicaDeCaudal
  readonly qu_lps: number
}

export function resolverQuEfectivoParaTramo(
  redHidraulica: RedHidraulica,
  tramoId: string,
  referencia: ReferenciaDeArtefacto,
  artefactoNormativo: ArtefactoNormativo,
): QuEfectivoParaTramo {
  const condicion = determinarCondicionHidraulicaDeCaudal(redHidraulica, tramoId, referencia)
  const qu_lps = resolverQuEfectivo(artefactoNormativo, condicion)

  return { condicion, qu_lps }
}
