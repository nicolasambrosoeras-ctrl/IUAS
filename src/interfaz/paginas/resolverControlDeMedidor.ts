// D-δ.57: view-model del control ↓ / DN / ↑ / Auto de un medidor. NO
// calcula hidráulica -- lee el MedidorEvaluado que resolverEstadoModulo3 ya
// resolvió (recomendado + adoptado, con el adoptado hidráulicamente
// efectivo) y el orden REAL de Tabla N°6 para saber qué DN es el inmediato
// superior/inferior. Los botones mueven por Tabla N°6, nunca "DN + n".
import type { MedidorEvaluado } from '../../motor/medidores/resolverMedidorAdoptado'
import { tabla06Medidores } from '../../normativa/eras-2023/tabla-06-medidores'

const DN_ORDENADOS: readonly number[] = tabla06Medidores.map((fila) => fila.dnMedidor_mm)

export type ControlDeMedidor = {
  readonly origen: 'automatico' | 'manual'
  readonly criterioSeleccion: MedidorEvaluado['adoptado']['criterioSeleccion']
  readonly dnAdoptado_mm: number
  readonly dnRecomendado_mm: number
  // DN inmediato superior / inferior en Tabla N°6. null = ya está en el
  // extremo -> botón deshabilitado.
  readonly dnSiguiente_mm: number | null
  readonly dnAnterior_mm: number | null
}

export function resolverControlDeMedidor(medidor: MedidorEvaluado): ControlDeMedidor {
  const indice = DN_ORDENADOS.indexOf(medidor.adoptado.dnMedidor_mm)
  return {
    origen: medidor.adoptado.origen,
    criterioSeleccion: medidor.adoptado.criterioSeleccion,
    dnAdoptado_mm: medidor.adoptado.dnMedidor_mm,
    dnRecomendado_mm: medidor.recomendado.dnMedidor_mm,
    dnSiguiente_mm: indice >= 0 && indice < DN_ORDENADOS.length - 1 ? DN_ORDENADOS[indice + 1]! : null,
    dnAnterior_mm: indice > 0 ? DN_ORDENADOS[indice - 1]! : null,
  }
}
