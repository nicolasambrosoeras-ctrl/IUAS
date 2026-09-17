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
//   V_ref = velocidad real del Tramo REPRESENTATIVO de este Local+red --
//           el mismo Tramo cuyo DN/V edita y ve el usuario en la fila de
//           Modulo 2 (identificarTramosRepresentativosDeLocales, D-δ.44;
//           es "puro" de este Local, nunca troncal compartido con OTROS
//           Locales, asi que no hay riesgo de mezclar velocidades ajenas).
//           FIX-HYD-EST-SIMPLIFIED-01: antes (D-delta.40/45) se usaba el
//           MAXIMO entre los tramos que alimentan directamente cada
//           terminal fisico -- ramales internos que, en granularidad
//           'profesional', tienen su propio DN dimensionado
//           independientemente del tramo que el usuario ve/edita en la
//           fila del Local+red. Eso desacoplaba la hf localizada
//           estimada del DN que el usuario esta dimensionando (subir el
//           DN de la fila no bajaba la hf localizada). Usar el Tramo
//           representativo ata Vref a la MISMA fuente de verdad
//           hidraulica que ya usa la UI para V/DN de esa fila.
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
import { contarSobrepasosDeLocalPorRed } from '../topologia/contarSobrepasosDeLocalPorRed'
import { localesDeUnidadFuncional } from '../geometria/resolverCotaHidraulicaDeArtefacto'
import { obtenerKsAcquaSystem } from '../perdidaCarga/catalogoKAccesoriosAcquaSystem'
import { SISTEMA_DE_TUBERIA_ACQUA_SYSTEM_ID } from '../perdidaCarga/resolverKsDeAccesorioDeTramo'
import { resolverKsDeReduccion } from '../perdidaCarga/resolverKsDeReduccion'
import {
  identificarTramosRepresentativosDeLocales,
  obtenerTramosRepresentativosDeLocalesDeContexto,
} from '../topologia/identificarTramoRepresentativoDeLocal'

// HYD-ACQUA-K-CATALOG-01: el Ks de la tee estimada pasa a depender del
// sistema comercial adoptado -- Acqua System usa su propio valor oficial
// simplificado (1,80, configuración N°5 "distributiva", ver
// catalogoKAccesoriosAcquaSystem.ts); cualquier otro sistema conserva
// EXACTAMENTE el valor de antes de este slice (Tabla N°7,
// teeEntradaCentralSalidasLaterales=3,00 -- D-δ.40, sin reabrir). La
// singularidad terminal y la llave de paso NO cambian por sistema: son
// decisiones de producto fijas (D-δ.45), fuera del alcance de este
// incremento (que sólo pidió completar el catálogo Acqua System y cerrar
// la tee/reducción estimadas).
export const KS_ESTIMADO_TEE_ERAS = obtenerKsDeAccesorio('teeEntradaCentralSalidasLaterales')
export const KS_ESTIMADO_SINGULARIDAD_TERMINAL = obtenerKsDeAccesorio('codo90')
export const KS_ESTIMADO_LLAVE_DE_PASO = obtenerKsDeAccesorio('llaveDePaso')

export function resolverKsEstimadoTee(sistemaDeTuberiaId: string): number {
  return sistemaDeTuberiaId === SISTEMA_DE_TUBERIA_ACQUA_SYSTEM_ID
    ? obtenerKsAcquaSystem('teeEstimadaDistributiva').ks
    : KS_ESTIMADO_TEE_ERAS
}

export type MotivoTramoSinPerdidaLocalizadaEstimada = 'sinDemanda' | 'sinCandidatoAdmisible'

