// Perdida de carga del medidor de agua (ERAS-2023 SS2.12, formula 6):
// Jm = 0,036 * (Qcl/C)^2. Qcl = caudal maximo probable en L/min, C =
// capacidad maxima del medidor en m3/hora. Devuelve Jm directamente en
// m.c.a. (asi lo trata el ejemplo oficial de la guia -- Qcl=42,1 l/min,
// C=7 m3/h -> Jm=0,036*(42,1/7)^2=1,3 m.c.a., sin multiplicar por ninguna
// longitud; el par DN/C de ese ejemplo es una errata, ver CRIT-A32).
// Primitiva pura: no conoce Tramo,
// RedHidraulica ni catalogo de medidores. La seleccion del medidor GENERAL
// (Qc -> DN + C via Tabla N°6, CRIT-A32) la compone
// motor/medidores/seleccionarMedidorGeneral, que llama a esta primitiva con
// el C de la fila elegida -- esta funcion sigue siendo agnostica del
// catalogo. El medidor INDIVIDUAL por unidad funcional (donde vive en la
// topologia, que caudal usa) sigue sin decidir (ver
// PENDIENTES-DE-ARQUITECTURA.md, D-delta.35 y la contradiccion S2.6/S2.12.1.e).
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
