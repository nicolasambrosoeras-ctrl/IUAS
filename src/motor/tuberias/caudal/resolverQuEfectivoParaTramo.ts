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

  // CRIT-A15 y su ampliacion para catalogo sin desagregar: la conectividad
  // fisica se resuelve ANTES de seleccionar el qu desagregado. Consultar
  // primero `resolverQuEfectivo` haria propagar su error sobre un campo
  // `quFria_lps`/`quCaliente_lps` = null sin llegar nunca al override (era
  // la regresion del caso "Lavavajillas industrial" en M2). Solo interviene
  // en las ramas AF/AC: el tramo comun aguas arriba de ambas ('total') ya
  // transporta `quTotal_lps` por seleccion directa. La conectividad fisica
  // es una pregunta distinta y no relativa al Tramo (ver
  // determinarConectividadFisica); no altera el significado de `condicion`.
  if (condicion === 'aguaFria' || condicion === 'aguaCaliente') {
    const fraccionDeCatalogo =
      condicion === 'aguaFria' ? artefactoNormativo.quFria_lps : artefactoNormativo.quCaliente_lps

    // Catalogo que NO desagrega AF/AC para esta condicion (`null`): los no
    // domiciliarios de §2.9.1.3 -- lavavajillas industrial, pileta de
    // cocina industrial, lavarropas industrial, lavachatas, valvula de
    // mingitorio. ERAS no publica columnas qu(A.Fria)/qu(A.Cal.) para
    // ellos, asi que no existe fraccion de mezcla ni base para partir
    // `quTotal_lps` entre ramas. Ampliacion de CRIT-A15 (decision del
    // usuario, D-δ.79 -- no norma ERAS): la cañeria de esta rama transporta
    // el caudal total declarado del artefacto, tanto si es la unica
    // conexion fisica ("solo a AF"/"solo a AC") como si esta conectado a AF
    // y AC a la vez (cada conexion se dimensiona para el caudal completo).
    // El tramo comun aguas arriba sigue en condicion 'total' -> `quTotal`
    // una sola vez, sin doble conteo (D-δ.8).
    if (fraccionDeCatalogo === null) {
      return { condicion, qu_lps: artefactoNormativo.quTotal_lps }
    }

    // Catalogo que si desagrega + conexion fisica exclusiva que coincide
    // con la condicion (CRIT-A15 fila "solo a AF"/"solo a AC"): no existe
    // rama complementaria que reciba el resto de la mezcla, la unica
    // cañeria entrega el total. El override solo se aplica sobre una
    // fraccion de mezcla positiva -- un cero explicito de catalogo (CRIT-A7,
    // p. ej. maquina lavavajillas conectada solo a AC) ya es el total
    // correcto para esa condicion, no una fraccion incompleta.
    const conectividad = determinarConectividadFisica(redHidraulica, referencia)
    const conexionExclusivaCoincideConCondicion =
      (conectividad === 'soloAF' && condicion === 'aguaFria') ||
      (conectividad === 'soloAC' && condicion === 'aguaCaliente')
    if (conexionExclusivaCoincideConCondicion) {
      return {
        condicion,
        qu_lps: fraccionDeCatalogo > 0 ? artefactoNormativo.quTotal_lps : fraccionDeCatalogo,
      }
    }
  }

  // Resto de casos: condicion 'total', o rama AF/AC de un artefacto cuyo
  // catalogo si desagrega y cuya conexion no es exclusiva (AF+AC "twin":
  // cada rama conserva su fraccion de mezcla). Seleccion directa del qu por
  // condicion; los errores de resolverQuEfectivo se propagan tal cual.
  const qu_lps = resolverQuEfectivo(artefactoNormativo, condicion)
  return { condicion, qu_lps }
}
