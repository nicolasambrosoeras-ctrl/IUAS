// Parseo puro del <input> de una cota (Nodo.cota_m / UnidadFuncional.
// cotaHidraulicaReferencia_m, D-δ.46) -- extraído de PanelDePresionDeModulo2.tsx
// cuando pasó a tener 3 consumidores reales (PanelDePresionDeModulo2.tsx,
// TarjetaDeTerminal.tsx, MotorDemandaPantalla.tsx), evitando además un
// import circular entre los primeros dos. cota_m SÍ admite negativos (un
// punto puede estar por debajo del datum, p.ej. un subsuelo) -- a
// diferencia de un input de magnitud física (Pdisponible, hfMedidor),
// solo se descarta NaN.
export function parsearCota(texto: string): number | undefined | 'ignorar' {
  if (texto === '') {
    return undefined
  }
  const valor = Number(texto)
  return Number.isNaN(valor) ? 'ignorar' : valor
}
