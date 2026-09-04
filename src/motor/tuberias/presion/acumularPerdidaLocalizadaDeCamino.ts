// Pérdida de carga localizada acumulada a lo largo de un camino hidráulico
// resuelto (raíz -> terminal), paralela a acumularPerdidaDistribuidaDeCamino
// pero para el subconjunto inequívoco de Tabla N°7 declarable sobre
// Tramo.accesorios (D-δ.33/M2-C slice A).
//
// Reutiliza resolverDiametroComercialDeTramo (capa comercial, NO
// resolverPerdidaDistribuidaDeTramo) para obtener velocidadReal_mps de
// cada Tramo del camino: la pérdida localizada solo necesita velocidad,
// no coeficiente de fricción ni catálogo de materiales -- pedir
// catalogoMateriales acá sería exigir un dato que esta composición no
// usa. No recalcula Qc, diámetro ni velocidad.
//
// Respeta los estados incompletos de la capa comercial (sinDemanda,
// sinCandidatoAdmisible -- ningún Tramo en esos estados tiene
// velocidadReal_mps) y la barrera de completitud propia de accesorios
// (sinRelevar, resolverPerdidaLocalizadaDeTramo): si algún Tramo del
// camino no llega a tener su pérdida localizada calculada, la
// acumulación NO devuelve una suma parcial -- devuelve 'incompleta'
// listando todos los tramos no resueltos con su motivo.
import type { Proyecto } from '../../../modelo/proyecto'
import type { ArtefactoNormativo } from '../../../normativa/eras-2023/catalogo-artefactos'
import type { SistemaDeTuberiaCatalogado } from '../sistemaDeTuberia'
import type { CaminoHaciaOrigen } from '../topologia/obtenerCaminoHaciaOrigen'
import { resolverDiametroComercialDeTramo } from '../resolverDiametroComercialDeTramo'
import { resolverPerdidaLocalizadaDeTramo } from '../perdidaCarga/resolverPerdidaLocalizadaDeTramo'

export type MotivoTramoSinPerdidaLocalizada = 'sinDemanda' | 'sinCandidatoAdmisible' | 'sinRelevar'

export type ResultadoPerdidaLocalizadaDeCamino =
  | {
      readonly tipo: 'acumulada'
      // Suma de los hf_m de todos los Tramos del camino. Para el caso
      // "raíz inmediata" (camino.tramos === []) es 0: un terminal que ES
      // la raíz no tiene ningún Tramo con accesorios aguas arriba, la
      // pérdida localizada es genuinamente 0 -- no un término obligatorio
      // ausente.
      readonly hf_m: number
      readonly porTramo: readonly { readonly tramoId: string; readonly hf_m: number }[]
    }
  | {
      readonly tipo: 'incompleta'
      readonly tramosNoResueltos: readonly {
        readonly tramoId: string
        readonly motivo: MotivoTramoSinPerdidaLocalizada
      }[]
    }

export function acumularPerdidaLocalizadaDeCamino(
  proyecto: Proyecto,
  camino: CaminoHaciaOrigen,
  catalogoArtefactos: readonly ArtefactoNormativo[],
  catalogoSistemasDeTuberia: readonly SistemaDeTuberiaCatalogado[],
): ResultadoPerdidaLocalizadaDeCamino {
  const porTramo: { tramoId: string; hf_m: number }[] = []
  const tramosNoResueltos: { tramoId: string; motivo: MotivoTramoSinPerdidaLocalizada }[] = []

  for (const tramo of camino.tramos) {
    const resultadoComercial = resolverDiametroComercialDeTramo(
      proyecto,
      tramo.id,
      catalogoArtefactos,
      catalogoSistemasDeTuberia,
    )

    if (resultadoComercial.tipo === 'sinDemanda') {
      tramosNoResueltos.push({ tramoId: tramo.id, motivo: 'sinDemanda' })
      continue
    }
    if (resultadoComercial.tipo === 'sinCandidatoAdmisible') {
      tramosNoResueltos.push({ tramoId: tramo.id, motivo: 'sinCandidatoAdmisible' })
      continue
    }

    const resultadoLocalizada = resolverPerdidaLocalizadaDeTramo(
      tramo.accesorios,
      resultadoComercial.velocidadReal_mps,
    )

    if (resultadoLocalizada.tipo === 'sinRelevar') {
      tramosNoResueltos.push({ tramoId: tramo.id, motivo: 'sinRelevar' })
      continue
    }

    porTramo.push({ tramoId: tramo.id, hf_m: resultadoLocalizada.hf_m })
  }

  if (tramosNoResueltos.length > 0) {
    return { tipo: 'incompleta', tramosNoResueltos }
  }

  const hf_m = porTramo.reduce((suma, entrada) => suma + entrada.hf_m, 0)
  return { tipo: 'acumulada', hf_m, porTramo }
}
