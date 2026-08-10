// Numero de Reynolds a partir de la velocidad ya calculada (CRIT-A18).
// Segundo eslabon del pipeline: V+Di+nu -> Re. viscosidadCinematica_m2s es
// parametro explicito -- ninguna viscosidad se hardcodea aqui.
export function calcularNumeroReynolds(
  velocidad_mps: number,
  diametroInterior_mm: number,
  viscosidadCinematica_m2s: number,
): number {
  if (velocidad_mps <= 0) {
    throw new Error(`calcularNumeroReynolds: velocidad_mps debe ser mayor a 0 (recibido: ${velocidad_mps})`)
  }
  if (diametroInterior_mm <= 0) {
    throw new Error(
      `calcularNumeroReynolds: diametroInterior_mm debe ser mayor a 0 (recibido: ${diametroInterior_mm})`,
    )
  }
  if (viscosidadCinematica_m2s <= 0) {
    throw new Error(
      `calcularNumeroReynolds: viscosidadCinematica_m2s debe ser mayor a 0 (recibido: ${viscosidadCinematica_m2s})`,
    )
  }

  // CRIT-A18: Re = V * D_m / nu
  const D_m = diametroInterior_mm / 1000

  return (velocidad_mps * D_m) / viscosidadCinematica_m2s
}
