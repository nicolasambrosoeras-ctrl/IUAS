// Completitud real de Modulo 2 (investigacion "completitud real de M2"):
// primitiva de dominio, independiente de UI, que responde si M2 tiene
// informacion suficiente, consistente y calculable para resolver la
// instalacion hidraulica DENTRO DEL ALCANCE ACTUALMENTE IMPLEMENTADO.
// Nunca deriva su respuesta de heuristicas visuales (cantidad de campos
// cargados, si el usuario abrio una seccion, etc.) -- compone
// EXCLUSIVAMENTE primitivas de dominio ya productivas y testeadas:
//   validarRedHidraulica / validarConfiguracionHidraulica  (integridad estructural)
//   auditarCoberturaFisica                                 (S1, D-delta.26)
//   resolverPresionResidualDeCamino                         (por terminal, M2-B)
//   resolverTerminalMasDesfavorable                         (M2-B)
// No reimplementa ninguna formula ni barrera ya expresada por esas
// primitivas -- este archivo solo agrega/clasifica sus resultados.
//
// Pdisponible y hfMedidor_mca llegan como parametros explicitos, igual
// que en resolverPresionResidualDeCamino (D-delta.36/D-delta.35): esta
// primitiva NO decide de donde salen ni quien los produce (bombeo,
// tanque, M3...). Si el llamador todavia no los tiene, eso es
// exactamente informacion faltante -- 'incompleto', nunca 'error' ni un
// bloqueo silencioso de M2. La inexistencia actual de M3 (D-delta.35)
// NO hace imposible llegar a 'completo': si hfMedidor_mca SI esta
// provisto (por quien sea, hoy tipicamente un test o un valor de
// laboratorio), M2 puede cerrar.
//
// hfEquipoACS (D-delta.15) sigue diferido y NO participa de este
// balance -- resolverBalanceDePresion ya lo excluye deliberadamente de
// su firma (ver comentario de ese archivo), asi que esta primitiva
// tampoco lo evalua: completitud se mide contra el alcance YA
// implementado, nunca contra features explicitamente diferidas.
//
// Terminales sin presionMinima_kgcm2 publicada (p.ej. maquinaLavavajillas,
// CRIT-A29 no aplica aca -- ese es un caso distinto): la propia
// resolverPresionResidualDeCamino documenta que "no es un error de uso...
// es un terminal que ESTE balance no puede cerrar" -- una limitacion
// normativa permanente de ese artefacto, no informacion faltante que
// vaya a completarse despues. Por eso NO bloquean 'completo' ni cuentan
// como 'incompleto': se excluyen de los candidatos a
// resolverTerminalMasDesfavorable y se reportan aparte, como
// diagnostico informativo (terminalesFueraDeAlcance) -- exactamente el
// mismo principio ya usado con griferias en CRIT-A29 (fuera de alcance
// normativo, no vacio de cobertura).
import type { Proyecto } from '../../modelo/proyecto'
import type { ReferenciaDeArtefacto } from '../../modelo/redHidraulica'
import type { ArtefactoNormativo } from '../../normativa/eras-2023/catalogo-artefactos'
import type { SistemaDeTuberiaCatalogado } from '../tuberias/sistemaDeTuberia'
import type { MaterialTuberia } from '../tuberias/materialTuberia'
import type { ProblemaValidacion } from '../../validacion/codigos'
import { validarRedHidraulica } from '../../validacion/redHidraulica'
import { validarConfiguracionHidraulica } from '../../validacion/configuracionHidraulica'
import { auditarCoberturaFisica } from '../tuberias/cobertura/auditarCoberturaFisica'
import type { CaminoHaciaOrigenNoResoluble } from '../tuberias/topologia/obtenerCaminoHaciaOrigen'
import {
  resolverPresionResidualDeCamino,
  type ResultadoPresionResidualDeCamino,
} from '../tuberias/presion/resolverPresionResidualDeCamino'
import {
  resolverTerminalMasDesfavorable,
  type CandidatoTerminal,
  type ResultadoTerminalMasDesfavorable,
} from '../tuberias/presion/resolverTerminalMasDesfavorable'

