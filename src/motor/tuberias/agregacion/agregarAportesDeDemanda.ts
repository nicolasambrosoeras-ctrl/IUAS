// Agregacion matematica pura de aportes de demanda: no consulta catalogo,
// Proyecto, Local, Artefacto ni criterios normativos -- eso ya quedo
// resuelto en las etapas anteriores del pipeline (participacion, aporte).
// Operacion total: [] es una entrada valida y produce {n:0, qmax_lps:0},
// sin excepcion. Que n=0 sea o no admisible es responsabilidad de la
// futura etapa que aplique Kc (mismo patron que calcularCoeficienteDeSimultaneidad,
// que vive separada de esta suma).
import type { AporteDeDemanda } from '../aporte/resolverAportesDeDemanda'

export interface AgregacionDeDemanda {
  readonly n: number
  readonly qmax_lps: number
}

export function agregarAportesDeDemanda(
  aportes: readonly AporteDeDemanda[],
): AgregacionDeDemanda {
  return aportes.reduce<AgregacionDeDemanda>(
    (total, aporte) => ({
      n: total.n + aporte.cantidad,
      qmax_lps: total.qmax_lps + aporte.cantidad * aporte.quTotal_lps,
    }),
    { n: 0, qmax_lps: 0 },
  )
}
