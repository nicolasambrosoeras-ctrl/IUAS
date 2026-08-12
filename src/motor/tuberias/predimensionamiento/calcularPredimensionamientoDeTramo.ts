// Orquestador minimo de predimensionamiento hidraulico por Tramo: conecta
// el Qc ya resuelto por resolverHidraulicaDeTramo con las primitivas
// normativas puras de seccion-escurrimiento (CRIT-A10). No reimplementa
// ninguna formula: solo decide que Ve corresponde inyectar en esta etapa
// (CRIT-A16) y encadena Qc -> Ae -> Di minimo.
import { calcularSeccionEscurrimiento, calcularDiametroInteriorMinimo } from '../../../normativa/eras-2023/seccion-escurrimiento'

// CRIT-A16: velocidad de predimensionamiento adoptada por el proyecto --
// no es un dato normativo intrinseco de ERAS-2023 (ver CRITERIOS.md), por
// lo que vive aqui, junto al unico orquestador que la usa, y no dentro de
// seccion-escurrimiento (esa primitiva normativa debe seguir recibiendo
// Ve como argumento) ni en el modelo de Proyecto (no existe todavia
// configuracion de usuario para esto).
export const VE_PREDIMENSIONAMIENTO_MPS = 2.0

export type PredimensionamientoDeTramo = {
  readonly ve_mps: number
  readonly ae_cm2: number
  readonly diReferenciaPredimensionamiento_mm: number
}

export function calcularPredimensionamientoDeTramo(qc_lps: number): PredimensionamientoDeTramo {
  const ve_mps = VE_PREDIMENSIONAMIENTO_MPS
  const ae_cm2 = calcularSeccionEscurrimiento(qc_lps, ve_mps)
  const diReferenciaPredimensionamiento_mm = calcularDiametroInteriorMinimo(ae_cm2)

  return { ve_mps, ae_cm2, diReferenciaPredimensionamiento_mm }
}