type PerdidaDistribuidaIncompleta = Extract<ResultadoPresionResidualDeCamino, { tipo: 'perdidaDistribuidaIncompleta' }>
type PerdidaLocalizadaIncompleta = Extract<ResultadoPresionResidualDeCamino, { tipo: 'perdidaLocalizadaIncompleta' }>
type PerdidaLocalizadaEstimadaIncompleta = Extract<
  ResultadoPresionResidualDeCamino,
  { tipo: 'perdidaLocalizadaEstimadaIncompleta' }
>
type BalanceIncompleto = Extract<ResultadoPresionResidualDeCamino, { tipo: 'balanceIncompleto' }>
type TerminalDeterminado = Extract<ResultadoTerminalMasDesfavorable, { tipo: 'determinado' }>

// Cada variante trae el nodoId del terminal que la origino -- la futura
// UI puede agrupar/mostrar "faltan longitudes en 3 tramos" sin volver a
// tocar hidraulica, pero el dominio nunca produce el string, solo el dato.
export type DiagnosticoErrorModulo2 =
  | { readonly tipo: 'problemaDeValidacion'; readonly problema: ProblemaValidacion }
  | { readonly tipo: 'topologiaNoResoluble'; readonly nodoId: string; readonly detalle: CaminoHaciaOrigenNoResoluble }

export type DiagnosticoIncompletitudModulo2 =
  | { readonly tipo: 'sinTerminalesHidraulicos' }
  | { readonly tipo: 'coberturaFisicaIncompleta'; readonly artefactosSinReferencia: readonly ReferenciaDeArtefacto[] }
  | { readonly tipo: 'presionDisponibleNoProvista' }
  | { readonly tipo: 'desnivelIncompleto'; readonly nodoId: string; readonly nodosSinCota: readonly string[] }
  // Granularidad 'simplificada' (D-delta.46): la UF de este terminal no
  // tiene cotaHidraulicaReferencia_m cargada. Deduplicado por
  // unidadFuncionalId ANTES de llegar acá -- nunca un motivo por cada
  // terminal de la misma UF (ver el loop mas abajo).
  | { readonly tipo: 'unidadFuncionalSinCotaDeReferencia'; readonly unidadFuncionalId: string }
  | ({ readonly tipo: 'perdidaDistribuidaIncompleta'; readonly nodoId: string } & Pick<
      PerdidaDistribuidaIncompleta,
      'tramosNoResueltos'
    >)
  | ({ readonly tipo: 'perdidaLocalizadaIncompleta'; readonly nodoId: string } & Pick<
      PerdidaLocalizadaIncompleta,
      'tramosNoResueltos'
    >)
  | ({ readonly tipo: 'perdidaLocalizadaEstimadaIncompleta'; readonly nodoId: string } & Pick<
      PerdidaLocalizadaEstimadaIncompleta,
      'tramosNoResueltos'
    >)
  | ({ readonly tipo: 'balanceIncompleto'; readonly nodoId: string } & Pick<BalanceIncompleto, 'terminosFaltantes'>)
  // Todos los terminales existentes quedaron fuera de alcance (sin
  // presionMinima_kgcm2 publicada): no hay ningun candidato con el que
  // determinar un terminal critico -- nunca se declara 'completo' sin un
  // terminalMasDesfavorable real.
  | { readonly tipo: 'sinTerminalesConPresionMinimaPublicada' }

export type DiagnosticoTerminalFueraDeAlcanceModulo2 = {
  readonly tipo: 'sinPresionMinimaPublicada'
  readonly nodoId: string
  readonly artefactoIdCatalogo: string
}

export type EstadoModulo2 =
  | { readonly estado: 'noIniciado' }
  | { readonly estado: 'incompleto'; readonly motivos: readonly DiagnosticoIncompletitudModulo2[] }
  | { readonly estado: 'error'; readonly problemas: readonly DiagnosticoErrorModulo2[] }
  | {
      readonly estado: 'completo'
      readonly terminalMasDesfavorable: TerminalDeterminado
      readonly terminalesFueraDeAlcance: readonly DiagnosticoTerminalFueraDeAlcanceModulo2[]
    }

