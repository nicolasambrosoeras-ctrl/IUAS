// D-δ.79 (P2): coherencia de cotas entre pelo de agua mínimo y punto de
// alimentación del tanque, modo Profesional + esquema 'tanqueElevado'.
import { describe, it, expect } from 'vitest'
import { resolverCoherenciaDeCotasDeTanque } from './resolverCoherenciaDeCotasDeTanque'

const PROFESIONAL_TANQUE = {
  esquema: 'tanqueElevado',
  granularidad: 'profesional',
} as const

describe('resolverCoherenciaDeCotasDeTanque', () => {
  it('pelo de agua por debajo del punto de alimentación → coherente', () => {
    expect(
      resolverCoherenciaDeCotasDeTanque({
        ...PROFESIONAL_TANQUE,
        cotaPeloDeAguaMinimo_m: 9,
        desnivelConexion_m: 10,
      }),
    ).toEqual({ tipo: 'coherente' })
  })

  it('pelo de agua a la misma cota que el punto de alimentación → coherente (no dispara la advertencia)', () => {
    expect(
      resolverCoherenciaDeCotasDeTanque({
        ...PROFESIONAL_TANQUE,
        cotaPeloDeAguaMinimo_m: 10,
        desnivelConexion_m: 10,
      }),
    ).toEqual({ tipo: 'coherente' })
  })

  it('pelo de agua por encima del punto de alimentación → advertencia con ambas cotas', () => {
    expect(
      resolverCoherenciaDeCotasDeTanque({
        ...PROFESIONAL_TANQUE,
        cotaPeloDeAguaMinimo_m: 11,
        desnivelConexion_m: 10,
      }),
    ).toEqual({
      tipo: 'peloEncimaDeLaAlimentacion',
      cotaPeloDeAguaMinimo_m: 11,
      desnivelAlimentacionTanque_m: 10,
    })
  })

  it('modo Rápido → noEvaluable (el pelo de agua se estima, la relación se cumple por construcción)', () => {
    expect(
      resolverCoherenciaDeCotasDeTanque({
        esquema: 'tanqueElevado',
        granularidad: 'simplificada',
        cotaPeloDeAguaMinimo_m: 11,
        desnivelConexion_m: 10,
      }),
    ).toEqual({ tipo: 'noEvaluable' })
  })

  it('esquema "cisternaBombeoElevado" → noEvaluable (cotas no comparables)', () => {
    expect(
      resolverCoherenciaDeCotasDeTanque({
        esquema: 'cisternaBombeoElevado',
        granularidad: 'profesional',
        cotaPeloDeAguaMinimo_m: 11,
        desnivelConexion_m: 10,
      }),
    ).toEqual({ tipo: 'noEvaluable' })
  })

  it('esquema "directa" → noEvaluable', () => {
    expect(
      resolverCoherenciaDeCotasDeTanque({
        esquema: 'directa',
        granularidad: 'profesional',
        cotaPeloDeAguaMinimo_m: 11,
        desnivelConexion_m: 10,
      }),
    ).toEqual({ tipo: 'noEvaluable' })
  })

  it('falta alguna cota → noEvaluable (nunca advertencia con datos parciales)', () => {
    expect(
      resolverCoherenciaDeCotasDeTanque({ ...PROFESIONAL_TANQUE, cotaPeloDeAguaMinimo_m: 11, desnivelConexion_m: undefined }),
    ).toEqual({ tipo: 'noEvaluable' })
    expect(
      resolverCoherenciaDeCotasDeTanque({ ...PROFESIONAL_TANQUE, cotaPeloDeAguaMinimo_m: undefined, desnivelConexion_m: 10 }),
    ).toEqual({ tipo: 'noEvaluable' })
  })

  it('cotas negativas (bajo la acera): compara con signo, sin clamp', () => {
    expect(
      resolverCoherenciaDeCotasDeTanque({ ...PROFESIONAL_TANQUE, cotaPeloDeAguaMinimo_m: -0.5, desnivelConexion_m: -1 }),
    ).toEqual({
      tipo: 'peloEncimaDeLaAlimentacion',
      cotaPeloDeAguaMinimo_m: -0.5,
      desnivelAlimentacionTanque_m: -1,
    })
  })
})
