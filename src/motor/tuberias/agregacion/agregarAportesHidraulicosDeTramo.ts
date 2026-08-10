// Agregacion matematica pura de AporteHidraulicoDeTramo: mismo patron que
// agregarAportesDeDemanda, pero leyendo aporte.qu_lps (ya resuelto por
// condicion hidraulica) en vez de aporte.quTotal_lps -- ese campo no existe
// en AporteHidraulicoDeTramo. La duplicacion aritmetica frente a
// agregarAportesDeDemanda es deliberada: ambas funciones comparten forma
// pero no fuente de datos, y no amerita un accessor generico compartido.
// aporte.condicion no participa: distintos aportes del mismo Tramo pueden
// traer condicion distinta entre si (p.ej. un artefacto exclusivamente
// frio junto a uno mixto en tronco comun) y qu_lps ya viene resuelto para
// cada uno. Operacion total: [] es una entrada valida y produce
// {n:0, qmax_lps:0}, sin excepcion (mismo criterio que agregarAportesDeDemanda).
import type { AporteHidraulicoDeTramo } from '../aporte/resolverAportesHidraulicosDeTramo'
import type { AgregacionDeDemanda } from './agregarAportesDeDemanda'

export function agregarAportesHidraulicosDeTramo(
  aportes: readonly AporteHidraulicoDeTramo[],
): AgregacionDeDemanda {
  return aportes.reduce<AgregacionDeDemanda>(
    (total, aporte) => ({
      n: total.n + aporte.cantidad,
      qmax_lps: total.qmax_lps + aporte.cantidad * aporte.qu_lps,
    }),
    { n: 0, qmax_lps: 0 },
  )
}
