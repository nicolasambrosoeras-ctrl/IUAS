import { describe, it, expect } from 'vitest'
import type { UnidadFuncional } from '../../../modelo/proyecto'
import { resolverCotaTerminalEfectiva } from './resolverCotaTerminalEfectiva'

function uf(cotaHidraulicaReferencia_m: number | undefined): UnidadFuncional {
  return {
    id: 'uf-1',
    nombre: 'uf-1',
    locales: [],
    ...(cotaHidraulicaReferencia_m !== undefined ? { cotaHidraulicaReferencia_m } : {}),
  }
}

describe('resolverCotaTerminalEfectiva', () => {
  it("'profesional': devuelve la cota propia del Nodo terminal, ignorando la de la UF", () => {
    expect(resolverCotaTerminalEfectiva('profesional', uf(7), 3)).toBe(3)
  })

  it("'profesional': cota del Nodo terminal ausente -> undefined (nunca la de la UF)", () => {
    expect(resolverCotaTerminalEfectiva('profesional', uf(7), undefined)).toBeUndefined()
  })

  it("'simplificada': devuelve la cota de la UF, ignorando la del Nodo terminal", () => {
    expect(resolverCotaTerminalEfectiva('simplificada', uf(7), 3)).toBe(7)
  })

  it("'simplificada': cota de la UF ausente -> undefined, aunque el Nodo tenga una propia", () => {
    expect(resolverCotaTerminalEfectiva('simplificada', uf(undefined), 3)).toBeUndefined()
  })
})
