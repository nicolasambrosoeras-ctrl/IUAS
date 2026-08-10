// Aporte elemental de demanda por Artefacto participante. Resuelve
// unicamente los datos crudos que la etapa de agregacion (n/Qmax, todavia
// no implementada) va a necesitar; no multiplica cantidad x quTotal_lps
// aca -- esa cuenta pertenece al siguiente slice.
import type { ArtefactoNormativo } from '../../../normativa/eras-2023/catalogo-artefactos'
import type { ArtefactoResuelto } from '../topologia/resolverArtefactosReferenciados'

export interface AporteDeDemanda {
  readonly artefactoResuelto: ArtefactoResuelto
  readonly cantidad: number
  readonly quTotal_lps: number
}

export function resolverAportesDeDemanda(
  artefactosParticipantes: readonly ArtefactoResuelto[],
  catalogoArtefactos: readonly ArtefactoNormativo[],
): readonly AporteDeDemanda[] {
  return artefactosParticipantes.map((artefactoResuelto) => {
    const artefactoId = artefactoResuelto.artefacto.artefactoId
    const artefactoNormativo = catalogoArtefactos.find((candidato) => candidato.id === artefactoId)

    // Precondicion imposible tras validarReferenciasDeCatalogo: toda
    // referencia de artefactoId, sin importar origen, ya fue validada
    // contra el catalogo antes de llegar aca (mismo criterio que n<1 en
    // calcularCoeficienteDeSimultaneidad). No se tolera en silencio con
    // quTotal_lps: 0 -- eso podria producir subdimensionamiento.
    if (artefactoNormativo === undefined) {
      throw new Error(
        `resolverAportesDeDemanda: no existe ningun ArtefactoNormativo con id "${artefactoId}" en el catalogo recibido`,
      )
    }

    return {
      artefactoResuelto,
      cantidad: artefactoResuelto.artefacto.cantidad,
      quTotal_lps: artefactoNormativo.quTotal_lps,
    }
  })
}
