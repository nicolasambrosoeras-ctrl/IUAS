// Aporte elemental hidraulico por Artefacto participante, para UN Tramo
// concreto: a diferencia de resolverAportesDeDemanda (quTotal_lps fijo,
// independiente de topologia), aca el qu depende de la condicion
// hidraulica del par (Tramo, Artefacto) -- un mismo Artefacto puede
// aportar quTotal/quFria/quCaliente distinto segun el Tramo evaluado. No
// calcula n, Qmax, Kc, aEfectivo, K ni Qc; solo resuelve los datos crudos
// que una futura etapa de agregacion AF/AC va a necesitar (mismo patron
// que resolverAportesDeDemanda respecto de agregarAportesDeDemanda).
import type { ArtefactoNormativo } from '../../../normativa/eras-2023/catalogo-artefactos'
import type { RedHidraulica } from '../../../modelo/redHidraulica'
import type { ArtefactoResuelto } from '../topologia/resolverArtefactosReferenciados'
import { resolverQuEfectivoParaTramo } from '../caudal/resolverQuEfectivoParaTramo'
import {
  claveDeReferenciaDeArtefacto,
  type CondicionesHidraulicasAguasAbajo,
} from '../caudal/resolverCondicionesHidraulicasAguasAbajo'
import type { CondicionHidraulicaDeCaudal } from '../caudal/resolverQuEfectivo'

export interface AporteHidraulicoDeTramo {
  readonly artefactoResuelto: ArtefactoResuelto
  readonly cantidad: number
  readonly condicion: CondicionHidraulicaDeCaudal
  readonly qu_lps: number
}

export function resolverAportesHidraulicosDeTramo(
  artefactos: readonly ArtefactoResuelto[],
  redHidraulica: RedHidraulica,
  tramoId: string,
  catalogoArtefactos: readonly ArtefactoNormativo[],
  // PERF-SCALE-01A: ver comentario homólogo en
  // filtrarArtefactosHidraulicamenteActivos.
  condiciones?: CondicionesHidraulicasAguasAbajo,
): readonly AporteHidraulicoDeTramo[] {
  return artefactos.map((artefactoResuelto) => {
    const artefactoId = artefactoResuelto.artefacto.artefactoId
    const artefactoNormativo = catalogoArtefactos.find((candidato) => candidato.id === artefactoId)

    // Mismo criterio que resolverAportesDeDemanda: precondicion imposible
    // tras validarReferenciasDeCatalogo, error explicito en vez de un 0
    // silencioso que podria subdimensionar.
    if (artefactoNormativo === undefined) {
      throw new Error(
        `resolverAportesHidraulicosDeTramo: no existe ningun ArtefactoNormativo con id "${artefactoId}" en el catalogo recibido`,
      )
    }

    const { condicion, qu_lps } = resolverQuEfectivoParaTramo(
      redHidraulica,
      tramoId,
      artefactoResuelto.referencia,
      artefactoNormativo,
      condiciones?.get(claveDeReferenciaDeArtefacto(artefactoResuelto.referencia)),
    )

    return {
      artefactoResuelto,
      cantidad: artefactoResuelto.artefacto.cantidad,
      condicion,
      qu_lps,
    }
  })
}
