import { describe, it, expect } from 'vitest'
import type { RedHidraulica } from '../../modelo/redHidraulica'
import { asegurarRaizAC, asegurarRaizAF, esNodoRaizCompartida } from './asegurarRaizDeRed'

const REDHIDRAULICA_VACIA: RedHidraulica = { nodos: [], tramos: [] }

describe('asegurarRaizAF', () => {
  it('topología vacía: crea la Alimentación general desde cero (nodo origen + nodo AF + tramo)', () => {
    const resultado = asegurarRaizAF(REDHIDRAULICA_VACIA)

    expect(resultado.redHidraulica.nodos).toHaveLength(2)
    expect(resultado.redHidraulica.tramos).toHaveLength(1)
    const tramo = resultado.redHidraulica.tramos[0]!
    expect(tramo.nodoDestinoId).toBe(resultado.nodoId)
    expect(tramo.red).toBe('AF')
    // El nodo origen no tiene ningun tramo entrante (es la raiz real de toda la topologia).
    expect(resultado.redHidraulica.tramos.some((t) => t.nodoDestinoId === tramo.nodoOrigenId)).toBe(false)
  })

  it('ya existe una Alimentación general: la reutiliza sin crear nada nuevo', () => {
    const redHidraulica: RedHidraulica = {
      nodos: [{ id: 'n-general' }, { id: 'n-0' }],
      tramos: [{ id: 't-general', nodoOrigenId: 'n-general', nodoDestinoId: 'n-0', red: 'AF' }],
    }

    const resultado = asegurarRaizAF(redHidraulica)

    expect(resultado.nodoId).toBe('n-0')
    expect(resultado.redHidraulica).toBe(redHidraulica)
  })

  it('ids generados son unicos entre llamadas sucesivas', () => {
    const r1 = asegurarRaizAF(REDHIDRAULICA_VACIA)
    const r2 = asegurarRaizAF(REDHIDRAULICA_VACIA)
    expect(r1.nodoId).not.toBe(r2.nodoId)
  })
})

describe('asegurarRaizAC', () => {
  it('sin Alimentación general ni ACS: crea AMBAS (AC depende de AF)', () => {
    const resultado = asegurarRaizAC(REDHIDRAULICA_VACIA)

    // 2 nodos de AF (general + n-0) + 1 nodo AC (produccionACS) = 3
    expect(resultado.redHidraulica.nodos).toHaveLength(3)
    // t-general (AF) + t-af-acs (AF, hacia produccionACS) = 2
    expect(resultado.redHidraulica.tramos).toHaveLength(2)

    const nodoAcs = resultado.redHidraulica.nodos.find((n) => n.id === resultado.nodoId)
    expect(nodoAcs?.referencia).toEqual({ tipo: 'produccionACS' })

    const tramoHaciaAcs = resultado.redHidraulica.tramos.find((t) => t.nodoDestinoId === resultado.nodoId)
    expect(tramoHaciaAcs?.red).toBe('AF') // D-δ.7: la Alimentación ACS es un tramo AF

    expect(validarRedHidraulicaMinima(resultado.redHidraulica)).toEqual([])
  })

  it('ya existe Alimentación general pero NO Alimentación ACS: crea solo ACS, colgada de la raíz AF existente', () => {
    const redHidraulica: RedHidraulica = {
      nodos: [{ id: 'n-general' }, { id: 'n-0' }],
      tramos: [{ id: 't-general', nodoOrigenId: 'n-general', nodoDestinoId: 'n-0', red: 'AF' }],
    }

    const resultado = asegurarRaizAC(redHidraulica)

    expect(resultado.redHidraulica.nodos).toHaveLength(3) // n-general, n-0 + n-acs
    const tramoHaciaAcs = resultado.redHidraulica.tramos.find((t) => t.nodoDestinoId === resultado.nodoId)
    expect(tramoHaciaAcs?.nodoOrigenId).toBe('n-0') // cuelga de la raiz AF ya existente, no crea una nueva
  })

  it('ya existe Alimentación ACS: la reutiliza sin crear nada nuevo', () => {
    const redHidraulica: RedHidraulica = {
      nodos: [{ id: 'n-general' }, { id: 'n-0' }, { id: 'n-acs', referencia: { tipo: 'produccionACS' } }],
      tramos: [
        { id: 't-general', nodoOrigenId: 'n-general', nodoDestinoId: 'n-0', red: 'AF' },
        { id: 't-af-acs', nodoOrigenId: 'n-0', nodoDestinoId: 'n-acs', red: 'AF' },
      ],
    }

    const resultado = asegurarRaizAC(redHidraulica)

    expect(resultado.nodoId).toBe('n-acs')
    expect(resultado.redHidraulica).toBe(redHidraulica)
  })
})

describe('esNodoRaizCompartida', () => {
  const redHidraulica: RedHidraulica = {
    nodos: [
      { id: 'n-general' },
      { id: 'n-0' },
      { id: 'n-acs', referencia: { tipo: 'produccionACS' } },
      { id: 'n-af-1' },
    ],
    tramos: [
      { id: 't-general', nodoOrigenId: 'n-general', nodoDestinoId: 'n-0', red: 'AF' },
      { id: 't-af-acs', nodoOrigenId: 'n-0', nodoDestinoId: 'n-acs', red: 'AF' },
      { id: 't-af-1', nodoOrigenId: 'n-0', nodoDestinoId: 'n-af-1', red: 'AF' },
    ],
  }

  it('la raíz AF (destino de la Alimentación general) es compartida', () => {
    expect(esNodoRaizCompartida(redHidraulica, 'n-0')).toBe(true)
  })

  it('la raíz AC (destino de la Alimentación ACS) es compartida, aunque hoy tenga un único hijo', () => {
    expect(esNodoRaizCompartida(redHidraulica, 'n-acs')).toBe(true)
  })

  it('un nodo de bifurcación dedicado de un Local NO es compartido', () => {
    expect(esNodoRaizCompartida(redHidraulica, 'n-af-1')).toBe(false)
  })

  it('un nodo inexistente no es compartido', () => {
    expect(esNodoRaizCompartida(redHidraulica, 'inexistente')).toBe(false)
  })
})

// Helper minimo: valida solo unicidad estructural basica (no depende de
// Proyecto/UF) para las aserciones de este archivo.
function validarRedHidraulicaMinima(redHidraulica: RedHidraulica): string[] {
  const problemas: string[] = []
  const idsNodos = new Set<string>()
  for (const nodo of redHidraulica.nodos) {
    if (idsNodos.has(nodo.id)) problemas.push(`nodo duplicado: ${nodo.id}`)
    idsNodos.add(nodo.id)
  }
  const idsTramos = new Set<string>()
  for (const tramo of redHidraulica.tramos) {
    if (idsTramos.has(tramo.id)) problemas.push(`tramo duplicado: ${tramo.id}`)
    idsTramos.add(tramo.id)
    if (!idsNodos.has(tramo.nodoOrigenId)) problemas.push(`tramo ${tramo.id}: origen inexistente`)
    if (!idsNodos.has(tramo.nodoDestinoId)) problemas.push(`tramo ${tramo.id}: destino inexistente`)
  }
  return problemas
}
