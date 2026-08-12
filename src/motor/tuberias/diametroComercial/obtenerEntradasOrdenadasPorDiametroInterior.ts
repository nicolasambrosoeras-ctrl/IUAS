// Geometria comercial pura (mismo nivel que obtenerCandidatosDeDiametroComercial,
// sin conocer Hazen-Williams, Darcy-Weisbach, materiales ni CRIT-A19): dado
// un sistema de tuberia, devuelve TODAS sus entradas ordenadas ascendente
// por diametro interior efectivo -- sin ningun umbral, sin filtro de
// velocidad. Distinta de obtenerCandidatosDeDiametroComercial (que sigue
// intacta, "Di efectivo >= umbral"): esta primitiva es para el caso donde
// la politica de selección (CRIT-A23) necesita recorrer el catalogo
// comercial completo y decidir por velocidad real, no por un umbral de
// predimensionamiento. No pasarle un umbral artificial a
// obtenerCandidatosDeDiametroComercial para simular "todo el catalogo" --
// esta funcion expresa esa operacion honestamente.
import type { EntradaCatalogoTuberia, SistemaDeTuberia } from './obtenerCandidatosDeDiametroComercial'

export function obtenerEntradasOrdenadasPorDiametroInterior(
  sistemaDeTuberia: SistemaDeTuberia,
): readonly EntradaCatalogoTuberia[] {
  // Mismo criterio que obtenerCandidatosDeDiametroComercial: catalogo
  // dimensionalmente invalido no se acepta silenciosamente.
  sistemaDeTuberia.entradas.forEach((entrada) => {
    if (entrada.diametroInteriorEfectivo_mm <= 0) {
      throw new Error(
        `obtenerEntradasOrdenadasPorDiametroInterior: entrada "${entrada.denominacionComercial}" del sistema ` +
          `"${sistemaDeTuberia.id}" tiene diametroInteriorEfectivo_mm invalido (recibido: ${entrada.diametroInteriorEfectivo_mm})`,
      )
    }
  })

  // .slice() copia antes de ordenar: no muta sistemaDeTuberia.entradas.
  // Array.prototype.sort es estable (ES2019+): entradas con el mismo
  // diametroInteriorEfectivo_mm conservan su orden relativo original.
  return sistemaDeTuberia.entradas.slice().sort((a, b) => a.diametroInteriorEfectivo_mm - b.diametroInteriorEfectivo_mm)
}
