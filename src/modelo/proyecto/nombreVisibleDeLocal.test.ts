import { describe, it, expect } from 'vitest'
import type { Local } from './index'
import { nombrePersonalizadoDeLocal, nombreVisibleDeLocal } from './nombreVisibleDeLocal'

function localDeEjemplo(nombre?: string): Local {
  return { id: 'local-1', tipo: 'bano', artefactos: [], ...(nombre === undefined ? {} : { nombre }) }
}

describe('nombrePersonalizadoDeLocal', () => {
  it('sin `nombre` -> undefined', () => {
    expect(nombrePersonalizadoDeLocal(localDeEjemplo())).toBeUndefined()
  })

  it('`nombre` presente y no vacío -> recortado', () => {
    expect(nombrePersonalizadoDeLocal(localDeEjemplo('  Baño principal  '))).toBe('Baño principal')
  })

  it('`nombre` vacío o sólo espacios -> undefined (nunca se persiste string vacío)', () => {
    expect(nombrePersonalizadoDeLocal(localDeEjemplo(''))).toBeUndefined()
    expect(nombrePersonalizadoDeLocal(localDeEjemplo('   '))).toBeUndefined()
  })
})

describe('nombreVisibleDeLocal', () => {
  it('sin nombre personalizado -> usa la etiqueta automática que le pasan', () => {
    expect(nombreVisibleDeLocal(localDeEjemplo(), 'Baño 1')).toBe('Baño 1')
  })

  it('con nombre personalizado -> el personalizado gana sobre la etiqueta automática', () => {
    expect(nombreVisibleDeLocal(localDeEjemplo('Baño de invitados'), 'Baño 1')).toBe('Baño de invitados')
  })

  it('nombre personalizado vacío -> cae al automático (no un string vacío)', () => {
    expect(nombreVisibleDeLocal(localDeEjemplo('   '), 'Baño 1')).toBe('Baño 1')
  })
})
