import { describe, it, expect } from 'vitest'
import type { RedDeTramo } from '../../../../modelo/redHidraulica'
import {
  TEMPERATURA_REFERENCIA_AGUA_C,
  VISCOSIDAD_CINEMATICA_AGUA_M2S,
  REFERENCIA_FUENTE_VISCOSIDAD_AGUA,
  resolverPropiedadesAguaParaRed,
} from './propiedadesAguaDarcy'

describe('resolverPropiedadesAguaParaRed', () => {
  it('AF: temperaturaReferencia_C=20, viscosidadCinematica_m2s adoptada', () => {
    const propiedades = resolverPropiedadesAguaParaRed('AF')

    expect(propiedades.temperaturaReferencia_C).toBe(20)
    expect(propiedades.viscosidadCinematica_m2s).toBe(1.0034e-6)
  })

  it('AC: temperaturaReferencia_C=20, viscosidadCinematica_m2s adoptada (transitoriamente igual a AF)', () => {
    const propiedades = resolverPropiedadesAguaParaRed('AC')

    expect(propiedades.temperaturaReferencia_C).toBe(20)
    expect(propiedades.viscosidadCinematica_m2s).toBe(1.0034e-6)
  })

  it('AF y AC devuelven objetos con los mismos valores (N2: diferenciación arquitectónica, no numérica todavía)', () => {
    expect(resolverPropiedadesAguaParaRed('AF')).toEqual(resolverPropiedadesAguaParaRed('AC'))
  })

  it('usa las constantes exportadas, sin duplicar los valores', () => {
    const propiedades = resolverPropiedadesAguaParaRed('AF')

    expect(propiedades.temperaturaReferencia_C).toBe(TEMPERATURA_REFERENCIA_AGUA_C)
    expect(propiedades.viscosidadCinematica_m2s).toBe(VISCOSIDAD_CINEMATICA_AGUA_M2S)
  })

  it('registra la fuente documental (NIST) y aclara que no es un valor ERAS', () => {
    expect(REFERENCIA_FUENTE_VISCOSIDAD_AGUA).toContain('NIST')
    expect(REFERENCIA_FUENTE_VISCOSIDAD_AGUA).toContain('no valor publicado por ERAS-2023')
  })

  it('red no contemplada por el tipo (alcanzada solo mediante un valor fuera de RedDeTramo): throw explícito, sin fallback silencioso', () => {
    const redInvalida = 'ACS' as unknown as RedDeTramo

    expect(() => resolverPropiedadesAguaParaRed(redInvalida)).toThrow(/red no contemplada/)
  })
})
