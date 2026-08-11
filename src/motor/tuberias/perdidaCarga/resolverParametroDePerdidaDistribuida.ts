// Resuelve el parametro operativo de perdida distribuida (CRIT-A17/CRIT-A18)
// segun la configuracion global del Proyecto: Hazen-Williams -> coeficienteC,
// Darcy-Weisbach -> rugosidadAbsoluta_mm, nunca ambos. Solo orquesta
// configuracionHidraulica + catalogo de materiales -- no conoce ni llama a
// las primitivas matematicas (calcularPerdidaCargaHazenWilliams,
// calcularFactorFriccionDarcy, etc.), que siguen recibiendo numeros
// explicitos. El catalogo entra por parametro (mismo patron que
// resolverAportesDeDemanda con catalogoArtefactos); la resolucion por ID
// es exclusivamente obtenerMaterialTuberia, sin find/switch propio.
import type { Proyecto } from '../../../modelo/proyecto'
import { obtenerMaterialTuberia, type MaterialTuberia } from '../materialTuberia'

export type ParametroDePerdidaDistribuida =
  | {
      readonly metodo: 'hazenWilliams'
      readonly coeficienteC: number
    }
  | {
      readonly metodo: 'darcyWeisbach'
      readonly rugosidadAbsoluta_mm: number
    }

export function resolverParametroDePerdidaDistribuida(
  proyecto: Proyecto,
  catalogoMateriales: readonly MaterialTuberia[],
): ParametroDePerdidaDistribuida {
  const material = obtenerMaterialTuberia(proyecto.configuracionHidraulica.materialTuberiaId, catalogoMateriales)

  if (proyecto.configuracionHidraulica.metodoPerdidaDistribuida === 'hazenWilliams') {
    return { metodo: 'hazenWilliams', coeficienteC: material.coeficienteC }
  }

  return { metodo: 'darcyWeisbach', rugosidadAbsoluta_mm: material.rugosidadAbsoluta_mm }
}
