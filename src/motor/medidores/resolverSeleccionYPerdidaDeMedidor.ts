// Núcleo común de M3-B1/M3-B2a: dado un caudal de diseño en l/s, selecciona
// la fila de Tabla N°6 (ERAS-2023 §2.12 / ISO 4064, CRIT-A32) y calcula la
// pérdida de carga con la primitiva firme `calcularPerdidaCargaMedidor`
// (fórmula (6), CRIT-A25). No sabe de qué ámbito viene el caudal (general
// = Qc global; individual = Qunit con simultaneidad total, K=1) ni de
// topología: recibe un número y devuelve el resultado tabular.
//
// Extraído cuando apareció el segundo consumidor real (el medidor
// individual) — antes vivía inline en `seleccionarMedidorGeneral`. Las
// reglas que concentra, en un solo lugar:
//   - conversión l/s -> m³/h (× 3,6) para la tabla y -> l/min (× 60) para
//     la fórmula (6);
//   - `C` sale de la MISMA fila seleccionada (nunca el par DN19↔C=7 del
//     ejemplo oficial, errata — CRIT-A32);
//   - `Qc` de diseño por encima del dominio de Tabla N°6 (> 40 m³/h) ->
//     'fueraDeTabla06', NUNCA extrapolación;
//   - sin verificación metrológica: ERAS no publica Q1..Q4/Qmin.
import {
  seleccionarFilaTabla06PorCaudal,
  qcMaximoCubiertoPorTabla06_m3h,
} from '../../normativa/eras-2023/tabla-06-medidores'
import { calcularPerdidaCargaMedidor } from '../tuberias/perdidaCarga/calcularPerdidaCargaMedidor'

// 1 l/s = 3,6 m³/h ; 1 l/s = 60 l/min. La Guía tabula el umbral de
// selección en m³/h y expresa `Qcl` de la fórmula (6) en l/min.
export const M3H_POR_LPS = 3.6 as const
export const LPM_POR_LPS = 60 as const

export type NucleoSeleccionDeMedidor =
  | {
      readonly tipo: 'seleccionado'
      readonly qcDiseno_lps: number
      readonly qcDiseno_m3h: number
      // Caudal máximo probable en l/min usado como `Qcl` de la fórmula (6).
      readonly qcl_lpm: number
      readonly dnMedidor_mm: number
      // `C` de la fila seleccionada — divisor de la fórmula (6).
      readonly capacidadMaxima_m3h: number
      // "Caudal medio para determinar el medidor" de la fila — informativo.
      readonly caudalMedio_m3h: number
      // Umbral "Qc del proyecto" tabulado de la fila — para la memoria de
      // cálculo (deja ver contra qué valor se comparó).
      readonly qcProyectoTabla_m3h: number
      // Pérdida de carga del medidor, m.c.a. (CRIT-A25).
      readonly hfMedidor_mca: number
    }
  | {
      readonly tipo: 'fueraDeTabla06'
      readonly qcDiseno_lps: number
      readonly qcDiseno_m3h: number
      readonly qcMaximoCubierto_m3h: number
    }

export function resolverSeleccionYPerdidaDeMedidor(qcDiseno_lps: number): NucleoSeleccionDeMedidor {
  if (!Number.isFinite(qcDiseno_lps) || qcDiseno_lps <= 0) {
    // Precondición imposible tras el motor de demanda / la agregación K=1
    // (siempre > 0 cuando hay algún consumo) — mismo criterio "precondición
    // imposible" del resto del motor: throw explícito, nunca un resultado
    // fabricado.
    throw new Error(
      `resolverSeleccionYPerdidaDeMedidor: qcDiseno_lps debe ser un número mayor a 0 (recibido: ${qcDiseno_lps})`,
    )
  }

  const qcDiseno_m3h = qcDiseno_lps * M3H_POR_LPS
  const qcl_lpm = qcDiseno_lps * LPM_POR_LPS

  const fila = seleccionarFilaTabla06PorCaudal(qcDiseno_m3h)
  if (fila === 'fueraDeTabla06') {
    return { tipo: 'fueraDeTabla06', qcDiseno_lps, qcDiseno_m3h, qcMaximoCubierto_m3h: qcMaximoCubiertoPorTabla06_m3h }
  }

  return {
    tipo: 'seleccionado',
    qcDiseno_lps,
    qcDiseno_m3h,
    qcl_lpm,
    dnMedidor_mm: fila.dnMedidor_mm,
    capacidadMaxima_m3h: fila.capacidadMaxima_m3h,
    caudalMedio_m3h: fila.caudalMedio_m3h,
    qcProyectoTabla_m3h: fila.qcProyecto_m3h,
    hfMedidor_mca: calcularPerdidaCargaMedidor(qcl_lpm, fila.capacidadMaxima_m3h),
  }
}
