// Golden end-to-end de CRIT-A22 (Incremento correctivo 1 — piso físico
// de caudal individual), usando topología/catálogo real completos, sin
// mockear ninguna primitiva. Reproduce los casos A1-A6 del análisis
// previo a este incremento: valores esperados calculados a mano con las
// fórmulas normativas ya cerradas (CRIT-A1/A4/A8/A13/A14) + CRIT-A22,
// nunca invocando funciones del propio motor. Fixtures duplicadas
// localmente a propósito, sin exportar helpers compartidos (mismo
// criterio que resolverHidraulicaDeTramo.golden.test.ts).
import { describe, it, expect } from 'vitest'
import type {
  Artefacto,
  MetadatosProyecto,
  ParametrosProyecto,
  Proyecto,
  TipoDeProyecto,
  UnidadFuncional,
} from '../../modelo/proyecto'
import type { Nodo, RedHidraulica, ReferenciaDeArtefacto, Tramo } from '../../modelo/redHidraulica'
import { catalogoArtefactos } from '../../normativa/eras-2023/catalogo-artefactos'
import { resolverHidraulicaDeTramo } from './resolverHidraulicaDeTramo'

function metadatos(): MetadatosProyecto {
  return {
    nombre: 'Proyecto golden CRIT-A22',
    obra: 'Obra golden CRIT-A22',
    comitente: 'Comitente golden CRIT-A22',
    fecha: '2026-01-01',
    schemaVersion: '1.0.0',
    versionNormativa: 'eras-2023',
  }
}

function parametros(tipoDeProyecto: TipoDeProyecto): ParametrosProyecto {
  return { tipoDeProyecto, presionSobreAcera_m: 0, alturaArtefactoMasDesfavorable_m: 0 }
}

function proyectoCon(
  tipoDeProyecto: TipoDeProyecto,
  unidadesFuncionales: readonly UnidadFuncional[],
  redHidraulica: RedHidraulica,
): Proyecto {
  return {
    metadatos: metadatos(),
    parametros: parametros(tipoDeProyecto),
    unidadesFuncionales,
    redHidraulica,
    configuracionHidraulica: { metodoPerdidaDistribuida: 'hazenWilliams', metodoPerdidaLocalizada: 'detallado', granularidadHidraulica: 'profesional', materialTuberiaId: 'ppr', sistemaDeTuberiaId: 'acquaSystemMagnumPn20' },
  }
}

function artefacto(idInstancia: string, artefactoIdCatalogo: string): Artefacto {
  return { id: idInstancia, artefactoId: artefactoIdCatalogo, cantidad: 1, origen: 'normativo' }
}

function localCon(id: string, artefactos: readonly Artefacto[]): { id: string; tipo: 'bano' | 'cocina' | 'lavadero' | 'jardin' | 'toilette'; regimen: 'domiciliario'; artefactos: readonly Artefacto[] } {
  const tipoPorId: Record<string, 'bano' | 'cocina' | 'lavadero' | 'jardin' | 'toilette'> = {
    bano: 'bano',
    toilette: 'toilette',
    cocina: 'cocina',
    lavadero: 'lavadero',
    jardin: 'jardin',
  }
  return { id, tipo: tipoPorId[id] ?? 'bano', regimen: 'domiciliario', artefactos }
}

function referenciaDe(unidadFuncionalId: string, localId: string, artefactoId: string): ReferenciaDeArtefacto {
  return { tipo: 'artefacto', unidadFuncionalId, localId, artefactoId }
}

