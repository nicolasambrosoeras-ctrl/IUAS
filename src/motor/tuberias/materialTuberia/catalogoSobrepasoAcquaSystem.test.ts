import { describe, it, expect } from 'vitest'
import { resolverProductoSobrepasoAcquaSystem } from './catalogoSobrepasoAcquaSystem'

describe('resolverProductoSobrepasoAcquaSystem', () => {
  it.each([
    ['20 mm', '08-084020000'],
    ['25 mm', '08-084025000'],
    ['32 mm', '08-084032000'],
  ])('DN %s resuelve el código de fábrica %s', (dnComercial, codigoEsperado) => {
    const resultado = resolverProductoSobrepasoAcquaSystem(dnComercial)
    expect(resultado).toEqual({ tipo: 'resuelto', producto: { dnComercial, codigo: codigoEsperado } })
  })

  it.each(['40 mm', '10 mm', '110 mm'])('DN %s no comercializado -> dnNoDisponible, nunca un código inventado', (dnComercial) => {
    const resultado = resolverProductoSobrepasoAcquaSystem(dnComercial)
    expect(resultado).toEqual({ tipo: 'dnNoDisponible', dnComercial })
  })
})
