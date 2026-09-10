// M2-TOPO-A: clasificación estructural de distribución compartida /
// secundaria. Fixtures pequeñas y legibles, duplicadas localmente a
// propósito (mismo criterio que el resto del motor de tuberías). El
// criterio comprobado: un Tramo es "distribución compartida" cuando NO es
// Alimentación general (raíz) ni Alimentación ACS y su conjunto de
// artefactos aguas abajo pertenece a MÁS DE UN Local
// (unidadFuncionalId + localId, deduplicado).
import { describe, it, expect } from 'vitest'
import type { Artefacto, Proyecto, TipoDeProyecto, UnidadFuncional } from '../../../modelo/proyecto'
import type { Nodo, RedHidraulica, ReferenciaDeArtefacto, Tramo } from '../../../modelo/redHidraulica'
import { proyectoInicial } from '../../../interfaz/paginas/proyectoDeEjemplo'
import {
  esTramoDeDistribucionCompartida,
  identificarTramosDeDistribucionCompartida,
} from './identificarTramosDeDistribucionCompartida'

function artefacto(idInstancia: string, artefactoIdCatalogo = 'lavatorio'): Artefacto {
  return { id: idInstancia, artefactoId: artefactoIdCatalogo, cantidad: 1, origen: 'normativo' }
}

function referenciaDe(unidadFuncionalId: string, localId: string, artefactoId: string): ReferenciaDeArtefacto {
  return { tipo: 'artefacto', unidadFuncionalId, localId, artefactoId }
}

function unidadFuncionalCon(
  unidadFuncionalId: string,
  locales: readonly { readonly localId: string; readonly artefactos: readonly Artefacto[] }[],
): UnidadFuncional {
  return {
    id: unidadFuncionalId,
    nombre: unidadFuncionalId,
    locales: locales.map((local) => ({
      id: local.localId,
      tipo: 'bano' as const,
      regimen: 'domiciliario' as const,
      artefactos: local.artefactos,
    })),
  }
}

function proyectoCon(
  unidadesFuncionales: readonly UnidadFuncional[],
  redHidraulica: RedHidraulica | undefined,
  tipoDeProyecto: TipoDeProyecto = 'viviendaMultifamiliar',
): Proyecto {
  return {
    metadatos: {
      nombre: 'Proyecto TOPO-A',
      obra: 'Obra',
      comitente: 'Comitente',
      fecha: '2026-01-01',
      schemaVersion: '1.0.0',
      versionNormativa: 'eras-2023',
    },
    parametros: { tipoDeProyecto, presionSobreAcera_m: 0, alturaArtefactoMasDesfavorable_m: 0 },
    unidadesFuncionales,
    ...(redHidraulica !== undefined ? { redHidraulica } : {}),
    configuracionHidraulica: {
      metodoPerdidaDistribuida: 'hazenWilliams',
      metodoPerdidaLocalizada: 'detallado',
      granularidadHidraulica: 'profesional',
      materialTuberiaId: 'ppr',
      sistemaDeTuberiaId: 'acquaSystemMagnumPn20',
    },
  }
}

function idsDe(tramos: readonly Tramo[]): readonly string[] {
  return tramos.map((tramo) => tramo.id)
}

