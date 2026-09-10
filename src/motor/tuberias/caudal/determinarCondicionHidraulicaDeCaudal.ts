// Clasificador puro de condicion hidraulica para el par (Tramo, Artefacto):
// deriva 'total' | 'aguaFria' | 'aguaCaliente' exclusivamente de la
// topologia (RedHidraulica), sin consultar catalogo, ArtefactoNormativo ni
// calcular qu/demanda. La condicion NO es una propiedad del Tramo: un mismo
// Tramo puede rendir condiciones distintas segun el Artefacto evaluado (ver
// PENDIENTES-DE-ARQUITECTURA.md, analisis previo de CRIT-A14/D-delta).
//
// PERF-SCALE-01A: desde este slice es un WRAPPER fino sobre el traversal en
// lote `resolverCondicionesHidraulicasDeCaudalAguasAbajo`. El resultado es
// idéntico -- construye el índice topológico, resuelve las condiciones de
// TODOS los artefactos aguas abajo del Tramo en un DFS, y devuelve la del
// artefacto pedido (o lanza el mismo error de "no está aguas abajo"). Los
// consumidores del motor que necesitan la condición de muchos artefactos
// del mismo Tramo deben llamar directamente al traversal en lote y
// reutilizar su Map -- no este wrapper en un bucle (era exactamente el
// hotspot de PERF-SCALE-01A).
import type { RedHidraulica, ReferenciaDeArtefacto } from '../../../modelo/redHidraulica'
import { crearIndiceTopologico } from '../topologia/indiceTopologico'
import {
  claveDeReferenciaDeArtefacto,
  resolverCondicionesHidraulicasDeCaudalAguasAbajo,
} from './resolverCondicionesHidraulicasAguasAbajo'
import type { CondicionHidraulicaDeCaudal } from './resolverQuEfectivo'

export function determinarCondicionHidraulicaDeCaudal(
  redHidraulica: RedHidraulica,
  tramoId: string,
  artefacto: ReferenciaDeArtefacto,
): CondicionHidraulicaDeCaudal {
  const tramoInicial = redHidraulica.tramos.find((tramo) => tramo.id === tramoId)

  // Precondicion imposible tras validarRedHidraulica: mismo criterio que
  // obtenerArtefactosAguasAbajo (tramoId inexistente es un error de uso,
  // no "ninguna condicion").
  if (tramoInicial === undefined) {
    throw new Error(`determinarCondicionHidraulicaDeCaudal: no existe ningun tramo con id "${tramoId}"`)
  }

  // Conservacion de masa en el equipo de produccion ACS: un tramo ya
  // declarado AC se resuelve de una, sin analizar la ruta ni exigir que el
  // artefacto esté aguas abajo -- comportamiento preservado exactamente
  // (esa coherencia semantica es responsabilidad de la validacion de la
  // red, no de este clasificador; ver analisis previo, D-delta).
  if (tramoInicial.red === 'AC') {
    return 'aguaCaliente'
  }

  const indice = crearIndiceTopologico(redHidraulica)
  const condiciones = resolverCondicionesHidraulicasDeCaudalAguasAbajo(indice, tramoId)
  const condicion = condiciones.get(claveDeReferenciaDeArtefacto(artefacto))

  if (condicion === undefined) {
    throw new Error(
      `determinarCondicionHidraulicaDeCaudal: el artefacto (unidadFuncionalId="${artefacto.unidadFuncionalId}", ` +
        `localId="${artefacto.localId}", artefactoId="${artefacto.artefactoId}") no está aguas abajo del tramo "${tramoId}"`,
    )
  }

  return condicion
}
