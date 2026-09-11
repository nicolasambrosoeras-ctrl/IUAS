// Perdida de carga localizada ESTIMADA de un Local+red (D-delta.40 tees +
// D-delta.45 plantilla tipica del modo rapido): el resto de Tabla N7
// (curvas, uniones, valvula esclusa, reducciones) sigue SIN estimarse --
// no hay en el dominio ninguna base normativa ni topologica para inferir
// esas cantidades sin relevamiento fisico. La plantilla D-delta.45 agrega
// dos componentes mas, ambos decisiones de producto IUAS explicitas
// (decisiones rojas presentadas y resueltas por el usuario, ver
// PENDIENTES-DE-ARQUITECTURA.md D-delta.45): una singularidad terminal
// fija y una llave de paso, ambas de cardinalidad 1 por Local+red
// (nunca por terminal) cuando hay al menos 1 terminal fisico.
//
// Formula (decision IUAS, conservadora -- ninguna parte de esta seccion
// es transcripcion de ERAS-2023):
//   n = contarTerminalesFisicosDeLocal
//   N_tees_estimadas          = max(0, n-1)
//   N_singularidadTerminal    = n >= 1 ? 1 : 0   -- el ultimo terminal de la linea
//   N_llaveDePaso             = n >= 1 ? 1 : 0   -- una por Local+red, no por terminal
//   Ks_estimado_tee           = 3,00  (Tabla N7: teeEntradaCentralSalidasLaterales,
//                                      peor Ks de las 3 variantes de tee, D-delta.40)
//   Ks_singularidadTerminal   = 1,35  (Tabla N7: codo90 -- decision roja D-delta.45,
//                                      resuelta por el usuario a favor de la opcion
//                                      mas conservadora entre curva90/codo90/tuboSaliente)
//   Ks_llaveDePaso            = 9,18  (Tabla N7: llaveDePaso -- decision roja D-delta.45,
//                                      resuelta por el usuario: SI incluirla, 1 por Local+red)
//   V_ref = MAX velocidadReal_mps entre los tramos que alimentan
//           directamente cada terminal fisico de este Local+red (nunca
//           toda la traza hasta la raiz: eso mezclaria velocidades de
//           tramos troncales compartidos con OTROS Locales). Nunca
//           subestima Js (Js proporcional a V^2): mismo principio
//           conservador ya usado para Ks_estimado_tee, D-delta.40.
//   Ks_equivalente_estimado = N_tees_estimadas*Ks_estimado_tee
//                            + N_singularidadTerminal*Ks_singularidadTerminal
//                            + N_llaveDePaso*Ks_llaveDePaso
//   Js_estimada = Ks_equivalente_estimado * V_ref^2 / (2g)
//
// Unico valor por Local+red: se aplica igual a todos los terminales de
// ese Local+red (no se distribuye por tramo -- no hay relevamiento de
// DONDE, dentro del Local, esta cada componente estimado).
//
// n=0 (ningun terminal fisico en esta red/Local) es el UNICO cero real
// que nunca requiere resolver velocidad: Ks_equivalente_estimado=0
// independientemente de V, asi que se corta antes de tocar la capa
// comercial. A partir de D-delta.45, n=1 YA NO es un cero -- aunque
// N_tees_estimadas siga siendo 0, la singularidad terminal y la llave de
// paso SI aplican con un unico terminal, asi que ahora requiere resolver
// velocidad igual que n>=2 (cambio de comportamiento respecto de
// D-delta.40, ver PENDIENTES-DE-ARQUITECTURA.md D-delta.45).
import type { Proyecto } from '../../../modelo/proyecto'
import type { ArtefactoNormativo } from '../../../normativa/eras-2023/catalogo-artefactos'
import type { RedDeTramo } from '../../../modelo/redHidraulica'
import type { SistemaDeTuberiaCatalogado } from '../sistemaDeTuberia'
import { obtenerKsDeAccesorio } from '../../../normativa/eras-2023/tabla-07-perdidas-localizadas'
import { resolverDiametroComercialDeTramo } from '../resolverDiametroComercialDeTramo'
import type { ContextoDeCalculoM2 } from '../contextoDeCalculoM2'
import { calcularPerdidaCargaLocalizada } from '../perdidaCarga/calcularPerdidaCargaLocalizada'
import { contarTerminalesFisicosDeLocal } from '../topologia/contarTerminalesFisicosDeLocal'

export const KS_ESTIMADO_TEE = obtenerKsDeAccesorio('teeEntradaCentralSalidasLaterales')
export const KS_ESTIMADO_SINGULARIDAD_TERMINAL = obtenerKsDeAccesorio('codo90')
export const KS_ESTIMADO_LLAVE_DE_PASO = obtenerKsDeAccesorio('llaveDePaso')

export type MotivoTramoSinPerdidaLocalizadaEstimada = 'sinDemanda' | 'sinCandidatoAdmisible'

export type ResultadoPerdidaLocalizadaEstimadaDeLocal =
  | {
      readonly tipo: 'estimada'
      readonly hf_m: number
      readonly nTerminalesLocal: number
      readonly nTeesEstimadas: number
      readonly nSingularidadTerminal: number
      readonly nLlaveDePaso: number
      // 0 cuando nTerminalesLocal=0: Js=0 no depende de V, nunca se
      // resolvio ningun candidato comercial para llegar a este resultado.
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
  // PERF-SCALE-01B: contexto de cálculo local a la resolución -- memoiza
  // hidráulica/diámetro por Tramo entre caminos y etapas. Ausente ⇒
  // comportamiento previo byte a byte.
  contexto?: ContextoDeCalculoM2,
): ResultadoPerdidaLocalizadaEstimadaDeLocal {
  const { redHidraulica } = proyecto
  if (redHidraulica === undefined) {
    // Precondicion imposible: mismo criterio que acumularPerdidaLocalizadaDeCamino
    // / resolverPresionResidualDeCamino.
    throw new Error('resolverPerdidaLocalizadaEstimadaDeLocal requiere un proyecto con redHidraulica definida')
  }

  const nTerminalesLocal = contarTerminalesFisicosDeLocal(redHidraulica, unidadFuncionalId, localId, red)

  if (nTerminalesLocal === 0) {
    return {
      tipo: 'estimada',
      hf_m: 0,
      nTerminalesLocal: 0,
      nTeesEstimadas: 0,
      nSingularidadTerminal: 0,
      nLlaveDePaso: 0,
      velocidadReferencia_mps: 0,
    }
  }

  const nTeesEstimadas = Math.max(0, nTerminalesLocal - 1)
  const nSingularidadTerminal = 1
  const nLlaveDePaso = 1

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
      contexto,
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

  const ksEquivalenteEstimado =
    nTeesEstimadas * KS_ESTIMADO_TEE +
    nSingularidadTerminal * KS_ESTIMADO_SINGULARIDAD_TERMINAL +
    nLlaveDePaso * KS_ESTIMADO_LLAVE_DE_PASO
  const hf_m = calcularPerdidaCargaLocalizada(ksEquivalenteEstimado, velocidadReferencia_mps)

  return {
    tipo: 'estimada',
    hf_m,
    nTerminalesLocal,
    nTeesEstimadas,
    nSingularidadTerminal,
    nLlaveDePaso,
    velocidadReferencia_mps,
  }
}
