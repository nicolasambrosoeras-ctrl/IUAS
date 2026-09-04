// Composición de resolverPerdidaLocalizadaDeTramo a lo largo de un
// camino: se verifica que la acumulación suma exactamente los hf_m que
// esa primitiva devuelve por tramo (el expected se deriva componiendo
// resolverDiametroComercialDeTramo + resolverPerdidaLocalizadaDeTramo
// directamente -- que es justamente lo que esta función hace, no una
// fórmula reimplementada), y que cualquier estado incompleto se propaga
// sin convertirse en hf=0 ni en suma parcial.
import { describe, it, expect } from 'vitest'
import type { Artefacto, MetadatosProyecto, ParametrosProyecto, Proyecto, UnidadFuncional } from '../../../modelo/proyecto'
import type { AccesorioDeTramo, Nodo, RedHidraulica, ReferenciaDeArtefacto, Tramo } from '../../../modelo/redHidraulica'
import { catalogoArtefactos } from '../../../normativa/eras-2023/catalogo-artefactos'
import { validarRedHidraulica } from '../../../validacion/redHidraulica'
import { catalogoSistemasDeTuberia, type SistemaDeTuberiaCatalogado } from '../sistemaDeTuberia'
import { resolverDiametroComercialDeTramo } from '../resolverDiametroComercialDeTramo'
import { resolverPerdidaLocalizadaDeTramo } from '../perdidaCarga/resolverPerdidaLocalizadaDeTramo'
import { obtenerCaminoHaciaOrigen, type CaminoHaciaOrigen } from '../topologia/obtenerCaminoHaciaOrigen'
import { acumularPerdidaLocalizadaDeCamino } from './acumularPerdidaLocalizadaDeCamino'

function metadatos(): MetadatosProyecto {
  return {
    nombre: 'Proyecto camino localizada',
    obra: 'Obra',
    comitente: 'Comitente',
    fecha: '2026-01-01',
    schemaVersion: '1.0.0',
    versionNormativa: 'eras-2023',
  }
}

function parametros(): ParametrosProyecto {
  return { tipoDeProyecto: 'viviendaIndividual', presionSobreAcera_m: 0, alturaArtefactoMasDesfavorable_m: 0 }
}

function artefacto(idInstancia: string, artefactoIdCatalogo: string): Artefacto {
  return { id: idInstancia, artefactoId: artefactoIdCatalogo, cantidad: 1, origen: 'normativo' }
}

function referenciaDe(unidadFuncionalId: string, localId: string, artefactoId: string): ReferenciaDeArtefacto {
  return { tipo: 'artefacto', unidadFuncionalId, localId, artefactoId }
}

function proyectoCon(
  unidadesFuncionales: readonly UnidadFuncional[],
  redHidraulica: RedHidraulica,
  sistemaDeTuberiaId = 'acquaSystemMagnumPn20',
): Proyecto {
  return {
    metadatos: metadatos(),
    parametros: parametros(),
    unidadesFuncionales,
    redHidraulica,
    configuracionHidraulica: {
      metodoPerdidaDistribuida: 'hazenWilliams',
      materialTuberiaId: 'ppr',
      sistemaDeTuberiaId,
    },
  }
}

const SISTEMA_INSUFICIENTE: readonly SistemaDeTuberiaCatalogado[] = [
  {
    id: 'sistema-insuficiente',
    denominacion: 'Sistema de laboratorio insuficiente (ficticio)',
    materialTuberiaId: 'ppr',
    fabricante: 'Fabricante ficticio',
    referenciaFuenteDimensiones: 'Fuente ficticia de laboratorio',
    entradas: [{ denominacionComercial: '5 mm (ficticio)', diametroInteriorEfectivo_mm: 5 }],
  },
]

