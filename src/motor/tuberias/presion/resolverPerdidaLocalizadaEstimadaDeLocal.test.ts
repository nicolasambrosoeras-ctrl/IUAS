// Los expected de hf_m se derivan llamando resolverDiametroComercialDeTramo
// directamente sobre los mismos tramos (mismo criterio que
// acumularPerdidaLocalizadaDeCamino.test.ts): nunca un numero mágico
// hardcodeado, siempre la composición de las primitivas ya productivas.
import { describe, it, expect } from 'vitest'
import type { Artefacto, MetadatosProyecto, ParametrosProyecto, Proyecto, UnidadFuncional } from '../../../modelo/proyecto'
import type { Nodo, RedHidraulica, ReferenciaDeArtefacto, Tramo } from '../../../modelo/redHidraulica'
import { catalogoArtefactos } from '../../../normativa/eras-2023/catalogo-artefactos'
import { catalogoSistemasDeTuberia, type SistemaDeTuberiaCatalogado } from '../sistemaDeTuberia'
import { resolverDiametroComercialDeTramo } from '../resolverDiametroComercialDeTramo'
import { calcularPerdidaCargaLocalizada } from '../perdidaCarga/calcularPerdidaCargaLocalizada'
import {
  resolverPerdidaLocalizadaEstimadaDeLocal,
  KS_ESTIMADO_TEE,
  KS_ESTIMADO_SINGULARIDAD_TERMINAL,
  KS_ESTIMADO_LLAVE_DE_PASO,
} from './resolverPerdidaLocalizadaEstimadaDeLocal'

function metadatos(): MetadatosProyecto {
  return {
    nombre: 'Proyecto perdida localizada estimada',
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
      metodoPerdidaLocalizada: 'estimado', granularidadHidraulica: 'profesional',
      materialTuberiaId: 'ppr',
      sistemaDeTuberiaId,
    },
  }
}

// Topologia en estrella: raiz -> un Tramo directo por cada terminal
// declarado, todos de la MISMA red -- exactamente los tramos que
// "alimentan directamente" cada terminal del Local+red.
function proyectoConTerminalesEnEstrella(
  artefactoIdsCatalogo: readonly string[],
  red: 'AF' | 'AC' = 'AF',
): { proyecto: Proyecto; tramoIds: readonly string[] } {
  const artefactos = artefactoIdsCatalogo.map((id, indice) => artefacto(`inst-${indice}`, id))
  const uf: UnidadFuncional = {
    id: 'uf-1',
    nombre: 'uf-1',
    locales: [{ id: 'local-1', tipo: 'bano', regimen: 'domiciliario', artefactos }],
  }
  const nodos: Nodo[] = [
    { id: 'raiz' },
    ...artefactoIdsCatalogo.map((_id, indice) => ({
      id: `t${indice}`,
      referencia: referenciaDe('uf-1', 'local-1', `inst-${indice}`),
    })),
  ]
  const tramoIds = artefactoIdsCatalogo.map((_id, indice) => `tr${indice}`)
  const tramos: Tramo[] = artefactoIdsCatalogo.map((_id, indice) => ({
    id: `tr${indice}`,
    nodoOrigenId: 'raiz',
    nodoDestinoId: `t${indice}`,
    red,
    longitud_m: 3,
  }))
  return { proyecto: proyectoCon([uf], { nodos, tramos }), tramoIds }
}

function velocidadRealDe(proyecto: Proyecto, tramoId: string): number {
  const resultado = resolverDiametroComercialDeTramo(proyecto, tramoId, catalogoArtefactos, catalogoSistemasDeTuberia)
  if (resultado.tipo !== 'conCandidato') throw new Error(`fixture: se esperaba conCandidato para ${tramoId}`)
  return resultado.velocidadReal_mps
}

// Ks equivalente estimado (D-delta.45): tees (n-1) + 1 singularidad
// terminal fija + 1 llave de paso por Local+red, esta ultima solo
// cuando hay al menos 1 terminal fisico.
function ksEquivalenteEstimado(nTees: number): number {
  return nTees * KS_ESTIMADO_TEE + KS_ESTIMADO_SINGULARIDAD_TERMINAL + KS_ESTIMADO_LLAVE_DE_PASO
}