describe('resolverHidraulicaDeTramo — golden CRIT-A22 (piso físico de caudal individual)', () => {
  it('A1 — válvula sola: qcEstadistico=quMax=1.5, piso no se activa', () => {
    const valvula = artefacto('inst-valvula', 'inodoroValvula')
    const uf: UnidadFuncional = { id: 'uf-1', nombre: 'UF 1', locales: [localCon('bano', [valvula])] }
    const nodos: Nodo[] = [{ id: 'n0' }, { id: 'n1', referencia: referenciaDe('uf-1', 'bano', 'inst-valvula') }]
    const tramos: Tramo[] = [{ id: 't0', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AF' }]
    const proyecto = proyectoCon('viviendaIndividual', [uf], { nodos, tramos })

    const resultado = resolverHidraulicaDeTramo(proyecto, 't0', catalogoArtefactos)

    if (resultado.tipo !== 'conDemanda') {
      throw new Error('se esperaba conDemanda')
    }
    expect(resultado.simultaneidad.qcEstadistico_lps).toBe(1.5)
    expect(resultado.simultaneidad.quMaxParticipante_lps).toBe(1.5)
    expect(resultado.qc_lps).toBe(1.5)
    expect(resultado.simultaneidad.pisoCaudalIndividualAplicado).toBe(false)
  })

  it('A2/A3 — válvula + resto del baño (mismo Local): CRIT-A8 sigue suprimiendo, n=1, piso no interviene', () => {
    const valvula = artefacto('inst-valvula', 'inodoroValvula')
    const lavatorio = artefacto('inst-lavatorio', 'lavatorio')
    const bidet = artefacto('inst-bidet', 'bidet')
    const ducha = artefacto('inst-ducha', 'receptaculoDucha')
    const uf: UnidadFuncional = { id: 'uf-1', nombre: 'UF 1', locales: [localCon('bano', [valvula, lavatorio, bidet, ducha])] }
    const nodos: Nodo[] = [
      { id: 'nRaiz' },
      { id: 'n0' },
      { id: 'n1', referencia: referenciaDe('uf-1', 'bano', 'inst-valvula') },
      { id: 'n2', referencia: referenciaDe('uf-1', 'bano', 'inst-lavatorio') },
      { id: 'n3', referencia: referenciaDe('uf-1', 'bano', 'inst-bidet') },
      { id: 'n4', referencia: referenciaDe('uf-1', 'bano', 'inst-ducha') },
    ]
    const tramos: Tramo[] = [
      // Tramo común evaluado, aguas arriba de las 4 derivaciones del baño.
      { id: 'tGeneral', nodoOrigenId: 'nRaiz', nodoDestinoId: 'n0', red: 'AF' },
      { id: 't0', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AF' },
      { id: 't1', nodoOrigenId: 'n0', nodoDestinoId: 'n2', red: 'AF' },
      { id: 't2', nodoOrigenId: 'n0', nodoDestinoId: 'n3', red: 'AF' },
      { id: 't3', nodoOrigenId: 'n0', nodoDestinoId: 'n4', red: 'AF' },
    ]
    const proyecto = proyectoCon('viviendaIndividual', [uf], { nodos, tramos })

    // CRIT-A8 suprime lavatorio/bidet/ducha dentro del mismo Local que la
    // válvula -> n=1, participante final = solo la válvula.
    const resultado = resolverHidraulicaDeTramo(proyecto, 'tGeneral', catalogoArtefactos)

    if (resultado.tipo !== 'conDemanda') {
      throw new Error('se esperaba conDemanda')
    }
    expect(resultado.simultaneidad.qcEstadistico_lps).toBe(1.5)
    expect(resultado.simultaneidad.quMaxParticipante_lps).toBe(1.5)
    expect(resultado.qc_lps).toBe(1.5)
    expect(resultado.simultaneidad.pisoCaudalIndividualAplicado).toBe(false)
  })

  it('A4 — válvula en Local propio + cocina/lavadero/jardín de la misma UF (vivienda individual): piso se activa', () => {
    const valvula = artefacto('inst-valvula', 'inodoroValvula')
    const piletaCocina = artefacto('inst-pileta-cocina', 'piletaDeCocina')
    const lavavajillas = artefacto('inst-lavavajillas', 'maquinaLavavajillas')
    const piletaLavar = artefacto('inst-pileta-lavar', 'piletaDeLavar')
    const lavarropas = artefacto('inst-lavarropas', 'maquinaLavarropas')
    const canilla = artefacto('inst-canilla', 'canillaDeServicio')

    const uf: UnidadFuncional = {
      id: 'uf-1',
      nombre: 'UF 1',
      locales: [
        localCon('bano', [valvula]),
        localCon('cocina', [piletaCocina, lavavajillas]),
        localCon('lavadero', [piletaLavar, lavarropas]),
        localCon('jardin', [canilla]),
      ],
    }
    const nodos: Nodo[] = [
      { id: 'n0' },
      { id: 'n1', referencia: referenciaDe('uf-1', 'bano', 'inst-valvula') },
      { id: 'n2', referencia: referenciaDe('uf-1', 'cocina', 'inst-pileta-cocina') },
      { id: 'n3', referencia: referenciaDe('uf-1', 'cocina', 'inst-lavavajillas') },
      { id: 'n4', referencia: referenciaDe('uf-1', 'lavadero', 'inst-pileta-lavar') },
      { id: 'n5', referencia: referenciaDe('uf-1', 'lavadero', 'inst-lavarropas') },
      { id: 'n6', referencia: referenciaDe('uf-1', 'jardin', 'inst-canilla') },
    ]
    const tramos: Tramo[] = [
      { id: 't0', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AF' },
      { id: 't1', nodoOrigenId: 'n0', nodoDestinoId: 'n2', red: 'AF' },
      { id: 't2', nodoOrigenId: 'n0', nodoDestinoId: 'n3', red: 'AF' },
      { id: 't3', nodoOrigenId: 'n0', nodoDestinoId: 'n4', red: 'AF' },
      { id: 't4', nodoOrigenId: 'n0', nodoDestinoId: 'n5', red: 'AF' },
      { id: 't5', nodoOrigenId: 'n0', nodoDestinoId: 'n6', red: 'AF' },
      { id: 'tGeneral', nodoOrigenId: 'nRaiz', nodoDestinoId: 'n0', red: 'AF' },
    ]
    const nodosCompletos: Nodo[] = [{ id: 'nRaiz' }, ...nodos]
    const proyecto = proyectoCon('viviendaIndividual', [uf], { nodos: nodosCompletos, tramos })

    const resultado = resolverHidraulicaDeTramo(proyecto, 'tGeneral', catalogoArtefactos)

    if (resultado.tipo !== 'conDemanda') {
      throw new Error('se esperaba conDemanda')
    }
    // n=6 (válvula + 5 artefactos de otros Locales, CRIT-A8 no los suprime
    // porque no comparten Local con la válvula), Qmax=2.5, Kc=1/sqrt(5),
    // aEfectivo=1 (viviendaIndividual) -> qcEstadistico=2.5/sqrt(5)≈1.1180339887498949.
    expect(resultado.simultaneidad.qcEstadistico_lps).toBeCloseTo(1.1180339887498949, 9)
    expect(resultado.simultaneidad.quMaxParticipante_lps).toBe(1.5)
    expect(resultado.qc_lps).toBe(1.5)
    expect(resultado.simultaneidad.pisoCaudalIndividualAplicado).toBe(true)
  })

  it('A5 — válvula + 6 artefactos adicionales (próximo a demo, 1 UF): piso se activa', () => {
    const valvula = artefacto('inst-valvula', 'inodoroValvula')
    const lavatorioToilette = artefacto('inst-lavatorio-toilette', 'lavatorio')
    const piletaCocina = artefacto('inst-pileta-cocina', 'piletaDeCocina')
    const lavavajillas = artefacto('inst-lavavajillas', 'maquinaLavavajillas')
    const piletaLavar = artefacto('inst-pileta-lavar', 'piletaDeLavar')
    const lavarropas = artefacto('inst-lavarropas', 'maquinaLavarropas')
    const canilla = artefacto('inst-canilla', 'canillaDeServicio')

    const uf: UnidadFuncional = {
      id: 'uf-1',
      nombre: 'UF 1',
      locales: [
        localCon('bano', [valvula]),
        localCon('toilette', [lavatorioToilette]),
        localCon('cocina', [piletaCocina, lavavajillas]),
        localCon('lavadero', [piletaLavar, lavarropas]),
        localCon('jardin', [canilla]),
      ],
    }
    const nodos: Nodo[] = [
      { id: 'n0' },
      { id: 'n1', referencia: referenciaDe('uf-1', 'bano', 'inst-valvula') },
      { id: 'n2', referencia: referenciaDe('uf-1', 'toilette', 'inst-lavatorio-toilette') },
      { id: 'n3', referencia: referenciaDe('uf-1', 'cocina', 'inst-pileta-cocina') },
      { id: 'n4', referencia: referenciaDe('uf-1', 'cocina', 'inst-lavavajillas') },
      { id: 'n5', referencia: referenciaDe('uf-1', 'lavadero', 'inst-pileta-lavar') },
      { id: 'n6', referencia: referenciaDe('uf-1', 'lavadero', 'inst-lavarropas') },
      { id: 'n7', referencia: referenciaDe('uf-1', 'jardin', 'inst-canilla') },
    ]
    const tramos: Tramo[] = [
      { id: 't0', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AF' },
      { id: 't1', nodoOrigenId: 'n0', nodoDestinoId: 'n2', red: 'AF' },
      { id: 't2', nodoOrigenId: 'n0', nodoDestinoId: 'n3', red: 'AF' },
      { id: 't3', nodoOrigenId: 'n0', nodoDestinoId: 'n4', red: 'AF' },
      { id: 't4', nodoOrigenId: 'n0', nodoDestinoId: 'n5', red: 'AF' },
      { id: 't5', nodoOrigenId: 'n0', nodoDestinoId: 'n6', red: 'AF' },
      { id: 't6', nodoOrigenId: 'n0', nodoDestinoId: 'n7', red: 'AF' },
      { id: 'tGeneral', nodoOrigenId: 'nRaiz', nodoDestinoId: 'n0', red: 'AF' },
    ]
    const nodosCompletos: Nodo[] = [{ id: 'nRaiz' }, ...nodos]
    const proyecto = proyectoCon('viviendaIndividual', [uf], { nodos: nodosCompletos, tramos })

    const resultado = resolverHidraulicaDeTramo(proyecto, 'tGeneral', catalogoArtefactos)

    if (resultado.tipo !== 'conDemanda') {
      throw new Error('se esperaba conDemanda')
    }
    // n=7, Qmax=2.7, Kc=1/sqrt(6), aEfectivo=1 -> qcEstadistico=2.7/sqrt(6)≈1.1022703842524301.
    expect(resultado.simultaneidad.qcEstadistico_lps).toBeCloseTo(1.1022703842524301, 9)
    expect(resultado.simultaneidad.quMaxParticipante_lps).toBe(1.5)
    expect(resultado.qc_lps).toBe(1.5)
    expect(resultado.simultaneidad.pisoCaudalIndividualAplicado).toBe(true)
  })

  it('A6 — multifamiliar, válvula (UF1) + lavatorio (UF2): Qc estadístico ya supera quMax, piso no se activa, aEfectivo no se altera', () => {
    const valvula = artefacto('inst-valvula', 'inodoroValvula')
    const lavatorio = artefacto('inst-lavatorio', 'lavatorio')
    const uf1: UnidadFuncional = { id: 'uf-1', nombre: 'UF 1', locales: [localCon('bano', [valvula])] }
    const uf2: UnidadFuncional = { id: 'uf-2', nombre: 'UF 2', locales: [localCon('bano', [lavatorio])] }
    const nodos: Nodo[] = [
      { id: 'nRaiz' },
      { id: 'n0' },
      { id: 'n1', referencia: referenciaDe('uf-1', 'bano', 'inst-valvula') },
      { id: 'n2', referencia: referenciaDe('uf-2', 'bano', 'inst-lavatorio') },
    ]
    const tramos: Tramo[] = [
      // Tramo común evaluado (alimentación general), aguas arriba de
      // ambas UF.
      { id: 'tGeneral', nodoOrigenId: 'nRaiz', nodoDestinoId: 'n0', red: 'AF' },
      { id: 't0', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AF' },
      { id: 't1', nodoOrigenId: 'n0', nodoDestinoId: 'n2', red: 'AF' },
    ]
    const proyecto = proyectoCon('viviendaMultifamiliar', [uf1, uf2], { nodos, tramos })

    const resultado = resolverHidraulicaDeTramo(proyecto, 'tGeneral', catalogoArtefactos)

    if (resultado.tipo !== 'conDemanda') {
      throw new Error('se esperaba conDemanda')
    }
    // n=2, Qmax=1.7, Kc=1, aEfectivo=2 (>1 UF residencial) -> qcEstadistico=3.4.
    expect(resultado.simultaneidad.aEfectivo).toBe(2)
    expect(resultado.simultaneidad.qcEstadistico_lps).toBeCloseTo(3.4, 10)
    expect(resultado.simultaneidad.quMaxParticipante_lps).toBe(1.5)
    expect(resultado.qc_lps).toBeCloseTo(3.4, 10)
    expect(resultado.qc_lps).toBe(resultado.simultaneidad.qcEstadistico_lps)
    expect(resultado.simultaneidad.pisoCaudalIndividualAplicado).toBe(false)
  })
})
