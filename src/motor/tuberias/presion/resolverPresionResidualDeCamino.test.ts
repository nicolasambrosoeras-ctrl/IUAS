// Orquestador de balance de presion sobre un camino: se verifican los
// estados de corte de cada etapa (topologia, terminal/Pmin, desnivel,
// perdida distribuida, perdida localizada) y que la barrera de
// completitud sigue diciendo la verdad -- con hfMedidor sin consumidor
// topologico todavia (D-delta.35), el resultado es siempre
// 'balanceIncompleto', nunca una residual presentada como verificada.
// hfLocalizada SI tiene consumidor desde M2-C slice A (D-delta.33): los
// fixtures de este archivo declaran accesorios=[] por defecto (relevado,
// sin accesorios del subconjunto soportado) para poder llegar a
// 'balanceIncompleto' sin necesidad de cargar accesorios reales en cada
// test que no los ejercita.
import { describe, it, expect } from 'vitest'
import type { Artefacto, MetadatosProyecto, ParametrosProyecto, Proyecto, UnidadFuncional } from '../../../modelo/proyecto'
import type { AccesorioDeTramo, Nodo, RedHidraulica, ReferenciaDeArtefacto, Tramo } from '../../../modelo/redHidraulica'
import { catalogoArtefactos } from '../../../normativa/eras-2023/catalogo-artefactos'
import { validarRedHidraulica } from '../../../validacion/redHidraulica'
import { catalogoSistemasDeTuberia } from '../sistemaDeTuberia'
import { catalogoMaterialesTuberia } from '../materialTuberia'
import { obtenerCaminoHaciaOrigen, type CaminoHaciaOrigen } from '../topologia/obtenerCaminoHaciaOrigen'
import { acumularPerdidaDistribuidaDeCamino } from './acumularPerdidaDistribuidaDeCamino'
import { resolverPresionResidualDeCamino } from './resolverPresionResidualDeCamino'

