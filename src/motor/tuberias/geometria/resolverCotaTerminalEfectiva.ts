// Cota efectiva de un terminal para el cálculo de Δz (D-δ.46): decide,
// según GranularidadHidraulica (D-δ.44), de dónde sale la cota del
// terminal -- ORTOGONAL a resolverDesnivelDeCamino, que sigue sin saber
// nada de UnidadFuncional ni de granularidad, solo lee cota_m de los
// nodos extremo que recibe.
//
// 'profesional': cota individual del Nodo terminal (Nodo.cota_m),
// comportamiento sin cambios -- el proyectista releva la conexión real
// de cada Artefacto.
//
// 'simplificada': cota hidráulica de referencia de la UnidadFuncional
// (UnidadFuncional.cotaHidraulicaReferencia_m), IGNORANDO por completo
// el cota_m propio del Nodo terminal (si lo tuviera de un cambio previo
// de granularidad -- nunca se lee ni se borra, D-δ.44 mismo criterio de
// "no perder capacidad"). Esto es una aproximación deliberada del modo
// rápido, NO una redefinición de CRIT-A29: el punto físico donde se
// verifica presión sigue siendo la conexión del Artefacto; simplemente
// IUAS no exige conocer su altura exacta, adoptando una cota
// representativa común a toda la UF.
import type { GranularidadHidraulica, UnidadFuncional } from '../../../modelo/proyecto'

export function resolverCotaTerminalEfectiva(
  granularidadHidraulica: GranularidadHidraulica,
  unidadFuncional: UnidadFuncional,
  cotaNodoTerminal_m: number | undefined,
): number | undefined {
  if (granularidadHidraulica === 'profesional') {
    return cotaNodoTerminal_m
  }
  return unidadFuncional.cotaHidraulicaReferencia_m
}
