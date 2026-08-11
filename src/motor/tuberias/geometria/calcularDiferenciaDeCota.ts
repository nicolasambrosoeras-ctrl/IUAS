// Diferencia de cota entre dos puntos hidraulicos (Δz), primer eslabon
// geometrico del futuro balance de energia/presion. Primitiva pura,
// desacoplada de Nodo/Tramo/Proyecto -- recibe numeros explicitos, igual
// que las primitivas de Hazen-Williams/Darcy-Weisbach. Conserva el signo a
// proposito: Δz>0 = ascenso (consume carga estatica), Δz<0 = descenso
// (aporta carga estatica) -- Math.abs() destruiria esa informacion. No
// representa ni deriva longitud fisica de tuberia: la futura
// Tramo.longitud_m sera explicita e independiente de Δz.
export function calcularDiferenciaDeCota(cotaOrigen_m: number, cotaDestino_m: number): number {
  return cotaDestino_m - cotaOrigen_m
}
