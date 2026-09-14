// VIS-TOPO-01 — tests del adaptador puro resolverGrafoVisual (VIS-TOPO-00
// §12/§19/B40/B41). Cubre los 6 casos de estudio de la investigación (A-F)
// más los invariantes estructurales del GrafoVisual resultante. No prueba
// layout ni render -- ver layoutGrafoVisual.test.ts / EsquemaHidraulico.
import { describe, it, expect } from 'vitest'
import type { Local, Proyecto, TipoDeLocal, UnidadFuncional } from '../../modelo/proyecto'
import type { Nodo, RedHidraulica, Tramo } from '../../modelo/redHidraulica'
import { validarRedHidraulica } from '../../validacion/redHidraulica'
import { conMontanteNuevo } from './montantesDelProyecto'
import { agregarLocalAMontante } from './reconciliarMontante'
import { resolverGrafoVisual, type GrafoVisual } from './resolverGrafoVisual'

function local(id: string, tipo: TipoDeLocal = 'bano', cotaPiso_m?: number): Local {
  return {
    id,
    tipo,
    regimen: 'domiciliario',
    ...(cotaPiso_m !== undefined ? { cotaPiso_m } : {}),
    artefactos: [{ id: `${id}-art`, artefactoId: 'lavatorio', cantidad: 1, origen: 'normativo' }],
  }
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

// --- Caso A: origen -> tramo -> Local (simple) --------------------------

function proyectoCasoA(): Proyecto {
  const uf: UnidadFuncional = { id: 'uf-1', nombre: 'UF 1', niveles: [{ id: 'niv-1', nombre: 'PB', locales: [local('l-1')] }] }
  const nodos: Nodo[] = [
    { id: 'n-gen' },
    { id: 'n-1', referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'l-1', artefactoId: 'l-1-art' } },
  ]
  const tramos: Tramo[] = [{ id: 't-1', nodoOrigenId: 'n-gen', nodoDestinoId: 'n-1', red: 'AF', longitud_m: 5 }]
  return proyectoBase([uf], { nodos, tramos })
}

// --- Caso B: bifurcación 1→2 ---------------------------------------------

function proyectoCasoB(): Proyecto {
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

// --- Caso C: fan-out 1→4 (derivacionMultipleNoModelada) ------------------

function proyectoCasoC(): Proyecto {
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

// --- Caso D: Montante (3 Locales encadenados, mismo montanteId) ----------

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

function proyectoCasoD(): { proyecto: Proyecto; montanteId: string } {
  const uf: UnidadFuncional = {
    id: 'uf-1',
    nombre: 'UF 1',
    niveles: [{ id: 'niv-1', nombre: 'PB', locales: [local('l-1', 'bano', 3), local('l-2', 'bano', 6), local('l-3', 'bano', 9)] }],
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
  return { proyecto: proyectoConMontante, montanteId: creado.montanteId }
}

// --- Caso E: multinivel (PB / PA en la misma UF) --------------------------

function proyectoCasoE(): Proyecto {
  const uf: UnidadFuncional = {
    id: 'uf-1',
    nombre: 'Casa 1',
    niveles: [
      { id: 'niv-pb', nombre: 'PB', nivel: 0, locales: [local('l-pb')] },
      { id: 'niv-pa', nombre: 'PA', nivel: 1, locales: [local('l-pa')] },
    ],
  }
  const nodos: Nodo[] = [
    { id: 'n-gen' },
    { id: 'n-pb', referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'l-pb', artefactoId: 'l-pb-art' } },
    { id: 'n-pa', referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'l-pa', artefactoId: 'l-pa-art' } },
  ]
  const tramos: Tramo[] = [
    { id: 't-pb', nodoOrigenId: 'n-gen', nodoDestinoId: 'n-pb', red: 'AF', longitud_m: 4 },
    { id: 't-pa', nodoOrigenId: 'n-gen', nodoDestinoId: 'n-pa', red: 'AF', longitud_m: 7 },
  ]
  return proyectoBase([uf], { nodos, tramos })
}

// --- Caso F: AF + AC sobre el mismo Local ----------------------------------

function proyectoCasoF(): Proyecto {
  const uf: UnidadFuncional = { id: 'uf-1', nombre: 'UF 1', niveles: [{ id: 'niv-1', nombre: 'PB', locales: [local('l-1')] }] }
  const nodos: Nodo[] = [
    { id: 'n-gen' },
    { id: 'n-acs', referencia: { tipo: 'produccionACS' } },
    { id: 'n-l1-af', referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'l-1', artefactoId: 'l-1-art' } },
    { id: 'n-l1-ac', referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'l-1', artefactoId: 'l-1-art' } },
  ]
  const tramos: Tramo[] = [
    { id: 't-af', nodoOrigenId: 'n-gen', nodoDestinoId: 'n-l1-af', red: 'AF', longitud_m: 5 },
    { id: 't-acs', nodoOrigenId: 'n-gen', nodoDestinoId: 'n-acs', red: 'AF', longitud_m: 2 },
    { id: 't-ac', nodoOrigenId: 'n-acs', nodoDestinoId: 'n-l1-ac', red: 'AC', longitud_m: 3 },
  ]
  return proyectoBase([uf], { nodos, tramos })
}

