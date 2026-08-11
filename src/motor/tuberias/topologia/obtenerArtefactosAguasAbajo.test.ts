import { describe, it, expect } from 'vitest'
import type { Proyecto, UnidadFuncional } from '../../../modelo/proyecto'
import type { Nodo, RedHidraulica, ReferenciaDeArtefacto, Tramo } from '../../../modelo/redHidraulica'
import { obtenerArtefactosAguasAbajo } from './obtenerArtefactosAguasAbajo'

function proyectoCon(
  unidadesFuncionales: readonly UnidadFuncional[],
  redHidraulica?: RedHidraulica,
): Proyecto {
  return {
    metadatos: {
      nombre: 'Proyecto de prueba',
      obra: 'Obra de prueba',
      comitente: 'Comitente de prueba',
      fecha: '2026-01-01',
      schemaVersion: '1.0.0',
      versionNormativa: 'eras-2023',
    },
    parametros: {
      tipoDeProyecto: 'oficinaPrivada',
      presionSobreAcera_m: 0,
      alturaArtefactoMasDesfavorable_m: 0,
    },
    unidadesFuncionales,
    configuracionHidraulica: { metodoPerdidaDistribuida: 'hazenWilliams' },
    ...(redHidraulica !== undefined ? { redHidraulica } : {}),
  }
}

function unidadFuncionalConArtefacto(id: string, localId: string, artefactoId: string): UnidadFuncional {
  return {
    id,
    nombre: `UF ${id}`,
    locales: [
      {
        id: localId,
        tipo: 'bano',
        regimen: 'domiciliario',
        artefactos: [{ id: artefactoId, artefactoId: 'receptaculoDucha', cantidad: 1, origen: 'normativo' }],
      },
    ],
  }
}

function referenciaA(unidadFuncionalId: string, localId: string, artefactoId: string): ReferenciaDeArtefacto {
  return { tipo: 'artefacto', unidadFuncionalId, localId, artefactoId }
}

function ordenarPorClave(referencias: readonly ReferenciaDeArtefacto[]): ReferenciaDeArtefacto[] {
  return [...referencias].sort((a, b) =>
    `${a.unidadFuncionalId}::${a.localId}::${a.artefactoId}`.localeCompare(
      `${b.unidadFuncionalId}::${b.localId}::${b.artefactoId}`,
    ),
  )
}

