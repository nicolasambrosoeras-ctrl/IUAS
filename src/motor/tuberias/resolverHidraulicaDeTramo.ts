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
import { crearIndiceTopologico } from './topologia/indiceTopologico'
import { resolverCondicionesHidraulicasDeCaudalAguasAbajo } from './caudal/resolverCondicionesHidraulicasAguasAbajo'
import { resolverSimultaneidadHidraulicaDeTramo } from './simultaneidad/resolverSimultaneidadHidraulicaDeTramo'
import type { ResultadoSimultaneidadHidraulicaDeTramo } from './simultaneidad/resolverSimultaneidadHidraulicaDeTramo'
import { calcularPredimensionamientoDeTramo } from './predimensionamiento/calcularPredimensionamientoDeTramo'
import type { PredimensionamientoDeTramo } from './predimensionamiento/calcularPredimensionamientoDeTramo'
import type { ContextoDeCalculoM2 } from './contextoDeCalculoM2'
import {
  registrarSolicitudHidraulicaDeTramo,
  registrarCalculoHidraulicaDeTramo,
} from './topologia/instrumentacionTopologica'

export type ResultadoHidraulicoDeTramo =
  | {
      readonly tipo: 'sinDemanda'
      readonly qc_lps: 0
    }
  | {
      readonly tipo: 'conDemanda'
      readonly qc_lps: number
      readonly simultaneidad: ResultadoSimultaneidadHidraulicaDeTramo
      readonly predimensionamiento: PredimensionamientoDeTramo
    }

export function resolverHidraulicaDeTramo(
  proyecto: Proyecto,
  tramoId: string,
  catalogoArtefactos: readonly ArtefactoNormativo[],
  // PERF-SCALE-01B: contexto de cálculo local a la resolución de M2. Ausente
  // ⇒ se recalcula siempre (comportamiento previo byte a byte). Presente ⇒
  // el resultado de este Tramo se calcula UNA vez por resolución y se
  // reutiliza en todos los caminos y etapas siguientes. La clave es sólo
  // `tramoId`: durante una resolución el Proyecto/catálogo son inmutables,
  // así que no hay dos resultados legítimos distintos para el mismo Tramo.
  contexto?: ContextoDeCalculoM2,
): ResultadoHidraulicoDeTramo {
  registrarSolicitudHidraulicaDeTramo()

  const memoizado = contexto?.hidraulicaPorTramo.get(tramoId)
  if (memoizado !== undefined) {
    return memoizado
  }

  const resultado = calcularHidraulicaDeTramo(proyecto, tramoId, catalogoArtefactos)
  contexto?.hidraulicaPorTramo.set(tramoId, resultado)
  return resultado
}

function calcularHidraulicaDeTramo(
  proyecto: Proyecto,
  tramoId: string,
  catalogoArtefactos: readonly ArtefactoNormativo[],
): ResultadoHidraulicoDeTramo {
  registrarCalculoHidraulicaDeTramo()

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

  // PERF-SCALE-01A: la condición hidráulica topológica de CADA artefacto
  // aguas abajo de `tramoId` se resuelve UNA vez, en un solo traversal DFS
  // sobre un índice construido acá -- no una vez por artefacto (con
  // reconstrucción de índice + DFS propio) dentro de
  // filtrarArtefactosHidraulicamenteActivos y de
  // resolverAportesHidraulicosDeTramo, que era el hotspot medido. El Map se
  // comparte entre ambas etapas; el resultado es idéntico al del
  // clasificador puntual por construcción.
  const indiceTopologico = crearIndiceTopologico(redHidraulica)
  const condicionesAguasAbajo = resolverCondicionesHidraulicasDeCaudalAguasAbajo(indiceTopologico, tramoId)

  const activos = filtrarArtefactosHidraulicamenteActivos(
    computables,
    redHidraulica,
    tramoId,
    catalogoArtefactos,
    condicionesAguasAbajo,
  )

  // CRIT-A13 revisado: CRIT-A8 opera sobre el subconjunto hidraulicamente
  // activo de la condicion evaluada, no sobre el conjunto computable crudo.
  const participantes = aplicarParticipacionCritA8(activos, catalogoArtefactos)

  if (participantes.length === 0) {
    return { tipo: 'sinDemanda', qc_lps: 0 }
  }

  const aportes = resolverAportesHidraulicosDeTramo(
    participantes,
    redHidraulica,
    tramoId,
    catalogoArtefactos,
    condicionesAguasAbajo,
  )
  const simultaneidad = resolverSimultaneidadHidraulicaDeTramo(proyecto.parametros.tipoDeProyecto, aportes)
  const predimensionamiento = calcularPredimensionamientoDeTramo(simultaneidad.qc_lps)

  return { tipo: 'conDemanda', qc_lps: simultaneidad.qc_lps, simultaneidad, predimensionamiento }
}
