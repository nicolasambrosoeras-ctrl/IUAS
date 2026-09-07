import { describe, it, expect } from 'vitest'
import type { CandidatoTerminal } from '../../motor/tuberias/presion/resolverTerminalMasDesfavorable'
import type { ResultadoPresionResidualDeCamino } from '../../motor/tuberias/presion/resolverPresionResidualDeCamino'
import { ordenarCandidatosParaListado } from './ordenarCandidatosParaListado'

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

describe('ordenarCandidatosParaListado (D-δ.48)', () => {
  it('ordena los balanceCompleto por margen ascendente -- el más desfavorable primero', () => {
    const resultado = ordenarCandidatosParaListado([
      candidato('holgado', balanceCompleto(15, 10)), // margen=5
      candidato('critico', balanceCompleto(7, 6)), // margen=1
      candidato('medio', balanceCompleto(20, 12)), // margen=8
    ])

    expect(resultado.map((c) => c.nodoId)).toEqual(['critico', 'holgado', 'medio'])
  })

  it('los terminalSinPresionMinima siempre quedan al final, sin importar su posición original', () => {
    const resultado = ordenarCandidatosParaListado([
      candidato('sin-pmin', { tipo: 'terminalSinPresionMinima', nodoId: 'sin-pmin', artefactoIdCatalogo: 'x' }),
      candidato('critico', balanceCompleto(7, 6)), // margen=1
      candidato('holgado', balanceCompleto(15, 10)), // margen=5
    ])

    expect(resultado.map((c) => c.nodoId)).toEqual(['critico', 'holgado', 'sin-pmin'])
  })

  it('los estados incompletos (ni balanceCompleto ni sinPresionMinima) quedan entre los completos y los sin Pmin', () => {
    const resultado = ordenarCandidatosParaListado([
      candidato('sin-pmin', { tipo: 'terminalSinPresionMinima', nodoId: 'sin-pmin', artefactoIdCatalogo: 'x' }),
      candidato('incompleto', { tipo: 'balanceIncompleto', terminosFaltantes: ['hfMedidor'], ...traza() }),
      candidato('completo', balanceCompleto(15, 10)),
    ])

    expect(resultado.map((c) => c.nodoId)).toEqual(['completo', 'incompleto', 'sin-pmin'])
  })

  it('el primero de la lista ordenada coincide con el criterio de resolverTerminalMasDesfavorable (menor margen, no menor Presidual)', () => {
    // Mismo contraejemplo que resolverTerminalMasDesfavorable.test.ts: A
    // tiene menor Presidual absoluta pero mayor margen que B.
    const resultado = ordenarCandidatosParaListado([
      candidato('terminal-a', balanceCompleto(5.5, 2.0)), // margen=3.5
      candidato('terminal-b', balanceCompleto(7.0, 6.0)), // margen=1.0
    ])

    expect(resultado[0]!.nodoId).toBe('terminal-b')
  })

  it('no muta el array recibido', () => {
    const original = [candidato('a', balanceCompleto(15, 10)), candidato('b', balanceCompleto(7, 6))]
    const copia = [...original]

    ordenarCandidatosParaListado(original)

    expect(original).toEqual(copia)
  })
})
