// PERF-SCALE-01C: punto ÚNICO de resolución compartida de M2 para un
// mismo Proyecto/render. Antes de este archivo, el sidebar
// (resolverResumenDeProyecto) y el panel de verificación
// (PanelDePresionDeModulo2) llamaban cada uno, por su cuenta,
// resolverEntradasDeVerificacion + resolverEstadoModulo2 -- dos
// resoluciones completas de M2 por cada actualización de Proyecto, más un
// tercer recorrido de presión (bucle `candidatos` del panel) que
// reconstruía exactamente lo que resolverEstadoModulo2 ya había calculado
// (PERF-SCALE-01B §17).
//
// MotorDemandaPantalla memoiza el resultado de esta función por identidad
// de Proyecto (useMemo) y lo pasa a ambos consumidores. NO es un cache
// global ni persistente: vive sólo mientras `proyecto` no cambie de
// referencia, exactamente como el ContextoDeCalculoM2 de 01B vive sólo
// una resolución. No cambia ninguna fórmula ni resultado -- es la MISMA
// composición que cada consumidor ya hacía por separado.
import type { Proyecto } from '../../modelo/proyecto'
import type { ArtefactoNormativo } from '../../normativa/eras-2023/catalogo-artefactos'
import type { TipoProyectoNormativo } from '../../normativa/eras-2023/coeficientes-mayoracion'
import { catalogoSistemasDeTuberia } from '../../motor/tuberias/sistemaDeTuberia'
import { catalogoMaterialesTuberia } from '../../motor/tuberias/materialTuberia'
import { resolverEstadoModulo2, type EstadoModulo2 } from '../../motor/modulo2/resolverEstadoModulo2'
import { resolverEntradasDeVerificacion, type EntradasDeVerificacion } from './resolverEntradasDeVerificacion'

export type ResolucionDeModulo2 = {
  readonly entradas: EntradasDeVerificacion
  readonly estadoModulo2: EstadoModulo2
}

export function resolverResolucionDeModulo2(
  proyecto: Proyecto,
  catalogoArtefactos: readonly ArtefactoNormativo[],
  coeficientesMayoracion: readonly TipoProyectoNormativo[],
): ResolucionDeModulo2 {
  const entradas = resolverEntradasDeVerificacion(proyecto, catalogoArtefactos, coeficientesMayoracion)
  const estadoModulo2 = resolverEstadoModulo2(
    entradas.proyectoParaVerificacion,
    entradas.presionDisponible_mca,
    entradas.hfMedidorDeTerminal,
    catalogoArtefactos,
    catalogoSistemasDeTuberia,
    catalogoMaterialesTuberia,
  )
  return { entradas, estadoModulo2 }
}
