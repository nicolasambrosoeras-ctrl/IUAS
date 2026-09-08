import { describe, it, expect } from 'vitest'
import type { EsquemaDeAbastecimiento } from '../../modelo/proyecto'
import { resolverOrigenHidraulicoEfectivo } from './resolverOrigenHidraulico'

describe('resolverOrigenHidraulicoEfectivo (M4-G / D-δ.68)', () => {
  it('G1: mapeo de los tres esquemas a los dos orígenes', () => {
    expect(resolverOrigenHidraulicoEfectivo('directa')).toBe('directa')
    expect(resolverOrigenHidraulicoEfectivo('tanqueElevado')).toBe('tanqueElevado')
    expect(resolverOrigenHidraulicoEfectivo('cisternaBombeoElevado')).toBe('tanqueElevado')
  })

  it('G3 (núcleo): tanqueElevado y cisternaBombeoElevado producen EL MISMO origen efectivo', () => {
    expect(resolverOrigenHidraulicoEfectivo('cisternaBombeoElevado')).toBe(
      resolverOrigenHidraulicoEfectivo('tanqueElevado'),
    )
  })

  it('esquema desconocido en runtime (JSON corrupto) -> throw controlado, nunca un valor fuera del tipo', () => {
    expect(() =>
      resolverOrigenHidraulicoEfectivo('bombeoDirecto' as unknown as EsquemaDeAbastecimiento),
    ).toThrow(/esquema no reconocido/)
  })

  it('sólo devuelve "directa" o "tanqueElevado"', () => {
    const esquemas: readonly EsquemaDeAbastecimiento[] = ['directa', 'tanqueElevado', 'cisternaBombeoElevado']
    for (const esquema of esquemas) {
      expect(['directa', 'tanqueElevado']).toContain(resolverOrigenHidraulicoEfectivo(esquema))
    }
  })
})
