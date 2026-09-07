// M3-B1 — Selección pura del MEDIDOR GENERAL.
//
// Dado el caudal de cálculo Qc del proyecto ya resuelto por la capa de
// demanda/hidráulica aguas arriba (M1 / capa de caudal de M2), selecciona
// la fila de Tabla N°6 (ERAS-2023 §2.12, ISO 4064 — ver CRIT-A32) y calcula
// la pérdida de carga con la primitiva ya firme `calcularPerdidaCargaMedidor`
// (fórmula (6), CRIT-A25). Este motor NO recalcula demanda.
//
// Alcance deliberado de este incremento (decisiones del usuario, M3-A):
//
//  - SÓLO el ámbito 'general' (medidor de consumos generales, §2.6.b, en la
//    conexión / recinto del medidor general). El medidor individual por
//    unidad funcional queda para M3-B2, bloqueado por la contradicción
//    normativa §2.6 ("simultaneidad total de los consumos") vs. §2.12.1.e
//    (remisión genérica a §2.9 y siguientes) — decisión roja todavía sin
//    cerrar. No se anticipa acá ninguna estructura de medidores individuales.
//
//  - M3 queda SEPARADO de `RedHidraulica` (decisión roja 1, alternativa 4):
//    este motor recibe un número (Qc) y devuelve un resultado de borde; no
//    conoce `Nodo`, `Tramo` ni topología. La pertenencia de `hfMedidor_mca`
//    al balance de un terminal (según origen hidráulico y tipo de medidor,
//    D-δ.38) la resuelve la capa de presión de M2, no este motor.
//
//  - Regla de selección literal de §2.12: primera fila cuyo "Qc del
//    proyecto" tabulado sea >= al Qc de diseño. NO se interpola DN. La
//    capacidad `C` se toma de la MISMA fila seleccionada — nunca el
//    emparejamiento DN19↔C=7 del ejemplo oficial (errata, CRIT-A32).
//
//  - Qc de diseño por encima del dominio de Tabla N°6 (> 40 m³/h):
//    'fueraDeTabla06', NUNCA extrapolación. La ampliación de rango
//    (Tabla N°8, Anexo A) no se implementa en este incremento.
//
//  - NO se verifica ningún "caudal mínimo metrológico": ERAS remite a ISO
//    4064 pero no publica Q1/Q2/Q3/Q4 ni Qmin en el texto de la Guía. Sólo
//    se verifica lo que la fuente permite (que el Qc cae dentro del dominio
//    de la tabla). Una verificación de rango metrológico podrá agregarse
//    cuando exista catálogo de fabricante / la clase ISO 4064 como dato.
import {
  seleccionarFilaTabla06PorCaudal,
  qcMaximoCubiertoPorTabla06_m3h,
} from '../../normativa/eras-2023/tabla-06-medidores'
import { calcularPerdidaCargaMedidor } from '../tuberias/perdidaCarga/calcularPerdidaCargaMedidor'

// 1 l/s = 3,6 m³/h ; 1 l/s = 60 l/min. La Guía tabula el umbral de
// selección en m³/h y expresa `Qcl` de la fórmula (6) en l/min.
const M3H_POR_LPS = 3.6 as const
const LPM_POR_LPS = 60 as const

export type ResultadoSeleccionMedidorGeneral =
  | {
      readonly tipo: 'seleccionado'
      readonly ambito: 'general'
      readonly qcDiseno_lps: number
      readonly qcDiseno_m3h: number
      // Caudal máximo probable en l/min usado como `Qcl` de la fórmula (6).
      readonly qcl_lpm: number
      readonly dnMedidor_mm: number
      // `C` de la fila seleccionada — divisor de la fórmula (6).
      readonly capacidadMaxima_m3h: number
      // "Caudal medio para determinar el medidor" de la fila — informativo.
      readonly caudalMedio_m3h: number
      // Umbral "Qc del proyecto" tabulado de la fila seleccionada — para la
      // memoria de cálculo (deja ver contra qué valor se comparó).
      readonly qcProyectoTabla_m3h: number
      // Pérdida de carga del medidor, m.c.a. (CRIT-A25).
      readonly hfMedidor_mca: number
    }
  | {
      // Qc de diseño fuera del dominio inequívoco de Tabla N°6 (> 40 m³/h).
      // No es un error de uso ni una incompletitud de datos del usuario: es
      // una limitación del alcance normativo transcripto. Un incremento
      // futuro (Tabla N°8) puede cubrirlo.
      readonly tipo: 'fueraDeTabla06'
      readonly ambito: 'general'
      readonly qcDiseno_lps: number
      readonly qcDiseno_m3h: number
      readonly qcMaximoCubierto_m3h: number
    }

export function seleccionarMedidorGeneral(qcDiseno_lps: number): ResultadoSeleccionMedidorGeneral {
  if (!Number.isFinite(qcDiseno_lps) || qcDiseno_lps <= 0) {
    // Precondición imposible tras el motor de demanda (CRIT-A4/CRIT-A22
    // garantizan Qc > 0) — mismo criterio "precondición imposible" del
    // resto del motor: throw explícito, nunca un resultado fabricado.
    throw new Error(
      `seleccionarMedidorGeneral: qcDiseno_lps debe ser un número mayor a 0 (recibido: ${qcDiseno_lps})`,
    )
  }

  const qcDiseno_m3h = qcDiseno_lps * M3H_POR_LPS
  const qcl_lpm = qcDiseno_lps * LPM_POR_LPS

  const fila = seleccionarFilaTabla06PorCaudal(qcDiseno_m3h)
  if (fila === 'fueraDeTabla06') {
    return {
      tipo: 'fueraDeTabla06',
      ambito: 'general',
      qcDiseno_lps,
      qcDiseno_m3h,
      qcMaximoCubierto_m3h: qcMaximoCubiertoPorTabla06_m3h,
    }
  }

  const hfMedidor_mca = calcularPerdidaCargaMedidor(qcl_lpm, fila.capacidadMaxima_m3h)

  return {
    tipo: 'seleccionado',
    ambito: 'general',
    qcDiseno_lps,
    qcDiseno_m3h,
    qcl_lpm,
    dnMedidor_mm: fila.dnMedidor_mm,
    capacidadMaxima_m3h: fila.capacidadMaxima_m3h,
    caudalMedio_m3h: fila.caudalMedio_m3h,
    qcProyectoTabla_m3h: fila.qcProyecto_m3h,
    hfMedidor_mca,
  }
}