// --- Invariantes reutilizables (B41) --------------------------------------

function verificarInvariantes(grafo: GrafoVisual): void {
  const idsNodos = grafo.nodos.map((n) => n.id)
  expect(new Set(idsNodos).size).toBe(idsNodos.length)

  const idsAristas = grafo.aristas.map((a) => a.id)
  expect(new Set(idsAristas).size).toBe(idsAristas.length)

  const nodosPorId = new Set(idsNodos)
  for (const arista of grafo.aristas) {
    expect(nodosPorId.has(arista.origenId)).toBe(true)
    expect(nodosPorId.has(arista.destinoId)).toBe(true)
    expect(['AF', 'AC']).toContain(arista.red)
  }

  for (const nodo of grafo.nodos) {
    expect(nodo.label).not.toMatch(/undefined|NaN|\[object/)
    // Ningún label expone directamente un id técnico tipo uuid/n-xxxx como
    // única etiqueta visible (salvo cuando el label está vacío a propósito,
    // p. ej. nodos intermedios/derivación 1→2 sin símbolo V1).
    if (nodo.label !== '') {
      expect(nodo.label).not.toBe(nodo.dominioId)
    }
  }

  for (const arista of grafo.aristas) {
    if (arista.longitudTexto !== undefined) {
      expect(arista.longitudTexto).not.toMatch(/NaN|Infinity|undefined/)
    }
  }
}

describe('resolverGrafoVisual', () => {
  it('proyecto sin redHidraulica -> grafo vacío', () => {
    const proyecto = proyectoBase([], { nodos: [], tramos: [] })
    const grafo = resolverGrafoVisual(proyecto)
    expect(grafo).toEqual({ nodos: [], aristas: [], grupos: [] })
  })

  it('Caso A: origen -> tramo -> Local', () => {
    const grafo = resolverGrafoVisual(proyectoCasoA())
    verificarInvariantes(grafo)
    expect(grafo.nodos).toHaveLength(2)
    const origen = grafo.nodos.find((n) => n.tipo === 'origen')
    const destino = grafo.nodos.find((n) => n.tipo === 'local')
    expect(origen).toBeDefined()
    expect(destino).toBeDefined()
    expect(destino!.id).toBe('local:uf-1:l-1')
    expect(destino!.label).toBe('Baño 1')
    expect(destino!.sublabel).toContain('UF 1')
    expect(grafo.aristas).toHaveLength(1)
    expect(grafo.aristas[0]!.origenId).toBe(origen!.id)
    expect(grafo.aristas[0]!.destinoId).toBe(destino!.id)
    expect(grafo.aristas[0]!.red).toBe('AF')
    expect(grafo.aristas[0]!.longitudTexto).toBe('5,0 m')
  })

  it('Caso B: bifurcación 1→2 no se marca como no detallada', () => {
    const grafo = resolverGrafoVisual(proyectoCasoB())
    verificarInvariantes(grafo)
    const bifurcacion = grafo.nodos.find((n) => n.tipo === 'derivacion')
    expect(bifurcacion).toBeDefined()
    expect(bifurcacion!.noDetallado).toBeUndefined()
    expect(grafo.aristas).toHaveLength(3)
    expect(grafo.nodos.filter((n) => n.tipo === 'local')).toHaveLength(2)
  })

  it('Caso C: fan-out 1→4 se muestra con sus 4 aristas reales, marcado no detallado', () => {
    const grafo = resolverGrafoVisual(proyectoCasoC())
    verificarInvariantes(grafo)
    const distribucion = grafo.nodos.find((n) => n.tipo === 'derivacion')
    expect(distribucion).toBeDefined()
    expect(distribucion!.noDetallado).toBe(true)
    expect(distribucion!.cantidadSalidas).toBe(4)
    // exactamente 1 nodo de distribución real -- nunca 3 tees ficticias.
    expect(grafo.nodos.filter((n) => n.tipo === 'derivacion')).toHaveLength(1)
    const aristasDesdeDistribucion = grafo.aristas.filter((a) => a.origenId === distribucion!.id)
    expect(aristasDesdeDistribucion).toHaveLength(4)
    expect(grafo.nodos.filter((n) => n.tipo === 'local')).toHaveLength(4)
  })

  it('Caso D: Montante -- aristas reales conservadas, sin nodo Montante sintético', () => {
    const { proyecto, montanteId } = proyectoCasoD()
    expect(validarRedHidraulica(proyecto)).toEqual([])
    const grafo = resolverGrafoVisual(proyecto)
    verificarInvariantes(grafo)
    const aristasDelMontante = grafo.aristas.filter((a) => a.montanteId === montanteId)
    expect(aristasDelMontante).toHaveLength(3)
    // ningún nodo visual representa al Montante como entidad propia.
    expect(grafo.nodos.some((n) => (n as { montanteId?: string }).montanteId !== undefined)).toBe(false)
    // la etiqueta humana del montante aparece exactamente una vez.
    const conEtiqueta = aristasDelMontante.filter((a) => a.montanteEtiqueta !== undefined)
    expect(conEtiqueta).toHaveLength(1)
    expect(conEtiqueta[0]!.montanteEtiqueta).toBe('Montante AF 1')
  })

  it('Caso E: multinivel -- grupos de UF y Nivel presentes', () => {
    const grafo = resolverGrafoVisual(proyectoCasoE())
    verificarInvariantes(grafo)
    const grupoUf = grafo.grupos.find((g) => g.tipo === 'uf')
    const gruposNivel = grafo.grupos.filter((g) => g.tipo === 'nivel')
    expect(grupoUf).toBeDefined()
    expect(gruposNivel).toHaveLength(2)
    expect(gruposNivel.every((g) => g.parentId === grupoUf!.id)).toBe(true)
    const localPb = grafo.nodos.find((n) => n.id === 'local:uf-1:l-pb')!
    const localPa = grafo.nodos.find((n) => n.id === 'local:uf-1:l-pa')!
    expect(localPb.grupoNivelId).not.toBe(localPa.grupoNivelId)
    expect(localPb.sublabel).toContain('PB')
    expect(localPa.sublabel).toContain('PA')
  })

  it('Caso F: AF + AC sobre el mismo Local -- un único nodo destino, redes no fusionadas', () => {
    const grafo = resolverGrafoVisual(proyectoCasoF())
    verificarInvariantes(grafo)
    // un único nodo visual "Local" recibe ambas redes -- no se duplica.
    expect(grafo.nodos.filter((n) => n.tipo === 'local')).toHaveLength(1)
    const local1 = grafo.nodos.find((n) => n.tipo === 'local')!
    const aristasHaciaLocal = grafo.aristas.filter((a) => a.destinoId === local1.id)
    // dos aristas reales convergen en el mismo Local -- una AF directa,
    // otra AC vía producción ACS -- sin fusionarse en una arista bicolor.
    expect(aristasHaciaLocal).toHaveLength(2)
    expect(aristasHaciaLocal.map((a) => a.red).sort()).toEqual(['AC', 'AF'])
    // la producción ACS es un origen visual propio, no fusionado con el origen AF.
    const origenes = grafo.nodos.filter((n) => n.tipo === 'origen')
    expect(origenes).toHaveLength(2)
    expect(origenes.some((o) => o.label === 'Producción ACS' && o.red === 'AC')).toBe(true)
    expect(origenes.some((o) => o.red === 'AF')).toBe(true)
  })

  it('no muta el Proyecto recibido (B43)', () => {
    const proyecto = proyectoCasoB()
    const antes = JSON.stringify(proyecto)
    resolverGrafoVisual(proyecto)
    expect(JSON.stringify(proyecto)).toBe(antes)
  })

  it('etiqueta el origen AF según el esquema de abastecimiento vigente', () => {
    const proyecto: Proyecto = { ...proyectoCasoA(), configuracionAbastecimiento: { esquema: 'tanqueElevado' } }
    const grafo = resolverGrafoVisual(proyecto)
    const origen = grafo.nodos.find((n) => n.tipo === 'origen')!
    expect(origen.label).toBe('Tanque elevado')
  })

  it('sin configuracionAbastecimiento usa una etiqueta genérica, nunca un default silencioso', () => {
    const grafo = resolverGrafoVisual(proyectoCasoA())
    const origen = grafo.nodos.find((n) => n.tipo === 'origen')!
    expect(origen.label).toBe('Alimentación')
  })

  it('DN ausente no se muestra como "DN pendiente" ni como undefined/NaN', () => {
    const grafo = resolverGrafoVisual(proyectoCasoA())
    const arista = grafo.aristas[0]!
    expect(arista.dnTexto).toBeUndefined()
  })

  it('DN presente se muestra con el texto declarado, sin reinterpretar hidráulica', () => {
    const proyecto = proyectoCasoA()
    const tramoConDn = { ...proyecto.redHidraulica!.tramos[0]!, dnComercialAdoptado: '25 mm' }
    const conDn: Proyecto = { ...proyecto, redHidraulica: { ...proyecto.redHidraulica!, tramos: [tramoConDn] } }
    const grafo = resolverGrafoVisual(conDn)
    expect(grafo.aristas[0]!.dnTexto).toBe('DN 25 mm')
  })
})