function metadatos(): MetadatosProyecto {
  return {
    nombre: 'Proyecto presion camino',
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

function proyectoCon(unidadesFuncionales: readonly UnidadFuncional[], redHidraulica: RedHidraulica): Proyecto {
  return {
    metadatos: metadatos(),
    parametros: parametros(),
    unidadesFuncionales,
    redHidraulica,
    configuracionHidraulica: {
      metodoPerdidaDistribuida: 'hazenWilliams',
      materialTuberiaId: 'ppr',
      sistemaDeTuberiaId: 'acquaSystemMagnumPn20',
    },
  }
}

function ufLavatorio(): UnidadFuncional {
  return {
    id: 'uf-1',
    nombre: 'uf-1',
    locales: [{ id: 'local-1', tipo: 'bano', regimen: 'domiciliario', artefactos: [artefacto('inst-1', 'lavatorio')] }],
  }
}

// raiz(cota 0) -> mid -> terminal(cota 8, lavatorio); ambos Tramos AF con
// longitud_m -> desnivel 8, hf distribuida acumulable. Los flags `omit*`
// quitan explicitamente un dato para ejercitar los estados incompletos
// (no se usa `x?: number` con default porque no distinguiria "ausente" de
// "undefined explicito").
function proyectoCaminoCompleto(opts?: {
  cotaRaiz?: number
  cotaTerminal?: number
  longT0?: number
  longT1?: number
  artefactoIdCatalogo?: string
  omitCotaRaiz?: boolean
  omitCotaTerminal?: boolean
  omitLongT0?: boolean
  omitLongT1?: boolean
  // Por defecto ambos tramos quedan "relevados sin accesorios" ([]) para
  // que los tests que no ejercitan M2-C puedan llegar a
  // 'balanceIncompleto' sin cargar accesorios. omitAccesoriosT1 simula el
  // caso "todavia no relevado" (undefined).
  accesoriosT0?: readonly AccesorioDeTramo[]
  accesoriosT1?: readonly AccesorioDeTramo[]
  omitAccesoriosT1?: boolean
}): Proyecto {
  const o = opts ?? {}
  const cotaRaiz = o.cotaRaiz ?? 0
  const cotaTerminal = o.cotaTerminal ?? 8
  const longT0 = o.longT0 ?? 4
  const longT1 = o.longT1 ?? 3
  const artefactoIdCatalogo = o.artefactoIdCatalogo ?? 'lavatorio'
  const accesoriosT0 = o.accesoriosT0 ?? []
  const accesoriosT1 = o.accesoriosT1 ?? []

  const uf: UnidadFuncional = {
    id: 'uf-1',
    nombre: 'uf-1',
    locales: [{ id: 'local-1', tipo: 'bano', regimen: 'domiciliario', artefactos: [artefacto('inst-1', artefactoIdCatalogo)] }],
  }
  const nodos: Nodo[] = [
    { id: 'raiz', ...(o.omitCotaRaiz ? {} : { cota_m: cotaRaiz }) },
    { id: 'mid' },
    {
      id: 'terminal',
      referencia: referenciaDe('uf-1', 'local-1', 'inst-1'),
      ...(o.omitCotaTerminal ? {} : { cota_m: cotaTerminal }),
    },
  ]
  const tramos: Tramo[] = [
    {
      id: 't0',
      nodoOrigenId: 'raiz',
      nodoDestinoId: 'mid',
      red: 'AF',
      ...(o.omitLongT0 ? {} : { longitud_m: longT0 }),
      accesorios: accesoriosT0,
    },
    {
      id: 't1',
      nodoOrigenId: 'mid',
      nodoDestinoId: 'terminal',
      red: 'AF',
      ...(o.omitLongT1 ? {} : { longitud_m: longT1 }),
      ...(o.omitAccesoriosT1 ? {} : { accesorios: accesoriosT1 }),
    },
  ]
  return proyectoCon([uf], { nodos, tramos })
}

const P_DISPONIBLE = 20

describe('resolverPresionResidualDeCamino', () => {
  it('camino resoluble: devuelve balanceIncompleto (barrera) con la traza de desnivel y hf distribuida', () => {
    const proyecto = proyectoCaminoCompleto({ cotaRaiz: 0, cotaTerminal: 8, longT0: 4, longT1: 3 })
    expect(validarRedHidraulica(proyecto)).toEqual([])

    const resultado = resolverPresionResidualDeCamino(
      proyecto,
      'terminal',
      P_DISPONIBLE,
      catalogoArtefactos,
      catalogoSistemasDeTuberia,
      catalogoMaterialesTuberia,
    )

    // Con hfMedidor sin consumidor topologico todavia (D-delta.35), la
    // barrera de resolverBalanceDePresion corta aca -- SIEMPRE. hfLocalizada
    // SI resuelve (accesorios=[] por defecto -> 0 real, no ausente).
    expect(resultado.tipo).toBe('balanceIncompleto')
    if (resultado.tipo !== 'balanceIncompleto') return
    expect([...resultado.terminosFaltantes].sort()).toEqual(['hfMedidor'])
    expect(resultado.raizId).toBe('raiz')
    expect(resultado.terminalId).toBe('terminal')
    expect(resultado.desnivel_m).toBe(8)
    expect(resultado.hfLocalizada_mca).toBe(0)
    expect(resultado.hfLocalizadaPorTramo).toEqual([
      { tramoId: 't0', hf_m: 0 },
      { tramoId: 't1', hf_m: 0 },
    ])

    const camino = obtenerCaminoHaciaOrigen(proyecto.redHidraulica!, 'terminal') as CaminoHaciaOrigen
    const acum = acumularPerdidaDistribuidaDeCamino(
      proyecto,
      camino,
      catalogoArtefactos,
      catalogoSistemasDeTuberia,
      catalogoMaterialesTuberia,
    )
    if (acum.tipo !== 'acumulada') throw new Error('fixture: se esperaba perdida acumulada')
    expect(resultado.hfDistribuida_mca).toBeCloseTo(acum.hf_m, 12)
    expect(resultado.hfDistribuidaPorTramo).toEqual(acum.porTramo)
  })

  it('descenso: desnivel_m negativo se traslada tal cual a la traza', () => {
    const proyecto = proyectoCaminoCompleto({ cotaRaiz: 12, cotaTerminal: 4 })

    const resultado = resolverPresionResidualDeCamino(
      proyecto,
      'terminal',
      P_DISPONIBLE,
      catalogoArtefactos,
      catalogoSistemasDeTuberia,
      catalogoMaterialesTuberia,
    )

    if (resultado.tipo !== 'balanceIncompleto') throw new Error('se esperaba balanceIncompleto')
    expect(resultado.desnivel_m).toBe(-8)
  })

  it('topologia con convergencia aguas arriba -> topologiaNoResoluble', () => {
    const uf = ufLavatorio()
    const nodos: Nodo[] = [
      { id: 'raiz-a', cota_m: 0 },
      { id: 'raiz-b', cota_m: 0 },
      { id: 'union' },
      { id: 'terminal', referencia: referenciaDe('uf-1', 'local-1', 'inst-1'), cota_m: 5 },
    ]
    const tramos: Tramo[] = [
      { id: 'ta', nodoOrigenId: 'raiz-a', nodoDestinoId: 'union', red: 'AF', longitud_m: 3 },
      { id: 'tb', nodoOrigenId: 'raiz-b', nodoDestinoId: 'union', red: 'AF', longitud_m: 3 },
      { id: 'tt', nodoOrigenId: 'union', nodoDestinoId: 'terminal', red: 'AF', longitud_m: 3 },
    ]
    const proyecto = proyectoCon([uf], { nodos, tramos })

    const resultado = resolverPresionResidualDeCamino(
      proyecto,
      'terminal',
      P_DISPONIBLE,
      catalogoArtefactos,
      catalogoSistemasDeTuberia,
      catalogoMaterialesTuberia,
    )

    expect(resultado.tipo).toBe('topologiaNoResoluble')
    if (resultado.tipo !== 'topologiaNoResoluble') return
    expect(resultado.detalle.tipo).toBe('multiplesTramosEntrantes')
  })

  it('nodo consultado sin referencia a Artefacto -> terminalSinArtefacto', () => {
    const nodos: Nodo[] = [
      { id: 'raiz', cota_m: 0 },
      { id: 'hub' },
    ]
    const tramos: Tramo[] = [{ id: 't0', nodoOrigenId: 'raiz', nodoDestinoId: 'hub', red: 'AF', longitud_m: 3 }]
    const proyecto = proyectoCon([], { nodos, tramos })

    const resultado = resolverPresionResidualDeCamino(
      proyecto,
      'hub',
      P_DISPONIBLE,
      catalogoArtefactos,
      catalogoSistemasDeTuberia,
      catalogoMaterialesTuberia,
    )

    expect(resultado).toEqual({ tipo: 'terminalSinArtefacto', nodoId: 'hub' })
  })

  it('Artefacto terminal sin presionMinima_kgcm2 publicada -> terminalSinPresionMinima, nunca Pmin=0', () => {
    const proyecto = proyectoCaminoCompleto({ artefactoIdCatalogo: 'maquinaLavavajillas' })

    const resultado = resolverPresionResidualDeCamino(
      proyecto,
      'terminal',
      P_DISPONIBLE,
      catalogoArtefactos,
      catalogoSistemasDeTuberia,
      catalogoMaterialesTuberia,
    )

    expect(resultado).toEqual({
      tipo: 'terminalSinPresionMinima',
      nodoId: 'terminal',
      artefactoIdCatalogo: 'maquinaLavavajillas',
    })
  })

  it('terminal sin cota_m -> desnivelIncompleto, ausencia nunca se interpreta como 0', () => {
    const proyecto = proyectoCaminoCompleto({ omitCotaTerminal: true })

    const resultado = resolverPresionResidualDeCamino(
      proyecto,
      'terminal',
      P_DISPONIBLE,
      catalogoArtefactos,
      catalogoSistemasDeTuberia,
      catalogoMaterialesTuberia,
    )

    expect(resultado).toEqual({ tipo: 'desnivelIncompleto', nodosSinCota: ['terminal'] })
  })

  it('Tramo del camino sin longitud_m -> perdidaDistribuidaIncompleta (con cotas completas)', () => {
    const proyecto = proyectoCaminoCompleto({ cotaRaiz: 0, cotaTerminal: 5, omitLongT1: true })

    const resultado = resolverPresionResidualDeCamino(
      proyecto,
      'terminal',
      P_DISPONIBLE,
      catalogoArtefactos,
      catalogoSistemasDeTuberia,
      catalogoMaterialesTuberia,
    )

    expect(resultado).toEqual({
      tipo: 'perdidaDistribuidaIncompleta',
      tramosNoResueltos: [{ tramoId: 't1', motivo: 'sinLongitud' }],
    })
  })

  it('el desnivel incompleto se reporta antes que la perdida (precedencia de etapas)', () => {
    const proyecto = proyectoCaminoCompleto({ omitCotaTerminal: true, omitLongT1: true })

    const resultado = resolverPresionResidualDeCamino(
      proyecto,
      'terminal',
      P_DISPONIBLE,
      catalogoArtefactos,
      catalogoSistemasDeTuberia,
      catalogoMaterialesTuberia,
    )

    expect(resultado.tipo).toBe('desnivelIncompleto')
  })

  it('raiz inmediata: consultar la propia raiz con un artefacto y cota -> desnivel 0, hf 0, balanceIncompleto', () => {
    const uf = ufLavatorio()
    const nodos: Nodo[] = [{ id: 'solo', referencia: referenciaDe('uf-1', 'local-1', 'inst-1'), cota_m: 3 }]
    const proyecto = proyectoCon([uf], { nodos, tramos: [] })

    const resultado = resolverPresionResidualDeCamino(
      proyecto,
      'solo',
      P_DISPONIBLE,
      catalogoArtefactos,
      catalogoSistemasDeTuberia,
      catalogoMaterialesTuberia,
    )

    if (resultado.tipo !== 'balanceIncompleto') throw new Error('se esperaba balanceIncompleto')
    expect(resultado.raizId).toBe('solo')
    expect(resultado.terminalId).toBe('solo')
    expect(resultado.desnivel_m).toBe(0)
    expect(resultado.hfDistribuida_mca).toBe(0)
    expect(resultado.hfDistribuidaPorTramo).toEqual([])
    expect(resultado.hfLocalizada_mca).toBe(0)
    expect(resultado.hfLocalizadaPorTramo).toEqual([])
  })

  it('un Tramo con accesorios no relevados (undefined) -> perdidaLocalizadaIncompleta', () => {
    const proyecto = proyectoCaminoCompleto({ omitAccesoriosT1: true })

    const resultado = resolverPresionResidualDeCamino(
      proyecto,
      'terminal',
      P_DISPONIBLE,
      catalogoArtefactos,
      catalogoSistemasDeTuberia,
      catalogoMaterialesTuberia,
    )

    expect(resultado).toEqual({
      tipo: 'perdidaLocalizadaIncompleta',
      tramosNoResueltos: [{ tramoId: 't1', motivo: 'sinRelevar' }],
    })
  })

  it('accesorios declarados con instancias reales aumentan hfLocalizada_mca y quedan en la traza por tramo', () => {
    const proyecto = proyectoCaminoCompleto({ accesoriosT0: [{ tipo: 'codo90', cantidad: 2 }] })

    const resultado = resolverPresionResidualDeCamino(
      proyecto,
      'terminal',
      P_DISPONIBLE,
      catalogoArtefactos,
      catalogoSistemasDeTuberia,
      catalogoMaterialesTuberia,
    )

    if (resultado.tipo !== 'balanceIncompleto') throw new Error('se esperaba balanceIncompleto')
    expect(resultado.hfLocalizada_mca).toBeGreaterThan(0)
    expect(resultado.hfLocalizadaPorTramo[0]!.hf_m).toBeGreaterThan(0)
    expect(resultado.hfLocalizadaPorTramo[1]!.hf_m).toBe(0)
    expect(resultado.hfLocalizada_mca).toBeCloseTo(
      resultado.hfLocalizadaPorTramo[0]!.hf_m + resultado.hfLocalizadaPorTramo[1]!.hf_m,
      12,
    )
  })

  it('nodoTerminalId inexistente lanza excepcion', () => {
    const proyecto = proyectoCaminoCompleto()

    expect(() =>
      resolverPresionResidualDeCamino(
        proyecto,
        'inexistente',
        P_DISPONIBLE,
        catalogoArtefactos,
        catalogoSistemasDeTuberia,
        catalogoMaterialesTuberia,
      ),
    ).toThrow()
  })

  // Golden del slice completo sobre una topologia sintetica controlada
  // (item 8: datos sinteticos de test, nunca datos productivos del demo).
  // Valor independiente: J = 0.1307150589563208 m/m es la perdida unitaria
  // Hazen ya verificada de forma independiente (script aparte, CRIT-A10/A17)
  // en resolverPerdidaDistribuidaDeTramo.golden.test.ts para exactamente
  // esta fixture: Qc=0.2 l/s (lavatorio unico, n=1 CRIT-A4), PPR + Acqua
  // System Magnum PN20, candidato "20 mm" (Di=14.4mm), C=150. Aca solo se
  // compone: hf_total = J * (L0 + L1), desnivel = cota_terminal - cota_raiz.
  it('Golden — camino de 2 tramos: desnivel y Σhf distribuida Hazen compuestos linealmente', () => {
    const J_HAZEN_QC_0_2_DI_14_4_C_150 = 0.1307150589563208
    const L0 = 5
    const L1 = 2
    const proyecto = proyectoCaminoCompleto({ cotaRaiz: 0, cotaTerminal: 10, longT0: L0, longT1: L1 })
    expect(validarRedHidraulica(proyecto)).toEqual([])

    const resultado = resolverPresionResidualDeCamino(
      proyecto,
      'terminal',
      P_DISPONIBLE,
      catalogoArtefactos,
      catalogoSistemasDeTuberia,
      catalogoMaterialesTuberia,
    )

    if (resultado.tipo !== 'balanceIncompleto') throw new Error('se esperaba balanceIncompleto')
    expect(resultado.desnivel_m).toBe(10)
    expect(resultado.hfDistribuidaPorTramo.map((e) => e.tramoId)).toEqual(['t0', 't1'])
    expect(resultado.hfDistribuidaPorTramo[0]!.hf_m).toBeCloseTo(J_HAZEN_QC_0_2_DI_14_4_C_150 * L0, 9)
    expect(resultado.hfDistribuidaPorTramo[1]!.hf_m).toBeCloseTo(J_HAZEN_QC_0_2_DI_14_4_C_150 * L1, 9)
    expect(resultado.hfDistribuida_mca).toBeCloseTo(J_HAZEN_QC_0_2_DI_14_4_C_150 * (L0 + L1), 9)
    // Sin accesorios declarados en este golden (accesorios=[] por defecto):
    // hfLocalizada es un cero real, no un término ausente.
    expect(resultado.hfLocalizada_mca).toBe(0)
  })
})
