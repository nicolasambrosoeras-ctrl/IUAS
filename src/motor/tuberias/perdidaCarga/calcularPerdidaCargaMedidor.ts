// Perdida de carga del medidor de agua (ERAS-2023 SS2.12, formula 6):
// Jm = 0,036 * (Qcl/C)^2. Qcl = caudal maximo probable en L/min, C =
// capacidad maxima del medidor en m3/hora. Devuelve Jm directamente en
// m.c.a. (asi lo trata el ejemplo oficial de la guia -- Qc=0,71 l/s con
// medidor de 19mm, C=7 m3/h -> Jm=0,036*(42,1/7)^2=1,3 m.c.a., sin
// multiplicar por ninguna longitud). Primitiva pura: no conoce Tramo,
// RedHidraulica ni catalogo de medidores -- ese modelo (individual vs.
// general, donde vive en la topologia) queda deliberadamente sin decidir
// (ver PENDIENTES-DE-ARQUITECTURA.md, D-delta.35).
export function calcularPerdidaCargaMedidor(caudalMaximoProbable_lpm: number, capacidadMaximaMedidor_m3h: number): number {
  if (caudalMaximoProbable_lpm <= 0) {
    throw new Error(
      `calcularPerdidaCargaMedidor: caudalMaximoProbable_lpm debe ser mayor a 0 (recibido: ${caudalMaximoProbable_lpm})`,
    )
  }
  if (capacidadMaximaMedidor_m3h <= 0) {
    throw new Error(
      `calcularPerdidaCargaMedidor: capacidadMaximaMedidor_m3h debe ser mayor a 0 (recibido: ${capacidadMaximaMedidor_m3h})`,
    )
  }

  return 0.036 * (caudalMaximoProbable_lpm / capacidadMaximaMedidor_m3h) ** 2
}
