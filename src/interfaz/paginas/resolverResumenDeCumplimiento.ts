// Resumen agregado de cumplimiento del Panel de Presión (D-δ.48, sección
// 23): cuántos terminales "verificables" cumplen su Pmin. El denominador
// son exclusivamente los terminales que llegaron a `balanceCompleto` --
// los que todavía no completaron su balance (`balanceIncompleto` y
// cualquier otro estado de corte) no cuentan ni como cumplen ni como no
// cumplen, porque su verificación todavía no está determinada; los
// `terminalSinPresionMinima` (D-δ.41) tampoco entran: no tienen Pmin
// normativa contra la cual verificar -- no es que "no cumplan", es que
// la pregunta no aplica.
import type { CandidatoTerminal } from '../../motor/tuberias/presion/resolverTerminalMasDesfavorable'

export type ResumenDeCumplimiento = {
  readonly verificables: number
  readonly cumplen: number
}

export function resolverResumenDeCumplimiento(candidatos: readonly CandidatoTerminal[]): ResumenDeCumplimiento {
  let verificables = 0
  let cumplen = 0
  for (const candidato of candidatos) {
    if (candidato.resultado.tipo === 'balanceCompleto') {
      verificables += 1
      if (candidato.resultado.cumpleMinimo) {
        cumplen += 1
      }
    }
  }
  return { verificables, cumplen }
}
