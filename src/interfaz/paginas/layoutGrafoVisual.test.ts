// VIS-TOPO-01 — tests de layoutGrafoVisual (VIS-TOPO-00 B42). No busca
// pixel-perfect: verifica que todo nodo queda posicionado con valores
// finitos, que las aristas tienen una ruta válida y que el layout es
// determinista para la misma entrada.
import { describe, it, expect } from 'vitest'
import { resolverGrafoVisual } from './resolverGrafoVisual'
import { layoutGrafoVisual } from './layoutGrafoVisual'
import type { Local, Proyecto, TipoDeLocal, UnidadFuncional } from '../../modelo/proyecto'
import type { Nodo, RedHidraulica, Tramo } from '../../modelo/redHidraulica'

function local(id: string, tipo: TipoDeLocal = 'bano'): Local {
  return { id, tipo, regimen: 'domiciliario', artefactos: [{ id: `${id}-art`, artefactoId: 'lavatorio', cantidad: 1, origen: 'normativo' }] }
}

function proyectoBase(unidadesFuncionales: readonly UnidadFuncional[], redHidraulica: RedHidraulica): Proyecto {
  return {
    metadatos: { nombre: 'm', obra: 'o', comitente: 'c', fecha: '2026-01-01', schemaVersion: '1.0.0', versionNormativa: 'eras-2023' },
    parametros: { tipoDeProyecto: 'viviendaMultifamiliar', presionSobreAcera_m: 20, alturaArtefactoMasDesfavorable_m: 0 },
    unidadesFuncionales,
    redHidraulica,
    configuracionHidraulica: {
      metodoPerdidaDistribuida: 'hazenWilliams',
      metodoPerdidaLocalizada: 'estimado',
      granularidadHidraulica: 'simplificada',
      materialTuberiaId: 'ppr',
      sistemaDeTuberiaId: 'acquaSystemMagnumPn20',
    },
  }
}

function proyectoConFanOut(): Proyecto {
  const locales = ['l-1', 'l-2', 'l-3', 'l-4'].map((id) => local(id))
  const uf: UnidadFuncional = { id: 'uf-1', nombre: 'UF 1', niveles: [{ id: 'niv-1', nombre: 'PB', locales }] }
  const nodos: Nodo[] = [
    { id: 'n-gen' },
    { id: 'n-fanout' },
    ...locales.map((l) => ({
      id: `n-${l.id}`,
      referencia: { tipo: 'artefacto' as const, unidadFuncionalId: 'uf-1', localId: l.id, artefactoId: `${l.id}-art` },
    })),
  ]
  const tramos: Tramo[] = [
    { id: 't-gen', nodoOrigenId: 'n-gen', nodoDestinoId: 'n-fanout', red: 'AF', longitud_m: 10 },
    ...locales.map((l) => ({ id: `t-${l.id}`, nodoOrigenId: 'n-fanout', nodoDestinoId: `n-${l.id}`, red: 'AF' as const, longitud_m: 1 })),
  ]
  return proyectoBase([uf], { nodos, tramos })
}

describe('layoutGrafoVisual', () => {
  it('grafo vacío -> layout vacío, sin dividir por cero', () => {
    const layout = layoutGrafoVisual({ nodos: [], aristas: [], grupos: [] })
    expect(layout).toEqual({ nodos: [], aristas: [], minX: 0, minY: 0, ancho: 0, alto: 0 })
  })

  it('todos los nodos quedan posicionados con x/y/ancho/alto finitos', () => {
    const grafo = resolverGrafoVisual(proyectoConFanOut())
    const layout = layoutGrafoVisual(grafo)
    expect(layout.nodos.length).toBe(grafo.nodos.length)
    for (const nodo of layout.nodos) {
      expect(Number.isFinite(nodo.x)).toBe(true)
      expect(Number.isFinite(nodo.y)).toBe(true)
      expect(Number.isFinite(nodo.ancho)).toBe(true)
      expect(Number.isFinite(nodo.alto)).toBe(true)
      expect(nodo.ancho).toBeGreaterThan(0)
      expect(nodo.alto).toBeGreaterThan(0)
    }
  })

  it('cada arista tiene una ruta de puntos válida (>=2 puntos, todos finitos)', () => {
    const grafo = resolverGrafoVisual(proyectoConFanOut())
    const layout = layoutGrafoVisual(grafo)
    expect(layout.aristas.length).toBe(grafo.aristas.length)
    for (const arista of layout.aristas) {
      expect(arista.puntos.length).toBeGreaterThanOrEqual(2)
      for (const punto of arista.puntos) {
        expect(Number.isFinite(punto.x)).toBe(true)
        expect(Number.isFinite(punto.y)).toBe(true)
      }
    }
  })

  it('el fan-out 1→4 conserva 4 aristas paralelas distintas (no se pisan entre sí)', () => {
    const grafo = resolverGrafoVisual(proyectoConFanOut())
    const layout = layoutGrafoVisual(grafo)
    const distribucion = layout.nodos.find((n) => n.tipo === 'derivacion')!
    const salientes = layout.aristas.filter((a) => a.origenId === distribucion.id)
    expect(salientes).toHaveLength(4)
    expect(new Set(salientes.map((a) => a.id)).size).toBe(4)
  })

  it('dirección global top-down: el origen queda por encima de los Locales', () => {
    const grafo = resolverGrafoVisual(proyectoConFanOut())
    const layout = layoutGrafoVisual(grafo)
    const origen = layout.nodos.find((n) => n.tipo === 'origen')!
    const locales = layout.nodos.filter((n) => n.tipo === 'local')
    for (const localNodo of locales) {
      expect(origen.y).toBeLessThan(localNodo.y)
    }
  })

  it('bounding box cubre todos los nodos', () => {
    const grafo = resolverGrafoVisual(proyectoConFanOut())
    const layout = layoutGrafoVisual(grafo)
    for (const nodo of layout.nodos) {
      expect(nodo.x - nodo.ancho / 2).toBeGreaterThanOrEqual(layout.minX - 0.001)
      expect(nodo.y - nodo.alto / 2).toBeGreaterThanOrEqual(layout.minY - 0.001)
      expect(nodo.x + nodo.ancho / 2).toBeLessThanOrEqual(layout.minX + layout.ancho + 0.001)
      expect(nodo.y + nodo.alto / 2).toBeLessThanOrEqual(layout.minY + layout.alto + 0.001)
    }
  })

  it('mismo input -> mismo layout (determinismo)', () => {
    const grafo = resolverGrafoVisual(proyectoConFanOut())
    const layoutA = layoutGrafoVisual(grafo)
    const layoutB = layoutGrafoVisual(grafo)
    expect(layoutA).toEqual(layoutB)
  })
})
