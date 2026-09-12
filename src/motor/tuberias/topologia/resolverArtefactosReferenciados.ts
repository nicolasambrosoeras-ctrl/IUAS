// Resolver funcional puro: traduce cada ReferenciaDeArtefacto (identidad
// UnidadFuncional -> Local -> Artefacto) a las instancias reales dentro del
// Proyecto. No aplica computabilidad, CRIT-A8, ni catalogo normativo: es la
// segunda etapa conceptual (resolucion funcional), previa a computabilidad
// y simultaneidad, que hoy viven fusionadas dentro de calcularSimultaneidad.
import type { Artefacto, Local, Proyecto, UnidadFuncional } from '../../../modelo/proyecto'
import type { ReferenciaDeArtefacto } from '../../../modelo/redHidraulica'
import { localesDeUnidadFuncional } from '../geometria/resolverCotaHidraulicaDeArtefacto'

export interface ArtefactoResuelto {
  readonly referencia: ReferenciaDeArtefacto
  readonly unidadFuncional: UnidadFuncional
  readonly local: Local
  readonly artefacto: Artefacto
}

export function resolverArtefactosReferenciados(
  proyecto: Proyecto,
  referencias: readonly ReferenciaDeArtefacto[],
): readonly ArtefactoResuelto[] {
  return referencias.map((referencia) => resolverUnaReferencia(proyecto, referencia))
}

function resolverUnaReferencia(proyecto: Proyecto, referencia: ReferenciaDeArtefacto): ArtefactoResuelto {
  const unidadFuncional = proyecto.unidadesFuncionales.find((uf) => uf.id === referencia.unidadFuncionalId)

  // Precondicion imposible tras validarRedHidraulica: una referencia que no
  // resuelve no es "ningun resultado", es un error de uso de esta funcion
  // (mismo criterio que n<1 en calcularCoeficienteDeSimultaneidad y que
  // tramoId inexistente en obtenerArtefactosAguasAbajo).
  if (unidadFuncional === undefined) {
    throw new Error(
      `resolverArtefactosReferenciados: no existe ninguna UnidadFuncional con id "${referencia.unidadFuncionalId}"`,
    )
  }

  const local = localesDeUnidadFuncional(unidadFuncional).find((local) => local.id === referencia.localId)

  if (local === undefined) {
    throw new Error(
      `resolverArtefactosReferenciados: no existe ningun Local con id "${referencia.localId}" dentro de la ` +
        `UnidadFuncional "${referencia.unidadFuncionalId}"`,
    )
  }

  const artefacto = local.artefactos.find((artefacto) => artefacto.id === referencia.artefactoId)

  if (artefacto === undefined) {
    throw new Error(
      `resolverArtefactosReferenciados: no existe ningun Artefacto con id "${referencia.artefactoId}" dentro del ` +
        `Local "${referencia.localId}"`,
    )
  }

  return { referencia, unidadFuncional, local, artefacto }
}
