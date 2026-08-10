// Tests de composicion/regla de filtrado: no repiten exhaustivamente el
// traversal de determinarCondicionHidraulicaDeCaudal ni la seleccion de
// resolverQuEfectivo (ya cubiertos en sus propios archivos) -- verifican
// que esta funcion decide activo/no-activo correctamente y respeta la
// frontera de responsabilidad (no aplica CRIT-A8, no construye aportes).
import { describe, it, expect } from 'vitest'
import type { Artefacto, Local, UnidadFuncional } from '../../../modelo/proyecto'
import type { Nodo, RedHidraulica, Tramo } from '../../../modelo/redHidraulica'
import type { ArtefactoNormativo } from '../../../normativa/eras-2023/catalogo-artefactos'
import { catalogoArtefactos } from '../../../normativa/eras-2023/catalogo-artefactos'
import type { ArtefactoResuelto } from '../topologia/resolverArtefactosReferenciados'
import { filtrarArtefactosHidraulicamenteActivos } from './filtrarArtefactosHidraulicamenteActivos'

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

describe('filtrarArtefactosHidraulicamenteActivos — caso D (tronco AF + split directo/ACS)', () => {
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

  it('1. condicion=total (t1): qu_lps=0.20>0, se conserva', () => {
    const resultado = filtrarArtefactosHidraulicamenteActivos([lavatorioResuelto], red, 't1', catalogoArtefactos)

    expect(resultado).toEqual([lavatorioResuelto])
  })

  it('2. condicion=aguaFria (t2): qu_lps=0.08>0, se conserva', () => {
    const resultado = filtrarArtefactosHidraulicamenteActivos([lavatorioResuelto], red, 't2', catalogoArtefactos)

    expect(resultado).toEqual([lavatorioResuelto])
  })

  it('3. condicion=aguaCaliente (t4): qu_lps=0.12>0, se conserva', () => {
    const resultado = filtrarArtefactosHidraulicamenteActivos([lavatorioResuelto], red, 't4', catalogoArtefactos)

    expect(resultado).toEqual([lavatorioResuelto])
  })
})

