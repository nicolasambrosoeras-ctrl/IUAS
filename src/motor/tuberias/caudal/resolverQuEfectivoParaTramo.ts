// Composicion de las primitivas de caudal: clasifica la condicion hidraulica
// topologica del par (Tramo, Artefacto), determina la conectividad fisica
// global del Artefacto (CRIT-A15) y selecciona el qu normativo
// correspondiente. No reimplementa ninguna de las responsabilidades que
// compone (traversal relativo al Tramo, conectividad global, seleccion
// quTotal/quFria/quCaliente): solo las encadena. Los errores de las
// primitivas se propagan tal cual, sin traducirlos a una jerarquia propia.
import type { RedHidraulica, ReferenciaDeArtefacto } from '../../../modelo/redHidraulica'
import type { ArtefactoNormativo } from '../../../normativa/eras-2023/catalogo-artefactos'
import { determinarCondicionHidraulicaDeCaudal } from './determinarCondicionHidraulicaDeCaudal'
import { determinarConectividadFisica } from './determinarConectividadFisica'
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

  // CRIT-A15: si el Artefacto esta conectado fisicamente a una sola red y
  // el Tramo evaluado resuelve justamente esa conexion, la cañeria unica
  // transporta el caudal total -- no existe ninguna rama complementaria que
  // reciba el resto de la mezcla. El override solo se aplica sobre una
  // fraccion de mezcla positiva ya resuelta (`qu_lps > 0`): un cero
  // explicito de catalogo (CRIT-A7) no es una fraccion incompleta que haya
  // que reconstruir, ya es el total correcto para esa condicion -- y un
  // `qu` requerido = null ya hizo propagar su error mas arriba, sin llegar
  // a esta linea. La conectividad fisica es una pregunta distinta y no
  // relativa al Tramo (ver determinarConectividadFisica); se consulta
  // aparte, sin alterar el significado de `condicion`.
  if (qu_lps > 0) {
    const conectividad = determinarConectividadFisica(redHidraulica, referencia)
    if (
      (conectividad === 'soloAF' && condicion === 'aguaFria') ||
      (conectividad === 'soloAC' && condicion === 'aguaCaliente')
    ) {
      return { condicion, qu_lps: artefactoNormativo.quTotal_lps }
    }
  }

  return { condicion, qu_lps }
}
