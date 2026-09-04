// Composición de N3 a lo largo de un camino: se verifica que la
// acumulación suma exactamente los hf_m que resolverPerdidaDistribuidaDeTramo
// devuelve por tramo (el expected se deriva llamando a esa misma primitiva
// —cuya composición es justamente lo que esta función hace—, no
// reimplementando Hazen/Darcy), y que cualquier estado incompleto de N3
// se propaga sin convertirse en hf=0 ni en suma parcial.
import { describe, it, expect } from 'vitest'
import type { Artefacto, MetadatosProyecto, ParametrosProyecto, Proyecto, UnidadFuncional } from '../../../modelo/proyecto'
import type { Nodo, RedHidraulica, ReferenciaDeArtefacto, Tramo } from '../../../modelo/redHidraulica'
import { catalogoArtefactos } from '../../../normativa/eras-2023/catalogo-artefactos'
import { validarRedHidraulica } from '../../../validacion/redHidraulica'
import { catalogoSistemasDeTuberia, type SistemaDeTuberiaCatalogado } from '../sistemaDeTuberia'
import { catalogoMaterialesTuberia } from '../materialTuberia'
import { obtenerCaminoHaciaOrigen, type CaminoHaciaOrigen } from '../topologia/obtenerCaminoHaciaOrigen'
import { resolverPerdidaDistribuidaDeTramo } from '../resolverPerdidaDistribuidaDeTramo'
import { acumularPerdidaDistribuidaDeCamino } from './acumularPerdidaDistribuidaDeCamino'

