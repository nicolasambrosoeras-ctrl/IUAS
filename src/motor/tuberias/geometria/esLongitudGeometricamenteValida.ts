// Predicado puro: ¿es longitud_m geométricamente compatible con la
// diferencia de cota que separa origen y destino? Invariante CRIT-A20:
// longitud_m >= |Δz|, con tolerancia exclusivamente numérica (ruido de
// punto flotante), nunca tolerancia constructiva/de medición. No recibe
// Nodo/Tramo/Proyecto/RedHidraulica -- el caller resuelve Δz con
// calcularDiferenciaDeCota y pasa el resultado ya calculado.
const EPSILON_GEOMETRICO_M = 1e-9

export function esLongitudGeometricamenteValida(longitud_m: number, diferenciaDeCota_m: number): boolean {
  return longitud_m >= Math.abs(diferenciaDeCota_m) - EPSILON_GEOMETRICO_M
}
