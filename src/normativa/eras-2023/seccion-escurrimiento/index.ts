// Primitiva pura de predimensionamiento hidraulico: seccion minima de
// escurrimiento (CRIT-A10) y diametro interior minimo equivalente para
// seccion circular. Ve_mps se recibe siempre como parametro -- este
// paquete no fija ningun valor de velocidad; CRIT-A16 es quien decide,
// a nivel de proyecto, que Ve corresponde inyectar aqui durante la etapa
// de predimensionamiento. Datos/formulas puras: no lee Proyecto, Tramo
// ni RedHidraulica.

export function calcularSeccionEscurrimiento(Qc_lps: number, Ve_mps: number): number {
  if (Qc_lps <= 0) {
    throw new Error(`calcularSeccionEscurrimiento: Qc_lps debe ser mayor a 0 (recibido: ${Qc_lps})`);
  }
  if (Ve_mps <= 0) {
    throw new Error(`calcularSeccionEscurrimiento: Ve_mps debe ser mayor a 0 (recibido: ${Ve_mps})`);
  }

  // CRIT-A10: Ae_cm2 = 10 * Qc_lps / Ve_mps -- correccion dimensional de
  // la formula impresa en ERAS-2023 §2.12.1 (Qc en l/s, Ve en m/s).
  return (10 * Qc_lps) / Ve_mps;
}

export function calcularDiametroInteriorMinimo(Ae_cm2: number): number {
  if (Ae_cm2 <= 0) {
    throw new Error(`calcularDiametroInteriorMinimo: Ae_cm2 debe ser mayor a 0 (recibido: ${Ae_cm2})`);
  }

  // A = pi * D^2 / 4  =>  D = sqrt(4*A/pi). Ae_cm2 -> diametro en cm,
  // luego se convierte a mm (x10) porque la columna de salida es Di [mm].
  const diametroInterior_cm = Math.sqrt((4 * Ae_cm2) / Math.PI);
  return diametroInterior_cm * 10;
}
