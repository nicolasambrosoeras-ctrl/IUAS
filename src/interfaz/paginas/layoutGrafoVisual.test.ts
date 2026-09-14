// VIS-TOPO-01 — tests de layoutGrafoVisual (VIS-TOPO-00 B42). No busca
// pixel-perfect: verifica que todo nodo queda posicionado con valores
// finitos, que las aristas tienen una ruta válida y que el layout es
// determinista para la misma entrada.
import { describe, it, expect } from 'vitest'
import { resolverGrafoVisual } from './resolverGrafoVisual'
import { layoutGrafoVisual, type GrafoVisualPosicionado } from './layoutGrafoVisual'
import type { Local, Proyecto, TipoDeLocal, UnidadFuncional } from '../../modelo/proyecto'
import type { Nodo, RedHidraulica, Tramo } from '../../modelo/redHidraulica'
import { conMontanteNuevo } from './montantesDelProyecto'
import { agregarLocalAMontante } from './reconciliarMontante'

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

// --- fixtures adicionales para ortogonalidad (VIS-TOPO-01B §37) ---------

function proyectoSimple1a1(): Proyecto {
  const uf: UnidadFuncional = { id: 'uf-1', nombre: 'UF 1', niveles: [{ id: 'niv-1', nombre: 'PB', locales: [local('l-1')] }] }
  const nodos: Nodo[] = [
    { id: 'n-gen' },
    { id: 'n-1', referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'l-1', artefactoId: 'l-1-art' } },
  ]
  const tramos: Tramo[] = [{ id: 't-1', nodoOrigenId: 'n-gen', nodoDestinoId: 'n-1', red: 'AF', longitud_m: 5 }]
  return proyectoBase([uf], { nodos, tramos })
}

function proyecto1a2(): Proyecto {
  const uf: UnidadFuncional = {
    id: 'uf-1',
    nombre: 'UF 1',
    niveles: [{ id: 'niv-1', nombre: 'PB', locales: [local('l-1'), local('l-2')] }],
  }
  const nodos: Nodo[] = [
    { id: 'n-gen' },
    { id: 'n-bif' },
    { id: 'n-l1', referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'l-1', artefactoId: 'l-1-art' } },
    { id: 'n-l2', referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'l-2', artefactoId: 'l-2-art' } },
  ]
  const tramos: Tramo[] = [
    { id: 't-gen', nodoOrigenId: 'n-gen', nodoDestinoId: 'n-bif', red: 'AF', longitud_m: 10 },
    { id: 't-l1', nodoOrigenId: 'n-bif', nodoDestinoId: 'n-l1', red: 'AF', longitud_m: 2 },
    { id: 't-l2', nodoOrigenId: 'n-bif', nodoDestinoId: 'n-l2', red: 'AF', longitud_m: 3 },
  ]
  return proyectoBase([uf], { nodos, tramos })
}

// Baño con 3 artefactos AF -- 3 aristas reales paralelas convergiendo en
// el mismo nodo visual "Local" desde el mismo nodo de derivación.
function proyectoAristasParalelas(): Proyecto {
  const uf: UnidadFuncional = { id: 'uf-1', nombre: 'UF 1', niveles: [{ id: 'niv-1', nombre: 'PB', locales: [local('l-bano')] }] }
  const nodos: Nodo[] = [
    { id: 'n-gen' },
    { id: 'n-bano' },
    { id: 'n-lavatorio', referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'l-bano', artefactoId: 'l-bano-art' } },
    { id: 'n-ducha', referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'l-bano', artefactoId: 'l-bano-art' } },
    { id: 'n-bidet', referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'l-bano', artefactoId: 'l-bano-art' } },
  ]
  const tramos: Tramo[] = [
    { id: 't-gen', nodoOrigenId: 'n-gen', nodoDestinoId: 'n-bano', red: 'AF', longitud_m: 10 },
    { id: 't-lavatorio', nodoOrigenId: 'n-bano', nodoDestinoId: 'n-lavatorio', red: 'AF', longitud_m: 1 },
    { id: 't-ducha', nodoOrigenId: 'n-bano', nodoDestinoId: 'n-ducha', red: 'AF', longitud_m: 1 },
    { id: 't-bidet', nodoOrigenId: 'n-bano', nodoDestinoId: 'n-bidet', red: 'AF', longitud_m: 1 },
  ]
  return proyectoBase([uf], { nodos, tramos })
}

