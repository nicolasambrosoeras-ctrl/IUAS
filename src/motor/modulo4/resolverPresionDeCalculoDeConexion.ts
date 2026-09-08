// Presión de cálculo de la conexión (M4-D2, CRIT-A37). ERAS §2.7 exige
// ajustar la presión garantizada sobre el nivel de acera por el desnivel
// hasta el punto de alimentación de cálculo:
//
//   presionCalculo_m = presionSobreAcera_m - desnivelConexion_m
//
// con `desnivelConexion_m` FIRMADO (ver ParametrosProyecto):
//   > 0  punto por encima de la acera  -> se resta el ascenso;
//   < 0  punto por debajo de la acera  -> restar un negativo = sumar el
//        descenso (p. ej. tanque de bombeo / cisterna en sótano).
//
// Primitiva pura: sólo la resta firmada. NO aplica clamp, NO redondea, NO
// conoce el rango [4, 35] m de la Tabla N°1 -- decidir si la presión
// resultante es utilizable es responsabilidad de resolverGastoTabla01.
// Inputs no finitos -> throw (error de programación).
export function resolverPresionDeCalculoDeConexion(entrada: {
  readonly presionSobreAcera_m: number
  readonly desnivelConexion_m: number
}): number {
  const { presionSobreAcera_m, desnivelConexion_m } = entrada

  if (!Number.isFinite(presionSobreAcera_m)) {
    throw new Error(
      `resolverPresionDeCalculoDeConexion: presionSobreAcera_m debe ser un número finito (recibido: ${presionSobreAcera_m})`,
    )
  }
  if (!Number.isFinite(desnivelConexion_m)) {
    throw new Error(
      `resolverPresionDeCalculoDeConexion: desnivelConexion_m debe ser un número finito (recibido: ${desnivelConexion_m})`,
    )
  }

  return presionSobreAcera_m - desnivelConexion_m
}
