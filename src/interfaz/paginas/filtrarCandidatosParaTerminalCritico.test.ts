import { describe, it, expect } from 'vitest'
import type { CandidatoTerminal } from '../../motor/tuberias/presion/resolverTerminalMasDesfavorable'
import type { ResultadoPresionResidualDeCamino } from '../../motor/tuberias/presion/resolverPresionResidualDeCamino'
import { filtrarCandidatosParaTerminalCritico } from './filtrarCandidatosParaTerminalCritico'

// D-δ.47 (bug corregido): resolverTerminalMasDesfavorable recibía TODOS
// los candidatos sin excluir 'terminalSinPresionMinima' -- una
// limitación normativa PERMANENTE (D-δ.41), nunca "dato pendiente" como
// 'balanceIncompleto'. Eso contaminaba el terminal crítico con un falso
// "candidatoProvisional" cuando el único terminal excluido era, p.ej.,
// una máquina lavavajillas sin Pmin publicada -- EstadoModulo2 ya decía
// 'completo' (D-δ.41 excluye este caso de sus propios candidatos) pero
// el panel seguía mostrando "resultado provisional: 1 terminal(es)
// todavía sin balanceCompleto", sugiriendo falsamente que faltaba
// información. Reproducido manualmente contra la web real (proyecto
// demo, profesional+detallado, Máquina lavavajillas sin Pmin) y
// corregido filtrando ANTES de resolverTerminalMasDesfavorable.
describe('filtrarCandidatosParaTerminalCritico (D-δ.47)', () => {
  const balanceCompleto: ResultadoPresionResidualDeCamino = {
    tipo: 'balanceCompleto',
    presionResidual_mca: 10,
    presionMinimaRequerida_mca: 6,
    cumpleMinimo: true,
    raizId: 'raiz',
    terminalId: 't1',
    desnivel_m: 1,
    hfDistribuida_mca: 0.1,
    hfDistribuidaPorTramo: [],
    hfLocalizada: { metodologia: 'detallado', hf_mca: 0, porTramo: [] },
  }
  const sinPresionMinima: ResultadoPresionResidualDeCamino = { tipo: 'terminalSinPresionMinima', nodoId: 't2', artefactoIdCatalogo: 'maquinaLavavajillas' }
  const balanceIncompleto: ResultadoPresionResidualDeCamino = { tipo: 'terminalSinArtefacto', nodoId: 't3' }

  it('excluye terminalSinPresionMinima del ranking', () => {
    const candidatos: CandidatoTerminal[] = [
      { nodoId: 't1', resultado: balanceCompleto },
      { nodoId: 't2', resultado: sinPresionMinima },
    ]

    expect(filtrarCandidatosParaTerminalCritico(candidatos)).toEqual([{ nodoId: 't1', resultado: balanceCompleto }])
  })

  it('conserva otros tipos no-balanceCompleto (siguen siendo "pendientes", no fuera de alcance)', () => {
    const candidatos: CandidatoTerminal[] = [
      { nodoId: 't1', resultado: balanceCompleto },
      { nodoId: 't3', resultado: balanceIncompleto },
    ]

    expect(filtrarCandidatosParaTerminalCritico(candidatos)).toEqual(candidatos)
  })

  it('lista vacía -> lista vacía', () => {
    expect(filtrarCandidatosParaTerminalCritico([])).toEqual([])
  })
})
