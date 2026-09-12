// HYD-EST-01: resumen por Local/Red de resultados POR CAMINO. No produce
// una hf agregada ni una Vref; presión consume directamente el resolver
// de camino. Los caminos incompletos nunca reciben un fallback numérico.
import type { Proyecto } from '../../../modelo/proyecto'
import type { RedDeTramo } from '../../../modelo/redHidraulica'
import type { ArtefactoNormativo } from '../../../normativa/eras-2023/catalogo-artefactos'
import type { SistemaDeTuberiaCatalogado } from '../sistemaDeTuberia'
import { crearContextoDeCalculoM2, type ContextoDeCalculoM2 } from '../contextoDeCalculoM2'
import {
  claveLocalYRed, obtenerIndiceEstimacionLocalizada, resolverPerdidaLocalizadaEstimadaDeCamino,
  type ResultadoPerdidaLocalizadaEstimadaDeCamino,
} from './resolverPerdidaLocalizadaEstimadaDeCamino'

export { KS_ESTIMADO_TEE, KS_ESTIMADO_SINGULARIDAD_TERMINAL, KS_ESTIMADO_LLAVE_DE_PASO } from './resolverPerdidaLocalizadaEstimadaDeCamino'

export type ResultadoPerdidaLocalizadaEstimadaDeLocal = {
  readonly nTerminalesLocal: number
  readonly caminos: readonly { readonly terminalId: string; readonly resultado: ResultadoPerdidaLocalizadaEstimadaDeCamino }[]
}

export function resolverPerdidaLocalizadaEstimadaDeLocal(
  proyecto: Proyecto,
  unidadFuncionalId: string,
  localId: string,
  red: RedDeTramo,
  catalogoArtefactos: readonly ArtefactoNormativo[],
  catalogoSistemasDeTuberia: readonly SistemaDeTuberiaCatalogado[],
  contexto: ContextoDeCalculoM2 = crearContextoDeCalculoM2(),
): ResultadoPerdidaLocalizadaEstimadaDeLocal {
  const indice = obtenerIndiceEstimacionLocalizada(proyecto, contexto)
  const grupo = indice.grupos.get(claveLocalYRed(unidadFuncionalId, localId, red))
  const terminales = [...grupo?.terminales ?? []].sort()
  return { nTerminalesLocal: terminales.length, caminos: terminales.map(terminalId => {
    const camino = indice.caminos.get(terminalId)!
    return { terminalId, resultado: camino.tipo === 'camino'
      ? resolverPerdidaLocalizadaEstimadaDeCamino(proyecto, camino, catalogoArtefactos, catalogoSistemasDeTuberia, contexto)
      : { tipo: 'incompleta', tramosNoResueltos: [{ tramoId: proyecto.redHidraulica!.tramos.find(t => t.nodoDestinoId === terminalId)!.id, motivo: 'caminoNoResoluble' }] } }
  }) }
}
