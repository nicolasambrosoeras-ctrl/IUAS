import { describe, it, expect } from 'vitest'
import { metaDeCabeceraDeLocal, tipoEsRedundanteConNombreVisible } from './resumenDeCabeceraDeLocal'

describe('tipoEsRedundanteConNombreVisible', () => {
  it('nombre visible igual al tipo (sin nombre personalizado, único de su tipo) -> redundante', () => {
    expect(tipoEsRedundanteConNombreVisible('Baño', 'Baño')).toBe(true)
  })

  it('nombre numerado ("Baño 1") NO se considera igual a "Baño"', () => {
    expect(tipoEsRedundanteConNombreVisible('Baño 1', 'Baño')).toBe(false)
  })

  it('nombre personalizado nunca es igual al tipo', () => {
    expect(tipoEsRedundanteConNombreVisible('Baño principal', 'Baño')).toBe(false)
  })

  it('compara con trim, tolera espacios accidentales', () => {
    expect(tipoEsRedundanteConNombreVisible('  Baño  ', 'Baño')).toBe(true)
  })
})

describe('metaDeCabeceraDeLocal (brief BETA-UI-POLISH-01 §4/§7)', () => {
  it('"Baño" + "Baño" -> omite el tipo repetido: sólo el resumen de artefactos', () => {
    expect(metaDeCabeceraDeLocal('Baño', 'Baño', '4 artefactos')).toBe('4 artefactos')
  })

  it('"Baño 1" + "Baño" -> conserva el tipo: "Baño · 4 artefactos"', () => {
    expect(metaDeCabeceraDeLocal('Baño 1', 'Baño', '4 artefactos')).toBe('Baño · 4 artefactos')
  })

  it('"Baño principal" + "Baño" -> conserva el tipo: "Baño · 4 artefactos"', () => {
    expect(metaDeCabeceraDeLocal('Baño principal', 'Baño', '4 artefactos')).toBe('Baño · 4 artefactos')
  })
})
