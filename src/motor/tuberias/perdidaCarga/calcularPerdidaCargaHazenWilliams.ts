// Primitivas puras de perdida de carga distribuida por Hazen-Williams
// (CRIT-A17): J (perdida unitaria) y hf = J*L (perdida total), separadas
// para que cada una sea testeable de forma independiente -- misma logica
// que Ae/Di en seccion-escurrimiento. No integra con Proyecto, Tramo ni
// resolverHidraulicaDeTramo; no conoce materiales ni diametro comercial.
export function calcularPerdidaCargaUnitariaHazenWilliams(
  qc_lps: number,
  coeficienteC: number,
  diametroInterior_mm: number,
): number {
  if (qc_lps <= 0) {
    throw new Error(`calcularPerdidaCargaUnitariaHazenWilliams: qc_lps debe ser mayor a 0 (recibido: ${qc_lps})`)
  }
  if (coeficienteC <= 0) {
    throw new Error(
      `calcularPerdidaCargaUnitariaHazenWilliams: coeficienteC debe ser mayor a 0 (recibido: ${coeficienteC})`,
    )
  }
  if (diametroInterior_mm <= 0) {
    throw new Error(
      `calcularPerdidaCargaUnitariaHazenWilliams: diametroInterior_mm debe ser mayor a 0 (recibido: ${diametroInterior_mm})`,
    )
  }

  // CRIT-A17: la formula opera en Q_m3s y D_m; la API del proyecto trabaja
  // en qc_lps y diametroInterior_mm -- conversion explicita, sin colapsar
  // en una constante combinada que oculte el origen dimensional.
  const Q_m3s = qc_lps / 1000
  const D_m = diametroInterior_mm / 1000

  // CRIT-A17: J = 10.67 * Q_m3s^1.852 / (C^1.852 * D_m^4.87)
  return (10.67 * Math.pow(Q_m3s, 1.852)) / (Math.pow(coeficienteC, 1.852) * Math.pow(D_m, 4.87))
}

export function calcularPerdidaCargaHazenWilliams(J_m_m: number, longitud_m: number): number {
  if (J_m_m <= 0) {
    throw new Error(`calcularPerdidaCargaHazenWilliams: J_m_m debe ser mayor a 0 (recibido: ${J_m_m})`)
  }
  if (longitud_m <= 0) {
    throw new Error(`calcularPerdidaCargaHazenWilliams: longitud_m debe ser mayor a 0 (recibido: ${longitud_m})`)
  }

  // CRIT-A17: hf = J * L
  return J_m_m * longitud_m
}
