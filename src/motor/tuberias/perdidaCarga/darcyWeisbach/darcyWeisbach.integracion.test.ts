// Test de integración de primitivas: encadena manualmente las cuatro
// funciones puras (Qc -> V -> Re -> f -> hf) para comprobar que son
// composables, sin crear ningún orquestador productivo -- esta cadena no
// se exporta ni se reutiliza, es exclusivamente la aserción del test.
import { describe, it, expect } from 'vitest'
import { calcularVelocidad } from './calcularVelocidad'
import { calcularNumeroReynolds } from './calcularNumeroReynolds'
import { calcularFactorFriccionDarcy } from './calcularFactorFriccionDarcy'
import { calcularPerdidaCargaDarcyWeisbach } from './calcularPerdidaCargaDarcyWeisbach'

describe('composición manual del pipeline Darcy-Weisbach turbulento (CRIT-A18)', () => {
  it('Qc=0.7273238618387272 l/s, D=25mm, epsilon=0.0015mm (laboratorio), nu=1e-6, L=10m -> reproduce el caso C', () => {
    const qc_lps = 0.7273238618387272
    const diametroInterior_mm = 25
    const rugosidadAbsoluta_mm = 0.0015
    const viscosidadCinematica_m2s = 1e-6
    const longitud_m = 10

    const V = calcularVelocidad(qc_lps, diametroInterior_mm)
    const Re = calcularNumeroReynolds(V, diametroInterior_mm, viscosidadCinematica_m2s)
    const f = calcularFactorFriccionDarcy(Re, rugosidadAbsoluta_mm, diametroInterior_mm)
    const hf = calcularPerdidaCargaDarcyWeisbach(f, longitud_m, diametroInterior_mm, V)

    expect(V).toBeCloseTo(1.4816920043560982, 9)
    expect(Re).toBeCloseTo(37042.30010890246, 5)
    expect(f).toBeCloseTo(0.02231824636614258, 9)
    expect(hf).toBeCloseTo(0.9989343107491304, 9)
  })

  it('un Qc que produce Re por debajo del umbral hace que el pipeline se rechace en la etapa de fricción, no antes', () => {
    // V y Re se calculan igualmente (CRIT-A18: Re se usa también como
    // verificación de validez); solo la etapa de fricción rechaza.
    const qc_lps = 0.0392699082
    const diametroInterior_mm = 25
    const viscosidadCinematica_m2s = 1e-6

    const V = calcularVelocidad(qc_lps, diametroInterior_mm)
    const Re = calcularNumeroReynolds(V, diametroInterior_mm, viscosidadCinematica_m2s)

    expect(Re).toBeCloseTo(2000, 0)
    expect(() => calcularFactorFriccionDarcy(Re, 0, diametroInterior_mm)).toThrow(/fuera de alcance/)
  })
})
