// Política productiva inicial de propiedades del agua para Darcy-Weisbach
// (CRIT-A21): agua líquida, referencia única de 20 °C, resuelta por red
// (AF/AC) para dejar preparada una futura diferenciación sin tener que
// modificar el orquestador de pérdidas distribuidas cuando se adopte.
// Distinto de calcularNumeroReynolds (CRIT-A18): esa primitiva matemática
// sigue recibiendo viscosidadCinematica_m2s explícito, sin importar nada
// de este módulo -- la política se resuelve acá, afuera, y se pasa como
// argumento. No es propiedad de MaterialTuberia ni de SistemaDeTuberia:
// ν es del agua, no de la tubería. No es un valor publicado por
// ERAS-2023.
import type { RedDeTramo } from '../../../../modelo/redHidraulica'

export type PropiedadesAguaDarcy = {
  readonly temperaturaReferencia_C: number
  readonly viscosidadCinematica_m2s: number
}

// NIST Chemistry WebBook -- Thermophysical Properties of Fluid Systems
// (agua, formulación IAPWS), 1 bar, 20 °C. Publicado directamente:
// viscosidad dinámica μ=1,0016e-3 Pa·s y densidad=55,409 mol/L. Derivado:
// ρ=55,409 mol/L × 18,015268 g/mol (masa molar IAPWS del agua)
// =998,208 kg/m³, y ν=μ/ρ=1,0034e-6 m²/s.
export const TEMPERATURA_REFERENCIA_AGUA_C = 20
export const VISCOSIDAD_CINEMATICA_AGUA_M2S = 1.0034e-6
export const REFERENCIA_FUENTE_VISCOSIDAD_AGUA =
  'NIST Chemistry WebBook -- Thermophysical Properties of Fluid Systems (agua, formulación IAPWS), ' +
  '1 bar, 20 °C: μ=1,0016e-3 Pa·s y densidad=55,409 mol/L publicadas directamente; ρ=998,208 kg/m³ ' +
  '(derivada con masa molar IAPWS 18,015268 g/mol) y ν=μ/ρ=1,0034e-6 m²/s (derivada). ' +
  'Criterio técnico de proyecto (CRIT-A21), no valor publicado por ERAS-2023.'

export function resolverPropiedadesAguaParaRed(red: RedDeTramo): PropiedadesAguaDarcy {
  if (red === 'AF' || red === 'AC') {
    // N2: AF y AC comparten transitoriamente la misma referencia --
    // decisión deliberada (CRIT-A21), no un descuido. La diferenciación
    // futura por red no requiere modificar el resto del pipeline Darcy,
    // solo esta función.
    return {
      temperaturaReferencia_C: TEMPERATURA_REFERENCIA_AGUA_C,
      viscosidadCinematica_m2s: VISCOSIDAD_CINEMATICA_AGUA_M2S,
    }
  }

  throw new Error(`resolverPropiedadesAguaParaRed: red no contemplada (recibido: ${String(red)})`)
}
