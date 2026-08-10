// Tests de composicion: no vuelven a cubrir exhaustivamente el traversal
// A/B de determinarCondicionHidraulicaDeCaudal ni la seleccion
// quTotal/quFria/quCaliente de resolverQuEfectivo (ya cubiertos en sus
// propios archivos de test) -- solo verifican que ambas primitivas se
// encadenan correctamente y que sus errores se propagan sin traducir.
import { describe, it, expect } from 'vitest'
import type { Nodo, RedHidraulica, ReferenciaDeArtefacto, Tramo } from '../../../modelo/redHidraulica'
import type { ArtefactoNormativo } from '../../../normativa/eras-2023/catalogo-artefactos'
import { catalogoArtefactos } from '../../../normativa/eras-2023/catalogo-artefactos'
import { resolverQuEfectivoParaTramo } from './resolverQuEfectivoParaTramo'

function buscarEnCatalogo(id: string): ArtefactoNormativo {
  const artefacto = catalogoArtefactos.find((candidato) => candidato.id === id)
  if (artefacto === undefined) {
    throw new Error(`fixture de test: no existe "${id}" en catalogoArtefactos`)
  }
  return artefacto
}

function referenciaDe(unidadFuncionalId: string, localId: string, artefactoId: string): ReferenciaDeArtefacto {
  // artefactoId es identidad de instancia dentro del Proyecto, deliberadamente
  // distinto del id de catálogo ('lavatorio' abajo) -- no deben coincidir.
  return { tipo: 'artefacto', unidadFuncionalId, localId, artefactoId }
}

describe('resolverQuEfectivoParaTramo — tronco común de artefacto mixto (caso D)', () => {
  // t1 AF ──┬── t2 AF ──────────────→ lavatorio (n2)
  //         └── t3 AF → n3(ACS) → t4 AC ──→ lavatorio (n4, misma identidad que n2)
  const lavatorio = referenciaDe('uf-1', 'local-bano', 'inst-lavatorio')
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
  const lavatorioNormativo = buscarEnCatalogo('lavatorio')

  it('1. t1 (tronco común): condicion=total, qu_lps=quTotal_lps', () => {
    const resultado = resolverQuEfectivoParaTramo(red, 't1', lavatorio, lavatorioNormativo)

    expect(resultado.condicion).toBe('total')
    expect(resultado.qu_lps).toBe(lavatorioNormativo.quTotal_lps)
    expect(resultado.qu_lps).toBe(0.2)
  })

  it('2. t2 (rama AF directa): condicion=aguaFria, qu_lps=quFria_lps', () => {
    const resultado = resolverQuEfectivoParaTramo(red, 't2', lavatorio, lavatorioNormativo)

    expect(resultado.condicion).toBe('aguaFria')
    expect(resultado.qu_lps).toBe(lavatorioNormativo.quFria_lps)
    expect(resultado.qu_lps).toBe(0.08)
  })

  it('3. t3 (AF de alimentación al equipo ACS): condicion=aguaCaliente, qu_lps=quCaliente_lps (aunque el fluido siga frío)', () => {
    const resultado = resolverQuEfectivoParaTramo(red, 't3', lavatorio, lavatorioNormativo)

    expect(resultado.condicion).toBe('aguaCaliente')
    expect(resultado.qu_lps).toBe(lavatorioNormativo.quCaliente_lps)
    expect(resultado.qu_lps).toBe(0.12)
  })

  it('4. t4 (rama AC de salida): condicion=aguaCaliente, qu_lps=quCaliente_lps', () => {
    const resultado = resolverQuEfectivoParaTramo(red, 't4', lavatorio, lavatorioNormativo)

    expect(resultado.condicion).toBe('aguaCaliente')
    expect(resultado.qu_lps).toBe(0.12)
  })
})

