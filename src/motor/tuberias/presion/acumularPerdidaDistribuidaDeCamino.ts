// Perdida de carga distribuida acumulada a lo largo de un camino
// hidraulico resuelto (raiz -> terminal), cuarto eslabon del balance de
// presion de M2-B tras obtenerCaminoHaciaOrigen y resolverDesnivelDeCamino.
//
// Compone, sin recalcular NADA, el resultado publico de
// resolverPerdidaDistribuidaDeTramo (N3) para cada Tramo del camino: no
// vuelve a resolver Qc, diametro comercial, velocidad ni factor de
// friccion -- solo suma los hf_m ya calculados por tramo.
//
// Respeta los estados incompletos de N3 (mismo principio que la barrera
// de completitud de resolverBalanceDePresion): si algun Tramo del camino
// no llega a 'conPerdidaDistribuida' (sin longitud, sin candidato
// comercial admisible, sin demanda computable aguas abajo), la
// acumulacion NO devuelve una suma parcial ni interpreta ese tramo como
// hf=0 -- devuelve 'incompleta' listando los tramos no resueltos y su
// motivo. La cobertura fisica del Proyecto (S1/auditarCoberturaFisica) es
// responsabilidad del orquestador de presion que consuma esta funcion,
// no de esta composicion por tramo.
//
// GranularidadHidraulica (D-δ.44): en 'profesional' esta función itera
// TODO camino.tramos, sin cambios respecto del comportamiento original.
// En 'simplificada', seleccionarTramosDeAcumulacion trunca el camino en
// el Tramo representativo del (Local, Red) del terminal -- los Tramos
// más profundos (ramales hacia cada Artefacto) NUNCA se iteran acá:
// contribuyen 0 a hfDistribuida por definición del modelo simplificado,
// nunca "tramo no resuelto". La regla hf=Σ J·L no cambia -- cambia
// exclusivamente el conjunto de Tramos que la componen.
import type { Proyecto } from '../../../modelo/proyecto'
import type { ArtefactoNormativo } from '../../../normativa/eras-2023/catalogo-artefactos'
import type { SistemaDeTuberiaCatalogado } from '../sistemaDeTuberia'
import type { MaterialTuberia } from '../materialTuberia'
import type { CaminoHaciaOrigen } from '../topologia/obtenerCaminoHaciaOrigen'
import { resolverPerdidaDistribuidaDeTramo } from '../resolverPerdidaDistribuidaDeTramo'
import { seleccionarTramosDeAcumulacion } from './seleccionarTramosDeAcumulacion'

export type MotivoTramoSinPerdida = 'sinDemanda' | 'sinCandidatoAdmisible' | 'sinLongitud'

export type ResultadoPerdidaDistribuidaDeCamino =
  | {
      readonly tipo: 'acumulada'
      // Suma de los hf_m de todos los Tramos del camino. Para el caso
      // "raiz inmediata" (camino.tramos === []) es 0: un terminal que ES
      // la raiz no tiene ninguna canieria de distribucion aguas arriba,
      // asi que la perdida distribuida es genuinamente 0 -- no un termino
      // obligatorio ausente.
      readonly hf_m: number
      readonly porTramo: readonly { readonly tramoId: string; readonly hf_m: number }[]
    }
  | {
      readonly tipo: 'incompleta'
      readonly tramosNoResueltos: readonly {
        readonly tramoId: string
        readonly motivo: MotivoTramoSinPerdida
      }[]
    }

export function acumularPerdidaDistribuidaDeCamino(
  proyecto: Proyecto,
  camino: CaminoHaciaOrigen,
  catalogoArtefactos: readonly ArtefactoNormativo[],
  catalogoSistemasDeTuberia: readonly SistemaDeTuberiaCatalogado[],
  catalogoMateriales: readonly MaterialTuberia[],
): ResultadoPerdidaDistribuidaDeCamino {
  const porTramo: { tramoId: string; hf_m: number }[] = []
  const tramosNoResueltos: { tramoId: string; motivo: MotivoTramoSinPerdida }[] = []

  const { tramosRelevables } = seleccionarTramosDeAcumulacion(proyecto, camino)

  for (const tramo of tramosRelevables) {
    const resultadoTramo = resolverPerdidaDistribuidaDeTramo(
      proyecto,
      tramo.id,
      catalogoArtefactos,
      catalogoSistemasDeTuberia,
      catalogoMateriales,
    )

    switch (resultadoTramo.tipo) {
      case 'conPerdidaDistribuida':
        porTramo.push({ tramoId: tramo.id, hf_m: resultadoTramo.hf_m })
        break
      case 'sinDemanda':
        tramosNoResueltos.push({ tramoId: tramo.id, motivo: 'sinDemanda' })
        break
      case 'sinCandidatoAdmisible':
        tramosNoResueltos.push({ tramoId: tramo.id, motivo: 'sinCandidatoAdmisible' })
        break
      case 'sinLongitud':
        tramosNoResueltos.push({ tramoId: tramo.id, motivo: 'sinLongitud' })
        break
    }
  }

  if (tramosNoResueltos.length > 0) {
    return { tipo: 'incompleta', tramosNoResueltos }
  }

  const hf_m = porTramo.reduce((suma, entrada) => suma + entrada.hf_m, 0)
  return { tipo: 'acumulada', hf_m, porTramo }
}
