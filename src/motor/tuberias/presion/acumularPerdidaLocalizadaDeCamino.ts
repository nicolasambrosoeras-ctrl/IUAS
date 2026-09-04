// Pérdida de carga localizada acumulada a lo largo de un camino hidráulico
// resuelto (raíz -> terminal), paralela a acumularPerdidaDistribuidaDeCamino
// pero para el subconjunto inequívoco de Tabla N°7 declarable sobre
// Tramo.accesorios (D-δ.33/M2-C slice A) MÁS la contribución de tees
// declaradas sobre el Nodo del que sale cada Tramo (CRIT-A31).
//
// Reutiliza resolverDiametroComercialDeTramo (capa comercial, NO
// resolverPerdidaDistribuidaDeTramo) para obtener velocidadReal_mps de
// cada Tramo del camino: la pérdida localizada solo necesita velocidad,
// no coeficiente de fricción ni catálogo de materiales -- pedir
// catalogoMateriales acá sería exigir un dato que esta composición no
// usa. No recalcula Qc, diámetro ni velocidad.
//
// Tee (CRIT-A31): por cada Tramo del camino, se consulta
// resolverClasificacionDeTee sobre su nodoOrigenId. Si ese Nodo es una
// bifurcación de tee (1 entrante + 2 salientes) SIN configurar todavía,
// el Tramo queda no resuelto (mismo tratamiento que accesorios sin
// relevar). Si está clasificada, se suma Js_tee = Ks(clasificación)·V²/2g
// -- reutilizando la MISMA velocidadReal_mps ya resuelta de este Tramo,
// nunca una "velocidad de tee" separada -- al hf_m propio de sus
// accesorios en línea (ambos usan la misma V a igual Tramo, así que la
// suma es la composición lineal correcta de CRIT-A26). Si el Nodo no es
// una bifurcación de tee (noEsBifurcacionDeTee: no bifurca, o bifurca en
// más de 2), no hay contribución de tee para este Tramo -- no es
// incompletitud, simplemente no aplica.
//
// Respeta los estados incompletos de la capa comercial (sinDemanda,
// sinCandidatoAdmisible -- ningún Tramo en esos estados tiene
// velocidadReal_mps) y las dos barreras de completitud propias de
// pérdida localizada (accesorios sin relevar, tee sin configurar): si
// algún Tramo del camino no llega a tener su pérdida localizada
// calculada, la acumulación NO devuelve una suma parcial -- devuelve
// 'incompleta' listando todos los tramos no resueltos con su motivo.
import type { Proyecto } from '../../../modelo/proyecto'
import type { ArtefactoNormativo } from '../../../normativa/eras-2023/catalogo-artefactos'
import { obtenerKsDeAccesorio } from '../../../normativa/eras-2023/tabla-07-perdidas-localizadas'
import type { SistemaDeTuberiaCatalogado } from '../sistemaDeTuberia'
import type { CaminoHaciaOrigen } from '../topologia/obtenerCaminoHaciaOrigen'
import { resolverClasificacionDeTee } from '../topologia/resolverClasificacionDeTee'
import { resolverDiametroComercialDeTramo } from '../resolverDiametroComercialDeTramo'
import { resolverPerdidaLocalizadaDeTramo } from '../perdidaCarga/resolverPerdidaLocalizadaDeTramo'
import { calcularPerdidaCargaLocalizada } from '../perdidaCarga/calcularPerdidaCargaLocalizada'

export type MotivoTramoSinPerdidaLocalizada = 'sinDemanda' | 'sinCandidatoAdmisible' | 'sinRelevar' | 'teeSinConfigurar'

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
  const { redHidraulica } = proyecto
  if (redHidraulica === undefined) {
    // Precondición imposible: un camino real (CaminoHaciaOrigen) solo se
    // obtiene de una RedHidraulica ya existente -- mismo criterio que
    // resolverPresionResidualDeCamino.
    throw new Error('acumularPerdidaLocalizadaDeCamino requiere un proyecto con redHidraulica definida')
  }

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
    const { velocidadReal_mps } = resultadoComercial

    // Tee (CRIT-A31): se evalúa antes que los accesorios propios del
    // Tramo -- ambas barreras son independientes, pero un Tramo que sale
    // de una bifurcación de tee sin configurar se reporta por ese motivo
    // específico, sin necesidad de evaluar además sus accesorios en
    // línea (que igual podrían estar sin relevar).
    const clasificacionTee = resolverClasificacionDeTee(redHidraulica, tramo.nodoOrigenId, tramo.id)
    if (clasificacionTee.tipo === 'sinConfigurar') {
      tramosNoResueltos.push({ tramoId: tramo.id, motivo: 'teeSinConfigurar' })
      continue
    }
    const hfTee_m =
      clasificacionTee.tipo === 'clasificado'
        ? calcularPerdidaCargaLocalizada(obtenerKsDeAccesorio(clasificacionTee.idAccesorioTabla07), velocidadReal_mps)
        : 0

    const resultadoLocalizada = resolverPerdidaLocalizadaDeTramo(tramo.accesorios, velocidadReal_mps)

    if (resultadoLocalizada.tipo === 'sinRelevar') {
      tramosNoResueltos.push({ tramoId: tramo.id, motivo: 'sinRelevar' })
      continue
    }

    porTramo.push({ tramoId: tramo.id, hf_m: resultadoLocalizada.hf_m + hfTee_m })
  }

  if (tramosNoResueltos.length > 0) {
    return { tipo: 'incompleta', tramosNoResueltos }
  }

  const hf_m = porTramo.reduce((suma, entrada) => suma + entrada.hf_m, 0)
  return { tipo: 'acumulada', hf_m, porTramo }
}
