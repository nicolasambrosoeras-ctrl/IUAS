// Perdida de carga localizada ESTIMADA de un Local+red (D-delta.40, modo
// estandar): unica magnitud del modo estimado implementada hasta ahora --
// tees estimadas. El resto de Tabla N7 (codos, curvas, llaves...) NO se
// estima: no hay en el dominio ninguna base normativa ni topologica para
// inferir cantidades de esos accesorios sin relevamiento fisico, y modo
// estandar debe simplificar el relevamiento, no inventar infraestructura
// con falsa precision (ver PENDIENTES-DE-ARQUITECTURA.md, D-delta.40).
//
// Formula (decision IUAS, conservadora -- ninguna parte de esta seccion
// es transcripcion de ERAS-2023):
//   N_tees_estimadas = max(0, n-1)          n = contarTerminalesFisicosDeLocal
//   Ks_estimado_tee = 3,00                  peor Ks de las 3 variantes de tee de Tabla N7
//   V_ref = MAX velocidadReal_mps entre los tramos que alimentan
//           directamente cada terminal fisico de este Local+red (nunca
//           toda la traza hasta la raiz: eso mezclaria velocidades de
//           tramos troncales compartidos con OTROS Locales). Nunca
//           subestima Js (Js proporcional a V^2): mismo principio
//           conservador que Ks=3,00, ver checkpoint rojo resuelto en
//           D-delta.40.
//   Js_estimada = (N_tees_estimadas * Ks_estimado_tee) * V_ref^2 / (2g)
//
// Unico valor por Local+red: se aplica igual a todos los terminales de
// ese Local+red (no se distribuye por tramo -- no hay relevamiento de
// DONDE, dentro del Local, esta cada tee estimada).
//
// N_tees_estimadas=0 (0 o 1 terminal fisico en esta red/Local) es un cero
// real que NUNCA requiere resolver velocidad: Js=0 independientemente de
// V, asi que se corta antes de tocar la capa comercial -- evita exigir
// que esos tramos tengan demanda/diametro resuelto cuando el resultado
// final no depende de eso.
import type { Proyecto } from '../../../modelo/proyecto'
import type { ArtefactoNormativo } from '../../../normativa/eras-2023/catalogo-artefactos'
import type { RedDeTramo } from '../../../modelo/redHidraulica'
import type { SistemaDeTuberiaCatalogado } from '../sistemaDeTuberia'
import { resolverDiametroComercialDeTramo } from '../resolverDiametroComercialDeTramo'
import { calcularPerdidaCargaLocalizada } from '../perdidaCarga/calcularPerdidaCargaLocalizada'
import { contarTerminalesFisicosDeLocal } from '../topologia/contarTerminalesFisicosDeLocal'

// Peor Ks de las 3 variantes de tee de Tabla N7 (teeEntradaCentralSalidasLaterales,
// ver normativa/eras-2023/tabla-07-perdidas-localizadas y CRIT-A31) --
// adopcion deliberadamente conservadora ante geometria no relevada, NO
// afirma que toda tee real tenga este Ks.
const KS_ESTIMADO_TEE = 3.0

export type MotivoTramoSinPerdidaLocalizadaEstimada = 'sinDemanda' | 'sinCandidatoAdmisible'

export type ResultadoPerdidaLocalizadaEstimadaDeLocal =
  | {
      readonly tipo: 'estimada'
      readonly hf_m: number
      readonly nTerminalesLocal: number
      readonly nTeesEstimadas: number
      // 0 cuando nTeesEstimadas=0: Js=0 no depende de V, nunca se resolvio
      // ningun candidato comercial para llegar a este resultado.
      readonly velocidadReferencia_mps: number
    }
  | {
      readonly tipo: 'incompleta'
      readonly tramosNoResueltos: readonly {
        readonly tramoId: string
        readonly motivo: MotivoTramoSinPerdidaLocalizadaEstimada
      }[]
    }

export function resolverPerdidaLocalizadaEstimadaDeLocal(
  proyecto: Proyecto,
  unidadFuncionalId: string,
  localId: string,
  red: RedDeTramo,
  catalogoArtefactos: readonly ArtefactoNormativo[],
  catalogoSistemasDeTuberia: readonly SistemaDeTuberiaCatalogado[],
): ResultadoPerdidaLocalizadaEstimadaDeLocal {
  const { redHidraulica } = proyecto
  if (redHidraulica === undefined) {
    // Precondicion imposible: mismo criterio que acumularPerdidaLocalizadaDeCamino
    // / resolverPresionResidualDeCamino.
    throw new Error('resolverPerdidaLocalizadaEstimadaDeLocal requiere un proyecto con redHidraulica definida')
  }

  const nTerminalesLocal = contarTerminalesFisicosDeLocal(redHidraulica, unidadFuncionalId, localId, red)
  const nTeesEstimadas = Math.max(0, nTerminalesLocal - 1)

  if (nTeesEstimadas === 0) {
    return { tipo: 'estimada', hf_m: 0, nTerminalesLocal, nTeesEstimadas: 0, velocidadReferencia_mps: 0 }
  }

  // Tramos que alimentan DIRECTAMENTE cada terminal fisico de este
  // Local+red (aquellos cuyo nodoDestinoId es uno de esos terminales) --
  // nunca toda la traza hasta la raiz, ver comentario de archivo.
  const idsDeNodosTerminalesDeLocal = new Set(
    redHidraulica.nodos
      .filter(
        (nodo) =>
          nodo.referencia?.tipo === 'artefacto' &&
          nodo.referencia.unidadFuncionalId === unidadFuncionalId &&
          nodo.referencia.localId === localId,
      )
      .map((nodo) => nodo.id),
  )
  const tramosTerminales = redHidraulica.tramos.filter(
    (tramo) => tramo.red === red && idsDeNodosTerminalesDeLocal.has(tramo.nodoDestinoId),
  )

  const tramosNoResueltos: { tramoId: string; motivo: MotivoTramoSinPerdidaLocalizadaEstimada }[] = []
  let velocidadReferencia_mps = 0

  for (const tramo of tramosTerminales) {
    const resultadoComercial = resolverDiametroComercialDeTramo(
      proyecto,
      tramo.id,
      catalogoArtefactos,
      catalogoSistemasDeTuberia,
    )

    if (resultadoComercial.tipo === 'sinDemanda' || resultadoComercial.tipo === 'sinCandidatoAdmisible') {
      tramosNoResueltos.push({ tramoId: tramo.id, motivo: resultadoComercial.tipo })
      continue
    }

    velocidadReferencia_mps = Math.max(velocidadReferencia_mps, resultadoComercial.velocidadReal_mps)
  }

  if (tramosNoResueltos.length > 0) {
    return { tipo: 'incompleta', tramosNoResueltos }
  }

  const hf_m = calcularPerdidaCargaLocalizada(nTeesEstimadas * KS_ESTIMADO_TEE, velocidadReferencia_mps)

  return { tipo: 'estimada', hf_m, nTerminalesLocal, nTeesEstimadas, velocidadReferencia_mps }
}
