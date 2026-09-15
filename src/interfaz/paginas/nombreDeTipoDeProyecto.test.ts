import { describe, it, expect } from 'vitest'
import { nombreDeTipoDeProyecto } from './nombreDeTipoDeProyecto'

describe('nombreDeTipoDeProyecto (BETA-UI-POLISH-01: subtítulo sin afirmar "Proyecto de ejemplo")', () => {
  it('viviendaIndividual -> "Vivienda individual" (default del demo y de un proyecto nuevo)', () => {
    expect(nombreDeTipoDeProyecto('viviendaIndividual')).toBe('Vivienda individual')
  })

  it('viviendaMultifamiliar -> "Vivienda multifamiliar"', () => {
    expect(nombreDeTipoDeProyecto('viviendaMultifamiliar')).toBe('Vivienda multifamiliar')
  })

  it('oficinaPrivada -> "Oficina privada"', () => {
    expect(nombreDeTipoDeProyecto('oficinaPrivada')).toBe('Oficina privada')
  })
})