describe('identificarTramosDeDistribucionCompartida', () => {
  it('proyecto sin redHidraulica -> lista vacía, sin lanzar', () => {
    const sinRed = proyectoCon([], undefined)
    expect(identificarTramosDeDistribucionCompartida(sinRed)).toEqual([])
  })

  it('red vacía ({nodos:[], tramos:[]}) -> lista vacía, sin lanzar (no es "raíz ausente")', () => {
    const proyecto = proyectoCon([], { nodos: [], tramos: [] })
    expect(identificarTramosDeDistribucionCompartida(proyecto)).toEqual([])
  })

  // Caso A del brief.
  it('el tramo raíz de Alimentación general NO es distribución compartida, aunque alcance varios Locales', () => {
    const ufA = unidadFuncionalCon('uf-1', [{ localId: 'local-1', artefactos: [artefacto('a1')] }])
    const ufB = unidadFuncionalCon('uf-2', [{ localId: 'local-2', artefactos: [artefacto('a2')] }])
    const nodos: Nodo[] = [
      { id: 'raiz' },
      { id: 'n-hub' },
      { id: 'n-1', referencia: referenciaDe('uf-1', 'local-1', 'a1') },
      { id: 'n-2', referencia: referenciaDe('uf-2', 'local-2', 'a2') },
    ]
    const tramos: Tramo[] = [
      { id: 't-general', nodoOrigenId: 'raiz', nodoDestinoId: 'n-hub', red: 'AF' },
      { id: 't-feed-1', nodoOrigenId: 'n-hub', nodoDestinoId: 'n-1', red: 'AF' },
      { id: 't-feed-2', nodoOrigenId: 'n-hub', nodoDestinoId: 'n-2', red: 'AF' },
    ]
    const proyecto = proyectoCon([ufA, ufB], { nodos, tramos })

    // n-hub alcanza 2 Locales pero cuelga directo de la raíz -> t-general es
    // Alimentación general, no distribución compartida. t-feed-1/2 alcanzan
    // un Local cada uno.
    expect(idsDe(identificarTramosDeDistribucionCompartida(proyecto))).toEqual([])
    expect(esTramoDeDistribucionCompartida(proyecto, 't-general')).toBe(false)
  })

  // Caso B del brief.
  it('el tramo de Alimentación ACS NO es distribución compartida', () => {
    const uf = unidadFuncionalCon('uf-1', [
      { localId: 'local-1', artefactos: [artefacto('a1')] },
      { localId: 'local-2', artefactos: [artefacto('a2')] },
    ])
    const nodos: Nodo[] = [
      { id: 'raiz' },
      { id: 'n-af' },
      { id: 'n-acs', referencia: { tipo: 'produccionACS' } },
      { id: 'n-ac-hub' },
      { id: 'n-ac-1', referencia: referenciaDe('uf-1', 'local-1', 'a1') },
      { id: 'n-ac-2', referencia: referenciaDe('uf-1', 'local-2', 'a2') },
    ]
    const tramos: Tramo[] = [
      { id: 't-general', nodoOrigenId: 'raiz', nodoDestinoId: 'n-af', red: 'AF' },
      { id: 't-af-acs', nodoOrigenId: 'n-af', nodoDestinoId: 'n-acs', red: 'AF' },
      { id: 't-ac-comun', nodoOrigenId: 'n-acs', nodoDestinoId: 'n-ac-hub', red: 'AC' },
      { id: 't-ac-1', nodoOrigenId: 'n-ac-hub', nodoDestinoId: 'n-ac-1', red: 'AC' },
      { id: 't-ac-2', nodoOrigenId: 'n-ac-hub', nodoDestinoId: 'n-ac-2', red: 'AC' },
    ]
    const proyecto = proyectoCon([uf], { nodos, tramos })

    // t-af-acs (destino produccionACS) queda excluido aunque alcance 2
    // Locales; t-ac-comun (n-ac-hub -> 2 Locales) SÍ es distribución
    // compartida: es un colector de AC, no la Alimentación ACS.
    expect(esTramoDeDistribucionCompartida(proyecto, 't-af-acs')).toBe(false)
    expect(idsDe(identificarTramosDeDistribucionCompartida(proyecto))).toEqual(['t-ac-comun'])
  })

  // Caso C del brief.
  it('un tramo que alcanza un único Local (feed de Local) NO es distribución compartida', () => {
    const uf = unidadFuncionalCon('uf-1', [
      { localId: 'local-1', artefactos: [artefacto('a1'), artefacto('a2')] },
    ])
    const nodos: Nodo[] = [
      { id: 'raiz' },
      { id: 'n-feed' },
      { id: 'n-1', referencia: referenciaDe('uf-1', 'local-1', 'a1') },
      { id: 'n-2', referencia: referenciaDe('uf-1', 'local-1', 'a2') },
    ]
    const tramos: Tramo[] = [
      { id: 't-general', nodoOrigenId: 'raiz', nodoDestinoId: 'n-feed', red: 'AF' },
      { id: 't-1', nodoOrigenId: 'n-feed', nodoDestinoId: 'n-1', red: 'AF' },
      { id: 't-2', nodoOrigenId: 'n-feed', nodoDestinoId: 'n-2', red: 'AF' },
    ]
    const proyecto = proyectoCon([uf], { nodos, tramos })
    expect(identificarTramosDeDistribucionCompartida(proyecto)).toEqual([])
  })

  // Caso D del brief.
  it('un tramo intermedio que alimenta 2 Locales SÍ es distribución compartida', () => {
    const uf = unidadFuncionalCon('uf-1', [
      { localId: 'local-1', artefactos: [artefacto('a1')] },
      { localId: 'local-2', artefactos: [artefacto('a2')] },
    ])
    const nodos: Nodo[] = [
      { id: 'raiz' },
      { id: 'n-af' },
      { id: 'n-comun' },
      { id: 'n-1', referencia: referenciaDe('uf-1', 'local-1', 'a1') },
      { id: 'n-2', referencia: referenciaDe('uf-1', 'local-2', 'a2') },
    ]
    const tramos: Tramo[] = [
      { id: 't-general', nodoOrigenId: 'raiz', nodoDestinoId: 'n-af', red: 'AF' },
      { id: 't-comun', nodoOrigenId: 'n-af', nodoDestinoId: 'n-comun', red: 'AF' },
      { id: 't-1', nodoOrigenId: 'n-comun', nodoDestinoId: 'n-1', red: 'AF' },
      { id: 't-2', nodoOrigenId: 'n-comun', nodoDestinoId: 'n-2', red: 'AF' },
    ]
    const proyecto = proyectoCon([uf], { nodos, tramos })
    expect(idsDe(identificarTramosDeDistribucionCompartida(proyecto))).toEqual(['t-comun'])
    expect(esTramoDeDistribucionCompartida(proyecto, 't-comun')).toBe(true)
  })

  // Caso E del brief: la identidad de Local es (unidadFuncionalId, localId),
  // no localId solo -- dos UF con un Local de mismo nombre son 3 Locales.
  it('un tramo intermedio que alimenta 3+ Locales SÍ es distribución compartida (identidad real de Local)', () => {
    const uf1 = unidadFuncionalCon('uf-1', [{ localId: 'bano', artefactos: [artefacto('a1')] }])
    const uf2 = unidadFuncionalCon('uf-2', [{ localId: 'bano', artefactos: [artefacto('a2')] }])
    const uf3 = unidadFuncionalCon('uf-3', [{ localId: 'bano', artefactos: [artefacto('a3')] }])
    const nodos: Nodo[] = [
      { id: 'raiz' },
      { id: 'n-af' },
      { id: 'n-comun' },
      { id: 'n-1', referencia: referenciaDe('uf-1', 'bano', 'a1') },
      { id: 'n-2', referencia: referenciaDe('uf-2', 'bano', 'a2') },
      { id: 'n-3', referencia: referenciaDe('uf-3', 'bano', 'a3') },
    ]
    const tramos: Tramo[] = [
      { id: 't-general', nodoOrigenId: 'raiz', nodoDestinoId: 'n-af', red: 'AF' },
      { id: 't-comun', nodoOrigenId: 'n-af', nodoDestinoId: 'n-comun', red: 'AF' },
      { id: 't-1', nodoOrigenId: 'n-comun', nodoDestinoId: 'n-1', red: 'AF' },
      { id: 't-2', nodoOrigenId: 'n-comun', nodoDestinoId: 'n-2', red: 'AF' },
      { id: 't-3', nodoOrigenId: 'n-comun', nodoDestinoId: 'n-3', red: 'AF' },
    ]
    const proyecto = proyectoCon([uf1, uf2, uf3], { nodos, tramos })
    expect(idsDe(identificarTramosDeDistribucionCompartida(proyecto))).toEqual(['t-comun'])
  })

  // Caso F del brief: montante NO segmentado en un único tramo compartido no
  // es lo único posible -- una cadena de segmentos compartidos también.
  it('cadena root -> compartido A -> compartido B -> feeds: A y B son distribución compartida, en orden de tramos', () => {
    const uf1 = unidadFuncionalCon('uf-1', [{ localId: 'l1', artefactos: [artefacto('a1')] }])
    const uf2 = unidadFuncionalCon('uf-2', [{ localId: 'l2', artefactos: [artefacto('a2')] }])
    const uf3 = unidadFuncionalCon('uf-3', [{ localId: 'l3', artefactos: [artefacto('a3')] }])
    const nodos: Nodo[] = [
      { id: 'raiz' },
      { id: 'n-af' },
      { id: 'n-a' },
      { id: 'n-b' },
      { id: 'n-1', referencia: referenciaDe('uf-1', 'l1', 'a1') },
      { id: 'n-2', referencia: referenciaDe('uf-2', 'l2', 'a2') },
      { id: 'n-3', referencia: referenciaDe('uf-3', 'l3', 'a3') },
    ]
    // Orden de declaración deliberadamente NO topológico para probar que el
    // resultado sigue el orden de `redHidraulica.tramos`.
    const tramos: Tramo[] = [
      { id: 't-general', nodoOrigenId: 'raiz', nodoDestinoId: 'n-af', red: 'AF' },
      { id: 'seg-b', nodoOrigenId: 'n-a', nodoDestinoId: 'n-b', red: 'AF' },
      { id: 't-1', nodoOrigenId: 'n-a', nodoDestinoId: 'n-1', red: 'AF' },
      { id: 'seg-a', nodoOrigenId: 'n-af', nodoDestinoId: 'n-a', red: 'AF' },
      { id: 't-2', nodoOrigenId: 'n-b', nodoDestinoId: 'n-2', red: 'AF' },
      { id: 't-3', nodoOrigenId: 'n-b', nodoDestinoId: 'n-3', red: 'AF' },
    ]
    const proyecto = proyectoCon([uf1, uf2, uf3], { nodos, tramos })

    // seg-a: n-af -> {l1, l2, l3}. seg-b: n-a -> {l2, l3}. Ambos compartidos.
    // t-1/t-2/t-3: un Local cada uno. Orden = orden de `tramos` (seg-b antes que seg-a).
    expect(idsDe(identificarTramosDeDistribucionCompartida(proyecto))).toEqual(['seg-b', 'seg-a'])
  })

  it('montante segmentada estilo "Golden 4": segmento con >1 Local aguas abajo es compartido; el que cuelga de la raíz es Alimentación general; el último (1 Local) es feed', () => {
    // n0(raíz) -seg-a-> n1 -seg-b-> n2 -seg-c-> n3, con una derivación a un
    // Local por nivel. Misma forma que resolverHidraulicaDeTramo.golden.test.ts.
    const uf1 = unidadFuncionalCon('uf-1', [{ localId: 'local-1', artefactos: [artefacto('a1')] }])
    const uf2 = unidadFuncionalCon('uf-2', [{ localId: 'local-2', artefactos: [artefacto('a2')] }])
    const uf3 = unidadFuncionalCon('uf-3', [{ localId: 'local-3', artefactos: [artefacto('a3')] }])
    const nodos: Nodo[] = [
      { id: 'n0' },
      { id: 'n1' },
      { id: 'n2' },
      { id: 'n3' },
      { id: 'g1', referencia: referenciaDe('uf-1', 'local-1', 'a1') },
      { id: 'g2', referencia: referenciaDe('uf-2', 'local-2', 'a2') },
      { id: 'g3', referencia: referenciaDe('uf-3', 'local-3', 'a3') },
    ]
    const tramos: Tramo[] = [
      { id: 'seg-a', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AF' },
      { id: 'der-1', nodoOrigenId: 'n1', nodoDestinoId: 'g1', red: 'AF' },
      { id: 'seg-b', nodoOrigenId: 'n1', nodoDestinoId: 'n2', red: 'AF' },
      { id: 'der-2', nodoOrigenId: 'n2', nodoDestinoId: 'g2', red: 'AF' },
      { id: 'seg-c', nodoOrigenId: 'n2', nodoDestinoId: 'n3', red: 'AF' },
      { id: 'der-3', nodoOrigenId: 'n3', nodoDestinoId: 'g3', red: 'AF' },
    ]
    const proyecto = proyectoCon([uf1, uf2, uf3], { nodos, tramos })

    // seg-a cuelga de la raíz n0 -> Alimentación general (excluido).
    // seg-b: n1 -> {local-2, local-3} -> compartido.
    // seg-c: n2 -> {local-3} -> feed de Local, no compartido.
    expect(idsDe(identificarTramosDeDistribucionCompartida(proyecto))).toEqual(['seg-b'])
    expect(esTramoDeDistribucionCompartida(proyecto, 'seg-a')).toBe(false)
    expect(esTramoDeDistribucionCompartida(proyecto, 'seg-b')).toBe(true)
    expect(esTramoDeDistribucionCompartida(proyecto, 'seg-c')).toBe(false)
  })

  it('proyecto de ejemplo (sin montantes): 0 tramos de distribución compartida', () => {
    // Backward compatibility (brief §22): la topología plana actual del demo
    // -- Alimentación general + Alimentación ACS + un feed por (Local, red) --
    // no tiene ningún tramo que alimente >1 Local sin ser general/ACS.
    expect(identificarTramosDeDistribucionCompartida(proyectoInicial)).toEqual([])
  })

  it('es determinista y no muta el proyecto ni la red', () => {
    const uf = unidadFuncionalCon('uf-1', [
      { localId: 'l1', artefactos: [artefacto('a1')] },
      { localId: 'l2', artefactos: [artefacto('a2')] },
    ])
    const nodos: Nodo[] = [
      { id: 'raiz' },
      { id: 'n-af' },
      { id: 'n-comun' },
      { id: 'n-1', referencia: referenciaDe('uf-1', 'l1', 'a1') },
      { id: 'n-2', referencia: referenciaDe('uf-1', 'l2', 'a2') },
    ]
    const tramos: Tramo[] = [
      { id: 't-general', nodoOrigenId: 'raiz', nodoDestinoId: 'n-af', red: 'AF' },
      { id: 't-comun', nodoOrigenId: 'n-af', nodoDestinoId: 'n-comun', red: 'AF' },
      { id: 't-1', nodoOrigenId: 'n-comun', nodoDestinoId: 'n-1', red: 'AF' },
      { id: 't-2', nodoOrigenId: 'n-comun', nodoDestinoId: 'n-2', red: 'AF' },
    ]
    const proyecto = proyectoCon([uf], { nodos, tramos })
    const instantanea = JSON.stringify(proyecto)

    const primera = identificarTramosDeDistribucionCompartida(proyecto)
    const segunda = identificarTramosDeDistribucionCompartida(proyecto)

    expect(primera).toEqual(segunda)
    expect(idsDe(primera)).toEqual(['t-comun'])
    expect(JSON.stringify(proyecto)).toBe(instantanea)
  })

  it('esTramoDeDistribucionCompartida: tramoId inexistente lanza (precondición de uso, red ya validada)', () => {
    const proyecto = proyectoCon([], { nodos: [{ id: 'n0' }], tramos: [] })
    expect(() => esTramoDeDistribucionCompartida(proyecto, 'no-existe')).toThrow(/no-existe/)
  })

  it('esTramoDeDistribucionCompartida: proyecto sin redHidraulica lanza', () => {
    const sinRed = proyectoCon([], undefined)
    expect(() => esTramoDeDistribucionCompartida(sinRed, 'x')).toThrow(/redHidraulica/)
  })
})