export type ResultadoPerdidaLocalizadaEstimadaDeLocal =
  | {
      readonly tipo: 'estimada'
      readonly hf_m: number
      readonly nTerminalesLocal: number
      readonly nTeesEstimadas: number
      readonly nSingularidadTerminal: number
      readonly nLlaveDePaso: number
      // HYD-OVERPASS-01: cantidad de "Sobrepaso fusión" (Acqua System)
      // asignados a este (Local, red) -- ver contarSobrepasosDeLocalPorRed.
      // Siempre 0 cuando el sistema adoptado no es Acqua System (el
      // producto no existe en ningún otro catálogo de este dominio).
      readonly nSobrepaso: number
      // HYD-ACQUA-K-CATALOG-01: 0 o 1 -- salto de diámetro real detectado
      // entre el Tramo representativo y su Tramo aguas arriba, sólo bajo
      // Acqua System (ver resolverKsDeReduccion.ts). Siempre 0 para
      // cualquier otro sistema o cuando no hay Tramo aguas arriba/DN
      // clasificable.
      readonly nReduccionEstimada: number
      // Ks efectivamente usados en esta resolución (ya resueltos por
      // sistema comercial -- expuestos para que ningún consumidor
      // (informe, UI) tenga que reimplementar la selección de catálogo).
      readonly ksTee: number
      readonly ksSobrepaso: number
      readonly ksReduccionEstimada: number
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

  // Sobrepaso (HYD-OVERPASS-01): se cuenta ANTES del corte por
  // nTerminalesLocal===0 porque, aunque infrecuente, no depende de la
  // misma cardinalidad (contarSobrepasosDeLocalPorRed recorre los
  // Artefactos del Local directamente) -- en la práctica ambos son 0 o
  // ambos son >0 para el mismo (Local, red), pero no se asume esa
  // correspondencia sin verificarla.
  const uf = proyecto.unidadesFuncionales.find((candidata) => candidata.id === unidadFuncionalId)
  const local = uf !== undefined ? localesDeUnidadFuncional(uf).find((candidato) => candidato.id === localId) : undefined
  const nSobrepaso = local !== undefined ? contarSobrepasosDeLocalPorRed(redHidraulica, local, unidadFuncionalId, localId, red) : 0

  if (nTerminalesLocal === 0) {
    return {
      tipo: 'estimada',
      hf_m: 0,
      nTerminalesLocal: 0,
      nTeesEstimadas: 0,
      nSingularidadTerminal: 0,
      nLlaveDePaso: 0,
      nSobrepaso: 0,
      nReduccionEstimada: 0,
      ksTee: resolverKsEstimadoTee(proyecto.configuracionHidraulica.sistemaDeTuberiaId),
      ksSobrepaso: 0,
      ksReduccionEstimada: 0,
      velocidadReferencia_mps: 0,
    }
  }

  const nTeesEstimadas = Math.max(0, nTerminalesLocal - 1)
  const nSingularidadTerminal = 1
  const nLlaveDePaso = 1

  // Tramo REPRESENTATIVO de este Local+red: la MISMA identidad que la fila
  // de Modulo 2 que el usuario ve y dimensiona (DN/V), ver comentario de
  // archivo (FIX-HYD-EST-SIMPLIFIED-01).
  const representativos =
    contexto === undefined
      ? identificarTramosRepresentativosDeLocales(proyecto)
      : obtenerTramosRepresentativosDeLocalesDeContexto(contexto, proyecto)
  const tramoRepresentativo = redHidraulica.tramos.find(
    (tramo) =>
      tramo.red === red &&
      representativos.get(tramo.id)?.unidadFuncionalId === unidadFuncionalId &&
      representativos.get(tramo.id)?.localId === localId,
  )
  if (tramoRepresentativo === undefined) {
    // Precondicion imposible: nTerminalesLocal > 0 ya garantiza que existe
    // al menos un Tramo puro de este Local+red, y el algoritmo de
    // identificarTramosRepresentativosDeLocales siempre asciende hasta el
    // mas cercano a la raiz -- mismo criterio de "inconsistencia interna"
    // que el resto del motor (ver resolverPresionResidualDeCamino).
    throw new Error(
      `resolverPerdidaLocalizadaEstimadaDeLocal: no se encontro Tramo representativo para uf="${unidadFuncionalId}" local="${localId}" red="${red}" con ${nTerminalesLocal} terminal(es) fisico(s)`,
    )
  }

  const tramosNoResueltos: { tramoId: string; motivo: MotivoTramoSinPerdidaLocalizadaEstimada }[] = []
  let velocidadReferencia_mps = 0
  let dnRepresentativo: string | undefined

  const resultadoComercial = resolverDiametroComercialDeTramo(
    proyecto,
    tramoRepresentativo.id,
    catalogoArtefactos,
    catalogoSistemasDeTuberia,
    contexto,
  )

  if (resultadoComercial.tipo === 'sinDemanda' || resultadoComercial.tipo === 'sinCandidatoAdmisible') {
    tramosNoResueltos.push({ tramoId: tramoRepresentativo.id, motivo: resultadoComercial.tipo })
  } else {
    velocidadReferencia_mps = resultadoComercial.velocidadReal_mps
    dnRepresentativo = resultadoComercial.candidato.denominacionComercial
  }

  if (tramosNoResueltos.length > 0) {
    return { tipo: 'incompleta', tramosNoResueltos }
  }

  const esSistemaAcqua = proyecto.configuracionHidraulica.sistemaDeTuberiaId === SISTEMA_DE_TUBERIA_ACQUA_SYSTEM_ID
  const ksTee = resolverKsEstimadoTee(proyecto.configuracionHidraulica.sistemaDeTuberiaId)

  // Sobrepaso (HYD-OVERPASS-01): sólo tiene incidencia hidráulica cuando
  // el sistema comercial adoptado es Acqua System -- es un producto de
  // ese catálogo específico, no una pieza genérica de Tabla N°7. Para
  // cualquier otro sistema, nSobrepaso puede ser >0 (el Artefacto sigue
  // conectado físicamente) pero no aporta Ks: no hay un valor publicado
  // ni adoptado para ningún otro fabricante todavía (nunca se inventa).
  const ksSobrepaso = esSistemaAcqua ? obtenerKsAcquaSystem('sobrepaso').ks : 0

  // Reducción estimada (HYD-ACQUA-K-CATALOG-01): sólo bajo Acqua System.
  // Detecta -- nunca releva -- un salto de diámetro REAL entre el Tramo
  // representativo de este Local+red y el Tramo inmediatamente aguas
  // arriba (su "padre" topológico, mismo criterio CRIT-A30 que el modo
  // detallado). Sin Tramo padre (representativo = primer segmento desde
  // la raíz) o DN no clasificable: no hay evidencia de una reducción real
  // -- se computa como 0, nunca como un pendiente que bloquee el modo
  // estimado (a diferencia del modo detallado, acá nadie declaró
  // explícitamente una reducción; es una detección automática opcional).
  let nReduccionEstimada = 0
  let ksReduccionEstimada = 0
  if (esSistemaAcqua && dnRepresentativo !== undefined) {
    const tramoPadre = redHidraulica.tramos.find((candidato) => candidato.nodoDestinoId === tramoRepresentativo.nodoOrigenId)
    if (tramoPadre !== undefined) {
      const resultadoPadre = resolverDiametroComercialDeTramo(proyecto, tramoPadre.id, catalogoArtefactos, catalogoSistemasDeTuberia, contexto)
      if (resultadoPadre.tipo === 'conCandidato') {
        const resultadoReduccion = resolverKsDeReduccion(
          proyecto.configuracionHidraulica.sistemaDeTuberiaId,
          dnRepresentativo,
          resultadoPadre.candidato.denominacionComercial,
        )
        if (resultadoReduccion.resultado === 'calculado' && resultadoReduccion.ks > 0) {
          nReduccionEstimada = 1
          ksReduccionEstimada = resultadoReduccion.ks
        }
      }
    }
  }

  const ksEquivalenteEstimado =
    nTeesEstimadas * ksTee +
    nSingularidadTerminal * KS_ESTIMADO_SINGULARIDAD_TERMINAL +
    nLlaveDePaso * KS_ESTIMADO_LLAVE_DE_PASO +
    nSobrepaso * ksSobrepaso +
    nReduccionEstimada * ksReduccionEstimada
  const hf_m = calcularPerdidaCargaLocalizada(ksEquivalenteEstimado, velocidadReferencia_mps)

  return {
    tipo: 'estimada',
    hf_m,
    nTerminalesLocal,
    nTeesEstimadas,
    nSingularidadTerminal,
    nLlaveDePaso,
    nSobrepaso,
    nReduccionEstimada,
    ksTee,
    ksSobrepaso,
    ksReduccionEstimada,
    velocidadReferencia_mps,
  }
}
