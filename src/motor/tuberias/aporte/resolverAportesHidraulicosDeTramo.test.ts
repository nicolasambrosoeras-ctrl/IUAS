// Tests de composicion: no vuelven a cubrir exhaustivamente el traversal
// A/B de determinarCondicionHidraulicaDeCaudal ni la seleccion
// quTotal/quFria/quCaliente de resolverQuEfectivo (ya cubiertos en sus
// propios archivos) -- verifican que resolverAportesHidraulicosDeTramo
// arma correctamente los AporteHidraulicoDeTramo a partir de esas piezas.
import { describe, it, expect } from 'vitest'
import type { Artefacto, Local, UnidadFuncional } from '../../../modelo/proyecto'
import type { Nodo, RedHidraulica, Tramo } from '../../../modelo/redHidraulica'
import type { ArtefactoNormativo } from '../../../normativa/eras-2023/catalogo-artefactos'
import { catalogoArtefactos } from '../../../normativa/eras-2023/catalogo-artefactos'
import type { ArtefactoResuelto } from '../topologia/resolverArtefactosReferenciados'
import { resolverAportesHidraulicosDeTramo } from './resolverAportesHidraulicosDeTramo'

function artefactoResueltoCon(
  unidadFuncionalId: string,
  localId: string,
  idInstancia: string,
  artefactoIdCatalogo: string,
  cantidad: number,
): ArtefactoResuelto {
  const artefacto: Artefacto = { id: idInstancia, artefactoId: artefactoIdCatalogo, cantidad, origen: 'normativo' }
  const local: Local = { id: localId, tipo: 'bano', regimen: 'domiciliario', artefactos: [artefacto] }
  const unidadFuncional: UnidadFuncional = { id: unidadFuncionalId, nombre: unidadFuncionalId, locales: [local] }

  return {
    referencia: { tipo: 'artefacto', unidadFuncionalId, localId, artefactoId: idInstancia },
    unidadFuncional,
    local,
    artefacto,
  }
}

