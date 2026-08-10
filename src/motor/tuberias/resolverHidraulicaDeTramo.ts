// Ensamblador integral de simultaneidad hidraulica por Tramo (CRIT-A13
// revisado): compone las etapas ya cerradas del pipeline en el orden
// normativo exacto -- computables -> activos hidraulicos -> CRIT-A8 --
// y decide, en el unico punto que conoce esa secuencia completa, si el
// Tramo/condicion evaluado tiene demanda o no. No reimplementa ninguna
// etapa ni recalcula nada que ya resuelvan las primitivas compuestas.
import type { ArtefactoNormativo } from '../../normativa/eras-2023/catalogo-artefactos'
import type { Proyecto } from '../../modelo/proyecto'
import { obtenerArtefactosAguasAbajo } from './topologia/obtenerArtefactosAguasAbajo'
import { resolverArtefactosReferenciados } from './topologia/resolverArtefactosReferenciados'
import { filtrarArtefactosComputables } from './computabilidad/filtrarArtefactosComputables'
import { filtrarArtefactosHidraulicamenteActivos } from './participacion/filtrarArtefactosHidraulicamenteActivos'
import { aplicarParticipacionCritA8 } from './participacion/aplicarParticipacionCritA8'
import { resolverAportesHidraulicosDeTramo } from './aporte/resolverAportesHidraulicosDeTramo'
import { resolverSimultaneidadHidraulicaDeTramo } from './simultaneidad/resolverSimultaneidadHidraulicaDeTramo'
import type { ResultadoSimultaneidadDeTramo } from './simultaneidad/calcularSimultaneidadDeTramo'

export type ResultadoHidraulicoDeTramo =
  | {
      readonly tipo: 'sinDemanda'
      readonly qc_lps: 0
    }
  | {
      readonly tipo: 'conDemanda'
      readonly qc_lps: number
      readonly simultaneidad: ResultadoSimultaneidadDeTramo
    }

export function resolverHidraulicaDeTramo(
  proyecto: Proyecto,
  tramoId: string,
  catalogoArtefactos: readonly ArtefactoNormativo[],
): ResultadoHidraulicoDeTramo {
  const referencias = obtenerArtefactosAguasAbajo(proyecto, tramoId)
  const resueltos = resolverArtefactosReferenciados(proyecto, referencias)
  const computables = filtrarArtefactosComputables(resueltos)

  const { redHidraulica } = proyecto
  if (redHidraulica === undefined) {
    // Inalcanzable en la practica: obtenerArtefactosAguasAbajo ya lanzo
    // mas arriba si redHidraulica fuera undefined. Chequeo necesario
    // unicamente para el angostamiento de tipos de TypeScript en las
    // llamadas siguientes, que requieren RedHidraulica sin undefined.
    throw new Error('resolverHidraulicaDeTramo requiere un proyecto con redHidraulica definida')
  }

  const activos = filtrarArtefactosHidraulicamenteActivos(computables, redHidraulica, tramoId, catalogoArtefactos)

  // CRIT-A13 revisado: CRIT-A8 opera sobre el subconjunto hidraulicamente
  // activo de la condicion evaluada, no sobre el conjunto computable crudo.
  const participantes = aplicarParticipacionCritA8(activos, catalogoArtefactos)

  if (participantes.length === 0) {
    return { tipo: 'sinDemanda', qc_lps: 0 }
  }

  const aportes = resolverAportesHidraulicosDeTramo(participantes, redHidraulica, tramoId, catalogoArtefactos)
  const simultaneidad = resolverSimultaneidadHidraulicaDeTramo(proyecto.parametros.tipoDeProyecto, aportes)

  return { tipo: 'conDemanda', qc_lps: simultaneidad.qc_lps, simultaneidad }
}
