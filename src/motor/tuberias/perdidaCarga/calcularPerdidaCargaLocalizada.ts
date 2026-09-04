// Perdida de carga localizada/singular por accesorio (ERAS-2023 SS2.12.1):
// Js = Ks * V^2 / (2*g). Primitiva pura: recibe Ks ya resuelto (de Tabla
// N7, normativa/eras-2023/tabla-07-perdidas-localizadas) y la velocidad
// real ya calculada -- no conoce Tramo, accesorios ni cuantos hay ni
// donde viven en la topologia (eso queda deliberadamente sin decidir,
// M2-C/D-delta.33). g=9.81 m/s2, misma constante y mismo criterio que
// calcularPerdidaCargaDarcyWeisbach (duplicada a proposito, sin extraer
// una constante compartida por un segundo consumidor todavia incierto).
const G_MPS2 = 9.81

export function calcularPerdidaCargaLocalizada(coeficienteKs: number, velocidad_mps: number): number {
  if (coeficienteKs <= 0) {
    throw new Error(`calcularPerdidaCargaLocalizada: coeficienteKs debe ser mayor a 0 (recibido: ${coeficienteKs})`)
  }
  if (velocidad_mps <= 0) {
    throw new Error(`calcularPerdidaCargaLocalizada: velocidad_mps debe ser mayor a 0 (recibido: ${velocidad_mps})`)
  }

  return (coeficienteKs * velocidad_mps ** 2) / (2 * G_MPS2)
}