describe('resolverPerdidaLocalizadaEstimadaDeLocal', () => {
  it('1 terminal fisico -> 0 tees estimadas, pero SI singularidad terminal + llave de paso (D-delta.45): hf>0, requiere resolver velocidad', () => {
    const { proyecto, tramoIds } = proyectoConTerminalesEnEstrella(['lavatorio'])

    const resultado = resolverPerdidaLocalizadaEstimadaDeLocal(
      proyecto,
      'uf-1',
      'local-1',
      'AF',
      catalogoArtefactos,
      catalogoSistemasDeTuberia,
    )

    const vMax = Math.max(...tramoIds.map((id) => velocidadRealDe(proyecto, id)))
    const hfEsperado = calcularPerdidaCargaLocalizada(ksEquivalenteEstimado(0), vMax)

    expect(resultado).toEqual({
      tipo: 'estimada',
      hf_m: hfEsperado,
      nTerminalesLocal: 1,
      nTeesEstimadas: 0,
      nSingularidadTerminal: 1,
      nLlaveDePaso: 1,
      velocidadReferencia_mps: vMax,
    })
  })

  it('0 terminales fisicos -> unico cero real, no requiere resolver velocidad', () => {
    const uf: UnidadFuncional = { id: 'uf-1', nombre: 'uf-1', locales: [{ id: 'local-1', tipo: 'bano', regimen: 'domiciliario', artefactos: [] }] }
    const proyecto = proyectoCon([uf], { nodos: [], tramos: [] })

    const resultado = resolverPerdidaLocalizadaEstimadaDeLocal(
      proyecto,
      'uf-1',
      'local-1',
      'AF',
      catalogoArtefactos,
      catalogoSistemasDeTuberia,
    )

    expect(resultado).toEqual({
      tipo: 'estimada',
      hf_m: 0,
      nTerminalesLocal: 0,
      nTeesEstimadas: 0,
      nSingularidadTerminal: 0,
      nLlaveDePaso: 0,
      velocidadReferencia_mps: 0,
    })
  })

  it('2 terminales fisicos -> 1 tee estimada + singularidad terminal + llave de paso, V_ref = maxima velocidad real entre los tramos terminales', () => {
    const { proyecto, tramoIds } = proyectoConTerminalesEnEstrella(['lavatorio', 'inodoroDeposito'])

    const resultado = resolverPerdidaLocalizadaEstimadaDeLocal(
      proyecto,
      'uf-1',
      'local-1',
      'AF',
      catalogoArtefactos,
      catalogoSistemasDeTuberia,
    )

    const vMax = Math.max(...tramoIds.map((id) => velocidadRealDe(proyecto, id)))
    const hfEsperado = calcularPerdidaCargaLocalizada(ksEquivalenteEstimado(1), vMax)

    if (resultado.tipo !== 'estimada') throw new Error('se esperaba estimada')
    expect(resultado.nTerminalesLocal).toBe(2)
    expect(resultado.nTeesEstimadas).toBe(1)
    expect(resultado.nSingularidadTerminal).toBe(1)
    expect(resultado.nLlaveDePaso).toBe(1)
    expect(resultado.velocidadReferencia_mps).toBeCloseTo(vMax, 12)
    expect(resultado.hf_m).toBeCloseTo(hfEsperado, 12)
  })

  it('4 terminales fisicos -> 3 tees estimadas + singularidad terminal + llave de paso', () => {
    const { proyecto, tramoIds } = proyectoConTerminalesEnEstrella([
      'lavatorio',
      'inodoroDeposito',
      'bidet',
      'receptaculoDucha',
    ])

    const resultado = resolverPerdidaLocalizadaEstimadaDeLocal(
      proyecto,
      'uf-1',
      'local-1',
      'AF',
      catalogoArtefactos,
      catalogoSistemasDeTuberia,
    )

    const vMax = Math.max(...tramoIds.map((id) => velocidadRealDe(proyecto, id)))
    const hfEsperado = calcularPerdidaCargaLocalizada(ksEquivalenteEstimado(3), vMax)

    if (resultado.tipo !== 'estimada') throw new Error('se esperaba estimada')
    expect(resultado.nTerminalesLocal).toBe(4)
    expect(resultado.nTeesEstimadas).toBe(3)
    expect(resultado.nSingularidadTerminal).toBe(1)
    expect(resultado.nLlaveDePaso).toBe(1)
    expect(resultado.hf_m).toBeCloseTo(hfEsperado, 12)
  })

  it('AF y AC se estiman de forma independiente sobre la misma topologia', () => {
    const uf: UnidadFuncional = {
      id: 'uf-1',
      nombre: 'uf-1',
      locales: [
        {
          id: 'local-1',
          tipo: 'bano',
          regimen: 'domiciliario',
          artefactos: [artefacto('inst-lav', 'lavatorio'), artefacto('inst-ducha', 'receptaculoDucha')],
        },
      ],
    }
    // lavatorio: solo AF. receptaculoDucha: AF+AC (dos nodos, misma
    // referencia) -- n(AF)=2, n(AC)=1.
    const nodos: Nodo[] = [
      { id: 'raiz' },
      { id: 't-lav', referencia: referenciaDe('uf-1', 'local-1', 'inst-lav') },
      { id: 't-ducha-af', referencia: referenciaDe('uf-1', 'local-1', 'inst-ducha') },
      { id: 't-ducha-ac', referencia: referenciaDe('uf-1', 'local-1', 'inst-ducha') },
    ]
    const tramos: Tramo[] = [
      { id: 'tr-lav', nodoOrigenId: 'raiz', nodoDestinoId: 't-lav', red: 'AF', longitud_m: 3 },
      { id: 'tr-ducha-af', nodoOrigenId: 'raiz', nodoDestinoId: 't-ducha-af', red: 'AF', longitud_m: 3 },
      { id: 'tr-ducha-ac', nodoOrigenId: 'raiz', nodoDestinoId: 't-ducha-ac', red: 'AC', longitud_m: 3 },
    ]
    const proyecto = proyectoCon([uf], { nodos, tramos })

    const resultadoAF = resolverPerdidaLocalizadaEstimadaDeLocal(
      proyecto,
      'uf-1',
      'local-1',
      'AF',
      catalogoArtefactos,
      catalogoSistemasDeTuberia,
    )
    const resultadoAC = resolverPerdidaLocalizadaEstimadaDeLocal(
      proyecto,
      'uf-1',
      'local-1',
      'AC',
      catalogoArtefactos,
      catalogoSistemasDeTuberia,
    )

    if (resultadoAF.tipo !== 'estimada' || resultadoAC.tipo !== 'estimada') throw new Error('se esperaba estimada')
    expect(resultadoAF.nTerminalesLocal).toBe(2)
    expect(resultadoAF.nTeesEstimadas).toBe(1)
    expect(resultadoAC.nTerminalesLocal).toBe(1)
    expect(resultadoAC.nTeesEstimadas).toBe(0)
    // D-delta.45: 1 terminal ya no es hf=0 -- singularidad terminal +
    // llave de paso aplican igual con un unico terminal fisico.
    expect(resultadoAC.nSingularidadTerminal).toBe(1)
    expect(resultadoAC.nLlaveDePaso).toBe(1)
    expect(resultadoAC.hf_m).toBeGreaterThan(0)
  })

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

  it('tramo terminal sin candidato comercial admisible -> incompleta, nunca una suma parcial silenciosa', () => {
    const { proyecto } = proyectoConTerminalesEnEstrella(['lavatorio', 'inodoroDeposito'], 'AF')
    const proyectoInsuficiente: Proyecto = {
      ...proyecto,
      configuracionHidraulica: { ...proyecto.configuracionHidraulica, sistemaDeTuberiaId: 'sistema-insuficiente' },
    }

    const resultado = resolverPerdidaLocalizadaEstimadaDeLocal(
      proyectoInsuficiente,
      'uf-1',
      'local-1',
      'AF',
      catalogoArtefactos,
      SISTEMA_INSUFICIENTE,
    )

    expect(resultado.tipo).toBe('incompleta')
    if (resultado.tipo !== 'incompleta') return
    expect(resultado.tramosNoResueltos.length).toBeGreaterThan(0)
    expect(resultado.tramosNoResueltos.every((t) => t.motivo === 'sinCandidatoAdmisible')).toBe(true)
  })
})
