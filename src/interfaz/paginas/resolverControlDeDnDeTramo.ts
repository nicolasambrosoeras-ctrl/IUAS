// D-δ.52 (Parte A): view-model del control ↓ / DN / ↑ / Auto de un Tramo.
// NO calcula hidráulica -- lee el resultado de resolverDiametroComercialDeTramo
// (que ya aplica el override) y el catálogo del sistema vigente para saber
// qué diámetro comercial es el inmediato superior/inferior. Los botones
// mueven por el catálogo REAL (obtenerEntradasOrdenadasPorDiametroInterior),
// nunca "DN + 5".
import type { Proyecto } from '../../modelo/proyecto'
import type { ArtefactoNormativo } from '../../normativa/eras-2023/catalogo-artefactos'
import { catalogoSistemasDeTuberia } from '../../motor/tuberias/sistemaDeTuberia'
import { obtenerSistemaDeTuberia } from '../../motor/tuberias/sistemaDeTuberia'
import { obtenerEntradasOrdenadasPorDiametroInterior } from '../../motor/tuberias/diametroComercial/obtenerEntradasOrdenadasPorDiametroInterior'
import { resolverDiametroComercialDeTramo } from '../../motor/tuberias/resolverDiametroComercialDeTramo'

export type ControlDeDnDeTramo = {
  // Hay un DN comercial resoluble para este Tramo (con o sin override).
  readonly disponible: boolean
  // 'automatico' | 'manual' -- si hay override manual activo.
  readonly origen: 'automatico' | 'manual'
  // Denominación comercial adoptada como efectiva de cálculo (la que se
  // muestra grande en la fila).
  readonly denominacionAdoptada: string | null
  // Denominación que el motor recomendaría automáticamente (CRIT-A23) --
  // para el detalle "DN recomendado: 25 mm". null si no hay ninguno
  // admisible automáticamente.
  readonly denominacionRecomendada: string | null
  // Denominación del diámetro comercial inmediato superior/inferior en el
  // catálogo del sistema vigente. null = ya está en el extremo -> botón
  // deshabilitado.
  readonly siguiente: string | null
  readonly anterior: string | null
}

const NO_DISPONIBLE: ControlDeDnDeTramo = {
  disponible: false,
  origen: 'automatico',
  denominacionAdoptada: null,
  denominacionRecomendada: null,
  siguiente: null,
  anterior: null,
}

export function resolverControlDeDnDeTramo(
  proyecto: Proyecto,
  tramoId: string,
  catalogoArtefactos: readonly ArtefactoNormativo[],
): ControlDeDnDeTramo {
  let resultado
  try {
    resultado = resolverDiametroComercialDeTramo(proyecto, tramoId, catalogoArtefactos, catalogoSistemasDeTuberia)
  } catch {
    return NO_DISPONIBLE
  }
  if (resultado.tipo !== 'conCandidato') {
    // sinDemanda / sinCandidatoAdmisible: no hay un DN base sobre el cual
    // ofrecer ↑/↓. (El caso "override manual sobre un Tramo sin candidato
    // automático" SÍ resuelve 'conCandidato' con origen 'manual".)
    return NO_DISPONIBLE
  }

  const sistema = obtenerSistemaDeTuberia(proyecto.configuracionHidraulica.sistemaDeTuberiaId, catalogoSistemasDeTuberia)
  const entradas = obtenerEntradasOrdenadasPorDiametroInterior(sistema)
  const denominacionAdoptada = resultado.candidato.denominacionComercial
  const indice = entradas.findIndex((entrada) => entrada.denominacionComercial === denominacionAdoptada)

  return {
    disponible: true,
    origen: resultado.origen,
    denominacionAdoptada,
    denominacionRecomendada: resultado.candidatoAutomatico?.denominacionComercial ?? null,
    siguiente: indice >= 0 && indice < entradas.length - 1 ? entradas[indice + 1]!.denominacionComercial : null,
    anterior: indice > 0 ? entradas[indice - 1]!.denominacionComercial : null,
  }
}

// Denominaciones comerciales válidas del sistema de tubería vigente --
// para normalizarOverridesDeDnSegunSistema al cambiar material/sistema.
export function denominacionesComercialesDelSistema(sistemaDeTuberiaId: string): ReadonlySet<string> {
  try {
    const sistema = obtenerSistemaDeTuberia(sistemaDeTuberiaId, catalogoSistemasDeTuberia)
    return new Set(sistema.entradas.map((entrada) => entrada.denominacionComercial))
  } catch {
    return new Set()
  }
}