// Cadena raiz -> intermedio -> terminal(lavatorio); ambos Tramos AF, con
// accesorios opcionales por tramo.
function proyectoCadenaDosTramos(accesorios: {
  t0?: readonly AccesorioDeTramo[]
  t1?: readonly AccesorioDeTramo[]
}): Proyecto {
  const uf: UnidadFuncional = {
    id: 'uf-1',
    nombre: 'uf-1',
    locales: [{ id: 'local-1', tipo: 'bano', regimen: 'domiciliario', artefactos: [artefacto('inst-lavatorio', 'lavatorio')] }],
  }
  const nodos: Nodo[] = [
    { id: 'n0' },
    { id: 'n1' },
    { id: 'n2', referencia: referenciaDe('uf-1', 'local-1', 'inst-lavatorio') },
  ]
  const tramos: Tramo[] = [
    { id: 't0', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AF', longitud_m: 3, ...(accesorios.t0 !== undefined ? { accesorios: accesorios.t0 } : {}) },
    { id: 't1', nodoOrigenId: 'n1', nodoDestinoId: 'n2', red: 'AF', longitud_m: 3, ...(accesorios.t1 !== undefined ? { accesorios: accesorios.t1 } : {}) },
  ]
  return proyectoCon([uf], { nodos, tramos })
}

function caminoResuelto(proyecto: Proyecto, nodoTerminalId: string): CaminoHaciaOrigen {
  const camino = obtenerCaminoHaciaOrigen(proyecto.redHidraulica!, nodoTerminalId)
  if (camino.tipo !== 'camino') {
    throw new Error(`fixture inválida: se esperaba un camino, se obtuvo ${camino.tipo}`)
  }
  return camino
}

function hfLocalizadaDeTramo(proyecto: Proyecto, tramoId: string, accesorios: readonly AccesorioDeTramo[] | undefined): number {
  const comercial = resolverDiametroComercialDeTramo(proyecto, tramoId, catalogoArtefactos, catalogoSistemasDeTuberia)
  if (comercial.tipo !== 'conCandidato') {
    throw new Error(`fixture inválida: tramo ${tramoId} no resolvió candidato comercial (${comercial.tipo})`)
  }
  const r = resolverPerdidaLocalizadaDeTramo(accesorios, comercial.velocidadReal_mps)
  if (r.tipo !== 'calculada') {
    throw new Error(`fixture inválida: tramo ${tramoId} no calculó pérdida localizada (${r.tipo})`)
  }
  return r.hf_m
}

describe('acumularPerdidaLocalizadaDeCamino', () => {
  it('suma los hf_m de cada Tramo del camino y los expone en porTramo', () => {
    const proyecto = proyectoCadenaDosTramos({
      t0: [{ tipo: 'codo90', cantidad: 1 }],
      t1: [{ tipo: 'llaveDePaso', cantidad: 1 }, { tipo: 'uniones', cantidad: 2 }],
    })
    expect(validarRedHidraulica(proyecto)).toEqual([])
    const camino = caminoResuelto(proyecto, 'n2')

    const resultado = acumularPerdidaLocalizadaDeCamino(proyecto, camino, catalogoArtefactos, catalogoSistemasDeTuberia)

    const hfT0 = hfLocalizadaDeTramo(proyecto, 't0', [{ tipo: 'codo90', cantidad: 1 }])
    const hfT1 = hfLocalizadaDeTramo(proyecto, 't1', [{ tipo: 'llaveDePaso', cantidad: 1 }, { tipo: 'uniones', cantidad: 2 }])

    expect(resultado.tipo).toBe('acumulada')
    if (resultado.tipo !== 'acumulada') return
    expect(resultado.porTramo).toEqual([
      { tramoId: 't0', hf_m: hfT0 },
      { tramoId: 't1', hf_m: hfT1 },
    ])
    expect(resultado.hf_m).toBeCloseTo(hfT0 + hfT1, 12)
    expect(resultado.hf_m).toBeGreaterThan(0)
  })

  it('accesorios=[] en ambos tramos -> acumulada con hf_m 0 (cero real, no ausencia)', () => {
    const proyecto = proyectoCadenaDosTramos({ t0: [], t1: [] })
    const camino = caminoResuelto(proyecto, 'n2')

    const resultado = acumularPerdidaLocalizadaDeCamino(proyecto, camino, catalogoArtefactos, catalogoSistemasDeTuberia)

    expect(resultado).toEqual({
      tipo: 'acumulada',
      hf_m: 0,
      porTramo: [
        { tramoId: 't0', hf_m: 0 },
        { tramoId: 't1', hf_m: 0 },
      ],
    })
  })

  it('raiz inmediata (camino sin Tramos) -> acumulada con hf_m 0, no un término ausente', () => {
    const proyecto = proyectoCadenaDosTramos({ t0: [], t1: [] })

    const resultado = acumularPerdidaLocalizadaDeCamino(
      proyecto,
      { tipo: 'camino', nodos: [{ id: 'n0' }], tramos: [], raizId: 'n0', terminalId: 'n0' },
      catalogoArtefactos,
      catalogoSistemasDeTuberia,
    )

    expect(resultado).toEqual({ tipo: 'acumulada', hf_m: 0, porTramo: [] })
  })

  it('un Tramo con accesorios no relevados (undefined) -> incompleta, nunca hf=0 ni suma parcial', () => {
    const proyecto = proyectoCadenaDosTramos({ t0: [{ tipo: 'codo90', cantidad: 1 }] }) // t1 sin relevar
    const camino = caminoResuelto(proyecto, 'n2')

    const resultado = acumularPerdidaLocalizadaDeCamino(proyecto, camino, catalogoArtefactos, catalogoSistemasDeTuberia)

    expect(resultado).toEqual({
      tipo: 'incompleta',
      tramosNoResueltos: [{ tramoId: 't1', motivo: 'sinRelevar' }],
    })
  })

  it('varios Tramos sin relevar se listan todos', () => {
    const proyecto = proyectoCadenaDosTramos({}) // ambos sin relevar
    const camino = caminoResuelto(proyecto, 'n2')

    const resultado = acumularPerdidaLocalizadaDeCamino(proyecto, camino, catalogoArtefactos, catalogoSistemasDeTuberia)

    expect(resultado).toEqual({
      tipo: 'incompleta',
      tramosNoResueltos: [
        { tramoId: 't0', motivo: 'sinRelevar' },
        { tramoId: 't1', motivo: 'sinRelevar' },
      ],
    })
  })

  it('un Tramo sin candidato comercial admisible -> incompleta con motivo sinCandidatoAdmisible', () => {
    const uf: UnidadFuncional = {
      id: 'uf-1',
      nombre: 'uf-1',
      locales: [{ id: 'local-1', tipo: 'bano', regimen: 'domiciliario', artefactos: [artefacto('inst-lavatorio', 'lavatorio')] }],
    }
    const nodos: Nodo[] = [{ id: 'n0' }, { id: 'n1', referencia: referenciaDe('uf-1', 'local-1', 'inst-lavatorio') }]
    const tramos: Tramo[] = [{ id: 't0', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AF', longitud_m: 3, accesorios: [] }]
    const proyecto = proyectoCon([uf], { nodos, tramos }, 'sistema-insuficiente')
    const camino = caminoResuelto(proyecto, 'n1')

    const resultado = acumularPerdidaLocalizadaDeCamino(proyecto, camino, catalogoArtefactos, SISTEMA_INSUFICIENTE)

    expect(resultado).toEqual({
      tipo: 'incompleta',
      tramosNoResueltos: [{ tramoId: 't0', motivo: 'sinCandidatoAdmisible' }],
    })
  })

  it('un Tramo sin demanda computable aguas abajo -> incompleta con motivo sinDemanda', () => {
    const nodos: Nodo[] = [{ id: 'n0' }, { id: 'n1' }]
    const tramos: Tramo[] = [{ id: 't0', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AF', longitud_m: 3, accesorios: [] }]
    const proyecto = proyectoCon([], { nodos, tramos })
    const camino = caminoResuelto(proyecto, 'n1')

    const resultado = acumularPerdidaLocalizadaDeCamino(proyecto, camino, catalogoArtefactos, catalogoSistemasDeTuberia)

    expect(resultado).toEqual({
      tipo: 'incompleta',
      tramosNoResueltos: [{ tramoId: 't0', motivo: 'sinDemanda' }],
    })
  })

  it('cada singularidad usa la velocidad de SU tramo: Qc distinto por bifurcación -> V distinta -> hf distinto', () => {
    // n1 bifurca hacia el terminal (n2, lavatorio) y hacia otra rama (n3,
    // ducha): t0 (n0->n1) carga Qc de AMBOS aguas abajo; t1 (n1->n2) carga
    // solo el del lavatorio. Mismo Ks_total declarado en ambos tramos, V
    // distinta -> hf distinto, y cada uno debe reflejar la V de su propio
    // tramo, no una compartida.
    const uf: UnidadFuncional = {
      id: 'uf-1',
      nombre: 'uf-1',
      locales: [
        {
          id: 'local-1',
          tipo: 'bano',
          regimen: 'domiciliario',
          artefactos: [artefacto('inst-lavatorio', 'lavatorio'), artefacto('inst-ducha', 'receptaculoDucha')],
        },
      ],
    }
    const accesoriosComunes: readonly AccesorioDeTramo[] = [{ tipo: 'codo90', cantidad: 1 }]
    const nodos: Nodo[] = [
      { id: 'n0' },
      { id: 'n1' },
      { id: 'n2', referencia: referenciaDe('uf-1', 'local-1', 'inst-lavatorio') },
      { id: 'n3', referencia: referenciaDe('uf-1', 'local-1', 'inst-ducha') },
    ]
    const tramos: Tramo[] = [
      { id: 't0', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AF', longitud_m: 3, accesorios: accesoriosComunes },
      { id: 't1', nodoOrigenId: 'n1', nodoDestinoId: 'n2', red: 'AF', longitud_m: 3, accesorios: accesoriosComunes },
      { id: 't-ducha', nodoOrigenId: 'n1', nodoDestinoId: 'n3', red: 'AF', longitud_m: 3 },
    ]
    const proyecto = proyectoCon([uf], { nodos, tramos })
    expect(validarRedHidraulica(proyecto)).toEqual([])
    const camino = caminoResuelto(proyecto, 'n2')
    expect(camino.tramos.map((t) => t.id)).toEqual(['t0', 't1'])

    const resultado = acumularPerdidaLocalizadaDeCamino(proyecto, camino, catalogoArtefactos, catalogoSistemasDeTuberia)

    const hfT0 = hfLocalizadaDeTramo(proyecto, 't0', accesoriosComunes)
    const hfT1 = hfLocalizadaDeTramo(proyecto, 't1', accesoriosComunes)

    // Qc de t0 (2 artefactos aguas abajo) > Qc de t1 (1 artefacto): las
    // velocidades reales resueltas por la capa comercial difieren, así
    // que a igual Ks_total declarado el hf resultante también difiere.
    expect(hfT0).not.toBeCloseTo(hfT1, 6)
    if (resultado.tipo !== 'acumulada') throw new Error('se esperaba acumulada')
    expect(resultado.porTramo).toEqual([
      { tramoId: 't0', hf_m: hfT0 },
      { tramoId: 't1', hf_m: hfT1 },
    ])
  })
})
