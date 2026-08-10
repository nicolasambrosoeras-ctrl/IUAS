// Perdida de carga distribuida por Darcy-Weisbach (CRIT-A18). Ultimo
// eslabon del pipeline: f+L+Di+V -> hf. g=9.81 m/s2 es una constante
// fisica, no configurable -- misma categoria que Math.PI en
// seccion-escurrimiento.
const G_MPS2 = 9.81

export function calcularPerdidaCargaDarcyWeisbach(
  factorFriccion: number,
  longitud_m: number,
  diametroInterior_mm: number,
  velocidad_mps: number,
): number {
  if (factorFriccion <= 0) {
    throw new Error(`calcularPerdidaCargaDarcyWeisbach: factorFriccion debe ser mayor a 0 (recibido: ${factorFriccion})`)
  }
  if (longitud_m <= 0) {
    throw new Error(`calcularPerdidaCargaDarcyWeisbach: longitud_m debe ser mayor a 0 (recibido: ${longitud_m})`)
  }
  if (diametroInterior_mm <= 0) {
    throw new Error(
      `calcularPerdidaCargaDarcyWeisbach: diametroInterior_mm debe ser mayor a 0 (recibido: ${diametroInterior_mm})`,
    )
  }
  if (velocidad_mps <= 0) {
    throw new Error(`calcularPerdidaCargaDarcyWeisbach: velocidad_mps debe ser mayor a 0 (recibido: ${velocidad_mps})`)
  }

  // CRIT-A18: hf = f * (L/D_m) * (V^2/(2*g))
  const D_m = diametroInterior_mm / 1000

  return factorFriccion * (longitud_m / D_m) * (velocidad_mps ** 2 / (2 * G_MPS2))
}
