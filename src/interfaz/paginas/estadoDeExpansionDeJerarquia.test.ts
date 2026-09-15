import { describe, it, expect } from 'vitest'
import type { Local, Nivel } from '../../modelo/proyecto'
import {
  alternarEnConjunto,
  estadoInicialDeLocalesColapsados,
  estadoInicialDeNivelesColapsados,
} from './estadoDeExpansionDeJerarquia'

function nivelDeEjemplo(id: string): Nivel {
  return { id, nombre: id, locales: [] }
}

function localDeEjemplo(id: string): Local {
  return { id, tipo: 'bano', artefactos: [] }
}

describe('alternarEnConjunto', () => {
  it('agrega el id si no está', () => {
    const resultado = alternarEnConjunto(new Set(), 'a')
    expect(resultado.has('a')).toBe(true)
  })

  it('quita el id si ya está', () => {
    const resultado = alternarEnConjunto(new Set(['a']), 'a')
    expect(resultado.has('a')).toBe(false)
  })

  it('no muta el conjunto original (inmutable)', () => {
    const original = new Set(['a'])
    alternarEnConjunto(original, 'b')
    expect(original.has('b')).toBe(false)
  })
})

describe('estadoInicialDeNivelesColapsados (brief §9)', () => {
  it('0 niveles -> conjunto vacío', () => {
    expect(estadoInicialDeNivelesColapsados([]).size).toBe(0)
  })

  it('1 nivel -> conjunto vacío (nada que colapsar, sin chrome de colapso)', () => {
    expect(estadoInicialDeNivelesColapsados([nivelDeEjemplo('n1')]).size).toBe(0)
  })

  it('2+ niveles -> el nivel base (índice 0) queda abierto, el resto colapsado', () => {
    const niveles = [nivelDeEjemplo('n1'), nivelDeEjemplo('n2'), nivelDeEjemplo('n3')]
    const colapsados = estadoInicialDeNivelesColapsados(niveles)
    expect(colapsados.has('n1')).toBe(false)
    expect(colapsados.has('n2')).toBe(true)
    expect(colapsados.has('n3')).toBe(true)
  })
})

describe('estadoInicialDeLocalesColapsados (brief §13)', () => {
  it('0 locales -> conjunto vacío', () => {
    expect(estadoInicialDeLocalesColapsados([]).size).toBe(0)
  })

  it('1 local -> conjunto vacío', () => {
    expect(estadoInicialDeLocalesColapsados([localDeEjemplo('l1')]).size).toBe(0)
  })

  it('2+ locales -> el primero queda abierto, el resto colapsado', () => {
    const locales = [localDeEjemplo('l1'), localDeEjemplo('l2'), localDeEjemplo('l3')]
    const colapsados = estadoInicialDeLocalesColapsados(locales)
    expect(colapsados.has('l1')).toBe(false)
    expect(colapsados.has('l2')).toBe(true)
    expect(colapsados.has('l3')).toBe(true)
  })
})