export function resolverEstadoModulo2(
  proyecto: Proyecto,
  // undefined = el llamador todavia no puede proveerlo (D-delta.36/D-delta.35
  // respectivamente) -- nunca se interpreta como 0 ni se fabrica un valor.
  presionDisponible_mca: number | undefined,
  // Escalar (mismo hfMedidor para todos los terminales, uso historico /
  // tests) o funcion por terminal (M3-E, D-delta.58: la perdida de
  // medidores aplicable depende del camino de cada terminal -- origen
  // hidraulico, UF, red, tipo de ACS). En ambos casos `undefined` para un
  // terminal deja su balance 'incompleto', nunca fabrica 0.
  hfMedidor_mca: number | undefined | ((nodoTerminalId: string) => number | undefined),
  catalogoArtefactos: readonly ArtefactoNormativo[],
  catalogoSistemasDeTuberia: readonly SistemaDeTuberiaCatalogado[],
  catalogoMateriales: readonly MaterialTuberia[],
): EstadoModulo2 {
  const { redHidraulica } = proyecto

  // 'noIniciado' es un gate previo a todo lo demas, no un peldano mas de
  // error>incompleto>completo: redHidraulica ausente es la unica senal
  // autoritativa de "M2 todavia no fue iniciado" (el propio modelo lo
  // documenta asi, ver modelo/redHidraulica). Una red presente aunque
  // vacia YA es "iniciada" -- cae en las etapas siguientes, nunca aca.
  if (redHidraulica === undefined) {
    return { estado: 'noIniciado' }
  }

  // Integridad estructural PRIMERO, sin excepcion: el resto del pipeline
  // (obtenerCaminoHaciaOrigen, resolverArtefactosReferenciados...) asume
  // como precondicion que validarRedHidraulica ya paso -- llamarlo sobre
  // una red con ids duplicados o referencias rotas puede lanzar
  // (throw), asi que esta etapa corta ANTES de intentar el pipeline por
  // terminal, nunca despues.
  const problemasEstructurales = [
    ...validarRedHidraulica(proyecto),
    ...validarConfiguracionHidraulica(proyecto, catalogoSistemasDeTuberia),
  ].filter((problema) => problema.severidad === 'error')
  if (problemasEstructurales.length > 0) {
    return {
      estado: 'error',
      problemas: problemasEstructurales.map((problema) => ({ tipo: 'problemaDeValidacion' as const, problema })),
    }
  }

  const nodosTerminales = redHidraulica.nodos.filter((nodo) => nodo.referencia?.tipo === 'artefacto')
  if (nodosTerminales.length === 0) {
    return { estado: 'incompleto', motivos: [{ tipo: 'sinTerminalesHidraulicos' }] }
  }

  const motivos: DiagnosticoIncompletitudModulo2[] = []

  const cobertura = auditarCoberturaFisica(proyecto)
  if (!cobertura.completa) {
    motivos.push({ tipo: 'coberturaFisicaIncompleta', artefactosSinReferencia: cobertura.artefactosSinReferencia })
  }

  if (presionDisponible_mca === undefined) {
    // Sin Pdisponible ningun balance es evaluable todavia (es un
    // parametro obligatorio de resolverPresionResidualDeCamino, D-delta.36):
    // se reporta como el motivo que es y se corta aca, sin reimplementar
    // a mano el resto del pipeline (camino/desnivel/perdidas) que esa
    // funcion ya compone -- mismo criterio de "componer, no duplicar".
    motivos.push({ tipo: 'presionDisponibleNoProvista' })
    return { estado: 'incompleto', motivos }
  }

  const errores: DiagnosticoErrorModulo2[] = []
  const candidatos: CandidatoTerminal[] = []
  const terminalesFueraDeAlcance: DiagnosticoTerminalFueraDeAlcanceModulo2[] = []
  // D-delta.46: varios terminales de la MISMA UF reportan
  // independientemente 'unidadFuncionalSinCotaDeReferencia' -- se
  // deduplica por id acá y se agrega UN motivo por UF despues del loop,
  // nunca uno por terminal (ver comentario del tipo mas arriba).
  const unidadesFuncionalesSinCotaIds = new Set<string>()

  for (const nodo of nodosTerminales) {
    const hfMedidorDelTerminal =
      typeof hfMedidor_mca === 'function' ? hfMedidor_mca(nodo.id) : hfMedidor_mca
    const resultado = resolverPresionResidualDeCamino(
      proyecto,
      nodo.id,
      presionDisponible_mca,
      hfMedidorDelTerminal,
      catalogoArtefactos,
      catalogoSistemasDeTuberia,
      catalogoMateriales,
    )

    switch (resultado.tipo) {
      case 'topologiaNoResoluble':
        errores.push({ tipo: 'topologiaNoResoluble', nodoId: nodo.id, detalle: resultado.detalle })
        break
      case 'terminalSinArtefacto':
        // Precondicion imposible: nodosTerminales ya filtro por
        // referencia.tipo==='artefacto', asi que este nodo especifico
        // nunca puede resolver a "sin artefacto" -- mismo criterio de
        // throw que el resto del motor ante estados estructuralmente
        // imposibles dado el llamador.
        throw new Error(
          `resolverEstadoModulo2: nodo "${nodo.id}" con referencia de artefacto resolvio 'terminalSinArtefacto' -- inconsistencia interna`,
        )
      case 'terminalSinPresionMinima':
        terminalesFueraDeAlcance.push({
          tipo: 'sinPresionMinimaPublicada',
          nodoId: resultado.nodoId,
          artefactoIdCatalogo: resultado.artefactoIdCatalogo,
        })
        break
      case 'desnivelIncompleto':
        motivos.push({ tipo: 'desnivelIncompleto', nodoId: nodo.id, nodosSinCota: resultado.nodosSinCota })
        break
      case 'unidadFuncionalSinCotaDeReferencia':
        unidadesFuncionalesSinCotaIds.add(resultado.unidadFuncionalId)
        break
      case 'perdidaDistribuidaIncompleta':
        motivos.push({ tipo: 'perdidaDistribuidaIncompleta', nodoId: nodo.id, tramosNoResueltos: resultado.tramosNoResueltos })
        break
      case 'perdidaLocalizadaIncompleta':
        motivos.push({ tipo: 'perdidaLocalizadaIncompleta', nodoId: nodo.id, tramosNoResueltos: resultado.tramosNoResueltos })
        break
      case 'perdidaLocalizadaEstimadaIncompleta':
        motivos.push({
          tipo: 'perdidaLocalizadaEstimadaIncompleta',
          nodoId: nodo.id,
          tramosNoResueltos: resultado.tramosNoResueltos,
        })
        break
      case 'balanceIncompleto':
        motivos.push({ tipo: 'balanceIncompleto', nodoId: nodo.id, terminosFaltantes: resultado.terminosFaltantes })
        break
      case 'balanceCompleto':
        candidatos.push({ nodoId: nodo.id, resultado })
        break
    }
  }

  for (const unidadFuncionalId of unidadesFuncionalesSinCotaIds) {
    motivos.push({ tipo: 'unidadFuncionalSinCotaDeReferencia', unidadFuncionalId })
  }

  if (errores.length > 0) {
    return { estado: 'error', problemas: errores }
  }
  if (motivos.length > 0) {
    return { estado: 'incompleto', motivos }
  }
  if (candidatos.length === 0) {
    // Todo terminal existente quedo excluido por falta de
    // presionMinima_kgcm2 publicada -- no hay ningun candidato real con
    // el que determinar un terminal critico. Nunca se declara 'completo'
    // sin un terminalMasDesfavorable real (ver comentario de archivo).
    return { estado: 'incompleto', motivos: [{ tipo: 'sinTerminalesConPresionMinimaPublicada' }] }
  }

  const terminalMasDesfavorable = resolverTerminalMasDesfavorable(candidatos)
  if (terminalMasDesfavorable.tipo !== 'determinado') {
    // Precondicion imposible: candidatos contiene EXCLUSIVAMENTE
    // resultados 'balanceCompleto' (ver el switch de arriba), asi que
    // resolverTerminalMasDesfavorable no puede excluir a ninguno --
    // 'candidatoProvisional'/'sinCandidatoDeterminable' aca serian una
    // inconsistencia interna, no un estado de dominio legitimo.
    throw new Error(
      `resolverEstadoModulo2: resolverTerminalMasDesfavorable devolvio '${terminalMasDesfavorable.tipo}' con candidatos exclusivamente 'balanceCompleto' -- inconsistencia interna`,
    )
  }

  return { estado: 'completo', terminalMasDesfavorable, terminalesFueraDeAlcance }
}
