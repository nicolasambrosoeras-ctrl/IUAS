import { describe, it, expect } from 'vitest'
import type { Artefacto } from '../../modelo/proyecto'
import { conTipoDeArtefactoCambiado } from './conTipoDeArtefactoCambiado'

const base = (overrides: Partial<Artefacto> = {}): Artefacto => ({
  id: 'inst-1',
  artefactoId: 'receptaculoDucha',
  cantidad: 1,
  origen: 'normativo',
  ...overrides,
})

describe('conTipoDeArtefactoCambiado (GEOM-UX-01 §7 + CAT-CONN-01 §9)', () => {
  it('cambia el artefactoId y conserva id / cantidad / origen', () => {
    const r = conTipoDeArtefactoCambiado(base({ cantidad: 3 }), 'bidet')
    expect(r).toMatchObject({ id: 'inst-1', artefactoId: 'bidet', cantidad: 3, origen: 'normativo' })
  })

  it('§7: el cambio de tipo ELIMINA el override de altura hidráulica del artefacto (adopta el default IUAS del tipo nuevo)', () => {
    const ducha = base({ artefactoId: 'receptaculoDucha', alturaHidraulicaSobrePiso_m: 2.15 })
    const bidet = conTipoDeArtefactoCambiado(ducha, 'bidet')
    expect(bidet.artefactoId).toBe('bidet')
    expect(bidet).not.toHaveProperty('alturaHidraulicaSobrePiso_m')
  })

  it('§7: si no había override de altura, sigue sin override', () => {
    const r = conTipoDeArtefactoCambiado(base(), 'lavatorio')
    expect(r).not.toHaveProperty('alturaHidraulicaSobrePiso_m')
  })

  it('sin conectividad explícita: limpia conectividadElegida del tipo anterior', () => {
    const r = conTipoDeArtefactoCambiado(base({ conectividadElegida: 'ambas' }), 'inodoroDeposito')
    expect(r).not.toHaveProperty('conectividadElegida')
  })

  it('con conectividad explícita: la fija (tipo requiereSeleccion recién declarado)', () => {
    const r = conTipoDeArtefactoCambiado(base(), 'lavarropasIndustrial', { conectividadElegida: 'soloAC' })
    expect(r.conectividadElegida).toBe('soloAC')
  })

  it('no muta el artefacto original', () => {
    const original = base({ alturaHidraulicaSobrePiso_m: 2.15, conectividadElegida: 'ambas' })
    conTipoDeArtefactoCambiado(original, 'bidet')
    expect(original.artefactoId).toBe('receptaculoDucha')
    expect(original.alturaHidraulicaSobrePiso_m).toBe(2.15)
    expect(original.conectividadElegida).toBe('ambas')
  })
})