function ramaMontante(id: string): { nodos: Nodo[]; tramos: Tramo[] } {
  return {
    nodos: [
      { id: `n-${id}` },
      { id: `n-${id}-t`, referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: id, artefactoId: `${id}-art` } },
    ],
    tramos: [
      { id: `t-${id}`, nodoOrigenId: 'n-af', nodoDestinoId: `n-${id}`, red: 'AF', longitud_m: 3 },
      { id: `t-${id}-t`, nodoOrigenId: `n-${id}`, nodoDestinoId: `n-${id}-t`, red: 'AF', longitud_m: 1 },
    ],
  }
}

function proyectoMontante(): Proyecto {
  const uf: UnidadFuncional = {
    id: 'uf-1',
    nombre: 'UF 1',
    niveles: [{ id: 'niv-1', nombre: 'PB', locales: [local('l-1'), local('l-2'), local('l-3')] }],
  }
  const ramas = [ramaMontante('l-1'), ramaMontante('l-2'), ramaMontante('l-3')]
  const redHidraulica: RedHidraulica = {
    nodos: [{ id: 'n-gen' }, { id: 'n-af' }, ...ramas.flatMap((r) => r.nodos)],
    tramos: [{ id: 't-gen', nodoOrigenId: 'n-gen', nodoDestinoId: 'n-af', red: 'AF', longitud_m: 10 }, ...ramas.flatMap((r) => r.tramos)],
  }
  const proyecto = proyectoBase([uf], redHidraulica)
  const creado = conMontanteNuevo(proyecto, 'AF')
  let proyectoConMontante = creado.proyecto
  for (const localId of ['l-1', 'l-2', 'l-3']) {
    const r = agregarLocalAMontante(proyectoConMontante, creado.montanteId, 'uf-1', localId)
    if (r.tipo !== 'reconciliado') {
      throw new Error(`fixture inválida: agregarLocalAMontante(${localId}) -> ${r.tipo}`)
    }
    proyectoConMontante = r.proyecto
  }
  return proyectoConMontante
}

const EPSILON_ORTOGONAL = 0.01

