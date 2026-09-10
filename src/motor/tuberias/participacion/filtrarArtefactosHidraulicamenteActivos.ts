// Filtro de participacion hidraulica previo a CRIT-A8 (CRIT-A13 revisado):
// para un Tramo/condicion dados, retiene unicamente los ArtefactoResuelto
// cuyo qu_lps efectivo es > 0 -- el conjunto sobre el que CRIT-A8 debe
// decidir participacion, no el resultado final de CRIT-A8. Esta funcion
// NO aplica CRIT-A8 (ver aplicarParticipacionCritA8, etapa siguiente) ni
// construye aportes (ver resolverAportesHidraulicosDeTramo, que sigue
// resolviendo condicion/qu_lps para el conjunto post-CRIT-A8). No
// duplica traversal topologico ni seleccion de quTotal/quFria/quCaliente:
// delega ambas responsabilidades en resolverQuEfectivoParaTramo.
import type { ArtefactoNormativo } from '../../../normativa/eras-2023/catalogo-artefactos'
import type { RedHidraulica } from '../../../modelo/redHidraulica'
import type { ArtefactoResuelto } from '../topologia/resolverArtefactosReferenciados'
import { resolverQuEfectivoParaTramo } from '../caudal/resolverQuEfectivoParaTramo'
import {
  claveDeReferenciaDeArtefacto,
  type CondicionesHidraulicasAguasAbajo,
} from '../caudal/resolverCondicionesHidraulicasAguasAbajo'

export function filtrarArtefactosHidraulicamenteActivos(
  artefactos: readonly ArtefactoResuelto[],
  redHidraulica: RedHidraulica,
  tramoId: string,
  catalogoArtefactos: readonly ArtefactoNormativo[],
  // PERF-SCALE-01A: condiciones hidráulicas de todos los artefactos aguas
  // abajo de `tramoId`, ya resueltas por el traversal en lote del llamador
  // (resolverHidraulicaDeTramo). `undefined` = se resuelve por artefacto
  // con el clasificador puntual, como antes de este slice.
  condiciones?: CondicionesHidraulicasAguasAbajo,
): readonly ArtefactoResuelto[] {
  return artefactos.filter((artefactoResuelto) => {
    const artefactoId = artefactoResuelto.artefacto.artefactoId
    const artefactoNormativo = catalogoArtefactos.find((candidato) => candidato.id === artefactoId)

    // Mismo criterio que resolverAportesDeDemanda/resolverAportesHidraulicosDeTramo:
    // precondicion imposible tras validarReferenciasDeCatalogo, error
    // explicito en vez de tratarlo como inactivo o ignorarlo.
    if (artefactoNormativo === undefined) {
      throw new Error(
        `filtrarArtefactosHidraulicamenteActivos: no existe ningun ArtefactoNormativo con id "${artefactoId}" en el catalogo recibido`,
      )
    }

    const { qu_lps } = resolverQuEfectivoParaTramo(
      redHidraulica,
      tramoId,
      artefactoResuelto.referencia,
      artefactoNormativo,
      condiciones?.get(claveDeReferenciaDeArtefacto(artefactoResuelto.referencia)),
    )

    return qu_lps > 0
  })
}