describe('resolverAportesHidraulicosDeTramo — tronco común de artefacto mixto (caso D)', () => {
  // t1 AF ──┬── t2 AF ──────────────→ lavatorio (n2)
  //         └── t3 AF → n3(ACS) → t4 AC ──→ lavatorio (n4, misma identidad que n2)
  const lavatorioResuelto = artefactoResueltoCon('uf-1', 'local-bano', 'inst-lavatorio', 'lavatorio', 1)
  const nodos: Nodo[] = [
    { id: 'n0' },
    { id: 'n1' },
    { id: 'n2', referencia: lavatorioResuelto.referencia },
    { id: 'n3', referencia: { tipo: 'produccionACS' } },
    { id: 'n4', referencia: lavatorioResuelto.referencia },
  ]
  const tramos: Tramo[] = [
    { id: 't1', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AF' },
    { id: 't2', nodoOrigenId: 'n1', nodoDestinoId: 'n2', red: 'AF' },
    { id: 't3', nodoOrigenId: 'n1', nodoDestinoId: 'n3', red: 'AF' },
    { id: 't4', nodoOrigenId: 'n3', nodoDestinoId: 'n4', red: 'AC' },
  ]
  const red: RedHidraulica = { nodos, tramos }

  it('1. t1 (tronco común): condicion=total, qu_lps=0.20, preserva artefactoResuelto por identidad', () => {
    const [aporte] = resolverAportesHidraulicosDeTramo([lavatorioResuelto], red, 't1', catalogoArtefactos)

    expect(aporte?.artefactoResuelto).toBe(lavatorioResuelto)
    expect(aporte?.cantidad).toBe(1)
    expect(aporte?.condicion).toBe('total')
    expect(aporte?.qu_lps).toBe(0.2)
  })

  it('2. t2 (rama AF directa): condicion=aguaFria, qu_lps=0.08', () => {
    const [aporte] = resolverAportesHidraulicosDeTramo([lavatorioResuelto], red, 't2', catalogoArtefactos)

    expect(aporte?.condicion).toBe('aguaFria')
    expect(aporte?.qu_lps).toBe(0.08)
  })

  it('3. t3 (AF de alimentación al equipo ACS): condicion=aguaCaliente, qu_lps=0.12', () => {
    const [aporte] = resolverAportesHidraulicosDeTramo([lavatorioResuelto], red, 't3', catalogoArtefactos)

    expect(aporte?.condicion).toBe('aguaCaliente')
    expect(aporte?.qu_lps).toBe(0.12)
  })

  it('4. t4 (rama AC de salida): condicion=aguaCaliente, qu_lps=0.12', () => {
    const [aporte] = resolverAportesHidraulicosDeTramo([lavatorioResuelto], red, 't4', catalogoArtefactos)

    expect(aporte?.condicion).toBe('aguaCaliente')
    expect(aporte?.qu_lps).toBe(0.12)
  })

  it('5. cantidad > 1: se preserva sin multiplicar contra qu_lps', () => {
    const lavatorioTriple = artefactoResueltoCon('uf-1', 'local-bano', 'inst-lavatorio', 'lavatorio', 3)
    const nodosConTriple: Nodo[] = [
      { id: 'n0' },
      { id: 'n1' },
      { id: 'n2', referencia: lavatorioTriple.referencia },
      { id: 'n3', referencia: { tipo: 'produccionACS' } },
      { id: 'n4', referencia: lavatorioTriple.referencia },
    ]
    const redConTriple: RedHidraulica = { nodos: nodosConTriple, tramos }

    const [aporte] = resolverAportesHidraulicosDeTramo([lavatorioTriple], redConTriple, 't1', catalogoArtefactos)

    expect(aporte?.cantidad).toBe(3)
    expect(aporte?.qu_lps).toBe(0.2)
  })
})

describe('resolverAportesHidraulicosDeTramo — otros casos', () => {
  it('6. múltiples artefactos: N entradas producen N aportes, en el mismo orden', () => {
    const a = artefactoResueltoCon('uf-1', 'local-a', 'inst-a', 'lavatorio', 1)
    const b = artefactoResueltoCon('uf-1', 'local-b', 'inst-b', 'inodoroDeposito', 1)
    const c = artefactoResueltoCon('uf-1', 'local-c', 'inst-c', 'bidet', 1)
    const nodos: Nodo[] = [
      { id: 'n0' },
      { id: 'n1' },
      { id: 'n2', referencia: a.referencia },
      { id: 'n3', referencia: b.referencia },
      { id: 'n4', referencia: c.referencia },
    ]
    // Los tres cuelgan del mismo tronco n1 (destino de t0), no de tramos
    // hermanos independientes: determinarCondicionHidraulicaDeCaudal solo
    // recorre aguas abajo del tramo evaluado.
    const tramos: Tramo[] = [
      { id: 't0', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AF' },
      { id: 't1', nodoOrigenId: 'n1', nodoDestinoId: 'n2', red: 'AF' },
      { id: 't2', nodoOrigenId: 'n1', nodoDestinoId: 'n3', red: 'AF' },
      { id: 't3', nodoOrigenId: 'n1', nodoDestinoId: 'n4', red: 'AF' },
    ]
    const red: RedHidraulica = { nodos, tramos }

    const aportes = resolverAportesHidraulicosDeTramo([a, b, c], red, 't0', catalogoArtefactos)

    expect(aportes).toHaveLength(3)
    expect(aportes[0]?.artefactoResuelto).toBe(a)
    expect(aportes[1]?.artefactoResuelto).toBe(b)
    expect(aportes[2]?.artefactoResuelto).toBe(c)
  })

  it('7. artefacto normativo inexistente en el catálogo recibido: lanza excepción', () => {
    const resuelto = artefactoResueltoCon('uf-1', 'local-a', 'inst-a', 'artefactoInexistente', 1)
    const nodos: Nodo[] = [{ id: 'n0' }, { id: 'n1', referencia: resuelto.referencia }]
    const tramos: Tramo[] = [{ id: 't0', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AF' }]
    const red: RedHidraulica = { nodos, tramos }

    expect(() => resolverAportesHidraulicosDeTramo([resuelto], red, 't0', catalogoArtefactos)).toThrow(
      /artefactoInexistente/,
    )
  })

  it('8. quCaliente_lps=null + conexión física exclusiva (CRIT-A15): el aporte usa quTotal_lps, sin lanzar', () => {
    // El catálogo no desagrega AF/AC para valvulaMingitorio (§2.9.1.3),
    // pero está conectado sólo a AC: CRIT-A15 fila "solo a AC" -> la única
    // cañería transporta el total. resolverQuEfectivoParaTramo resuelve la
    // conectividad antes de mirar el campo desagregado, así que el null no
    // se propaga (corrección del caso M2 "Lavavajillas industrial").
    const valvulaMingitorio = catalogoArtefactos.find((a) => a.id === 'valvulaMingitorio') as ArtefactoNormativo
    expect(valvulaMingitorio.quCaliente_lps).toBeNull()

    const resuelto = artefactoResueltoCon('uf-1', 'local-a', 'inst-a', 'valvulaMingitorio', 1)
    const nodos: Nodo[] = [
      { id: 'n0' },
      { id: 'n1', referencia: { tipo: 'produccionACS' } },
      { id: 'n2', referencia: resuelto.referencia },
    ]
    const tramos: Tramo[] = [
      { id: 't0', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AF' },
      { id: 't1', nodoOrigenId: 'n1', nodoDestinoId: 'n2', red: 'AC' },
    ]
    const red: RedHidraulica = { nodos, tramos }

    const aportes = resolverAportesHidraulicosDeTramo([resuelto], red, 't0', catalogoArtefactos)

    expect(aportes).toHaveLength(1)
    expect(aportes[0]?.condicion).toBe('aguaCaliente')
    expect(aportes[0]?.qu_lps).toBe(valvulaMingitorio.quTotal_lps)
  })

  it('8b. quFria/quCaliente=null + conexión física a AF y AC (D-δ.79): cada rama aporta quTotal_lps, el tramo común lo atribuye una sola vez', () => {
    const lavavajillasIndustrial = catalogoArtefactos.find((a) => a.id === 'lavavajillasIndustrial') as ArtefactoNormativo
    expect(lavavajillasIndustrial.quFria_lps).toBeNull()
    expect(lavavajillasIndustrial.quTotal_lps).toBe(0.4)

    const resuelto = artefactoResueltoCon('uf-1', 'local-a', 'inst-a', 'lavavajillasIndustrial', 1)
    const nodos: Nodo[] = [
      { id: 'n0' },
      { id: 'nTronco' },
      { id: 'n-af', referencia: resuelto.referencia },
      { id: 'n-acs', referencia: { tipo: 'produccionACS' } },
      { id: 'n-ac', referencia: resuelto.referencia },
    ]
    const tramos: Tramo[] = [
      { id: 'tTronco', nodoOrigenId: 'n0', nodoDestinoId: 'nTronco', red: 'AF' },
      { id: 'tRamaAF', nodoOrigenId: 'nTronco', nodoDestinoId: 'n-af', red: 'AF' },
      { id: 'tACSin', nodoOrigenId: 'nTronco', nodoDestinoId: 'n-acs', red: 'AF' },
      { id: 'tRamaAC', nodoOrigenId: 'n-acs', nodoDestinoId: 'n-ac', red: 'AC' },
    ]
    const red: RedHidraulica = { nodos, tramos }

    const ramaAF = resolverAportesHidraulicosDeTramo([resuelto], red, 'tRamaAF', catalogoArtefactos)
    expect(ramaAF[0]?.condicion).toBe('aguaFria')
    expect(ramaAF[0]?.qu_lps).toBe(0.4)

    const ramaAC = resolverAportesHidraulicosDeTramo([resuelto], red, 'tRamaAC', catalogoArtefactos)
    expect(ramaAC[0]?.condicion).toBe('aguaCaliente')
    expect(ramaAC[0]?.qu_lps).toBe(0.4)

    const tronco = resolverAportesHidraulicosDeTramo([resuelto], red, 'tTronco', catalogoArtefactos)
    expect(tronco[0]?.condicion).toBe('total')
    expect(tronco[0]?.qu_lps).toBe(0.4)
  })

  it('9. artefacto no aguas abajo del tramo: propaga el throw topológico', () => {
    const otro = artefactoResueltoCon('uf-1', 'local-a', 'inst-otro', 'inodoroDeposito', 1)
    const buscado = artefactoResueltoCon('uf-1', 'local-a', 'inst-lavatorio', 'lavatorio', 1)
    const nodos: Nodo[] = [{ id: 'n0' }, { id: 'n1', referencia: otro.referencia }]
    const tramos: Tramo[] = [{ id: 't0', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AF' }]
    const red: RedHidraulica = { nodos, tramos }

    expect(() => resolverAportesHidraulicosDeTramo([buscado], red, 't0', catalogoArtefactos)).toThrow(
      /aguas abajo/,
    )
  })

  it('10. no muta el array de entrada, ArtefactoResuelto, RedHidraulica ni catálogo', () => {
    const resuelto = artefactoResueltoCon('uf-1', 'local-a', 'inst-lavatorio', 'lavatorio', 1)
    const nodos: Nodo[] = [{ id: 'n0' }, { id: 'n1', referencia: resuelto.referencia }]
    const tramos: Tramo[] = [{ id: 't0', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AF' }]
    const red: RedHidraulica = { nodos, tramos }

    const entrada = [resuelto]
    const copiaEntrada = [...entrada]
    const copiaResuelto = { ...resuelto }
    const copiaRed = { nodos: [...red.nodos], tramos: [...red.tramos] }
    const copiaCatalogo = [...catalogoArtefactos]

    resolverAportesHidraulicosDeTramo(entrada, red, 't0', catalogoArtefactos)

    expect(entrada).toEqual(copiaEntrada)
    expect(resuelto).toEqual(copiaResuelto)
    expect(red).toEqual(copiaRed)
    expect(catalogoArtefactos).toEqual(copiaCatalogo)
  })
})