// Para todo par de puntos consecutivos de TODAS las aristas: x1===x2 o
// y1===y2 (VIS-TOPO-01B §13/§37), nunca ambos distintos.
function verificarOrtogonalidad(layout: GrafoVisualPosicionado): void {
  for (const arista of layout.aristas) {
    for (let i = 1; i < arista.puntos.length; i += 1) {
      const a = arista.puntos[i - 1]!
      const b = arista.puntos[i]!
      const mismaX = Math.abs(a.x - b.x) < EPSILON_ORTOGONAL
      const mismaY = Math.abs(a.y - b.y) < EPSILON_ORTOGONAL
      expect(
        mismaX || mismaY,
        `arista ${arista.id}: segmento diagonal (${a.x},${a.y}) -> (${b.x},${b.y})`,
      ).toBe(true)
    }
  }
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

  // --- VIS-TOPO-01B §37: routing 100% ortogonal ---------------------------

  describe('routing ortogonal (VIS-TOPO-01B)', () => {
    it('1→1: nunca un segmento diagonal (alineado o no)', () => {
      const layout = layoutGrafoVisual(resolverGrafoVisual(proyectoSimple1a1()))
      verificarOrtogonalidad(layout)
      const arista = layout.aristas[0]!
      // 1 solo hijo de un origen -- Dagre suele alinear la cadena: 2 puntos.
      expect(arista.puntos.length).toBeGreaterThanOrEqual(2)
    })

    it('1→2: ambas ramas ortogonales, con codo si no están alineadas', () => {
      const layout = layoutGrafoVisual(resolverGrafoVisual(proyecto1a2()))
      verificarOrtogonalidad(layout)
      expect(layout.aristas.length).toBe(3)
    })

    it('1→4 (fan-out no detallado): 4 rutas ortogonales, todas finitas', () => {
      const layout = layoutGrafoVisual(resolverGrafoVisual(proyectoConFanOut()))
      verificarOrtogonalidad(layout)
    })

    it('aristas paralelas (3 artefactos del mismo Local): rutas ortogonales, deterministas y no coincidentes', () => {
      const layout = layoutGrafoVisual(resolverGrafoVisual(proyectoAristasParalelas()))
      verificarOrtogonalidad(layout)
      const local1 = layout.nodos.find((n) => n.tipo === 'local')!
      const entrantes = layout.aristas.filter((a) => a.destinoId === local1.id)
      expect(entrantes).toHaveLength(3)
      // ninguna arista NaN/Infinity.
      for (const arista of entrantes) {
        for (const punto of arista.puntos) {
          expect(Number.isFinite(punto.x)).toBe(true)
          expect(Number.isFinite(punto.y)).toBe(true)
        }
      }
      // las 3 rutas son distintas entre sí (offset determinista aplicado).
      const rutas = entrantes.map((a) => JSON.stringify(a.puntos))
      expect(new Set(rutas).size).toBe(3)
      // determinismo: recalcular produce exactamente las mismas rutas.
      const layout2 = layoutGrafoVisual(resolverGrafoVisual(proyectoAristasParalelas()))
      const entrantes2 = layout2.aristas.filter((a) => a.destinoId === local1.id)
      expect(entrantes2.map((a) => JSON.stringify(a.puntos))).toEqual(rutas)
    })

    it('bus 1→N: las ramas comparten la misma cota horizontal de quiebre (branchY)', () => {
      const layout = layoutGrafoVisual(resolverGrafoVisual(proyectoConFanOut()))
      const distribucion = layout.nodos.find((n) => n.tipo === 'derivacion')!
      const salientes = layout.aristas.filter((a) => a.origenId === distribucion.id)
      expect(salientes).toHaveLength(4)
      // cada arista con codo tiene 4 puntos; el segundo y tercer punto
      // (el tramo horizontal del bus) comparten la misma y.
      const cotasDeBus = salientes.map((a) => a.puntos[1]?.y).filter((y): y is number => y !== undefined)
      expect(cotasDeBus.length).toBe(4)
      const referencia = cotasDeBus[0]!
      for (const y of cotasDeBus) {
        expect(Math.abs(y - referencia)).toBeLessThan(0.01)
      }
    })

    it('montante: la cadena se mantiene ortogonal y con sus 3 segmentos reales conservados', () => {
      const layout = layoutGrafoVisual(resolverGrafoVisual(proyectoMontante()))
      verificarOrtogonalidad(layout)
      const montanteId = layout.aristas.find((a) => a.montanteId !== undefined)?.montanteId
      expect(montanteId).toBeDefined()
      const segmentos = layout.aristas.filter((a) => a.montanteId === montanteId)
      expect(segmentos).toHaveLength(3)
    })

    it('dirección top-down: el rank del origen queda por encima de los Locales (no exige monotonía por codo)', () => {
      const layout = layoutGrafoVisual(resolverGrafoVisual(proyecto1a2()))
      const origen = layout.nodos.find((n) => n.tipo === 'origen')!
      const locales = layout.nodos.filter((n) => n.tipo === 'local')
      for (const localNodo of locales) {
        expect(origen.y).toBeLessThan(localNodo.y)
      }
    })
  })
})