describe('filtrarArtefactosHidraulicamenteActivos — cero explícito (CRIT-A13 revisado)', () => {
  const inodoroResuelto = artefactoResueltoCon('uf-1', 'local-bano', 'inst-inodoro', 'inodoroValvula', 1)
  const lavatorioResuelto = artefactoResueltoCon('uf-1', 'local-bano', 'inst-lavatorio', 'lavatorio', 1)
  const bidetResuelto = artefactoResueltoCon('uf-1', 'local-bano', 'inst-bidet', 'bidet', 1)

  const nodos: Nodo[] = [
    { id: 'n0' },
    { id: 'n1', referencia: inodoroResuelto.referencia },
    { id: 'n2', referencia: lavatorioResuelto.referencia },
    { id: 'n3', referencia: bidetResuelto.referencia },
  ]
  const tramos: Tramo[] = [
    { id: 't0', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AC' },
    { id: 't1', nodoOrigenId: 'n0', nodoDestinoId: 'n2', red: 'AC' },
    { id: 't2', nodoOrigenId: 'n0', nodoDestinoId: 'n3', red: 'AC' },
  ]
  const red: RedHidraulica = { nodos, tramos }

  it('4. inodoroValvula en aguaCaliente (quCaliente=0): se excluye', () => {
    const resultado = filtrarArtefactosHidraulicamenteActivos([inodoroResuelto], red, 't0', catalogoArtefactos)

    expect(resultado).toEqual([])
  })

  it('5. mezcla positivos y cero: preserva orden relativo, excluye solo el cero', () => {
    const resultado = filtrarArtefactosHidraulicamenteActivos(
      [inodoroResuelto, lavatorioResuelto, bidetResuelto],
      red,
      't0',
      catalogoArtefactos,
    )

    expect(resultado).toEqual([lavatorioResuelto, bidetResuelto])
  })

  it('6. prepara CRIT-A8: Local con inodoroValvula + lavatorio en aguaCaliente devuelve solo [lavatorio], sin aplicar CRIT-A8 ella misma', () => {
    const resultado = filtrarArtefactosHidraulicamenteActivos(
      [inodoroResuelto, lavatorioResuelto],
      red,
      't0',
      catalogoArtefactos,
    )

    expect(resultado).toEqual([lavatorioResuelto])
  })
})

describe('filtrarArtefactosHidraulicamenteActivos — otros casos', () => {
  it('7. cantidad > 1: permanece como un único ArtefactoResuelto, cantidad intacta', () => {
    const lavatorioTriple = artefactoResueltoCon('uf-1', 'local-bano', 'inst-lavatorio', 'lavatorio', 3)
    const nodos: Nodo[] = [{ id: 'n0' }, { id: 'n1', referencia: lavatorioTriple.referencia }]
    const tramos: Tramo[] = [{ id: 't0', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AF' }]
    const red: RedHidraulica = { nodos, tramos }

    const resultado = filtrarArtefactosHidraulicamenteActivos([lavatorioTriple], red, 't0', catalogoArtefactos)

    expect(resultado).toHaveLength(1)
    expect(resultado[0]?.artefacto.cantidad).toBe(3)
  })

  it('8. todos con qu_lps=0: devuelve [] sin lanzar', () => {
    const inodoroResuelto = artefactoResueltoCon('uf-1', 'local-bano', 'inst-inodoro', 'inodoroValvula', 1)
    const nodos: Nodo[] = [{ id: 'n0' }, { id: 'n1', referencia: inodoroResuelto.referencia }]
    const tramos: Tramo[] = [{ id: 't0', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AC' }]
    const red: RedHidraulica = { nodos, tramos }

    const resultado = filtrarArtefactosHidraulicamenteActivos([inodoroResuelto], red, 't0', catalogoArtefactos)

    expect(resultado).toEqual([])
  })

  it('9. qu requerido = null: propaga el error existente de resolverQuEfectivo', () => {
    const valvulaMingitorio = catalogoArtefactos.find((a) => a.id === 'valvulaMingitorio') as ArtefactoNormativo
    expect(valvulaMingitorio.quFria_lps).toBeNull()

    const resuelto = artefactoResueltoCon('uf-1', 'local-a', 'inst-a', 'valvulaMingitorio', 1)
    const nodos: Nodo[] = [{ id: 'n0' }, { id: 'n1', referencia: resuelto.referencia }]
    const tramos: Tramo[] = [{ id: 't0', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AF' }]
    const red: RedHidraulica = { nodos, tramos }

    expect(() => filtrarArtefactosHidraulicamenteActivos([resuelto], red, 't0', catalogoArtefactos)).toThrow(
      /quFria_lps/,
    )
  })

  it('10. artefacto normativo inexistente en el catálogo recibido: lanza excepción', () => {
    const resuelto = artefactoResueltoCon('uf-1', 'local-a', 'inst-a', 'artefactoInexistente', 1)
    const nodos: Nodo[] = [{ id: 'n0' }, { id: 'n1', referencia: resuelto.referencia }]
    const tramos: Tramo[] = [{ id: 't0', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AF' }]
    const red: RedHidraulica = { nodos, tramos }

    expect(() => filtrarArtefactosHidraulicamenteActivos([resuelto], red, 't0', catalogoArtefactos)).toThrow(
      /artefactoInexistente/,
    )
  })

  it('11. artefacto no aguas abajo del tramo: propaga el error topológico', () => {
    const otro = artefactoResueltoCon('uf-1', 'local-a', 'inst-otro', 'inodoroDeposito', 1)
    const buscado = artefactoResueltoCon('uf-1', 'local-a', 'inst-lavatorio', 'lavatorio', 1)
    const nodos: Nodo[] = [{ id: 'n0' }, { id: 'n1', referencia: otro.referencia }]
    const tramos: Tramo[] = [{ id: 't0', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AF' }]
    const red: RedHidraulica = { nodos, tramos }

    expect(() => filtrarArtefactosHidraulicamenteActivos([buscado], red, 't0', catalogoArtefactos)).toThrow(
      /aguas abajo/,
    )
  })

  it('12. orden e identidad: entrada [A,B,C] con B en cero produce [A,C] con las mismas referencias', () => {
    const a = artefactoResueltoCon('uf-1', 'local-a', 'inst-a', 'lavatorio', 1)
    const b = artefactoResueltoCon('uf-1', 'local-b', 'inst-b', 'inodoroValvula', 1)
    const c = artefactoResueltoCon('uf-1', 'local-c', 'inst-c', 'bidet', 1)
    const nodos: Nodo[] = [
      { id: 'n0' },
      { id: 'n1', referencia: a.referencia },
      { id: 'n2', referencia: b.referencia },
      { id: 'n3', referencia: c.referencia },
    ]
    const tramos: Tramo[] = [
      { id: 't0', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AC' },
      { id: 't1', nodoOrigenId: 'n0', nodoDestinoId: 'n2', red: 'AC' },
      { id: 't2', nodoOrigenId: 'n0', nodoDestinoId: 'n3', red: 'AC' },
    ]
    const red: RedHidraulica = { nodos, tramos }

    const resultado = filtrarArtefactosHidraulicamenteActivos([a, b, c], red, 't0', catalogoArtefactos)

    expect(resultado).toHaveLength(2)
    expect(resultado[0]).toBe(a)
    expect(resultado[1]).toBe(c)
  })

  it('13. no muta el array de entrada, ArtefactoResuelto, RedHidraulica ni catálogo', () => {
    const resuelto = artefactoResueltoCon('uf-1', 'local-a', 'inst-lavatorio', 'lavatorio', 1)
    const nodos: Nodo[] = [{ id: 'n0' }, { id: 'n1', referencia: resuelto.referencia }]
    const tramos: Tramo[] = [{ id: 't0', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AF' }]
    const red: RedHidraulica = { nodos, tramos }

    const entrada = [resuelto]
    const copiaEntrada = [...entrada]
    const copiaResuelto = { ...resuelto }
    const copiaRed = { nodos: [...red.nodos], tramos: [...red.tramos] }
    const copiaCatalogo = [...catalogoArtefactos]

    filtrarArtefactosHidraulicamenteActivos(entrada, red, 't0', catalogoArtefactos)

    expect(entrada).toEqual(copiaEntrada)
    expect(resuelto).toEqual(copiaResuelto)
    expect(red).toEqual(copiaRed)
    expect(catalogoArtefactos).toEqual(copiaCatalogo)
  })
})
