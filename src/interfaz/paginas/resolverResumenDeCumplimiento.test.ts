import { describe, it, expect } from 'vitest'
import type { CandidatoTerminal } from '../../motor/tuberias/presion/resolverTerminalMasDesfavorable'
import type { ResultadoPresionResidualDeCamino } from '../../motor/tuberias/presion/resolverPresionResidualDeCamino'
import { resolverResumenDeCumplimiento } from './resolverResumenDeCumplimiento'

function traza() {
  return {
    raizId: 'n0',
    terminalId: 'n-terminal',
    desnivel_m: 1,
    hfDistribuida_mca: 0.5,
    hfDistribuidaPorTramo: [],
    hfLocalizada: { metodologia: 'detallado' as const, hf_mca: 0.1, porTramo: [] },
  }
}

function balanceCompleto(
  presionResidual_mca: number,
  presionMinimaRequerida_mca: number,
): Extract<ResultadoPresionResidualDeCamino, { tipo: 'balanceCompleto' }> {
  return {
    tipo: 'balanceCompleto',
    presionResidual_mca,
    presionMinimaRequerida_mca,
    cumpleMinimo: presionResidual_mca >= presionMinimaRequerida_mca,
    ...traza(),
  }
}

function candidato(nodoId: string, resultado: ResultadoPresionResidualDeCamino): CandidatoTerminal {
  return { nodoId, resultado }
}

describe('resolverResumenDeCumplimiento (D-δ.48)', () => {
  it('lista vacía -> 0 verificables, 0 cumplen', () => {
    expect(resolverResumenDeCumplimiento([])).toEqual({ verificables: 0, cumplen: 0 })
  })

  it('todos balanceCompleto y cumplen -> verificables=cumplen', () => {
    const resultado = resolverResumenDeCumplimiento([
      candidato('a', balanceCompleto(15, 10)),
      candidato('b', balanceCompleto(20, 12)),
    ])

    expect(resultado).toEqual({ verificables: 2, cumplen: 2 })
  })

  it('uno no cumple (margen negativo) -> se cuenta como verificable pero no como cumple', () => {
    const resultado = resolverResumenDeCumplimiento([
      candidato('a', balanceCompleto(15, 10)), // cumple
      candidato('b', balanceCompleto(5.4, 6.0)), // no cumple
    ])

    expect(resultado).toEqual({ verificables: 2, cumplen: 1 })
  })

  it('terminalSinPresionMinima NO entra en el denominador (no es que "no cumpla", la pregunta no aplica)', () => {
    const resultado = resolverResumenDeCumplimiento([
      candidato('a', balanceCompleto(15, 10)),
      candidato('sin-pmin', { tipo: 'terminalSinPresionMinima', nodoId: 'sin-pmin', artefactoIdCatalogo: 'x' }),
    ])

    expect(resultado).toEqual({ verificables: 1, cumplen: 1 })
  })

  it('estados incompletos (balanceIncompleto) tampoco entran en el denominador -- todavía no están determinados', () => {
    const resultado = resolverResumenDeCumplimiento([
      candidato('a', balanceCompleto(15, 10)),
      candidato('incompleto', { tipo: 'balanceIncompleto', terminosFaltantes: ['hfMedidor'], ...traza() }),
    ])

    expect(resultado).toEqual({ verificables: 1, cumplen: 1 })
  })
})