describe('obtenerArtefactosAguasAbajo', () => {
  it('A. terminal directo: el tramo llega directamente a un nodo con referencia a Artefacto', () => {
    const uf = unidadFuncionalConArtefacto('uf-1', 'local-bano', 'artefacto-ducha')
    const nodos: Nodo[] = [
      { id: 'n0' },
      { id: 'n1', referencia: referenciaA('uf-1', 'local-bano', 'artefacto-ducha') },
    ]
    const tramos: Tramo[] = [{ id: 't1', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AF' }]
    const proyecto = proyectoCon([uf], { nodos, tramos })

    const resultado = obtenerArtefactosAguasAbajo(proyecto, 't1')

    expect(resultado).toEqual([referenciaA('uf-1', 'local-bano', 'artefacto-ducha')])
  })

  it('B. bifurcacion: el tramo llega a un nodo que se ramifica hacia dos Artefactos distintos', () => {
    const ufA = unidadFuncionalConArtefacto('uf-1', 'local-a', 'artefacto-a')
    const ufB = unidadFuncionalConArtefacto('uf-2', 'local-b', 'artefacto-b')
    const nodos: Nodo[] = [
      { id: 'n0' },
      { id: 'n1' },
      { id: 'n2', referencia: referenciaA('uf-1', 'local-a', 'artefacto-a') },
      { id: 'n3', referencia: referenciaA('uf-2', 'local-b', 'artefacto-b') },
    ]
    const tramos: Tramo[] = [
      { id: 't1', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AF' },
      { id: 't2', nodoOrigenId: 'n1', nodoDestinoId: 'n2', red: 'AF' },
      { id: 't3', nodoOrigenId: 'n1', nodoDestinoId: 'n3', red: 'AF' },
    ]
    const proyecto = proyectoCon([ufA, ufB], { nodos, tramos })

    const resultado = obtenerArtefactosAguasAbajo(proyecto, 't1')

    expect(ordenarPorClave(resultado)).toEqual(
      ordenarPorClave([referenciaA('uf-1', 'local-a', 'artefacto-a'), referenciaA('uf-2', 'local-b', 'artefacto-b')]),
    )
  })

  it('C. produccion ACS: el cambio de red AF -> AC no detiene el traversal', () => {
    const uf = unidadFuncionalConArtefacto('uf-1', 'local-bano', 'artefacto-ducha')
    const nodos: Nodo[] = [
      { id: 'n0' },
      { id: 'n1', referencia: { tipo: 'produccionACS' } },
      { id: 'n2', referencia: referenciaA('uf-1', 'local-bano', 'artefacto-ducha') },
    ]
    const tramos: Tramo[] = [
      { id: 't1', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AF' },
      { id: 't2', nodoOrigenId: 'n1', nodoDestinoId: 'n2', red: 'AC' },
    ]
    const proyecto = proyectoCon([uf], { nodos, tramos })

    const resultado = obtenerArtefactosAguasAbajo(proyecto, 't1')

    expect(resultado).toEqual([referenciaA('uf-1', 'local-bano', 'artefacto-ducha')])
  })

  it('D. doble camino al mismo Artefacto (AF directa y AF -> ACS -> AC): no se duplica', () => {
    const uf = unidadFuncionalConArtefacto('uf-1', 'local-bano', 'artefacto-ducha')
    const nodos: Nodo[] = [
      { id: 'n0' },
      { id: 'n1' },
      { id: 'n2', referencia: referenciaA('uf-1', 'local-bano', 'artefacto-ducha') },
      { id: 'n3', referencia: { tipo: 'produccionACS' } },
      { id: 'n4', referencia: referenciaA('uf-1', 'local-bano', 'artefacto-ducha') },
    ]
    const tramos: Tramo[] = [
      { id: 't1', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AF' },
      { id: 't2', nodoOrigenId: 'n1', nodoDestinoId: 'n2', red: 'AF' },
      { id: 't3', nodoOrigenId: 'n1', nodoDestinoId: 'n3', red: 'AF' },
      { id: 't4', nodoOrigenId: 'n3', nodoDestinoId: 'n4', red: 'AC' },
    ]
    const proyecto = proyectoCon([uf], { nodos, tramos })

    const resultado = obtenerArtefactosAguasAbajo(proyecto, 't1')

    expect(resultado).toHaveLength(1)
    expect(resultado).toEqual([referenciaA('uf-1', 'local-bano', 'artefacto-ducha')])
  })

  it('E. mismo localId/artefactoId en dos UF distintas: cadenas funcionales distintas, no se deduplican', () => {
    const uf1 = unidadFuncionalConArtefacto('uf-1', 'local-x', 'artefacto-x')
    const uf2 = unidadFuncionalConArtefacto('uf-2', 'local-x', 'artefacto-x')
    const nodos: Nodo[] = [
      { id: 'n0' },
      { id: 'n1' },
      { id: 'n2', referencia: referenciaA('uf-1', 'local-x', 'artefacto-x') },
      { id: 'n3', referencia: referenciaA('uf-2', 'local-x', 'artefacto-x') },
    ]
    const tramos: Tramo[] = [
      { id: 't1', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AF' },
      { id: 't2', nodoOrigenId: 'n1', nodoDestinoId: 'n2', red: 'AF' },
      { id: 't3', nodoOrigenId: 'n1', nodoDestinoId: 'n3', red: 'AF' },
    ]
    const proyecto = proyectoCon([uf1, uf2], { nodos, tramos })

    const resultado = obtenerArtefactosAguasAbajo(proyecto, 't1')

    expect(resultado).toHaveLength(2)
    expect(ordenarPorClave(resultado)).toEqual(
      ordenarPorClave([referenciaA('uf-1', 'local-x', 'artefacto-x'), referenciaA('uf-2', 'local-x', 'artefacto-x')]),
    )
  })

  it('F. ciclo: la topologia no entra en loop infinito y devuelve los Artefactos alcanzables', () => {
    const uf = unidadFuncionalConArtefacto('uf-1', 'local-bano', 'artefacto-ducha')
    const nodos: Nodo[] = [
      { id: 'n0' },
      { id: 'n1' },
      { id: 'n2' },
      { id: 'n3', referencia: referenciaA('uf-1', 'local-bano', 'artefacto-ducha') },
    ]
    const tramos: Tramo[] = [
      { id: 't1', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AF' },
      { id: 't2', nodoOrigenId: 'n1', nodoDestinoId: 'n2', red: 'AF' },
      { id: 't3', nodoOrigenId: 'n2', nodoDestinoId: 'n1', red: 'AF' },
      { id: 't4', nodoOrigenId: 'n2', nodoDestinoId: 'n3', red: 'AF' },
    ]
    const proyecto = proyectoCon([uf], { nodos, tramos })

    const resultado = obtenerArtefactosAguasAbajo(proyecto, 't1')

    expect(resultado).toEqual([referenciaA('uf-1', 'local-bano', 'artefacto-ducha')])
  })

  it('G. tramoId inexistente lanza excepcion', () => {
    const uf = unidadFuncionalConArtefacto('uf-1', 'local-bano', 'artefacto-ducha')
    const proyecto = proyectoCon([uf], { nodos: [], tramos: [] })

    expect(() => obtenerArtefactosAguasAbajo(proyecto, 'inexistente')).toThrow()
  })

  it('H. nodo hoja sin Artefacto y sin tramos salientes devuelve conjunto vacio', () => {
    const uf = unidadFuncionalConArtefacto('uf-1', 'local-bano', 'artefacto-ducha')
    const nodos: Nodo[] = [{ id: 'n0' }, { id: 'n1' }]
    const tramos: Tramo[] = [{ id: 't1', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AF' }]
    const proyecto = proyectoCon([uf], { nodos, tramos })

    const resultado = obtenerArtefactosAguasAbajo(proyecto, 't1')

    expect(resultado).toEqual([])
  })

  it('la concatenacion simple con "::" no debe producir colisiones de clave', () => {
    // A: unidadFuncionalId="a::b", localId="c", artefactoId="d"
    // B: unidadFuncionalId="a", localId="b::c", artefactoId="d"
    // Con `${a}::${b}::${c}` ambas producirian la clave "a::b::c::d".
    const ufA = unidadFuncionalConArtefacto('a::b', 'c', 'd')
    const ufB = unidadFuncionalConArtefacto('a', 'b::c', 'd')
    const nodos: Nodo[] = [
      { id: 'n0' },
      { id: 'n1' },
      { id: 'n2', referencia: referenciaA('a::b', 'c', 'd') },
      { id: 'n3', referencia: referenciaA('a', 'b::c', 'd') },
    ]
    const tramos: Tramo[] = [
      { id: 't1', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AF' },
      { id: 't2', nodoOrigenId: 'n1', nodoDestinoId: 'n2', red: 'AF' },
      { id: 't3', nodoOrigenId: 'n1', nodoDestinoId: 'n3', red: 'AF' },
    ]
    const proyecto = proyectoCon([ufA, ufB], { nodos, tramos })

    const resultado = obtenerArtefactosAguasAbajo(proyecto, 't1')

    expect(resultado).toHaveLength(2)
  })

  it('I. proyecto sin redHidraulica lanza excepcion', () => {
    const uf = unidadFuncionalConArtefacto('uf-1', 'local-bano', 'artefacto-ducha')
    const proyecto = proyectoCon([uf])

    expect(() => obtenerArtefactosAguasAbajo(proyecto, 't1')).toThrow()
  })
})