describe('resolverQuEfectivoParaTramo — otros casos de composición', () => {
  it('5. artefacto exclusivamente frío: condicion=aguaFria, qu_lps=quFria_lps (sin depender de que coincida con quTotal)', () => {
    const maquinaLavavajillas = buscarEnCatalogo('maquinaLavavajillas')
    const referencia = referenciaDe('uf-1', 'local-cocina', 'inst-lavavajillas')
    const nodos: Nodo[] = [{ id: 'n0' }, { id: 'n1', referencia }]
    const tramos: Tramo[] = [{ id: 't0', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AF' }]
    const red: RedHidraulica = { nodos, tramos }

    const resultado = resolverQuEfectivoParaTramo(red, 't0', referencia, maquinaLavavajillas)

    expect(resultado.condicion).toBe('aguaFria')
    expect(resultado.qu_lps).toBe(maquinaLavavajillas.quFria_lps)
  })

  it('6. quCaliente_lps=null en catálogo: propaga el throw de resolverQuEfectivo', () => {
    const valvulaMingitorio = buscarEnCatalogo('valvulaMingitorio')
    expect(valvulaMingitorio.quCaliente_lps).toBeNull()

    const referencia = referenciaDe('uf-1', 'local-banoPublico', 'inst-mingitorio')
    const nodos: Nodo[] = [
      { id: 'n0' },
      { id: 'n1', referencia: { tipo: 'produccionACS' } },
      { id: 'n2', referencia },
    ]
    const tramos: Tramo[] = [
      { id: 't0', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AF' },
      { id: 't1', nodoOrigenId: 'n1', nodoDestinoId: 'n2', red: 'AC' },
    ]
    const red: RedHidraulica = { nodos, tramos }

    expect(() => resolverQuEfectivoParaTramo(red, 't0', referencia, valvulaMingitorio)).toThrow(/quCaliente_lps/)
  })

  it('7. artefacto no aguas abajo: propaga el throw de determinarCondicionHidraulicaDeCaudal', () => {
    const lavatorioNormativo = buscarEnCatalogo('lavatorio')
    const otraReferencia = referenciaDe('uf-1', 'local-bano', 'inst-otro')
    const referenciaBuscada = referenciaDe('uf-1', 'local-bano', 'inst-lavatorio')
    const nodos: Nodo[] = [{ id: 'n0' }, { id: 'n1', referencia: otraReferencia }]
    const tramos: Tramo[] = [{ id: 't0', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AF' }]
    const red: RedHidraulica = { nodos, tramos }

    expect(() => resolverQuEfectivoParaTramo(red, 't0', referenciaBuscada, lavatorioNormativo)).toThrow(
      /aguas abajo/,
    )
  })

  it('8. no muta RedHidraulica, ReferenciaDeArtefacto ni ArtefactoNormativo', () => {
    const lavatorioNormativo = buscarEnCatalogo('lavatorio')
    const referencia = referenciaDe('uf-1', 'local-bano', 'inst-lavatorio')
    const nodos: Nodo[] = [{ id: 'n0' }, { id: 'n1', referencia }]
    const tramos: Tramo[] = [{ id: 't0', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AF' }]
    const red: RedHidraulica = { nodos, tramos }

    const copiaRed = { nodos: [...red.nodos], tramos: [...red.tramos] }
    const copiaReferencia = { ...referencia }
    const copiaArtefactoNormativo = { ...lavatorioNormativo }

    resolverQuEfectivoParaTramo(red, 't0', referencia, lavatorioNormativo)

    expect(red).toEqual(copiaRed)
    expect(referencia).toEqual(copiaReferencia)
    expect(lavatorioNormativo).toEqual(copiaArtefactoNormativo)
  })
})

describe('resolverQuEfectivoParaTramo — CRIT-A15 (conectividad física exclusiva)', () => {
  it('9. lavatorio conectado físicamente solo a AF: qu_lps = quTotal_lps, no quFria_lps', () => {
    const lavatorioNormativo = buscarEnCatalogo('lavatorio')
    const referencia = referenciaDe('uf-1', 'local-bano', 'inst-lavatorio')
    const nodos: Nodo[] = [{ id: 'n0' }, { id: 'n1', referencia }]
    const tramos: Tramo[] = [{ id: 't0', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AF' }]
    const red: RedHidraulica = { nodos, tramos }

    const resultado = resolverQuEfectivoParaTramo(red, 't0', referencia, lavatorioNormativo)

    expect(resultado.condicion).toBe('aguaFria')
    expect(resultado.qu_lps).toBe(lavatorioNormativo.quTotal_lps)
    expect(resultado.qu_lps).toBe(0.2)
  })

  it('10. lavatorio conectado físicamente solo a AC (simétrico): qu_lps = quTotal_lps, no quCaliente_lps', () => {
    const lavatorioNormativo = buscarEnCatalogo('lavatorio')
    const referencia = referenciaDe('uf-1', 'local-bano', 'inst-lavatorio')
    const nodos: Nodo[] = [{ id: 'n0' }, { id: 'n1', referencia }]
    const tramos: Tramo[] = [{ id: 't0', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AC' }]
    const red: RedHidraulica = { nodos, tramos }

    const resultado = resolverQuEfectivoParaTramo(red, 't0', referencia, lavatorioNormativo)

    expect(resultado.condicion).toBe('aguaCaliente')
    expect(resultado.qu_lps).toBe(lavatorioNormativo.quTotal_lps)
    expect(resultado.qu_lps).toBe(0.2)
  })

  it('11. lavatorio conectado físicamente a AF y a AC (twin): cada rama conserva su fracción, sin override', () => {
    const lavatorioNormativo = buscarEnCatalogo('lavatorio')
    const referencia = referenciaDe('uf-1', 'local-bano', 'inst-lavatorio')
    const nodos: Nodo[] = [
      { id: 'n0' },
      { id: 'n1', referencia },
      { id: 'n2', referencia: { tipo: 'produccionACS' } },
      { id: 'n3', referencia },
    ]
    const tramos: Tramo[] = [
      { id: 't0', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AF' },
      { id: 't1', nodoOrigenId: 'n0', nodoDestinoId: 'n2', red: 'AF' },
      { id: 't2', nodoOrigenId: 'n2', nodoDestinoId: 'n3', red: 'AC' },
    ]
    const red: RedHidraulica = { nodos, tramos }

    const resultadoAF = resolverQuEfectivoParaTramo(red, 't0', referencia, lavatorioNormativo)
    const resultadoAC = resolverQuEfectivoParaTramo(red, 't2', referencia, lavatorioNormativo)

    expect(resultadoAF.condicion).toBe('aguaFria')
    expect(resultadoAF.qu_lps).toBe(0.08)
    expect(resultadoAC.condicion).toBe('aguaCaliente')
    expect(resultadoAC.qu_lps).toBe(0.12)
  })

  it('12. lavavajillas (CRIT-A7) conectado solo a AF: sigue dando quTotal_lps, sin que CRIT-A15 rompa CRIT-A7', () => {
    const lavavajillasNormativo = buscarEnCatalogo('maquinaLavavajillas')
    const referencia = referenciaDe('uf-1', 'local-cocina', 'inst-lavavajillas')
    const nodos: Nodo[] = [{ id: 'n0' }, { id: 'n1', referencia }]
    const tramos: Tramo[] = [{ id: 't0', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AF' }]
    const red: RedHidraulica = { nodos, tramos }

    const resultado = resolverQuEfectivoParaTramo(red, 't0', referencia, lavavajillasNormativo)

    expect(resultado.condicion).toBe('aguaFria')
    expect(resultado.qu_lps).toBe(0.2)
  })
})
