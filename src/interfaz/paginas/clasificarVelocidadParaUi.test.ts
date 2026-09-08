import { describe, it, expect } from 'vitest'
import { clasificarVelocidadParaUi } from './clasificarVelocidadParaUi'
import type { ResultadoVerificacionVelocidad } from '../../motor/tuberias/velocidad/verificarVelocidadAdmisible'

// Rango chico (13–60 mm): Vmax normativo = 3 m/s.
const ADMISIBLE_D_CHICO: ResultadoVerificacionVelocidad = {
  tipo: 'admisible',
  limiteMinimo_mps: 1,
  limiteMaximo_mps: 3,
}
// Rango grande (75–200 mm): Vmax normativo = 2 m/s.
const ADMISIBLE_D_GRANDE: ResultadoVerificacionVelocidad = {
  tipo: 'admisible',
  limiteMinimo_mps: 1.5,
  limiteMaximo_mps: 2,
}
const FUERA_DE_DOMINIO: ResultadoVerificacionVelocidad = { tipo: 'fueraDeDominioNormativo' }

describe('clasificarVelocidadParaUi (DEPLOY-01, semántica presentacional)', () => {
  it('velocidad claramente baja -> normal (sin badge)', () => {
    expect(clasificarVelocidadParaUi(0.7, ADMISIBLE_D_CHICO, false)).toBe('normal')
    expect(clasificarVelocidadParaUi(1.2, ADMISIBLE_D_CHICO, false)).toBe('normal')
    expect(clasificarVelocidadParaUi(1.7, ADMISIBLE_D_CHICO, false)).toBe('normal')
    expect(clasificarVelocidadParaUi(1.8, ADMISIBLE_D_CHICO, false)).toBe('normal')
  })

  it('frontera 2,0 m/s: 1,999… normal, 2,0 elevada', () => {
    expect(clasificarVelocidadParaUi(1.999, ADMISIBLE_D_CHICO, false)).toBe('normal')
    expect(clasificarVelocidadParaUi(2.0, ADMISIBLE_D_CHICO, false)).toBe('elevada')
  })

  it('frontera 2,5 m/s: 2,499… elevada, 2,5 muy alta (aún admisible)', () => {
    expect(clasificarVelocidadParaUi(2.499, ADMISIBLE_D_CHICO, false)).toBe('elevada')
    expect(clasificarVelocidadParaUi(2.5, ADMISIBLE_D_CHICO, false)).toBe('muyAlta')
  })

  it('tramo 2,5+ pero ≤ Vmax -> muy alta, NUNCA no admisible', () => {
    expect(clasificarVelocidadParaUi(2.9, ADMISIBLE_D_CHICO, false)).toBe('muyAlta')
    expect(clasificarVelocidadParaUi(3.0, ADMISIBLE_D_CHICO, false)).toBe('muyAlta')
  })

  it('V > Vmax real aplicable -> no admisible', () => {
    expect(clasificarVelocidadParaUi(3.01, ADMISIBLE_D_CHICO, false)).toBe('noAdmisible')
    expect(
      clasificarVelocidadParaUi(3.2, { tipo: 'noAdmisible', limiteMinimo_mps: 1, limiteMaximo_mps: 3 }, false),
    ).toBe('noAdmisible')
  })

  it('Vmax depende del diámetro real: 2,05 m/s es no admisible en rango grande (Vmax=2)', () => {
    expect(clasificarVelocidadParaUi(2.05, ADMISIBLE_D_GRANDE, false)).toBe('noAdmisible')
    // 2,0 exacto sigue siendo admisible -> se comunica como "elevada".
    expect(clasificarVelocidadParaUi(2.0, ADMISIBLE_D_GRANDE, false)).toBe('elevada')
  })

  it('velocidadPorDebajoDelMinimo (CRIT-A24) -> normal, aunque el motor marque noAdmisible', () => {
    expect(
      clasificarVelocidadParaUi(0.49, { tipo: 'noAdmisible', limiteMinimo_mps: 1, limiteMaximo_mps: 3 }, true),
    ).toBe('normal')
  })

  it('fueraDeDominioNormativo: sin Vmax conocido nunca se afirma "no admisible"; sólo umbrales de comunicación', () => {
    expect(clasificarVelocidadParaUi(1.6, FUERA_DE_DOMINIO, false)).toBe('normal')
    expect(clasificarVelocidadParaUi(2.1, FUERA_DE_DOMINIO, false)).toBe('elevada')
    expect(clasificarVelocidadParaUi(2.9, FUERA_DE_DOMINIO, false)).toBe('muyAlta')
  })

  it('smoke del proyecto ejemplo: 2,9 -> muy alta, 2,1 -> elevada', () => {
    expect(clasificarVelocidadParaUi(2.9, ADMISIBLE_D_CHICO, false)).toBe('muyAlta')
    expect(clasificarVelocidadParaUi(2.1, ADMISIBLE_D_CHICO, false)).toBe('elevada')
  })
})