function metadatos(): MetadatosProyecto {
  return {
    nombre: 'Proyecto camino N3',
    obra: 'Obra camino N3',
    comitente: 'Comitente camino N3',
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
      metodoPerdidaLocalizada: 'detallado',
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

// Cadena raiz -> intermedio -> terminal(lavatorio), ambos Tramos AF con
// longitud_m. Cada Tramo tiene el lavatorio aguas abajo => n=1 (CRIT-A4),
// Qc=0.2, mismo candidato/velocidad; hf por Tramo depende de longitud_m.
function proyectoCadenaDosTramos(longitudes: { t0?: number; t1?: number }): Proyecto {
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
    { id: 't0', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AF', ...(longitudes.t0 !== undefined ? { longitud_m: longitudes.t0 } : {}) },
    { id: 't1', nodoOrigenId: 'n1', nodoDestinoId: 'n2', red: 'AF', ...(longitudes.t1 !== undefined ? { longitud_m: longitudes.t1 } : {}) },
  ]
  return proyectoCon([uf], { nodos, tramos })
}

function caminoResuelto(proyecto: Proyecto, nodoTerminalId: string): CaminoHaciaOrigen {
  const camino = obtenerCaminoHaciaOrigen(proyecto.redHidraulica!, nodoTerminalId)
  if (camino.tipo !== 'camino') {
    throw new Error(`fixture invalida: se esperaba un camino, se obtuvo ${camino.tipo}`)
  }
  return camino
}

function hfDeTramo(proyecto: Proyecto, tramoId: string): number {
  const r = resolverPerdidaDistribuidaDeTramo(
    proyecto,
    tramoId,
    catalogoArtefactos,
    catalogoSistemasDeTuberia,
    catalogoMaterialesTuberia,
  )
  if (r.tipo !== 'conPerdidaDistribuida') {
    throw new Error(`fixture invalida: tramo ${tramoId} no resolvio hf (${r.tipo})`)
  }
  return r.hf_m
}

describe('acumularPerdidaDistribuidaDeCamino', () => {
  it('suma los hf_m de cada Tramo del camino y los expone en porTramo', () => {
    const proyecto = proyectoCadenaDosTramos({ t0: 4, t1: 3 })
    expect(validarRedHidraulica(proyecto)).toEqual([])
    const camino = caminoResuelto(proyecto, 'n2')

    const resultado = acumularPerdidaDistribuidaDeCamino(
      proyecto,
      camino,
      catalogoArtefactos,
      catalogoSistemasDeTuberia,
      catalogoMaterialesTuberia,
    )

    const hfT0 = hfDeTramo(proyecto, 't0')
    const hfT1 = hfDeTramo(proyecto, 't1')

    expect(resultado.tipo).toBe('acumulada')
    if (resultado.tipo !== 'acumulada') return
    expect(resultado.porTramo).toEqual([
      { tramoId: 't0', hf_m: hfT0 },
      { tramoId: 't1', hf_m: hfT1 },
    ])
    expect(resultado.hf_m).toBeCloseTo(hfT0 + hfT1, 12)
    // Anclaje numerico: longitudes distintas (4 y 3) sobre el mismo J.
    expect(resultado.hf_m).toBeGreaterThan(0)
  })

  it('longitudes iguales -> aporte identico de cada Tramo (misma J, mismo candidato)', () => {
    const proyecto = proyectoCadenaDosTramos({ t0: 3, t1: 3 })
    const camino = caminoResuelto(proyecto, 'n2')

    const resultado = acumularPerdidaDistribuidaDeCamino(
      proyecto,
      camino,
      catalogoArtefactos,
      catalogoSistemasDeTuberia,
      catalogoMaterialesTuberia,
    )

    if (resultado.tipo !== 'acumulada') throw new Error('se esperaba acumulada')
    expect(resultado.porTramo[0]!.hf_m).toBeCloseTo(resultado.porTramo[1]!.hf_m, 12)
    expect(resultado.hf_m).toBeCloseTo(2 * resultado.porTramo[0]!.hf_m, 12)
  })

  it('raiz inmediata (camino sin Tramos) -> acumulada con hf_m 0, no un termino ausente', () => {
    const proyecto = proyectoCadenaDosTramos({ t0: 3, t1: 3 })

    const resultado = acumularPerdidaDistribuidaDeCamino(
      proyecto,
      { tipo: 'camino', nodos: [{ id: 'n0' }], tramos: [], raizId: 'n0', terminalId: 'n0' },
      catalogoArtefactos,
      catalogoSistemasDeTuberia,
      catalogoMaterialesTuberia,
    )

    expect(resultado).toEqual({ tipo: 'acumulada', hf_m: 0, porTramo: [] })
  })

  it('un Tramo sin longitud_m -> incompleta, nunca hf=0 ni suma parcial', () => {
    const proyecto = proyectoCadenaDosTramos({ t0: 3 }) // t1 sin longitud
    const camino = caminoResuelto(proyecto, 'n2')

    const resultado = acumularPerdidaDistribuidaDeCamino(
      proyecto,
      camino,
      catalogoArtefactos,
      catalogoSistemasDeTuberia,
      catalogoMaterialesTuberia,
    )

    expect(resultado).toEqual({
      tipo: 'incompleta',
      tramosNoResueltos: [{ tramoId: 't1', motivo: 'sinLongitud' }],
    })
  })

  it('un Tramo sin candidato comercial admisible -> incompleta con motivo sinCandidatoAdmisible', () => {
    const uf: UnidadFuncional = {
      id: 'uf-1',
      nombre: 'uf-1',
      locales: [{ id: 'local-1', tipo: 'bano', regimen: 'domiciliario', artefactos: [artefacto('inst-lavatorio', 'lavatorio')] }],
    }
    const nodos: Nodo[] = [
      { id: 'n0' },
      { id: 'n1', referencia: referenciaDe('uf-1', 'local-1', 'inst-lavatorio') },
    ]
    const tramos: Tramo[] = [{ id: 't0', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AF', longitud_m: 3 }]
    const proyecto = proyectoCon([uf], { nodos, tramos }, 'sistema-insuficiente')
    const camino = caminoResuelto(proyecto, 'n1')

    const resultado = acumularPerdidaDistribuidaDeCamino(
      proyecto,
      camino,
      catalogoArtefactos,
      SISTEMA_INSUFICIENTE,
      catalogoMaterialesTuberia,
    )

    expect(resultado).toEqual({
      tipo: 'incompleta',
      tramosNoResueltos: [{ tramoId: 't0', motivo: 'sinCandidatoAdmisible' }],
    })
  })

  it('un Tramo sin demanda computable aguas abajo -> incompleta con motivo sinDemanda', () => {
    // Terminal puramente topologico (sin referencia a artefacto): el Tramo
    // que llega a el no tiene ningun consumo aguas abajo.
    const nodos: Nodo[] = [{ id: 'n0' }, { id: 'n1' }]
    const tramos: Tramo[] = [{ id: 't0', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AF', longitud_m: 3 }]
    const proyecto = proyectoCon([], { nodos, tramos })
    const camino = caminoResuelto(proyecto, 'n1')

    const resultado = acumularPerdidaDistribuidaDeCamino(
      proyecto,
      camino,
      catalogoArtefactos,
      catalogoSistemasDeTuberia,
      catalogoMaterialesTuberia,
    )

    expect(resultado).toEqual({
      tipo: 'incompleta',
      tramosNoResueltos: [{ tramoId: 't0', motivo: 'sinDemanda' }],
    })
  })

  it('estados incompletos de varios Tramos se listan todos, sin devolver hf de los que si resolvieron', () => {
    const proyecto = proyectoCadenaDosTramos({}) // ambos sin longitud
    const camino = caminoResuelto(proyecto, 'n2')

    const resultado = acumularPerdidaDistribuidaDeCamino(
      proyecto,
      camino,
      catalogoArtefactos,
      catalogoSistemasDeTuberia,
      catalogoMaterialesTuberia,
    )

    expect(resultado).toEqual({
      tipo: 'incompleta',
      tramosNoResueltos: [
        { tramoId: 't0', motivo: 'sinLongitud' },
        { tramoId: 't1', motivo: 'sinLongitud' },
      ],
    })
  })
})
