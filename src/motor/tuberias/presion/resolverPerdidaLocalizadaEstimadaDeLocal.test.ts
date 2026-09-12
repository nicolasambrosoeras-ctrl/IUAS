import { describe, expect, it } from 'vitest'
import { fixture } from './hydEst.fixture'
import { resolverPerdidaLocalizadaEstimadaDeLocal } from './resolverPerdidaLocalizadaEstimadaDeLocal'
import { catalogoArtefactos } from '../../../normativa/eras-2023/catalogo-artefactos'
import { catalogoSistemasDeTuberia } from '../sistemaDeTuberia'
import type { Proyecto } from '../../../modelo/proyecto'

const resolver = (p: Proyecto, local = 'bano', red: 'AF' | 'AC' = 'AF') =>
  resolverPerdidaLocalizadaEstimadaDeLocal(p, 'uf', local, red, catalogoArtefactos, catalogoSistemasDeTuberia)

describe('HYD-EST: resumen Local/Red sin hf agregada', () => {
  it('devuelve cada camino con su pérdida propia; no hay hf total ni Vref', () => {
    const r = resolver(fixture())
    expect(r.nTerminalesLocal).toBe(2)
    expect(r.caminos).toHaveLength(2)
    expect(r).not.toHaveProperty('hf_m')
    expect(r).not.toHaveProperty('velocidadReferencia_mps')
    const [a, b] = r.caminos.map(c => c.resultado)
    if (a?.tipo !== 'estimada' || b?.tipo !== 'estimada') throw new Error('fixture incompleto')
    expect(a.hf_m).not.toBe(b.hf_m)
    expect(a.porSingularidad.filter(s => s.tipo === 'terminal')).toHaveLength(1)
    expect(b.porSingularidad.filter(s => s.tipo === 'terminal')).toHaveLength(1)
  })
  it('Local o red sin terminales no resuelve velocidades ni fabrica caminos', () => {
    expect(resolver(fixture(), 'inexistente')).toEqual({ nTerminalesLocal: 0, caminos: [] })
    expect(resolver(fixture(), 'bano', 'AC')).toEqual({ nTerminalesLocal: 0, caminos: [] })
  })
  it('1→3 deja todos sus caminos incompletos; nunca devuelve el antiguo K agregado', () => {
    const r = resolver(fixture(3))
    expect(r.caminos).toHaveLength(3)
    for (const c of r.caminos) {
      expect(c.resultado.tipo).toBe('incompleta')
      expect(c.resultado).not.toHaveProperty('hf_m')
      if (c.resultado.tipo !== 'incompleta') throw new Error('debe ser incompleta')
      expect(c.resultado.tramosNoResueltos[0]!.motivo).toBe('derivacionMultipleNoModelada')
    }
  })
  it('una única entrada no se inventa para dos alimentaciones independientes', () => {
    const p = fixture()
    const modificado = { ...p, redHidraulica: { ...p.redHidraulica!, tramos: p.redHidraulica!.tramos.filter(t => t.id !== 'comun').map(t => ({ ...t, nodoOrigenId: 'origen' })) } }
    for (const c of resolver(modificado).caminos) {
      expect(c.resultado).toMatchObject({ tipo: 'incompleta', tramosNoResueltos: [{ motivo: 'entradaLocalNoIdentificable' }] })
    }
  })
  it('el orden de declaración no cambia los caminos ni sus resultados', () => {
    const p = fixture(4)
    expect(resolver({ ...p, redHidraulica: { nodos: [...p.redHidraulica!.nodos].reverse(), tramos: [...p.redHidraulica!.tramos].reverse() } })).toEqual(resolver(p))
  })
})
