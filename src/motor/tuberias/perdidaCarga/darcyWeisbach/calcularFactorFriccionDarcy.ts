// Factor de friccion de Darcy en regimen turbulento, correlacion de Haaland
// (CRIT-A18). Tercer eslabon del pipeline: Re+epsilon+Di -> f. El proyecto
// no modela regimen laminar ni transicion: por debajo del umbral turbulento
// adoptado, el calculo queda explicitamente fuera de alcance de este
// modelo (throw), no un estado de dominio previsible a interpolar.
export const UMBRAL_REYNOLDS_TURBULENTO = 4000

export function calcularFactorFriccionDarcy(
  numeroReynolds: number,
  rugosidadAbsoluta_mm: number,
  diametroInterior_mm: number,
): number {
  if (diametroInterior_mm <= 0) {
    throw new Error(
      `calcularFactorFriccionDarcy: diametroInterior_mm debe ser mayor a 0 (recibido: ${diametroInterior_mm})`,
    )
  }
  // rugosidadAbsoluta_mm = 0 es valido (caso hidraulicamente liso, CRIT-A18).
  if (rugosidadAbsoluta_mm < 0) {
    throw new Error(
      `calcularFactorFriccionDarcy: rugosidadAbsoluta_mm no puede ser negativa (recibido: ${rugosidadAbsoluta_mm})`,
    )
  }
  // CRIT-A18: modelo exclusivamente turbulento; Re=4000 es valido (limite
  // operativo adoptado, no zona de transicion a interpolar).
  if (numeroReynolds < UMBRAL_REYNOLDS_TURBULENTO) {
    throw new Error(
      `calcularFactorFriccionDarcy: numeroReynolds=${numeroReynolds} fuera de alcance del modelo turbulento ` +
        `(CRIT-A18 exige numeroReynolds >= ${UMBRAL_REYNOLDS_TURBULENTO}); regimen laminar/transicional no implementado`,
    )
  }

  // CRIT-A18: conversion explicita y rugosidad relativa.
  const epsilon_m = rugosidadAbsoluta_mm / 1000
  const D_m = diametroInterior_mm / 1000
  const rugosidadRelativa = epsilon_m / D_m

  // Haaland: 1/sqrt(f) = -1.8 * log10((rugosidadRelativa/3.7)^1.11 + 6.9/Re)
  const inversoRaizF = -1.8 * Math.log10((rugosidadRelativa / 3.7) ** 1.11 + 6.9 / numeroReynolds)

  return 1 / inversoRaizF ** 2
}
