import { describe, it, expect } from 'vitest'
import { tablaOficialAcquaSystem, obtenerFilaOficialAcquaSystem } from './tablaOficialAcquaSystem'

const VALORES_OFICIALES: readonly [string, string, number][] = [
  ['1', 'Unión normal', 0.25],
  ['2', 'Buje de reducción de diámetros inmediatos', 0.55],
  ['2a', 'Buje de reducción de diámetros mediatos', 0.85],
  ['3', 'Codo a 90°', 2.0],
  ['4', 'Codo a 45°', 0.6],
  ['5', 'Tee normal: entrada por extremo y salidas por continuación y ramal', 1.8],
  ['5a', 'Tee reducida: entrada por extremo y salidas por continuación y ramal', 3.6],
  ['6', 'Tee normal: entradas por extremo y ramal; salida por el otro extremo', 1.3],
  ['6a', 'Tee reducida: entradas por extremo y ramal; salida por el otro extremo', 2.6],
  ['7', 'Tee normal: entradas por ambos extremos; salida por el ramal', 4.2],
  ['7a', 'Tee reducida: entradas por ambos extremos; salida por el ramal', 9.0],
  ['8', 'Tee normal: entrada por el ramal; salidas por ambos extremos', 2.2],
  ['8a', 'Tee reducida: entrada por el ramal; salidas por ambos extremos', 5.0],
  ['9', 'Tee con rosca central metálica', 0.8],
  ['10', 'Tubo macho o tubo hembra', 0.4],
  ['11', 'Codo con rosca metálica', 2.2],
]

describe('tablaOficialAcquaSystem', () => {
  it('contiene exactamente los 16 valores oficiales publicados en el manual (pág. 34)', () => {
    expect(tablaOficialAcquaSystem.length).toBe(16)
  })

  it.each(VALORES_OFICIALES)('fila %s (%s): R=%s', (numero, nombre, r) => {
    const fila = obtenerFilaOficialAcquaSystem(numero as never)
    expect(fila.nombreFabricante).toBe(nombre)
    expect(fila.r).toBeCloseTo(r, 6)
  })

  it('no existen valores oficiales Acqua no contenidos en la tabla (los 16 números son exactamente los publicados)', () => {
    const numeros = tablaOficialAcquaSystem.map((fila) => fila.numero).sort()
    const numerosEsperados = VALORES_OFICIALES.map(([numero]) => numero).sort()
    expect(numeros).toEqual(numerosEsperados)
  })

  it('obtenerFilaOficialAcquaSystem lanza para un número inexistente', () => {
    expect(() => obtenerFilaOficialAcquaSystem('99' as never)).toThrow()
  })
})
