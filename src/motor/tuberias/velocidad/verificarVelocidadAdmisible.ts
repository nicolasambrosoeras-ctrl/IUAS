// Verificacion de velocidad real contra ERAS-2023 §2.12.1 (CRIT-A19).
// Primitiva pura: recibe la velocidad ya calculada (no llama a
// calcularVelocidad) y el diametro interior efectivo/comercial -- nunca
// DN, diametro exterior ni Di minimo de predimensionamiento. El hueco
// normativo 60mm<D<75mm y los diametros fuera de 13-200mm son resultados
// normativos validos (fueraDeDominioNormativo), no errores de programacion.
export type ResultadoVerificacionVelocidad =
  | {
      readonly tipo: 'admisible'
      readonly limiteMinimo_mps: number
      readonly limiteMaximo_mps: number
    }
  | {
      readonly tipo: 'noAdmisible'
      readonly limiteMinimo_mps: number
      readonly limiteMaximo_mps: number
    }
  | {
      readonly tipo: 'fueraDeDominioNormativo'
    }

export function verificarVelocidadAdmisible(
  velocidad_mps: number,
  diametroInteriorEfectivo_mm: number,
): ResultadoVerificacionVelocidad {
  if (velocidad_mps <= 0) {
    throw new Error(`verificarVelocidadAdmisible: velocidad_mps debe ser mayor a 0 (recibido: ${velocidad_mps})`)
  }
  if (diametroInteriorEfectivo_mm <= 0) {
    throw new Error(
      `verificarVelocidadAdmisible: diametroInteriorEfectivo_mm debe ser mayor a 0 (recibido: ${diametroInteriorEfectivo_mm})`,
    )
  }

  // CRIT-A19: limites 13, 60, 75 y 200 mm incluidos en su rango respectivo.
  let limiteMinimo_mps: number
  let limiteMaximo_mps: number
  if (diametroInteriorEfectivo_mm >= 13 && diametroInteriorEfectivo_mm <= 60) {
    limiteMinimo_mps = 1
    limiteMaximo_mps = 3
  } else if (diametroInteriorEfectivo_mm >= 75 && diametroInteriorEfectivo_mm <= 200) {
    limiteMinimo_mps = 1.5
    limiteMaximo_mps = 2
  } else {
    // D<13, 60<D<75 o D>200: hueco/fuera del dominio cubierto por §2.12.1.
    return { tipo: 'fueraDeDominioNormativo' }
  }

  if (velocidad_mps >= limiteMinimo_mps && velocidad_mps <= limiteMaximo_mps) {
    return { tipo: 'admisible', limiteMinimo_mps, limiteMaximo_mps }
  }
  return { tipo: 'noAdmisible', limiteMinimo_mps, limiteMaximo_mps }
}
