// Determina, entre un conjunto de terminales ya resueltos por
// resolverPresionResidualDeCamino, cuál es el hidráulicamente más
// desfavorable (M2-B, investigación de presión). Composición pura --
// no recalcula Δz, hf ni Pmin: recibe los ResultadoPresionResidualDeCamino
// ya producidos por el llamador (uno por terminal candidato, todos
// resueltos con la misma Pdisponible_mca -- responsabilidad del
// llamador, esta función no la verifica porque no conoce Pdisponible).
//
// Magnitud de comparación: margen = presionResidual_mca -
// presionMinimaRequerida_mca. Es la magnitud correcta -- no "mayor cota"
// ni "más lejano" -- porque un terminal cercano y bajo puede ser más
// desfavorable que uno lejano y alto si su Pmin exigida es mayor o su
// camino acumula más pérdida localizada. Equivale exactamente al
// balance ya resuelto por resolverBalanceDePresion
// (presionResidual_mca = Pdisponible - Δz - hfDistribuida - hfLocalizada
// - hfMedidor), sin introducir ninguna fórmula nueva: margen<0 es
// exactamente el mismo cumpleMinimo=false que ya expone ese motor.
//
// Barrera de completitud (mismo principio que el resto de M2-B/M2-C):
// solo los terminales cuyo ResultadoPresionResidualDeCamino es
// 'balanceCompleto' entran al ranking -- 'balanceIncompleto' y
// cualquier otro estado de corte (topologiaNoResoluble,
// terminalSinArtefacto, etc.) se EXCLUYEN explícitamente, nunca se
// tratan como si cumplieran ni se ignoran en silencio (quedan listados
// en terminalesExcluidos). Mientras D-delta.33 (tees) y D-delta.35
// (medidor) sigan abiertas, 'balanceCompleto' es estructuralmente
// inalcanzable en todo el proyecto (hfLocalizada siempre 'parcial',
// hfMedidor siempre undefined -- ver resolverPresionResidualDeCamino) --
// por eso, hoy, esta función SIEMPRE devuelve 'sinCandidatoDeterminable'
// sobre datos reales: es el comportamiento correcto y esperable, no un
// bug, mientras esas barreras sigan vigentes.
//
// Tres resultados, nunca colapsados en uno solo (mismo criterio de "no
// completar por conveniencia" ya aplicado en D-delta.33):
//   'determinado'            -- TODOS los candidatos resolvieron
//                                'balanceCompleto': el peor de ellos ES
//                                el terminal más desfavorable real.
//   'candidatoProvisional'   -- Al menos uno resolvió 'balanceCompleto'
//                                pero otros quedaron excluidos: el peor
//                                de los completos es solo un candidato
//                                provisional -- un excluido podría ser
//                                peor todavía. Nunca se presenta como
//                                definitivo.
//   'sinCandidatoDeterminable' -- Ningún candidato resolvió
//                                'balanceCompleto'.
import type { ResultadoPresionResidualDeCamino } from './resolverPresionResidualDeCamino'

export type CandidatoTerminal = {
  readonly nodoId: string
  readonly resultado: ResultadoPresionResidualDeCamino
}

type BalanceCompletoDeCamino = Extract<ResultadoPresionResidualDeCamino, { readonly tipo: 'balanceCompleto' }>

type DatosDeTerminal = {
  readonly nodoId: string
  readonly presionResidual_mca: number
  readonly presionMinimaRequerida_mca: number
  readonly cumpleMinimo: boolean
  readonly margen_mca: number
}

export type ResultadoTerminalMasDesfavorable =
  | ({ readonly tipo: 'determinado' } & DatosDeTerminal)
  | ({ readonly tipo: 'candidatoProvisional'; readonly terminalesExcluidos: readonly string[] } & DatosDeTerminal)
  | { readonly tipo: 'sinCandidatoDeterminable'; readonly terminalesExcluidos: readonly string[] }

function datosDeTerminal(nodoId: string, resultado: BalanceCompletoDeCamino): DatosDeTerminal {
  return {
    nodoId,
    presionResidual_mca: resultado.presionResidual_mca,
    presionMinimaRequerida_mca: resultado.presionMinimaRequerida_mca,
    cumpleMinimo: resultado.cumpleMinimo,
    margen_mca: resultado.presionResidual_mca - resultado.presionMinimaRequerida_mca,
  }
}

export function resolverTerminalMasDesfavorable(
  candidatos: readonly CandidatoTerminal[],
): ResultadoTerminalMasDesfavorable {
  const completos: { nodoId: string; resultado: BalanceCompletoDeCamino }[] = []
  const terminalesExcluidos: string[] = []

  for (const candidato of candidatos) {
    if (candidato.resultado.tipo === 'balanceCompleto') {
      completos.push({ nodoId: candidato.nodoId, resultado: candidato.resultado })
    } else {
      terminalesExcluidos.push(candidato.nodoId)
    }
  }

  if (completos.length === 0) {
    return { tipo: 'sinCandidatoDeterminable', terminalesExcluidos }
  }

  // El más desfavorable es el de MENOR margen (presionResidual_mca -
  // presionMinimaRequerida_mca): el que está más cerca de -- o más por
  // debajo de -- su presión mínima exigida.
  let peor = datosDeTerminal(completos[0]!.nodoId, completos[0]!.resultado)
  for (const candidato of completos.slice(1)) {
    const datos = datosDeTerminal(candidato.nodoId, candidato.resultado)
    if (datos.margen_mca < peor.margen_mca) {
      peor = datos
    }
  }

  if (terminalesExcluidos.length === 0) {
    return { tipo: 'determinado', ...peor }
  }
  return { tipo: 'candidatoProvisional', terminalesExcluidos, ...peor }
}
