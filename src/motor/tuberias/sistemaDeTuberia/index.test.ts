import { describe, it, expect } from 'vitest'
import { catalogoSistemasDeTuberia, obtenerSistemaDeTuberia } from './index'

describe('catalogoSistemasDeTuberia', () => {
  it('tiene exactamente 1 sistema (N1: solo Acqua System Magnum PN20)', () => {
    expect(catalogoSistemasDeTuberia).toHaveLength(1)
  })

  it('id, denominación, material y fabricante del sistema', () => {
    const sistema = obtenerSistemaDeTuberia('acquaSystemMagnumPn20', catalogoSistemasDeTuberia)

    expect(sistema.id).toBe('acquaSystemMagnumPn20')
    expect(sistema.denominacion).toBe('Acqua System® Magnum PN20')
    expect(sistema.materialTuberiaId).toBe('ppr')
    expect(sistema.fabricante).toBe('Grupo Dema')
  })

  it('registra la fuente documental oficial del fabricante', () => {
    const sistema = obtenerSistemaDeTuberia('acquaSystemMagnumPn20', catalogoSistemasDeTuberia)

    expect(sistema.referenciaFuenteDimensiones).toContain('Grupo Dema')
    expect(sistema.referenciaFuenteDimensiones).toContain('grupodema.com.ar')
  })

  it('tiene exactamente 10 entradas comerciales', () => {
    const sistema = obtenerSistemaDeTuberia('acquaSystemMagnumPn20', catalogoSistemasDeTuberia)

    expect(sistema.entradas).toHaveLength(10)
  })

  it('denominaciones comerciales exactas, en orden', () => {
    const sistema = obtenerSistemaDeTuberia('acquaSystemMagnumPn20', catalogoSistemasDeTuberia)

    expect(sistema.entradas.map((entrada) => entrada.denominacionComercial)).toEqual([
      '20 mm',
      '25 mm',
      '32 mm',
      '40 mm',
      '50 mm',
      '63 mm',
      '75 mm',
      '90 mm',
      '110 mm',
      '125 mm',
    ])
  })

  it('diámetros interiores efectivos exactos (di publicado por el fabricante)', () => {
    const sistema = obtenerSistemaDeTuberia('acquaSystemMagnumPn20', catalogoSistemasDeTuberia)

    expect(sistema.entradas.map((entrada) => entrada.diametroInteriorEfectivo_mm)).toEqual([
      14.4, 18.0, 23.2, 29.0, 36.2, 45.8, 54.4, 65.4, 79.8, 88.9,
    ])
  })
})

describe('obtenerSistemaDeTuberia', () => {
  it('resuelve el sistema real del catálogo por id', () => {
    const sistema = obtenerSistemaDeTuberia('acquaSystemMagnumPn20', catalogoSistemasDeTuberia)

    expect(sistema.id).toBe('acquaSystemMagnumPn20')
  })

  it('id inexistente en el catálogo -> throw', () => {
    expect(() => obtenerSistemaDeTuberia('sistemaInexistente', catalogoSistemasDeTuberia)).toThrow(
      /no existe ningún SistemaDeTuberiaCatalogado con id "sistemaInexistente"/,
    )
  })

  it('catálogo deliberadamente vacío: id válido ausente -> throw', () => {
    expect(() => obtenerSistemaDeTuberia('acquaSystemMagnumPn20', [])).toThrow(
      /no existe ningún SistemaDeTuberiaCatalogado con id "acquaSystemMagnumPn20"/,
    )
  })
})
