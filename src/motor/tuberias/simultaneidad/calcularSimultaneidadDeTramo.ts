// Aritmetica final de simultaneidad por Tramo: n/qmax_lps ya agregados +
// aEfectivo ya determinado -> Kc/K/Qc. No determina aEfectivo (ver
// determinarAEfectivo.ts, responsabilidad separada y no invocada desde
// aca) ni conoce Proyecto, tipologia, catalogo, topologia ni CRIT-A8:
// trabaja unicamente sobre datos numericos ya resueltos.
import { calcularCoeficienteDeSimultaneidad } from '../../demanda/simultaneidad/calcularCoeficienteDeSimultaneidad'
import type { ValorCalculado, ValorConUnidad } from '../../../modelo/resultado'
import type { AgregacionDeDemanda } from '../agregacion/agregarAportesDeDemanda'

export interface ResultadoSimultaneidadDeTramo {
  readonly aEfectivo: 1 | 2 | 3 | 4
  readonly kc: ValorCalculado
  readonly k: ValorCalculado
  readonly qc_lps: number
}

export function calcularSimultaneidadDeTramo(
  agregacion: AgregacionDeDemanda,
  aEfectivo: 1 | 2 | 3 | 4,
): ResultadoSimultaneidadDeTramo {
  const { n, qmax_lps } = agregacion

  // n=0 y n no entero/negativo: precondicion imposible tras agregacion,
  // exigida por calcularCoeficienteDeSimultaneidad (misma fuente de verdad
  // que Modulo 1); no se duplica el chequeo aca.
  const { resultado: kc } = calcularCoeficienteDeSimultaneidad(n)

  if ('estado' in kc) {
    // CRIT-A4 (n=1): Qc = Qmax, sin aplicar K ni a. K hereda el mismo
    // estado indeterminado de Kc (D25), igual que Modulo 1 -- ningun
    // atajo con kc=1/k=1.
    return { aEfectivo, kc, k: kc, qc_lps: qmax_lps }
  }

  // n>=2 en este punto (unico otro estado posible de kc). CRIT-A2: K no
  // se limita si resulta mayor a 1; ese diagnostico pertenece a una capa
  // de resultado/advertencias todavia no implementada para tuberias.
  const k: ValorConUnidad = { valor: kc.valor * aEfectivo, unidad: 'adimensional' }

  return { aEfectivo, kc, k, qc_lps: qmax_lps * k.valor }
}
