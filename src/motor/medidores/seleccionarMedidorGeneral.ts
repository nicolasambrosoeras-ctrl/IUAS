// M3-B1 — Selección pura del MEDIDOR GENERAL (§2.6.b, en la conexión /
// recinto del medidor general).
//
// Dado el caudal de cálculo Qc del proyecto ya resuelto por la capa de
// demanda/hidráulica aguas arriba (M1 / capa de caudal de M2), selecciona
// la fila de Tabla N°6 y calcula la pérdida de carga. Este motor NO
// recalcula demanda: envuelve `resolverSeleccionYPerdidaDeMedidor` (núcleo
// común con el medidor individual) marcando el ámbito.
//
// Contexto de alcance (decisiones M3-A, ver D-δ.53 y CRIT-A32):
//  - M3 está separado de `RedHidraulica` (decisión roja 1, alternativa 4):
//    el resultado es un dato de borde para la capa de presión de M2. La
//    pertenencia de `hfMedidor_mca` al balance de un terminal (según origen
//    hidráulico, D-δ.38) la resuelve M2, no este motor.
//  - Regla de selección, C de la fila, tope de Tabla N°6 y ausencia de
//    verificación metrológica: ver `resolverSeleccionYPerdidaDeMedidor`.
//  - El medidor INDIVIDUAL por unidad funcional lo resuelve
//    `seleccionarMedidorIndividual` (M3-B2a), con simultaneidad total
//    (K=1, §2.6 / CRIT-A33).
import {
  resolverSeleccionYPerdidaDeMedidor,
  type NucleoSeleccionDeMedidor,
} from './resolverSeleccionYPerdidaDeMedidor'

export type ResultadoSeleccionMedidorGeneral =
  | ({ readonly tipo: 'seleccionado'; readonly ambito: 'general' } & Extract<
      NucleoSeleccionDeMedidor,
      { tipo: 'seleccionado' }
    >)
  | ({ readonly tipo: 'fueraDeTabla06'; readonly ambito: 'general' } & Extract<
      NucleoSeleccionDeMedidor,
      { tipo: 'fueraDeTabla06' }
    >)

export function seleccionarMedidorGeneral(qcDiseno_lps: number): ResultadoSeleccionMedidorGeneral {
  const nucleo = resolverSeleccionYPerdidaDeMedidor(qcDiseno_lps)
  return { ...nucleo, ambito: 'general' as const }
}
