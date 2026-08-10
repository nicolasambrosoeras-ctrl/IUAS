import { describe, it, expect } from 'vitest'
import type { Nodo, RedHidraulica, ReferenciaDeArtefacto, Tramo } from '../../../modelo/redHidraulica'
import { determinarCondicionHidraulicaDeCaudal } from './determinarCondicionHidraulicaDeCaudal'

function referenciaDe(unidadFuncionalId: string, localId: string, artefactoId: string): ReferenciaDeArtefacto {
  return { tipo: 'artefacto', unidadFuncionalId, localId, artefactoId }
}

describe('determinarCondicionHidraulicaDeCaudal — caso D central (tronco AF + split directo/ACS)', () => {
  // t1 AF ──┬── t2 AF ──────────────→ lavatorio (n2)
  //         └── t3 AF → n3(ACS) → t4 AC ──→ lavatorio (n4, misma identidad que n2)
  const lavatorio = referenciaDe('uf-1', 'local-bano', 'lavatorio')
  const nodos: Nodo[] = [
    { id: 'n0' },
    { id: 'n1' },
    { id: 'n2', referencia: lavatorio },
    { id: 'n3', referencia: { tipo: 'produccionACS' } },
    { id: 'n4', referencia: lavatorio },
  ]
  const tramos: Tramo[] = [
    { id: 't1', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AF' },
    { id: 't2', nodoOrigenId: 'n1', nodoDestinoId: 'n2', red: 'AF' },
    { id: 't3', nodoOrigenId: 'n1', nodoDestinoId: 'n3', red: 'AF' },
    { id: 't4', nodoOrigenId: 'n3', nodoDestinoId: 'n4', red: 'AC' },
  ]
  const red: RedHidraulica = { nodos, tramos }

  it('t1 (tronco común, antes del split): total', () => {
    expect(determinarCondicionHidraulicaDeCaudal(red, 't1', lavatorio)).toBe('total')
  })

  it('t2 (rama AF directa, después del split): aguaFria', () => {
    expect(determinarCondicionHidraulicaDeCaudal(red, 't2', lavatorio)).toBe('aguaFria')
  })

  it('t3 (AF de alimentación directa al equipo ACS): aguaCaliente', () => {
    expect(determinarCondicionHidraulicaDeCaudal(red, 't3', lavatorio)).toBe('aguaCaliente')
  })

  it('t4 (AC de salida del equipo): aguaCaliente', () => {
    expect(determinarCondicionHidraulicaDeCaudal(red, 't4', lavatorio)).toBe('aguaCaliente')
  })
})

describe('determinarCondicionHidraulicaDeCaudal — casos adicionales', () => {
  it('1. AF simple hacia un único artefacto: aguaFria (la función no consulta quFria===quTotal del catálogo)', () => {
    const inodoro = referenciaDe('uf-1', 'local-bano', 'inodoro')
    const nodos: Nodo[] = [{ id: 'n0' }, { id: 'n1', referencia: inodoro }]
    const tramos: Tramo[] = [{ id: 't0', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AF' }]
    const red: RedHidraulica = { nodos, tramos }

    expect(determinarCondicionHidraulicaDeCaudal(red, 't0', inodoro)).toBe('aguaFria')
  })

  it('2. mismo Tramo, dos Artefactos distintos: condiciones distintas (la condición es del par, no del tramo)', () => {
    // T0 AF ──┬── inodoro (AF exclusiva)
    //         ├── lavatorio (AF directa)
    //         └── produccionACS → AC → lavatorio (misma identidad)
    const inodoro = referenciaDe('uf-1', 'local-bano', 'inodoro')
    const lavatorio = referenciaDe('uf-1', 'local-bano', 'lavatorio')
    const nodos: Nodo[] = [
      { id: 'n0' },
      { id: 'n1' },
      { id: 'n2', referencia: inodoro },
      { id: 'n3', referencia: lavatorio },
      { id: 'n4', referencia: { tipo: 'produccionACS' } },
      { id: 'n5', referencia: lavatorio },
    ]
    const tramos: Tramo[] = [
      { id: 't0', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AF' },
      { id: 't1', nodoOrigenId: 'n1', nodoDestinoId: 'n2', red: 'AF' },
      { id: 't2', nodoOrigenId: 'n1', nodoDestinoId: 'n3', red: 'AF' },
      { id: 't3', nodoOrigenId: 'n1', nodoDestinoId: 'n4', red: 'AF' },
      { id: 't4', nodoOrigenId: 'n4', nodoDestinoId: 'n5', red: 'AC' },
    ]
    const red: RedHidraulica = { nodos, tramos }

    expect(determinarCondicionHidraulicaDeCaudal(red, 't0', inodoro)).toBe('aguaFria')
    expect(determinarCondicionHidraulicaDeCaudal(red, 't0', lavatorio)).toBe('total')
  })

  it('3. artefacto mixto alcanzable solo por AF (sin ninguna ruta ACS en la red): aguaFria, no compensa topología incompleta', () => {
    const lavatorio = referenciaDe('uf-1', 'local-bano', 'lavatorio')
    const nodos: Nodo[] = [{ id: 'n0' }, { id: 'n1', referencia: lavatorio }]
    const tramos: Tramo[] = [{ id: 't0', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AF' }]
    const red: RedHidraulica = { nodos, tramos }

    expect(determinarCondicionHidraulicaDeCaudal(red, 't0', lavatorio)).toBe('aguaFria')
  })

  it('4. única ruta hacia el artefacto es vía produccionACS: aguaCaliente', () => {
    const lavatorio = referenciaDe('uf-1', 'local-bano', 'lavatorio')
    const nodos: Nodo[] = [
      { id: 'n0' },
      { id: 'n1', referencia: { tipo: 'produccionACS' } },
      { id: 'n2', referencia: lavatorio },
    ]
    const tramos: Tramo[] = [
      { id: 't0', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AF' },
      { id: 't1', nodoOrigenId: 'n1', nodoDestinoId: 'n2', red: 'AC' },
    ]
    const red: RedHidraulica = { nodos, tramos }

    expect(determinarCondicionHidraulicaDeCaudal(red, 't0', lavatorio)).toBe('aguaCaliente')
  })

  it('5. tramo AC: aguaCaliente, sin exigir ancestro produccionACS en este slice', () => {
    const lavatorio = referenciaDe('uf-1', 'local-bano', 'lavatorio')
    const nodos: Nodo[] = [{ id: 'n0' }, { id: 'n1', referencia: lavatorio }]
    // AC declarado sin ningún nodo produccionACS en la red: la validación
    // actual no exige esa invariante y esta función no la impone tampoco.
    const tramos: Tramo[] = [{ id: 't0', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AC' }]
    const red: RedHidraulica = { nodos, tramos }

    expect(determinarCondicionHidraulicaDeCaudal(red, 't0', lavatorio)).toBe('aguaCaliente')
  })

  it('6. artefacto no alcanzable aguas abajo del tramo: lanza excepción', () => {
    const otroArtefacto = referenciaDe('uf-1', 'local-bano', 'inodoro')
    const artefactoNoPresente = referenciaDe('uf-1', 'local-bano', 'lavatorio')
    const nodos: Nodo[] = [{ id: 'n0' }, { id: 'n1', referencia: otroArtefacto }]
    const tramos: Tramo[] = [{ id: 't0', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AF' }]
    const red: RedHidraulica = { nodos, tramos }

    expect(() => determinarCondicionHidraulicaDeCaudal(red, 't0', artefactoNoPresente)).toThrow(/aguas abajo/)
  })

  it('7. misma artefactoId/localId en dos UF distintas: identidad completa distingue correctamente', () => {
    const refUf1 = referenciaDe('uf-1', 'local-x', 'artefacto-x')
    const refUf2 = referenciaDe('uf-2', 'local-x', 'artefacto-x')
    const nodos: Nodo[] = [
      { id: 'n0' },
      { id: 'n1', referencia: refUf1 },
      { id: 'n2', referencia: refUf2 },
    ]
    const tramos: Tramo[] = [
      { id: 't0', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AF' },
      { id: 't1', nodoOrigenId: 'n0', nodoDestinoId: 'n2', red: 'AF' },
    ]
    const red: RedHidraulica = { nodos, tramos }

    expect(determinarCondicionHidraulicaDeCaudal(red, 't0', refUf1)).toBe('aguaFria')
    expect(() => determinarCondicionHidraulicaDeCaudal(red, 't0', refUf2)).toThrow(/aguas abajo/)
  })

  it('8. reconvergencia directa + vía ACS en un nodo intermedio (no el artefacto): total', () => {
    // n1 ──┬── n2 (AF, directa) ──┐
    //      └── n3(ACS) → n4 (AC) ─┴── n5 (unión, sin referencia) → n6 (artefacto)
    const lavatorio = referenciaDe('uf-1', 'local-bano', 'lavatorio')
    const nodos: Nodo[] = [
      { id: 'n0' },
      { id: 'n1' },
      { id: 'n2' },
      { id: 'n3', referencia: { tipo: 'produccionACS' } },
      { id: 'n4' },
      { id: 'n5' },
      { id: 'n6', referencia: lavatorio },
    ]
    const tramos: Tramo[] = [
      { id: 't0', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AF' },
      { id: 't1', nodoOrigenId: 'n1', nodoDestinoId: 'n2', red: 'AF' },
      { id: 't2', nodoOrigenId: 'n1', nodoDestinoId: 'n3', red: 'AF' },
      { id: 't3', nodoOrigenId: 'n3', nodoDestinoId: 'n4', red: 'AC' },
      { id: 't4', nodoOrigenId: 'n2', nodoDestinoId: 'n5', red: 'AF' },
      { id: 't5', nodoOrigenId: 'n4', nodoDestinoId: 'n5', red: 'AC' },
      { id: 't6', nodoOrigenId: 'n5', nodoDestinoId: 'n6', red: 'AF' },
    ]
    const red: RedHidraulica = { nodos, tramos }

    expect(determinarCondicionHidraulicaDeCaudal(red, 't0', lavatorio)).toBe('total')
  })

  it('9. ciclo en la topología: termina y clasifica correctamente sin loop infinito', () => {
    // n1 ──t1──→ n2 ──t2──→ n1 (ciclo)
    // n1 ──t3──→ n3 (artefacto)
    const inodoro = referenciaDe('uf-1', 'local-bano', 'inodoro')
    const nodos: Nodo[] = [{ id: 'n0' }, { id: 'n1' }, { id: 'n2' }, { id: 'n3', referencia: inodoro }]
    const tramos: Tramo[] = [
      { id: 't0', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AF' },
      { id: 't1', nodoOrigenId: 'n1', nodoDestinoId: 'n2', red: 'AF' },
      { id: 't2', nodoOrigenId: 'n2', nodoDestinoId: 'n1', red: 'AF' },
      { id: 't3', nodoOrigenId: 'n1', nodoDestinoId: 'n3', red: 'AF' },
    ]
    const red: RedHidraulica = { nodos, tramos }

    expect(determinarCondicionHidraulicaDeCaudal(red, 't0', inodoro)).toBe('aguaFria')
  })

  it('10. tramoId inexistente: lanza excepción', () => {
    const red: RedHidraulica = { nodos: [], tramos: [] }
    const artefacto = referenciaDe('uf-1', 'local-bano', 'inodoro')

    expect(() => determinarCondicionHidraulicaDeCaudal(red, 'tramo-inexistente', artefacto)).toThrow(
      /tramo-inexistente/,
    )
  })
})
