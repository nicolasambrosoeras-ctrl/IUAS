// Orden de presentación del listado de terminales en el Panel de Presión
// (D-δ.48): los que llegaron a `balanceCompleto` primero, ordenados por
// margen ascendente (el más desfavorable arriba, coincidiendo con
// `terminalMasDesfavorable`); luego el resto de los estados incompletos,
// en su orden original; los `terminalSinPresionMinima` (D-δ.41,
// limitación normativa permanente, nunca compiten por terminal crítico)
// siempre al final. Sort estable: nunca reordena dentro de un mismo
// grupo salvo por margen. Puramente de presentación -- no decide nada
// hidráulico ni reimplementa el criterio de resolverTerminalMasDesfavorable,
// solo reutiliza la misma magnitud (margen = Presidual - PminRequerida)
// para ordenar la lista completa en vez de solo encontrar el peor.
import type { CandidatoTerminal } from '../../motor/tuberias/presion/resolverTerminalMasDesfavorable'
import type { ResultadoPresionResidualDeCamino } from '../../motor/tuberias/presion/resolverPresionResidualDeCamino'

function rangoDeOrden(resultado: ResultadoPresionResidualDeCamino): number {
  if (resultado.tipo === 'balanceCompleto') {
    return 0
  }
  if (resultado.tipo === 'terminalSinPresionMinima') {
    return 2
  }
  return 1
}

function margenParaOrden(resultado: ResultadoPresionResidualDeCamino): number {
  return resultado.tipo === 'balanceCompleto' ? resultado.presionResidual_mca - resultado.presionMinimaRequerida_mca : 0
}

export function ordenarCandidatosParaListado(
  candidatos: readonly CandidatoTerminal[],
): readonly CandidatoTerminal[] {
  return [...candidatos].sort((a, b) => {
    const rangoA = rangoDeOrden(a.resultado)
    const rangoB = rangoDeOrden(b.resultado)
    if (rangoA !== rangoB) {
      return rangoA - rangoB
    }
    return margenParaOrden(a.resultado) - margenParaOrden(b.resultado)
  })
}
