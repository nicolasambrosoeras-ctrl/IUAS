import { describe, it, expect } from 'vitest'
import { verificarVelocidadAdmisible } from './verificarVelocidadAdmisible'

describe('verificarVelocidadAdmisible — límites de diámetro (CRIT-A19)', () => {
  it('D=13 (límite inferior rango 1): dentro del dominio, no fuera de dominio', () => {
    expect(verificarVelocidadAdmisible(2, 13).tipo).not.toBe('fueraDeDominioNormativo')
  })

  it('D=60 (límite superior rango 1): dentro del dominio', () => {
    expect(verificarVelocidadAdmisible(2, 60).tipo).not.toBe('fueraDeDominioNormativo')
  })

  it('D=60.1: fuera del dominio (hueco 60-75)', () => {
    expect(verificarVelocidadAdmisible(2, 60.1)).toEqual({ tipo: 'fueraDeDominioNormativo' })
  })

  it('D=70: fuera del dominio (hueco 60-75)', () => {
    expect(verificarVelocidadAdmisible(2, 70)).toEqual({ tipo: 'fueraDeDominioNormativo' })
  })

  it('D=74.9: fuera del dominio (hueco 60-75)', () => {
    expect(verificarVelocidadAdmisible(2, 74.9)).toEqual({ tipo: 'fueraDeDominioNormativo' })
  })

  it('D=75 (límite inferior rango 2): dentro del dominio', () => {
    expect(verificarVelocidadAdmisible(1.8, 75).tipo).not.toBe('fueraDeDominioNormativo')
  })

  it('D=200 (límite superior rango 2): dentro del dominio', () => {
    expect(verificarVelocidadAdmisible(1.8, 200).tipo).not.toBe('fueraDeDominioNormativo')
  })

  it('D=12.9: fuera del dominio (por debajo de 13)', () => {
    expect(verificarVelocidadAdmisible(2, 12.9)).toEqual({ tipo: 'fueraDeDominioNormativo' })
  })

  it('D=200.1: fuera del dominio (por encima de 200)', () => {
    expect(verificarVelocidadAdmisible(1.8, 200.1)).toEqual({ tipo: 'fueraDeDominioNormativo' })
  })
})

describe('verificarVelocidadAdmisible — límites de velocidad, rango 13-60mm (D=25mm)', () => {
  it('V=1.0: admisible, límites 1 y 3', () => {
    expect(verificarVelocidadAdmisible(1.0, 25)).toEqual({
      tipo: 'admisible',
      limiteMinimo_mps: 1,
      limiteMaximo_mps: 3,
    })
  })

  it('V=3.0: admisible, límites 1 y 3', () => {
    expect(verificarVelocidadAdmisible(3.0, 25)).toEqual({
      tipo: 'admisible',
      limiteMinimo_mps: 1,
      limiteMaximo_mps: 3,
    })
  })

  it('V=0.999...: noAdmisible', () => {
    expect(verificarVelocidadAdmisible(0.9999999, 25)).toEqual({
      tipo: 'noAdmisible',
      limiteMinimo_mps: 1,
      limiteMaximo_mps: 3,
    })
  })

  it('V=3.001: noAdmisible', () => {
    expect(verificarVelocidadAdmisible(3.001, 25)).toEqual({
      tipo: 'noAdmisible',
      limiteMinimo_mps: 1,
      limiteMaximo_mps: 3,
    })
  })
})

describe('verificarVelocidadAdmisible — límites de velocidad, rango 75-200mm (D=100mm)', () => {
  it('V=1.5: admisible, límites 1.5 y 2', () => {
    expect(verificarVelocidadAdmisible(1.5, 100)).toEqual({
      tipo: 'admisible',
      limiteMinimo_mps: 1.5,
      limiteMaximo_mps: 2,
    })
  })

  it('V=2.0: admisible, límites 1.5 y 2', () => {
    expect(verificarVelocidadAdmisible(2.0, 100)).toEqual({
      tipo: 'admisible',
      limiteMinimo_mps: 1.5,
      limiteMaximo_mps: 2,
    })
  })

  it('V=1.499...: noAdmisible', () => {
    expect(verificarVelocidadAdmisible(1.4999999, 100)).toEqual({
      tipo: 'noAdmisible',
      limiteMinimo_mps: 1.5,
      limiteMaximo_mps: 2,
    })
  })

  it('V=2.001: noAdmisible', () => {
    expect(verificarVelocidadAdmisible(2.001, 100)).toEqual({
      tipo: 'noAdmisible',
      limiteMinimo_mps: 1.5,
      limiteMaximo_mps: 2,
    })
  })
})

describe('verificarVelocidadAdmisible — validaciones', () => {
  it('lanza excepción si velocidad_mps <= 0', () => {
    expect(() => verificarVelocidadAdmisible(0, 25)).toThrow()
    expect(() => verificarVelocidadAdmisible(-1, 25)).toThrow()
  })

  it('lanza excepción si diametroInteriorEfectivo_mm <= 0', () => {
    expect(() => verificarVelocidadAdmisible(2, 0)).toThrow()
    expect(() => verificarVelocidadAdmisible(2, -25)).toThrow()
  })
})
