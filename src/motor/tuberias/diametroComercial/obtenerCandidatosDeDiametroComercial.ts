// Seleccion de diametro comercial: dado un Di minimo (predimensionamiento,
// CRIT-A10/CRIT-A16) y un catalogo de un sistema de tuberia, devuelve las
// entradas cuyo diametro interior efectivo alcanza ese minimo. Geometria
// comercial pura -- no conoce Hazen-Williams, Darcy-Weisbach, materiales,
// normas ni C/epsilon (esa ubicacion se decide cuando existan propiedades
// hidraulicas de materiales reales, ver analisis previo). No selecciona
// "el" diametro final: devuelve todos los candidatos ordenados para que un
// incremento futuro (fuera de este alcance) verifique hidraulicamente cada
// uno y avance al siguiente si el anterior falla por presion.
//
// Campos deliberadamente minimos: diametroExterior_mm/espesor_mm/dn no se
// incluyen porque ningun consumidor de esta primitiva (ni sus tests) los
// lee todavia -- se agregan cuando exista un caso de uso real, mismo
// criterio ya aplicado en el resto del proyecto.
export type EntradaCatalogoTuberia = {
  readonly denominacionComercial: string
  readonly diametroInteriorEfectivo_mm: number
}

export type SistemaDeTuberia = {
  readonly id: string
  readonly denominacion: string
  readonly entradas: readonly EntradaCatalogoTuberia[]
}

export function obtenerCandidatosDeDiametroComercial(
  diMinimo_mm: number,
  sistemaDeTuberia: SistemaDeTuberia,
): readonly EntradaCatalogoTuberia[] {
  if (diMinimo_mm <= 0) {
    throw new Error(`obtenerCandidatosDeDiametroComercial: diMinimo_mm debe ser mayor a 0 (recibido: ${diMinimo_mm})`)
  }

  // Un catalogo dimensional invalido no debe aceptarse silenciosamente:
  // se valida cada entrada, incluidas las que no resultarian candidatas.
  sistemaDeTuberia.entradas.forEach((entrada) => {
    if (entrada.diametroInteriorEfectivo_mm <= 0) {
      throw new Error(
        `obtenerCandidatosDeDiametroComercial: entrada "${entrada.denominacionComercial}" del sistema ` +
          `"${sistemaDeTuberia.id}" tiene diametroInteriorEfectivo_mm invalido (recibido: ${entrada.diametroInteriorEfectivo_mm})`,
      )
    }
  })

  // El criterio de seleccion es exclusivamente el diametro interior
  // efectivo -- nunca DN, diametro exterior ni denominacion comercial.
  // .filter() ya devuelve un arreglo nuevo: .sort() sobre ese resultado no
  // muta sistemaDeTuberia.entradas. Array.prototype.sort es estable
  // (garantizado desde ES2019): dos entradas con el mismo
  // diametroInteriorEfectivo_mm conservan su orden relativo original del
  // catalogo -- ninguna se descarta.
  return sistemaDeTuberia.entradas
    .filter((entrada) => entrada.diametroInteriorEfectivo_mm >= diMinimo_mm)
    .sort((a, b) => a.diametroInteriorEfectivo_mm - b.diametroInteriorEfectivo_mm)
}
